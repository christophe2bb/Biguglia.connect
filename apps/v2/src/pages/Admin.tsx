import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldCheck, UserRound, X, ArrowRight } from "lucide-react";
import { useAuth, isStaff } from "../lib/auth";
import { request, rpc, str, errorText, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { MODULES, label } from "../lib/modules";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  PageHeading,
  Modal,
} from "../components/ui";
export default function Admin() {
  const { profile, session, profileError, reloadProfile } = useAuth();
  const [tab, setTab] = useState("reports");
  const [slug, setSlug] = useState("annonces");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [decision, setDecision] = useState<{ row: Row; action: string } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const m = MODULES.find((m) => m.slug === slug)!;
  const allowed = isStaff(profile);
  const data = useQuery(
    `admin-${tab}-${slug}-${session?.user.id}`,
    (signal) =>
      tab === "history"
        ? rpc<Row[]>("bc_v2_admin_history", {})
        : tab === "users"
          ? request<Row[]>("profiles", {
              query: {
                select: "id,full_name,email,role,status,created_at",
                order: "created_at.desc",
                limit: 100,
              },
              signal,
            })
          : tab === "reports"
            ? request<Row[]>("reports", {
                query: {
                  select:
                    "id,reporter_id,target_type,target_id,target_title,reason,description,status,created_at",
                  order: "created_at.desc",
                  limit: 100,
                },
                signal,
              })
            : tab === "artisans"
              ? request<Row[]>("artisan_profiles", {
                  query: {
                    select:
                      "id,user_id,business_name,description,is_verified,created_at",
                    is_verified: "eq.false",
                    order: "created_at.asc",
                    limit: 100,
                  },
                  signal,
                })
              : request<Row[]>(m.table, {
                  query: {
                    select: m.select,
                    order: "created_at.desc",
                    limit: 100,
                  },
                  signal,
                }),
    allowed,
  );
  if (!session) return <LoginPrompt />;
  if (!profile)
    return profileError ? (
      <Failure message={profileError} retry={reloadProfile} />
    ) : (
      <Loading />
    );
  if (!allowed)
    return (
      <Empty
        title="Cet espace est réservé à la modération"
        text="Votre compte ne dispose pas des droits nécessaires."
        action={
          <Link to="/" className="button">
            Retour à l’accueil
          </Link>
        }
      />
    );
  const update = async (
    table: string,
    id: string,
    body: Record<string, unknown>,
  ) => {
    setBusy(id);
    setError("");
    try {
      const result = await request<Row[]>(table, {
        method: "PATCH",
        query: { id: `eq.${id}` },
        body,
      });
      if (!result.length) throw new Error("L’action n’a pas été confirmée.");
      data.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };
  const applyDecision = async (event: FormEvent) => {
    event.preventDefault();
    if (!decision || busy) return;
    const target = decision.action.endsWith("_artisan")
      ? str(decision.row, "user_id")
      : decision.row.id;
    setBusy(decision.row.id);
    setError("");
    try {
      const result = await rpc<string>("bc_v2_admin_decision", {
        p_target: target,
        p_action: decision.action,
        p_reason: reason.trim() || null,
      });
      if (result !== target)
        throw new Error("La décision n’a pas été confirmée.");
      setDecision(null);
      setReason("");
      data.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="Espace de modération"
        title="Prenons soin de la communauté."
        text="Chaque décision protège les échanges et la confiance des habitants."
      />
      <div className="admin-role">
        <ShieldCheck size={20} />
        Connecté en tant que {str(profile, "full_name")} · {label(profile.role)}
      </div>
      <div className="tabs">
        {[
          ["reports", "Signalements"],
          ...(profile.role === "admin"
            ? [["artisans", "Artisans à vérifier"]]
            : []),
          ["content", "Publications"],
          ...(profile.role === "admin"
            ? [
                ["users", "Utilisateurs"],
                ["history", "Journal des décisions"],
              ]
            : []),
        ].map(([key, text]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {text}
          </button>
        ))}
      </div>
      {tab === "content" && (
        <div className="filters">
          <select
            aria-label="Rubrique à modérer"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {MODULES.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <Failure message={error} />}{" "}
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <Failure message={data.error} retry={data.reload} />
      ) : !data.data?.length ? (
        <Empty
          title="Tout est à jour"
          text="Aucun élément ne demande votre attention dans cette vue."
        />
      ) : tab === "history" ? (
        <div className="activity-list">
          {data.data.map((row) => (
            <article className="activity" key={row.id}>
              <div>
                <span className="badge neutral">{str(row, "action")}</span>
                <p>{str(row, "reason", "Décision de vérification")}</p>
                <small>
                  {new Date(str(row, "created_at")).toLocaleString("fr-FR")} ·{" "}
                  {str(row, "target_table")} · {str(row, "target_id")}
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>
                  {tab === "users"
                    ? "Utilisateur"
                    : tab === "artisans"
                      ? "Activité"
                      : "Publication / signalement"}
                </th>
                <th>Informations</th>
                <th>État</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>
                      {str(
                        row,
                        tab === "users"
                          ? "full_name"
                          : tab === "artisans"
                            ? "business_name"
                            : tab === "reports"
                              ? "target_title"
                              : m.titleField,
                        "Sans titre",
                      )}
                    </strong>
                    <small>
                      {tab === "users"
                        ? str(row, "email")
                        : new Date(str(row, "created_at")).toLocaleDateString(
                            "fr-FR",
                          )}
                    </small>
                  </td>
                  <td>
                    {tab === "reports" ? (
                      <>
                        <strong>{str(row, "reason")}</strong>
                        <p>{str(row, "description")}</p>
                      </>
                    ) : tab === "users" ? (
                      label(row.role)
                    ) : (
                      str(
                        row,
                        tab === "artisans" ? "description" : m.descriptionField,
                      ).slice(0, 180)
                    )}
                  </td>
                  <td>
                    <span className="badge neutral">
                      {tab === "artisans"
                        ? "En attente de vérification"
                        : label(row.status)}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {tab === "reports" ? (
                        <select
                          aria-label="État du signalement"
                          disabled={busy === row.id}
                          value={str(row, "status")}
                          onChange={(e) =>
                            void update("reports", row.id, {
                              status: e.target.value,
                            })
                          }
                        >
                          {[
                            ["pending", "En attente"],
                            ["reviewed", "Examiné"],
                            ["resolved", "Résolu"],
                            ["dismissed", "Classé"],
                          ].map(([v, l]) => (
                            <option value={v} key={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      ) : tab === "artisans" ? (
                        <>
                          <button
                            className="button small"
                            disabled={busy === row.id}
                            onClick={() => {
                              setReason("");
                              setDecision({ row, action: "approve_artisan" });
                            }}
                          >
                            <Check size={16} />
                            Valider
                          </button>
                          <button
                            className="button secondary small"
                            disabled={busy === row.id}
                            onClick={() => {
                              setReason("");
                              setDecision({ row, action: "refuse_artisan" });
                            }}
                          >
                            <X size={16} />À compléter
                          </button>
                        </>
                      ) : tab === "users" ? (
                        <select
                          aria-label="État du compte"
                          value={str(row, "status")}
                          disabled={
                            busy === row.id ||
                            row.id === session.user.id ||
                            ["admin", "moderator"].includes(str(row, "role"))
                          }
                          onChange={(e) => {
                            setReason("");
                            setDecision({
                              row,
                              action:
                                e.target.value === "active"
                                  ? "activate"
                                  : e.target.value === "suspended"
                                    ? "suspend"
                                    : "pending",
                            });
                          }}
                        >
                          <option value="active">Actif</option>
                          <option value="suspended">Suspendu</option>
                          <option value="pending">En attente</option>
                        </select>
                      ) : (
                        <>
                          <Link
                            className="text-button"
                            to={`/${m.slug}/${row.id}`}
                          >
                            Consulter
                            <ArrowRight size={16} />
                          </Link>
                          {m.statuses && (
                            <select
                              aria-label="État de la publication"
                              disabled={busy === row.id}
                              value={str(row, "status")}
                              onChange={(e) =>
                                void update(m.table, row.id, {
                                  status: e.target.value,
                                })
                              }
                            >
                              {m.statuses.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {decision && (
        <Modal
          title="Confirmer la décision"
          onClose={() => {
            if (!busy) setDecision(null);
          }}
        >
          <p>
            <strong>
              {str(
                decision.row,
                decision.action.endsWith("_artisan")
                  ? "business_name"
                  : "full_name",
              )}
            </strong>
          </p>
          <p>
            {
              (
                {
                  activate: "Réactiver ce compte",
                  suspend: "Suspendre ce compte",
                  pending: "Placer ce compte en attente",
                  approve_artisan: "Valider le dossier artisan",
                  refuse_artisan: "Demander de compléter le dossier artisan",
                } as Record<string, string>
              )[decision.action]
            }
          </p>
          <form onSubmit={(event) => void applyDecision(event)}>
            <label className="form-field">
              Motif{" "}
              {decision.action === "approve_artisan"
                ? "(facultatif)"
                : "(10 caractères minimum)"}
              <textarea
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={
                  decision.action === "approve_artisan" ? undefined : 10
                }
                maxLength={500}
                required={decision.action !== "approve_artisan"}
              />
            </label>
            <p>
              La décision sera enregistrée dans le journal et communiquée au
              membre concerné.
            </p>
            {error && <Failure message={error} />}
            <button
              className="button full"
              disabled={
                !!busy ||
                (decision.action !== "approve_artisan" &&
                  reason.trim().length < 10)
              }
            >
              {busy ? "Enregistrement…" : "Confirmer la décision"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
