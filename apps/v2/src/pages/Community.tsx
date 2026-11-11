import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HandHeart,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { request, str, errorText, type Row } from "../lib/client";
import { MODULES, moduleBySlug } from "../lib/modules";
import { useQuery } from "../lib/hooks";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  NotFound,
  PageHeading,
} from "../components/ui";
import { RecordCard } from "./Records";
const themes = MODULES.filter(
  (m) =>
    !["demandes", "emploi/offres", "emploi/demandes", "sorties"].includes(
      m.slug,
    ),
);
export function Community() {
  return (
    <>
      <PageHeading
        eyebrow="Les liens font le lieu"
        title="Trouvez votre communauté."
        text="Un centre d’intérêt en commun, et déjà quelque chose à se raconter."
      />
      <div className="community-intro">
        <HandHeart size={38} />
        <p>
          Des habitants qui se rencontrent autour de leurs passions.
          <br />
          <strong>Choisissez un thème et prenez part à la conversation.</strong>
        </p>
      </div>
      <div className="explore-grid">
        {themes.map((m) => (
          <Link
            to={"/communaute/" + m.slug}
            key={m.slug}
            className="module-tile"
          >
            <span className={`tile-icon ${m.color}`}>
              <m.icon size={25} />
            </span>
            <strong>{m.title}</strong>
            <span>{m.description}</span>
            <ArrowRight className="tile-arrow" size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}
export function CommunityTheme() {
  const { theme } = useParams();
  const m = moduleBySlug(theme || "");
  const { session } = useAuth();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const memberships = useQuery(
    `membership-${theme}-${session?.user.id}`,
    (signal) =>
      request<Row[]>("theme_memberships", {
        query: {
          select: "id,user_id,status",
          theme_slug: `eq.${theme}`,
          user_id: `eq.${session?.user.id}`,
          limit: 1,
        },
        signal,
      }),
    !!session && !!m,
  );
  const discussions = useQuery(
    "theme-" + theme,
    (signal) =>
      request<Row[]>("theme_discussions", {
        query: {
          select: "id,author_id,content,created_at",
          theme_slug: `eq.${theme}`,
          order: "created_at.desc",
          limit: 80,
        },
        signal,
      }),
    !!m,
  );
  if (!m) return <NotFound />;
  const membership = memberships.data?.[0],
    member = membership?.status === "active";
  const join = async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        theme_slug: theme,
        user_id: session.user.id,
        status: member ? "left" : "active",
      };
      await request("theme_memberships", {
        method: membership ? "PATCH" : "POST",
        query: membership
          ? { id: `eq.${membership.id}`, user_id: `eq.${session.user.id}` }
          : undefined,
        body,
      });
      memberships.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || busy || !member) return;
    setBusy(true);
    setError("");
    try {
      await request("theme_discussions", {
        method: "POST",
        body: {
          theme_slug: theme,
          author_id: session.user.id,
          content: text.trim(),
        },
      });
      setText("");
      discussions.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link to="/communaute" className="back-link">
        <ArrowLeft size={17} />
        Toutes les communautés
      </Link>
      <PageHeading
        eyebrow="La communauté"
        title={m.title}
        text={m.description}
        action={
          session ? (
            <button
              className={`button ${member ? "secondary" : ""}`}
              disabled={busy || memberships.loading || !!memberships.error}
              onClick={() => void join()}
            >
              {member ? <Check size={18} /> : <Plus size={18} />}
              {member ? "Quitter le groupe" : "Rejoindre le groupe"}
            </button>
          ) : (
            <Link to="/connexion" className="button">
              Rejoindre le groupe
            </Link>
          )
        }
      />
      <div className="theme-layout">
        <section className="panel">
          <h2>Les échanges du groupe</h2>
          {discussions.loading ? (
            <Loading />
          ) : discussions.error ? (
            <Failure message={discussions.error} retry={discussions.reload} />
          ) : discussions.data?.length ? (
            discussions.data.map((row) => (
              <article className="comment" key={row.id}>
                <span className="comment-avatar">
                  <Users size={18} />
                </span>
                <div>
                  <strong>
                    {row.author_id === session?.user.id
                      ? "Vous"
                      : "Un habitant du groupe"}
                  </strong>
                  <p>{str(row, "content")}</p>
                  <small>
                    {new Date(str(row, "created_at")).toLocaleString("fr-FR")}
                  </small>
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="Les belles conversations commencent ici"
              text="Rejoignez le groupe et partagez un premier message."
            />
          )}
          {member && (
            <form className="comment-form" onSubmit={send}>
              <textarea
                aria-label="Message au groupe"
                minLength={3}
                maxLength={3000}
                required
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Une idée, une question, un bon plan…"
              />
              <button
                className="button"
                disabled={busy || text.trim().length < 3}
              >
                <Send size={17} />
                Publier
              </button>
            </form>
          )}
          {(error || memberships.error) && (
            <Failure message={error || memberships.error} />
          )}
        </section>
        <aside className="panel">
          <span className={`tile-icon ${m.color}`}>
            <m.icon size={26} />
          </span>
          <h2>Passons à l’action.</h2>
          <p>
            Retrouvez toutes les publications de la rubrique{" "}
            {m.title.toLowerCase()}.
          </p>
          <Link to={"/" + m.slug} className="button secondary full">
            Explorer
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");
  const [slug, setSlug] = useState("annonces");
  const m = moduleBySlug(slug)!;
  const term = params.get("q") || "";
  const query = useQuery(
    `search-${slug}-${term}`,
    (signal) =>
      request<Row[]>(m.table, {
        query: {
          select: m.select,
          ...m.publicFilter,
          [m.titleField]: `ilike.*${term.replace(/[*,().%_]/g, " ").slice(0, 100)}*`,
          order: "created_at.desc,id.desc",
          limit: 24,
        },
        signal,
      }),
    term.length > 0,
  );
  return (
    <>
      <PageHeading
        eyebrow="Tout près de vous"
        title="Que recherchez-vous ?"
        text="Choisissez une rubrique et trouvez ce qui vous est utile."
      />
      <div className="filters">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: text });
          }}
        >
          <input
            aria-label="Votre recherche"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Un objet, un événement, une idée…"
          />
          <button>Rechercher</button>
        </form>
        <select
          aria-label="Rubrique de recherche"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        >
          {MODULES.filter((m) => !m.authOnly).map((m) => (
            <option value={m.slug} key={m.slug}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      {!term ? (
        <Empty
          title="À vous de jouer"
          text="Entrez quelques mots pour explorer les publications locales."
        />
      ) : query.loading ? (
        <Loading />
      ) : query.error ? (
        <Failure message={query.error} retry={query.reload} />
      ) : query.data?.length ? (
        <div className="record-grid">
          {query.data.map((row) => (
            <RecordCard key={row.id} row={row} module={m} />
          ))}
        </div>
      ) : (
        <Empty
          title="Aucune publication trouvée"
          text="Essayez une autre rubrique ou un mot plus simple."
        />
      )}
    </>
  );
}
