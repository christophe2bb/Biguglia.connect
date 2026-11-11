import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  Download,
  Heart,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { useAuth, isStaff } from "../lib/auth";
import {
  request,
  str,
  errorText,
  safeLocalPath,
  type Row,
} from "../lib/client";
import {
  MODULES,
  SECTORS,
  label,
  moduleBySlug,
  type Module,
} from "../lib/modules";
import { useQuery } from "../lib/hooks";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  Notice,
  PageHeading,
} from "../components/ui";
import { RecordCard, formatDate } from "./Records";
import { LoanActivity } from "./Equipment";

export function Profile() {
  const { session, profile, profileError, reloadProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!session) return <LoginPrompt />;
  if (!profile)
    return profileError ? (
      <Failure message={profileError} retry={reloadProfile} />
    ) : (
      <Loading text="Chargement de votre profil…" />
    );
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const rows = await request<Row[]>("profiles", {
        method: "PATCH",
        query: { id: `eq.${session.user.id}` },
        body: {
          full_name: String(form.get("full_name")).trim(),
          phone: String(form.get("phone")).trim() || null,
          home_sector_id: form.get("home_sector_id") || null,
        },
      });
      if (!rows.length)
        throw new Error("L’enregistrement n’a pas été confirmé.");
      setDone(true);
      reloadProfile();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
      navigate("/");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="Votre espace personnel"
        title="Bonjour, vous."
        text="Vos informations, vos préférences et votre compte."
      />
      <div className="profile-layout">
        <section className="panel">
          <div className="profile-identity">
            <span className="profile-avatar">
              {str(profile, "full_name", "B").charAt(0)}
            </span>
            <div>
              <h2>{str(profile, "full_name", "Mon profil")}</h2>
              <p>{str(profile, "email")}</p>
              <span className="badge sage">{label(profile.role)}</span>
            </div>
          </div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="form-field">
                Nom affiché
                <input
                  name="full_name"
                  defaultValue={str(profile, "full_name")}
                  required
                  maxLength={100}
                />
              </label>
              <label className="form-field">
                Téléphone (facultatif)
                <input
                  name="phone"
                  type="tel"
                  maxLength={25}
                  defaultValue={str(profile, "phone")}
                />
              </label>
              <label className="form-field">
                Mon quartier
                <select
                  name="home_sector_id"
                  defaultValue={str(profile, "home_sector_id")}
                >
                  <option value="">Non renseigné</option>
                  {SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {done && <Notice>Votre profil a été mis à jour.</Notice>}
            {error && <Failure message={error} />}
            <button className="button" disabled={busy}>
              Enregistrer
              <Check size={17} />
            </button>
          </form>
        </section>
        <aside>
          <section className="panel">
            <h2>Votre compte</h2>
            <Link className="account-link" to="/mot-de-passe">
              <Settings size={18} />
              Changer de mot de passe
              <ArrowRight size={16} />
            </Link>
            <Link className="account-link" to="/artisans/nouveau">
              <Wrench size={18} />
              Créer mon profil artisan
              <ArrowRight size={16} />
            </Link>
            <Link className="account-link" to="/confidentialite">
              <ShieldCheck size={18} />
              Mes données et mes droits
              <ArrowRight size={16} />
            </Link>
            <button
              className="account-link danger"
              disabled={busy}
              onClick={() => void logout()}
            >
              <LogOut size={18} />
              Me déconnecter
            </button>
          </section>
          <section className="panel">
            <h3>Mes informations personnelles</h3>
            <p>
              Vous pouvez télécharger les informations de votre profil au format
              JSON.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(profile, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mon-profil-biguglia.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={16} />
              Télécharger mon profil
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}

export function Dashboard() {
  const { session } = useAuth();
  const [tab, setTab] = useState("publications");
  const [slug, setSlug] = useState("demandes");
  const m = moduleBySlug(slug)!;
  const publications = useQuery(
    `my-${slug}-${session?.user.id}`,
    (signal) =>
      request<Row[]>(m.table, {
        query: {
          select: m.select,
          [m.owner]: `eq.${session?.user.id}`,
          order: "created_at.desc,id.desc",
          limit: 50,
        },
        signal,
      }),
    !!session && tab === "publications",
  );
  if (!session) return <LoginPrompt />;
  return (
    <>
      <PageHeading
        eyebrow="Mon espace"
        title="Vos projets, vos échanges."
        text="Retrouvez vos publications et gardez le fil de votre vie locale."
        action={
          <Link className="button" to="/publier">
            <Plus size={18} />
            Publier
          </Link>
        }
      />
      <div className="dashboard-shortcuts">
        <Link to="/messages">
          <MessageIcon />
          <strong>Ma messagerie</strong>
          <ArrowRight size={18} />
        </Link>
        <Link to="/favoris">
          <Heart size={22} />
          <strong>Mes favoris</strong>
          <ArrowRight size={18} />
        </Link>
        <Link to="/profil">
          <UserRound size={22} />
          <strong>Mon profil</strong>
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="tabs">
        {[
          ["publications", "Mes publications"],
          ["emprunts", "Prêts et emprunts"],
          ["inscriptions", "Mes inscriptions"],
        ].map(([key, text]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {text}
          </button>
        ))}
      </div>
      {tab === "publications" ? (
        <>
          <div className="filters">
            <label>
              Rubrique{" "}
              <select value={slug} onChange={(e) => setSlug(e.target.value)}>
                {MODULES.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <Link className="text-button" to={`/${m.slug}/nouveau`}>
              Créer {m.singular}
              <Plus size={17} />
            </Link>
          </div>
          {publications.loading ? (
            <Loading />
          ) : publications.error ? (
            <Failure message={publications.error} retry={publications.reload} />
          ) : publications.data?.length ? (
            <div className="record-grid">
              {publications.data.map((row) => (
                <RecordCard module={m} row={row} key={row.id} />
              ))}
            </div>
          ) : (
            <Empty
              title="Votre prochaine idée commence ici"
              text="Vos publications dans cette rubrique apparaîtront sur cette page."
              action={
                <Link to={`/${m.slug}/nouveau`} className="button secondary">
                  Créer une publication
                  <Plus size={17} />
                </Link>
              }
            />
          )}
        </>
      ) : tab === "emprunts" ? (
        <LoanActivity />
      ) : (
        <Registrations />
      )}
    </>
  );
}
function MessageIcon() {
  return <Bell size={22} />;
}

function Registrations() {
  const { session } = useAuth();
  const [type, setType] = useState("event");
  const module = moduleBySlug(type === "event" ? "evenements" : "sorties")!;
  const fk = type === "event" ? "event_id" : "outing_id";
  const registrations = useQuery(
    `registrations-${type}-${session?.user.id}`,
    async (signal) => {
      const rows = await request<Row[]>(
        type === "event" ? "event_participants" : "outing_participants",
        {
          query: {
            select: `id,${fk},status`,
            user_id: `eq.${session?.user.id}`,
            limit: 100,
          },
          signal,
        },
      );
      const ids = rows.map((r) => str(r, fk));
      const records = ids.length
        ? await request<Row[]>(module.table, {
            query: {
              select: module.select,
              id: `in.(${ids.join(",")})`,
              limit: 100,
            },
            signal,
          })
        : [];
      return { rows, records };
    },
    !!session,
  );
  return (
    <>
      <div className="filters">
        <select
          aria-label="Type d’inscription"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="event">Événements</option>
          <option value="outing">Sorties</option>
        </select>
      </div>
      {registrations.loading ? (
        <Loading />
      ) : registrations.error ? (
        <Failure message={registrations.error} retry={registrations.reload} />
      ) : !registrations.data?.rows.length ? (
        <Empty
          title="L’agenda vous attend"
          text="Choisissez un événement ou une sortie pour participer à la vie locale."
          action={
            <Link className="button secondary" to={"/" + module.slug}>
              Voir les rendez-vous
            </Link>
          }
        />
      ) : (
        <div className="activity-list">
          {registrations.data.rows.map((r) => (
            <Link
              className="activity"
              to={`/${module.slug}/${r[fk]}`}
              key={r.id}
            >
              <CalendarCheck size={24} />
              <div>
                <h3>
                  {str(
                    registrations.data!.records.find((x) => x.id === r[fk]),
                    "title",
                    "Événement",
                  )}
                </h3>
                <p>{label(r.status)}</p>
              </div>
              <ArrowRight size={19} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function Notifications() {
  const { session } = useAuth();
  const [error, setError] = useState("");
  const notifications = useQuery(
    "notifications-" + session?.user.id,
    (signal) =>
      request<Row[]>("notifications", {
        query: {
          select: "id,title,message,link,is_read,created_at",
          user_id: `eq.${session?.user.id}`,
          order: "created_at.desc",
          limit: 100,
        },
        signal,
      }),
    !!session,
  );
  if (!session) return <LoginPrompt />;
  const mark = async (id?: string) => {
    try {
      await request("notifications", {
        method: "PATCH",
        query: {
          user_id: `eq.${session.user.id}`,
          ...(id ? { id: `eq.${id}` } : { is_read: "eq.false" }),
        },
        body: { is_read: true },
        prefer: "return=minimal",
      });
      notifications.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="Votre vie locale"
        title="Les nouvelles pour vous"
        action={
          <button className="button secondary" onClick={() => void mark()}>
            <CheckCheck size={17} />
            Tout marquer comme lu
          </button>
        }
      />
      {notifications.loading ? (
        <Loading />
      ) : notifications.error ? (
        <Failure message={notifications.error} retry={notifications.reload} />
      ) : !notifications.data?.length ? (
        <Empty
          title="Vous êtes à jour"
          text="Les nouvelles liées à vos échanges et publications apparaîtront ici."
        />
      ) : (
        <div className="activity-list">
          {notifications.data.map((r) => (
            <article
              className={`activity ${r.is_read ? "" : "unread"}`}
              key={r.id}
            >
              <Bell size={22} />
              <div>
                <h3>{str(r, "title")}</h3>
                <p>{str(r, "message")}</p>
                <small>{formatDate(str(r, "created_at"))}</small>
              </div>
              {!!r.link && (
                <Link
                  className="text-button"
                  onClick={() => void mark(r.id)}
                  to={safeLocalPath(str(r, "link"))}
                >
                  Voir
                  <ArrowRight size={16} />
                </Link>
              )}
              {!r.is_read && (
                <button
                  className="icon-button"
                  aria-label="Marquer comme lu"
                  onClick={() => void mark(r.id)}
                >
                  <Check size={17} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {error && <Failure message={error} />}
    </>
  );
}

export function Favorites() {
  const { session } = useAuth();
  const favorites = useQuery(
    "favorites-" + session?.user.id,
    async (signal) => {
      const entries = await request<Row[]>("user_favorites", {
        query: {
          select: "id,target_type,target_id,target_user_id",
          user_id: `eq.${session?.user.id}`,
          order: "created_at.desc",
          limit: 100,
        },
        signal,
      });
      const groups = new Map<string, Row[]>();
      for (const entry of entries) {
        const m = MODULES.find((m) => m.context === entry.target_type);
        if (!m) continue;
        groups.set(m.slug, [...(groups.get(m.slug) || []), entry]);
      }
      const results = await Promise.all(
        [...groups].map(async ([slug, entries]) => {
          const m = moduleBySlug(slug)!;
          const ids = entries.map((r) => str(r, "target_id")).filter(Boolean);
          const rows = ids.length
            ? await request<Row[]>(m.table, {
                query: {
                  select: m.select,
                  id: `in.(${ids.join(",")})`,
                  limit: 100,
                },
                signal,
              })
            : [];
          return rows.map((row) => ({ module: m, row }));
        }),
      );
      return results.flat();
    },
    !!session,
  );
  if (!session) return <LoginPrompt />;
  return (
    <>
      <PageHeading
        eyebrow="À garder près de vous"
        title="Vos favoris"
        text="Les publications que vous souhaitez retrouver facilement."
      />
      {favorites.loading ? (
        <Loading />
      ) : favorites.error ? (
        <Failure message={favorites.error} retry={favorites.reload} />
      ) : favorites.data?.length ? (
        <div className="record-grid">
          {favorites.data.map(({ module, row }) => (
            <RecordCard module={module} row={row} key={module.slug + row.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="Gardez un peu de Biguglia de côté"
          text="Touchez le cœur d’une publication pour l’ajouter à vos favoris."
          action={
            <Link className="button secondary" to="/explorer">
              Explorer
            </Link>
          }
        />
      )}
    </>
  );
}
