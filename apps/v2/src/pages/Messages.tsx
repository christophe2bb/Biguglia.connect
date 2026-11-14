import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { authClient, request, str, errorText, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { usePagedFeed } from "../lib/usePagedFeed";
import {
  CONVERSATION_SELECT,
  MESSAGE_SELECT,
  sendMessage,
} from "../lib/messaging";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  PageHeading,
} from "../components/ui";

export default function Messages() {
  const { session } = useAuth();
  if (!session)
    return (
      <LoginPrompt text="Vos conversations sont privées. Connectez-vous pour les retrouver." />
    );
  return <Inbox key={session.user.id} userId={session.user.id} />;
}

function Inbox({ userId }: { userId: string }) {
  const { id } = useParams();
  const conversations = usePagedFeed({
    key: `inbox-${userId}`,
    table: "conversations",
    select: CONVERSATION_SELECT,
    column: "updated_at",
    filters: { "conversation_participants.user_id": `eq.${userId}` },
    enabled: true,
  });
  const latest = useRef(conversations);
  latest.current = conversations;
  useEffect(() => {
    const channel = authClient
      .channel("bc-v2-inbox-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void latest.current.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => void latest.current.refresh(true),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void latest.current.refresh(true);
      });
    const refresh = () => {
      if (!document.hidden) void latest.current.refresh(true);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      void authClient.removeChannel(channel);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId]);
  return (
    <>
      <PageHeading
        eyebrow="Les échanges qui rapprochent"
        title="Votre messagerie"
        text="Tous vos projets et toutes vos rencontres, au même endroit."
      />
      <div className={`messenger ${id ? "thread-selected" : ""}`}>
        <aside className="conversation-list">
          <div className="conversation-list-heading">
            <MessageCircle size={20} />
            <h2>Conversations</h2>
            <button
              className="text-button"
              disabled={!!conversations.busy}
              onClick={() => void conversations.refresh(true)}
            >
              Actualiser
            </button>
          </div>
          {conversations.loading ? (
            <Loading />
          ) : (
            <>
              {conversations.error && (
                <Failure
                  message={conversations.error}
                  retry={() => void conversations.retry()}
                />
              )}
              {conversations.rows.map((conversation) => (
                <Link
                  className={`conversation-item ${id === conversation.id ? "active" : ""}`}
                  key={conversation.id}
                  to={"/messages/" + conversation.id}
                >
                  <span className="conversation-avatar">
                    <UserRound size={21} />
                  </span>
                  <div>
                    <strong>
                      {str(conversation, "subject", "Conversation")}
                    </strong>
                    <small>
                      {new Date(
                        str(conversation, "updated_at"),
                      ).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
              {!conversations.rows.length && !conversations.error && (
                <Empty
                  title="Tout commence par un bonjour"
                  text="Contactez un habitant depuis une publication pour commencer à échanger."
                />
              )}
              {conversations.hasOlder && (
                <button
                  className="button secondary full"
                  disabled={!!conversations.busy}
                  onClick={() => void conversations.loadOlder()}
                >
                  Conversations plus anciennes
                </button>
              )}
              {conversations.hasNewer && (
                <button
                  className="button secondary full"
                  disabled={!!conversations.busy}
                  onClick={() => void conversations.refresh()}
                >
                  Continuer la mise à jour
                </button>
              )}
            </>
          )}
        </aside>
        <section className="message-thread">
          {id ? (
            <Thread
              key={`${userId}:${id}`}
              id={id}
              userId={userId}
              subject={str(
                conversations.rows.find((row) => row.id === id),
                "subject",
                "Conversation privée",
              )}
              onActivity={() => void conversations.refresh()}
            />
          ) : (
            <div className="thread-placeholder">
              <span>
                <MessageCircle size={42} strokeWidth={1} />
              </span>
              <h2>
                Un projet prend vie
                <br />
                avec une conversation.
              </h2>
              <p>Choisissez un échange pour reprendre le fil.</p>
              <Link className="text-button" to="/explorer">
                Explorer les publications
                <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Thread({
  id,
  userId,
  subject,
  onActivity,
}: {
  id: string;
  userId: string;
  subject: string;
  onActivity: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [readError, setReadError] = useState("");
  const [readRetry, setReadRetry] = useState(0);
  const [directUnavailable, setDirectUnavailable] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [atBottom, setAtBottom] = useState(true);
  const [newMessages, setNewMessages] = useState(false);
  const revision = useRef(0);
  const pending = useRef<{ id: string; content: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const newestSeen = useRef("");
  const readAck = useRef("");
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const abort = new AbortController();
    lifetime.current = abort;
    return () => abort.abort();
  }, []);
  const person = useQuery(`participant-${id}-${userId}`, async (signal) => {
    const people = await request<Row[]>(
      "rpc/get_conversation_other_participant",
      { method: "POST", body: { p_conversation_id: id }, signal },
    );
    if (!people[0]?.user_id)
      throw new Error(
        "Cette conversation n’est pas disponible pour votre compte.",
      );
    return people[0];
  });
  const timeline = usePagedFeed({
    key: `messages-${id}-${userId}`,
    table: "messages",
    select: MESSAGE_SELECT,
    column: "created_at",
    filters: { conversation_id: `eq.${id}` },
    enabled: true,
  });
  const latest = useRef({ timeline, onActivity });
  latest.current = { timeline, onActivity };
  useEffect(() => {
    let alive = true;
    const channel = authClient
      .channel("bc-v2-messages-" + id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          if (!alive) return;
          if (payload.eventType === "DELETE")
            latest.current.timeline.change(payload.old, true);
          else if (payload.new.conversation_id === id)
            latest.current.timeline.change(payload.new);
          if (payload.eventType === "INSERT")
            void latest.current.timeline.refresh();
          latest.current.onActivity();
        },
      )
      .subscribe((status) => {
        if (!alive) return;
        setDirectUnavailable(
          ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status),
        );
        if (status === "SUBSCRIBED") void latest.current.timeline.refresh(true);
      });
    const refresh = () => {
      setVisible(!document.hidden);
      if (!document.hidden) void latest.current.timeline.refresh(true);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      void authClient.removeChannel(channel);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id]);
  const newest = timeline.rows[0];
  useLayoutEffect(() => {
    if (anchor.current && !timeline.busy && scroll.current) {
      scroll.current.scrollTop =
        anchor.current.top +
        scroll.current.scrollHeight -
        anchor.current.height;
      anchor.current = null;
    }
    if (newest && newest.id !== newestSeen.current) {
      if (
        !newestSeen.current ||
        follow.current ||
        newest.sender_id === userId
      ) {
        bottom.current?.scrollIntoView?.({ block: "nearest" });
        follow.current = true;
        setAtBottom(true);
        setNewMessages(false);
      } else setNewMessages(true);
      newestSeen.current = newest.id;
    }
  }, [timeline.rows, timeline.busy, newest, userId]);
  const otherId = str(person.data, "user_id");
  const block = useQuery(
    `block-${otherId}-${userId}`,
    (signal) =>
      request<Row[]>("user_blocks", {
        query: {
          select: "id",
          user_id: `eq.${userId}`,
          target_user_id: `eq.${otherId}`,
          limit: 1,
        },
        signal,
      }),
    !!otherId,
  );
  useEffect(() => {
    if (
      !newest ||
      !otherId ||
      !visible ||
      !atBottom ||
      readAck.current === newest.id
    )
      return;
    const abort = new AbortController();
    void request<string>("rpc/bc_v2_mark_conversation_read", {
      method: "POST",
      body: { p_conversation: id, p_message: newest.id },
      signal: abort.signal,
    })
      .then((value) => {
        if (!value) throw new Error("Lecture non confirmée");
        if (!abort.signal.aborted) {
          readAck.current = newest.id;
          setReadError("");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setReadError(
            "La lecture n’a pas pu être enregistrée. Vos messages restent disponibles.",
          );
      });
    return () => abort.abort();
  }, [id, newest?.id, otherId, visible, atBottom, readRetry]);
  const toggleBlock = async () => {
    if (!otherId || blockBusy) return;
    setBlockBusy(true);
    setError("");
    try {
      if (block.data?.[0])
        await request("user_blocks", {
          method: "DELETE",
          query: { id: `eq.${block.data[0].id}`, user_id: `eq.${userId}` },
          prefer: "return=minimal",
        });
      else
        await request("user_blocks", {
          method: "POST",
          body: { user_id: userId, target_user_id: otherId },
        });
      block.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBlockBusy(false);
    }
  };
  const unavailable =
    person.loading ||
    !!person.error ||
    !otherId ||
    block.loading ||
    !!block.error ||
    !!block.data?.length;
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || unavailable || !text.trim()) return;
    setBusy(true);
    setError("");
    const sentRevision = revision.current;
    if (pending.current?.content !== text.trim())
      pending.current = { id: crypto.randomUUID(), content: text.trim() };
    const message = pending.current;
    try {
      const confirmed = await sendMessage(
        {
          id: message.id,
          conversation_id: id,
          sender_id: userId,
          content: message.content,
        },
        lifetime.current.signal,
      );
      pending.current = null;
      setText((value) => (revision.current === sentRevision ? "" : value));
      timeline.change(confirmed);
      void timeline.refresh();
      onActivity();
    } catch (e) {
      if (!lifetime.current.signal.aborted) setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const older = () => {
    if (scroll.current)
      anchor.current = {
        height: scroll.current.scrollHeight,
        top: scroll.current.scrollTop,
      };
    follow.current = false;
    setAtBottom(false);
    void timeline.loadOlder();
  };
  const messages = [...timeline.rows].reverse();
  const day = (row: Row) =>
    new Date(str(row, "created_at")).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return (
    <>
      <div className="thread-header">
        <Link
          className="icon-button thread-back"
          to="/messages"
          aria-label="Revenir aux conversations"
        >
          <ArrowLeft size={20} />
        </Link>
        <span className="conversation-avatar">
          <UserRound size={20} />
        </span>
        <div>
          <strong>
            {str(person.data, "full_name", "Votre interlocuteur")}
          </strong>
          <p>{subject}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Actualiser la conversation"
          disabled={!!timeline.busy}
          onClick={() => void timeline.refresh(true)}
        >
          <RefreshCw size={18} />
        </button>
        <button
          className="text-button"
          disabled={blockBusy || block.loading || !!block.error || !otherId}
          onClick={() => void toggleBlock()}
        >
          {block.data?.length ? "Débloquer" : "Bloquer"}
        </button>
        <ShieldCheck size={19} />
      </div>
      <div
        ref={scroll}
        className="message-scroll"
        role="log"
        aria-label="Messages de la conversation"
        aria-live="polite"
        aria-busy={timeline.loading}
        onScroll={() => {
          if (!scroll.current) return;
          const near =
            scroll.current.scrollHeight -
              scroll.current.scrollTop -
              scroll.current.clientHeight <
            100;
          follow.current = near;
          setAtBottom(near);
          if (near) setNewMessages(false);
        }}
      >
        {person.error ? (
          <Failure message={person.error} retry={person.reload} />
        ) : (
          <>
            {timeline.hasOlder && (
              <div className="history-actions">
                <button
                  className="button secondary"
                  disabled={!!timeline.busy}
                  onClick={older}
                >
                  {timeline.busy === "older"
                    ? "Chargement…"
                    : "Messages plus anciens"}
                </button>
              </div>
            )}
            {timeline.loading && <Loading />}
            {timeline.error && (
              <Failure
                message={timeline.error}
                retry={() => void timeline.retry()}
              />
            )}
            {messages.map((message, index) => (
              <div key={message.id}>
                {(index === 0 || day(message) !== day(messages[index - 1])) && (
                  <p className="message-day">{day(message)}</p>
                )}
                <div
                  className={`bubble-wrap ${message.sender_id === userId ? "mine" : ""}`}
                >
                  <div className="bubble">
                    <p>
                      {message.deleted_at
                        ? "Message supprimé"
                        : str(message, "content")}
                    </p>
                    <time dateTime={str(message, "created_at")}>
                      {new Date(str(message, "created_at")).toLocaleTimeString(
                        "fr-FR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </time>
                  </div>
                </div>
              </div>
            ))}
            {!timeline.loading && !timeline.error && !messages.length && (
              <p className="thread-start">
                Vous pouvez commencer votre conversation.
              </p>
            )}
            {timeline.hasNewer && (
              <button
                className="button secondary"
                disabled={!!timeline.busy}
                onClick={() => void timeline.refresh()}
              >
                Continuer la mise à jour
              </button>
            )}
          </>
        )}
        <div ref={bottom} />
      </div>
      {newMessages && (
        <button
          className="text-button"
          onClick={() => {
            bottom.current?.scrollIntoView?.({ block: "nearest" });
            follow.current = true;
            setAtBottom(true);
            setNewMessages(false);
          }}
        >
          Voir les derniers messages
        </button>
      )}
      {block.error && <Failure message={block.error} retry={block.reload} />}
      {directUnavailable && (
        <p role="status" className="notice warning">
          La réception en direct est momentanément indisponible. Actualisez la
          conversation pour recevoir les nouveaux messages.
        </p>
      )}
      {readError && (
        <div className="notice warning">
          <p>{readError}</p>
          <button
            className="text-button"
            onClick={() => setReadRetry((value) => value + 1)}
          >
            Réessayer l’accusé de lecture
          </button>
        </div>
      )}
      {error && <Failure message={error} />}
      <form className="message-compose" onSubmit={(event) => void send(event)}>
        <label className="sr-only" htmlFor="message-text">
          Votre message
        </label>
        <textarea
          id="message-text"
          value={text}
          rows={2}
          maxLength={5000}
          disabled={unavailable}
          onChange={(event) => {
            revision.current++;
            setText(event.target.value);
          }}
          placeholder="Écrivez votre message…"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!busy && text.trim())
                event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          className="button"
          type="submit"
          disabled={busy || unavailable || !text.trim()}
          aria-label="Envoyer le message"
        >
          <Send size={19} />
        </button>
      </form>
    </>
  );
}
