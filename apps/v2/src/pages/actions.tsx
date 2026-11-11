import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Check,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  apiUrl,
  authHeaders,
  errorText,
  request,
  str,
  timedFetch,
  type Row,
  safeUrl,
} from "../lib/client";
import { useQuery } from "../lib/hooks";
import { contentType, moduleTitle, type Module } from "../lib/modules";
import {
  Failure,
  Loading,
  LoginPrompt,
  Modal,
  Notice,
  Empty,
} from "../components/ui";

export function FavoriteButton({
  module: m,
  row,
}: {
  module: Module;
  row: Row;
}) {
  const { session } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const favorite = useQuery(
    `favorite-${m.context}-${row.id}-${session?.user.id}`,
    (signal) =>
      request<Row[]>("user_favorites", {
        query: {
          select: "id",
          user_id: `eq.${session?.user.id}`,
          target_type: `eq.${contentType(m)}`,
          target_id: `eq.${row.id}`,
          limit: 1,
        },
        signal,
      }),
    !!session,
  );
  const toggle = async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      if (favorite.data?.length)
        await request("user_favorites", {
          method: "DELETE",
          query: {
            id: `eq.${favorite.data[0].id}`,
            user_id: `eq.${session.user.id}`,
          },
          prefer: "return=minimal",
        });
      else
        await request("user_favorites", {
          method: "POST",
          body: {
            user_id: session.user.id,
            target_type: contentType(m),
            target_id: row.id,
          },
        });
      favorite.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {session ? (
        <button
          className={`icon-button ${favorite.data?.length ? "favorited" : ""}`}
          aria-label={
            favorite.data?.length
              ? "Retirer des favoris"
              : "Ajouter aux favoris"
          }
          disabled={busy || favorite.loading || !!favorite.error}
          onClick={() => void toggle()}
        >
          <Heart
            size={20}
            fill={favorite.data?.length ? "currentColor" : "none"}
          />
        </button>
      ) : (
        <Link
          className="icon-button"
          to="/connexion"
          aria-label="Se connecter pour enregistrer"
        >
          <Heart size={20} />
        </Link>
      )}
      {(error || favorite.error) && (
        <small role="alert">{error || favorite.error}</small>
      )}
    </div>
  );
}

export function ReportDialog({
  module: m,
  row,
  close,
}: {
  module: Module;
  row: Row;
  close: () => void;
}) {
  const { session } = useAuth();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || busy) return;
    setBusy(true);
    try {
      await request("reports", {
        method: "POST",
        body: {
          reporter_id: session.user.id,
          target_type:
            m.context === "general"
              ? m.slug === "forum"
                ? "post"
                : "other"
              : m.context,
          target_id: row.id,
          target_title: moduleTitle(m, row).slice(0, 200),
          reason,
          description: detail.trim() || null,
          status: "pending",
        },
      });
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Signaler une publication" onClose={close}>
      {!session ? (
        <LoginPrompt />
      ) : done ? (
        <Notice>Votre signalement a été transmis à la modération.</Notice>
      ) : (
        <form onSubmit={submit}>
          <label className="form-field">
            Motif
            <select
              value={reason}
              required
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Choisir…</option>
              <option value="spam">Publicité indésirable / spam</option>
              <option value="inappropriate">Contenu inapproprié</option>
              <option value="scam">Suspicion d’arnaque</option>
              <option value="harassment">Harcèlement</option>
              <option value="other">Autre problème</option>
            </select>
          </label>
          <label className="form-field">
            Précisions
            <textarea
              rows={4}
              maxLength={2000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </label>
          {error && <Failure message={error} />}
          <button className="button full" disabled={busy}>
            {busy ? "Envoi…" : "Transmettre le signalement"}
          </button>
        </form>
      )}
    </Modal>
  );
}

export function Comments({ module: m, row }: { module: Module; row: Row }) {
  const { session } = useAuth();
  const cfg = m.comment!;
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const comments = useQuery(`comments-${cfg.table}-${row.id}`, (signal) =>
    request<Row[]>(cfg.table, {
      query: {
        select: `id,${cfg.owner},${cfg.content},created_at`,
        [cfg.fk]: `eq.${row.id}`,
        order: "created_at.asc,id.asc",
        limit: 100,
      },
      signal,
    }),
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || busy || text.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      await request(cfg.table, {
        method: "POST",
        body: {
          [cfg.owner]: session.user.id,
          [cfg.fk]: row.id,
          [cfg.content]: text.trim(),
        },
      });
      setText("");
      comments.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="detail-section">
      <h2>La conversation</h2>
      {comments.loading ? (
        <Loading />
      ) : comments.error ? (
        <Failure message={comments.error} retry={comments.reload} />
      ) : (
        comments.data?.map((c) => (
          <div className="comment" key={c.id}>
            <div className="comment-avatar">B</div>
            <div>
              <strong>
                {str(c, cfg.owner) === session?.user.id
                  ? "Vous"
                  : "Un habitant"}
              </strong>
              <p>{str(c, cfg.content)}</p>
              <small>
                {new Date(str(c, "created_at")).toLocaleString("fr-FR")}
              </small>
            </div>
            {str(c, cfg.owner) === session?.user.id && (
              <button
                className="icon-button"
                aria-label="Supprimer mon commentaire"
                onClick={() =>
                  void (async () => {
                    try {
                      await request(cfg.table, {
                        method: "DELETE",
                        query: {
                          id: `eq.${c.id}`,
                          [cfg.owner]: `eq.${session.user.id}`,
                        },
                        prefer: "return=minimal",
                      });
                      comments.reload();
                    } catch (e) {
                      setError(errorText(e));
                    }
                  })()
                }
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))
      )}
      {session ? (
        <form className="comment-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="comment">
            Votre commentaire
          </label>
          <textarea
            id="comment"
            value={text}
            minLength={2}
            maxLength={3000}
            rows={3}
            placeholder="Partagez un message utile et bienveillant…"
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button className="button" disabled={busy || text.trim().length < 2}>
            <Send size={16} />
            Publier
          </button>
        </form>
      ) : (
        <p>
          <Link to="/connexion">Connectez-vous</Link> pour participer.
        </p>
      )}
      {error && <Failure message={error} />}
    </section>
  );
}

export function Participation({
  type,
  row,
  owner,
}: {
  type: "event" | "outing" | "help";
  row: Row;
  owner: string;
}) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const table =
      type === "event"
        ? "event_participants"
        : type === "outing"
          ? "outing_participants"
          : "help_request_participants",
    fk =
      type === "event"
        ? "event_id"
        : type === "outing"
          ? "outing_id"
          : "help_request_id",
    stateField = type === "help" ? "state" : "status";
  const registration = useQuery(
    `participation-${type}-${row.id}-${session?.user.id}`,
    (signal) =>
      request<Row[]>(table, {
        query: {
          select: `id,${stateField}`,
          user_id: `eq.${session?.user.id}`,
          [fk]: `eq.${row.id}`,
          limit: 1,
        },
        signal,
      }),
    !!session,
  );
  const current = registration.data?.[0];
  const registered =
    current &&
    !["annule", "annulee", "cancelled", "declined"].includes(
      str(current, stateField),
    );
  const closed =
    [
      "annule",
      "annulee",
      "annule",
      "complet",
      "complete",
      "terminee",
      "passe",
      "archive",
    ].includes(str(row, "status")) ||
    row.registration_open === false ||
    row.is_registration_open === false;
  const toggle = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const active = type === "help" ? "pending" : "inscrit";
      const status = registered
        ? type === "help"
          ? "declined"
          : "annule"
        : active;
      const result = await request<Row[]>(table, {
        method: current ? "PATCH" : "POST",
        query: current
          ? { id: `eq.${current.id}`, user_id: `eq.${session.user.id}` }
          : undefined,
        body: current
          ? { [stateField]: status }
          : {
              [fk]: row.id,
              user_id: session.user.id,
              [stateField]: status,
              ...(type === "help" ? { role: "helper" } : {}),
            },
      });
      if (!result[0]) throw new Error("L’inscription n’a pas été confirmée.");
      registration.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="participation">
      <CalendarCheck size={28} />
      <div>
        <h3>
          {registered
            ? "Votre participation est enregistrée"
            : type === "help"
              ? "Vous pouvez donner un coup de main ?"
              : "On se retrouve là-bas ?"}
        </h3>
        <p>
          {registered
            ? "Vous pouvez annuler votre participation depuis cette page."
            : closed
              ? "Les inscriptions sont fermées."
              : "Retrouvez votre inscription dans vos activités."}
        </p>
      </div>
      {session ? (
        <button
          className="button secondary"
          disabled={
            busy ||
            registration.loading ||
            !!registration.error ||
            owner === session.user.id ||
            (closed && !registered)
          }
          onClick={() => void toggle()}
        >
          {owner === session.user.id
            ? "Vous organisez"
            : busy
              ? "Un instant…"
              : registered
                ? "Me désinscrire"
                : closed
                  ? "Fermé"
                  : type === "help"
                    ? "Proposer mon aide"
                    : "Je participe"}
        </button>
      ) : (
        <Link className="button secondary" to="/connexion">
          Se connecter
        </Link>
      )}
      {(error || registration.error) && (
        <Failure message={error || registration.error} />
      )}
    </section>
  );
}

export function EquipmentRequest({ row }: { row: Row }) {
  const { session } = useAuth();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || busy) return;
    if (end < start) {
      setError("La date de retour doit suivre la date de début.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request("equipment_requests", {
        method: "POST",
        body: {
          equipment_id: row.id,
          requester_id: session.user.id,
          requested_start_date: start,
          requested_end_date: end,
          message: message.trim(),
          status: "en_attente",
        },
      });
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="detail-section">
      <h2>Demander ce matériel</h2>
      {done ? (
        <Notice>
          Votre demande est envoyée. Retrouvez son suivi dans « Mes activités ».
        </Notice>
      ) : !session ? (
        <LoginPrompt />
      ) : row.status !== "disponible" ? (
        <p>Ce matériel n’est pas disponible pour le moment.</p>
      ) : (
        <form onSubmit={submit} className="form-grid">
          <label className="form-field">
            Du
            <input
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="form-field">
            Au
            <input
              type="date"
              required
              min={start || new Date().toISOString().slice(0, 10)}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="form-field wide">
            Votre demande
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {error && <Failure message={error} />}
          <button className="button" disabled={busy}>
            {busy ? "Envoi…" : "Envoyer la demande"}
          </button>
        </form>
      )}
    </section>
  );
}

export function Photos({
  module: m,
  row,
  canEdit,
}: {
  module: Module;
  row: Row;
  canEdit: boolean;
}) {
  const { session } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cfg = m.photo!;
  const photos = useQuery(`photos-${m.table}-${row.id}`, async (signal) => {
    const records = await request<Row[]>(cfg.table, {
      query: { select: "id,url", [cfg.fk]: `eq.${row.id}`, limit: 12 },
      signal,
    });
    return Promise.all(
      records.map(async (photo) => {
        const url = str(photo, "url");
        if (url.startsWith("/api/service-requests/")) {
          const file = url.split("/").at(-1)!;
          const response = await timedFetch(
            `${apiUrl}/storage/v1/object/sign/service-quote-photos/requests/${row.id}/${encodeURIComponent(file)}`,
            {
              method: "POST",
              headers: { ...authHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ expiresIn: 300 }),
              signal,
            },
          );
          if (!response.ok)
            throw new Error(
              "Les photos privées ne sont pas accessibles à votre compte.",
            );
          const data = await response.json();
          return { ...photo, url: apiUrl + "/storage/v1" + data.signedURL };
        }
        return photo;
      }),
    );
  });
  const upload = async (files: FileList | null) => {
    if (!files || !session) return;
    setBusy(true);
    setError("");
    try {
      if (files.length + (photos.data?.length || 0) > 8)
        throw new Error("Vous pouvez joindre jusqu’à 8 photos.");
      for (const file of Array.from(files)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error(
            "Utilisez une image JPEG, PNG ou WebP de moins de 5 Mo.",
          );
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Conversion de l’image impossible.")),
            "image/jpeg",
            0.86,
          ),
        );
        const filename = crypto.randomUUID() + ".jpg";
        const isPrivate = m.table === "service_requests" && !!row.artisan_id;
        const bucket = isPrivate ? "service-quote-photos" : "photos";
        const path = isPrivate
          ? `requests/${row.id}/${filename}`
          : `${session.user.id}/${m.table}/${row.id}/${filename}`;
        const response = await timedFetch(
          `${apiUrl}/storage/v1/object/${bucket}/${path}`,
          {
            method: "POST",
            headers: {
              ...authHeaders(),
              "Content-Type": "image/jpeg",
              "x-upsert": "false",
            },
            body: blob,
          },
        );
        if (!response.ok)
          throw new Error("L’envoi de la photo n’a pas abouti.");
        const url = isPrivate
          ? `/api/service-requests/${row.id}/photos/${filename}`
          : `${apiUrl}/storage/v1/object/public/photos/${path}`;
        try {
          await request(cfg.table, {
            method: "POST",
            body: { [cfg.fk]: row.id, url },
          });
        } catch (e) {
          await timedFetch(`${apiUrl}/storage/v1/object/${bucket}`, {
            method: "DELETE",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ prefixes: [path] }),
          }).catch(() => {});
          throw e;
        }
      }
      photos.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="photos-section">
      {photos.loading ? (
        <Loading text="Chargement des photos…" />
      ) : photos.error ? (
        <Failure message={photos.error} retry={photos.reload} />
      ) : photos.data?.length ? (
        <div className="photo-grid">
          {photos.data.map((p) => (
            <a
              key={p.id}
              href={safeUrl(str(p, "url"))}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={safeUrl(str(p, "url"))}
                alt={`Photo de ${moduleTitle(m, row)}`}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      ) : null}
      {canEdit && (
        <label className={`upload-button ${busy ? "disabled" : ""}`}>
          <Upload size={17} />
          {busy ? "Envoi des photos…" : "Ajouter des photos"}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <Failure message={error} />}
    </section>
  );
}

export function Rating({ module: m, row }: { module: Module; row: Row }) {
  const { session } = useAuth();
  const [score, setScore] = useState("5");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ratings = useQuery(
    `ratings-${m.context}-${row.id}`,
    (signal) =>
      request<Row[]>("item_ratings", {
        query: {
          select: "id,user_id,rating,comment,created_at",
          target_type: `eq.${m.context}`,
          target_id: `eq.${row.id}`,
          limit: 30,
          order: "created_at.desc",
        },
        signal,
      }),
    m.context !== "general" && m.context !== "artisan",
  );
  if (m.context === "general" || m.context === "artisan") return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await request("item_ratings", {
        method: "POST",
        body: {
          user_id: session.user.id,
          author_id: row[m.owner],
          target_type: m.context,
          target_id: row.id,
          rating: Number(score),
          comment: text.trim(),
        },
        prefer: "resolution=merge-duplicates,return=representation",
        query: { on_conflict: "target_type,target_id,user_id" },
      });
      setDone(true);
      ratings.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="detail-section">
      <h2>Les avis des habitants</h2>
      {ratings.loading ? (
        <Loading />
      ) : ratings.error ? (
        <Failure message={ratings.error} retry={ratings.reload} />
      ) : !ratings.data?.length ? (
        <p>Pas encore d’avis pour cette publication.</p>
      ) : (
        ratings.data.map((r) => (
          <div className="review" key={r.id}>
            <span className="stars" aria-label={`${r.rating} sur 5`}>
              {"★".repeat(Number(r.rating))}
            </span>
            <p>{str(r, "comment")}</p>
          </div>
        ))
      )}
      {done ? (
        <Notice>Votre avis est enregistré.</Notice>
      ) : session && str(row, m.owner) !== session.user.id ? (
        <form className="review-form" onSubmit={submit}>
          <p>
            Un avis peut être déposé après un échange réel. L’éligibilité est
            vérifiée lors de l’enregistrement.
          </p>
          <label className="form-field">
            Votre note
            <select value={score} onChange={(e) => setScore(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Votre avis
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={3}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            {busy ? "Enregistrement…" : "Publier mon avis"}
          </button>
        </form>
      ) : null}
      {error && <Failure message={error} />}
    </section>
  );
}
