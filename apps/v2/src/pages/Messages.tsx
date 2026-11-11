import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  authClient,
  request,
  rpc,
  str,
  errorText,
  type Row,
} from "../lib/client";
import { useQuery } from "../lib/hooks";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  PageHeading,
} from "../components/ui";
export default function Messages() {
  const { session } = useAuth();
  const { id } = useParams();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const pending = useRef<{ id: string; content: string } | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const conversations = useQuery(
    "conversations-" + session?.user.id,
    (signal) =>
      request<Row[]>("conversations", {
        query: {
          select:
            "id,subject,related_type,related_id,updated_at,exchange_status",
          order: "updated_at.desc,id.desc",
          limit: 100,
        },
        signal,
      }),
    !!session,
  );
  const thread = useQuery(
    `thread-${id}-${session?.user.id}`,
    async (signal) => {
      const [messages, people] = await Promise.all([
        request<Row[]>("messages", {
          query: {
            select:
              "id,conversation_id,sender_id,content,created_at,deleted_at",
            conversation_id: `eq.${id}`,
            order: "created_at.desc,id.desc",
            limit: 100,
          },
          signal,
        }),
        rpc<Row[]>("get_conversation_other_participant", {
          p_conversation_id: id,
        }),
      ]);
      return { messages: messages.reverse(), person: people[0] };
    },
    !!session && !!id,
  );
  useEffect(() => {
    if (!session || !id) return;
    let alive = true;
    const channel = authClient
      .channel("bc-v2-messages-" + id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          if (alive) {
            thread.reload();
            conversations.reload();
          }
        },
      )
      .subscribe();
    const refresh = () => {
      if (!document.hidden) {
        thread.reload();
        conversations.reload();
      }
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      void authClient.removeChannel(channel);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id, session?.user.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread.data?.messages.length, id]);
  useEffect(() => {
    if (!id || !session || !thread.data) return;
    void request("conversation_participants", {
      method: "PATCH",
      query: { conversation_id: `eq.${id}`, user_id: `eq.${session.user.id}` },
      body: { last_read_at: new Date().toISOString() },
      prefer: "return=minimal",
    }).catch(() => {});
  }, [id, session?.user.id, thread.data?.messages.at(-1)?.id]);
  const otherId = str(thread.data?.person, "user_id");
  const block = useQuery(
    `blocked-${otherId}-${session?.user.id}`,
    (signal) =>
      request<Row[]>("user_blocks", {
        query: {
          select: "id",
          user_id: `eq.${session?.user.id}`,
          target_user_id: `eq.${otherId}`,
          limit: 1,
        },
        signal,
      }),
    !!session && !!otherId,
  );
  const toggleBlock = async () => {
    if (!session || !otherId || blockBusy) return;
    setBlockBusy(true);
    setError("");
    try {
      if (block.data?.[0])
        await request("user_blocks", {
          method: "DELETE",
          query: {
            id: `eq.${block.data[0].id}`,
            user_id: `eq.${session.user.id}`,
          },
          prefer: "return=minimal",
        });
      else
        await request("user_blocks", {
          method: "POST",
          body: { user_id: session.user.id, target_user_id: otherId },
        });
      block.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBlockBusy(false);
    }
  };
  if (!session)
    return (
      <LoginPrompt text="Vos conversations sont privées. Connectez-vous pour les retrouver." />
    );
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || busy || !text.trim()) return;
    setBusy(true);
    setError("");
    if (pending.current?.content !== text.trim())
      pending.current = { id: crypto.randomUUID(), content: text.trim() };
    try {
      await request("messages", {
        method: "POST",
        body: {
          id: pending.current.id,
          conversation_id: id,
          sender_id: session.user.id,
          content: pending.current.content,
        },
        prefer: "resolution=ignore-duplicates,return=representation",
      });
      pending.current = null;
      setText("");
      thread.reload();
      conversations.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
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
            <button className="text-button" onClick={conversations.reload}>
              Actualiser
            </button>
          </div>
          {conversations.loading ? (
            <Loading />
          ) : conversations.error ? (
            <Failure
              message={conversations.error}
              retry={conversations.reload}
            />
          ) : conversations.data?.length ? (
            conversations.data.map((c) => (
              <Link
                className={`conversation-item ${id === c.id ? "active" : ""}`}
                key={c.id}
                to={"/messages/" + c.id}
              >
                <span className="conversation-avatar">
                  <UserRound size={21} />
                </span>
                <div>
                  <strong>{str(c, "subject", "Conversation")}</strong>
                  <small>
                    {new Date(str(c, "updated_at")).toLocaleDateString(
                      "fr-FR",
                      { day: "numeric", month: "short" },
                    )}
                  </small>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))
          ) : (
            <Empty
              title="Tout commence par un bonjour"
              text="Contactez un habitant depuis une publication pour commencer à échanger."
            />
          )}
        </aside>
        <section className="message-thread">
          {!id ? (
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
          ) : (
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
                    {str(
                      thread.data?.person,
                      "full_name",
                      "Votre interlocuteur",
                    )}
                  </strong>
                  <p>
                    {str(
                      conversations.data?.find((c) => c.id === id),
                      "subject",
                      "Conversation privée",
                    )}
                  </p>
                </div>
                <button
                  className="text-button"
                  disabled={blockBusy || block.loading || !otherId}
                  onClick={() => void toggleBlock()}
                >
                  {block.data?.length ? "Débloquer" : "Bloquer"}
                </button>
                <ShieldCheck size={19} />
              </div>
              <div
                className="message-scroll"
                role="log"
                aria-label="Messages de la conversation"
                aria-live="polite"
              >
                {thread.loading && !thread.data ? (
                  <Loading />
                ) : thread.error ? (
                  <Failure message={thread.error} retry={thread.reload} />
                ) : thread.data?.messages.length ? (
                  thread.data.messages.map((message) => (
                    <div
                      className={`bubble-wrap ${message.sender_id === session.user.id ? "mine" : ""}`}
                      key={message.id}
                    >
                      <div className="bubble">
                        <p>
                          {message.deleted_at
                            ? "Message supprimé"
                            : str(message, "content")}
                        </p>
                        <time>
                          {new Date(
                            str(message, "created_at"),
                          ).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="thread-start">
                    Vous pouvez commencer votre conversation.
                  </p>
                )}
                <div ref={bottom} />
              </div>
              {error && <Failure message={error} />}
              <form className="message-compose" onSubmit={send}>
                <label className="sr-only" htmlFor="message-text">
                  Votre message
                </label>
                <textarea
                  id="message-text"
                  value={text}
                  rows={2}
                  maxLength={5000}
                  disabled={!!thread.error || !!block.data?.length}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Écrivez votre message…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!busy && text.trim())
                        e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  className="button"
                  type="submit"
                  disabled={
                    busy ||
                    !text.trim() ||
                    !!thread.error ||
                    !!block.data?.length
                  }
                  aria-label="Envoyer le message"
                >
                  <Send size={19} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
