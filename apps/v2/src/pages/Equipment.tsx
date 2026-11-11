import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errorText, request, rpc, str, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { label } from "../lib/modules";
import { Empty, Failure, Loading, LoginPrompt } from "../components/ui";
import { formatDate } from "../lib/format";

const SELECT_REQUEST =
  "id,equipment_id,requester_id,message,requested_start_date,requested_end_date,status";
const SELECT_LOAN =
  "id,equipment_id,request_id,owner_id,borrower_id,status,reserved_at,loan_started_at,returned_at";

export function LoanActivity({
  equipmentId,
  onChange,
}: {
  equipmentId?: string;
  onChange?: () => void;
}) {
  const { session } = useAuth();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const data = useQuery(
    `equipment-activity-${equipmentId || "all"}-${session?.user.id}`,
    async (signal) => {
      const owned = equipmentId
        ? []
        : await request<Row[]>("equipment_items", {
            query: {
              select: "id",
              owner_id: `eq.${session?.user.id}`,
              limit: 100,
            },
            signal,
          });
      const query = equipmentId
        ? { equipment_id: `eq.${equipmentId}` }
        : {
            or: `(requester_id.eq.${session?.user.id}${owned.length ? ",equipment_id.in.(" + owned.map((r) => r.id).join(",") + ")" : ""})`,
          };
      const [requests, loans] = await Promise.all([
        request<Row[]>("equipment_requests", {
          query: {
            ...query,
            select: SELECT_REQUEST,
            order: "created_at.desc,id.desc",
            limit: 100,
          },
          signal,
        }),
        request<Row[]>("equipment_loans", {
          query: {
            ...(equipmentId
              ? { equipment_id: `eq.${equipmentId}` }
              : {
                  or: `(owner_id.eq.${session?.user.id},borrower_id.eq.${session?.user.id})`,
                }),
            select: SELECT_LOAN,
            order: "created_at.desc,id.desc",
            limit: 100,
          },
          signal,
        }),
      ]);
      const ids = [...new Set(requests.map((r) => str(r, "equipment_id")))];
      const items = ids.length
        ? await request<Row[]>("equipment_items", {
            query: {
              select: "id,title,owner_id,status",
              id: `in.(${ids.join(",")})`,
              limit: 100,
            },
            signal,
          })
        : [];
      const members = [
        ...new Set([
          ...requests.map((r) => str(r, "requester_id")),
          ...items.map((r) => str(r, "owner_id")),
          ...loans.flatMap((r) => [str(r, "owner_id"), str(r, "borrower_id")]),
        ]),
      ].filter(Boolean);
      const people = members.length
        ? await request<Row[]>("profiles", {
            query: {
              select: "id,full_name",
              id: `in.(${members.join(",")})`,
              limit: 100,
            },
            signal,
          })
        : [];
      return { requests, loans, items, people };
    },
    !!session,
  );
  const act = async (id: string, action: string) => {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      const result = await rpc<string>("bc_v2_equipment_action", {
        p_request: id,
        p_action: action,
      });
      if (result !== id) throw new Error("L’opération n’a pas été confirmée.");
      data.reload();
      onChange?.();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };
  if (!session) return <LoginPrompt />;
  return (
    <section className="detail-section">
      <h2>Suivi des prêts et demandes</h2>
      <p>
        La réservation, la remise et le retour sont confirmés par le
        propriétaire. Le matériel redevient disponible après le retour.
      </p>
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <Failure message={data.error} retry={data.reload} />
      ) : !data.data?.requests.length ? (
        <Empty
          title="Aucune demande pour le moment"
          text="Les demandes reçues et vos emprunts apparaîtront ici."
          action={
            !equipmentId && (
              <Link className="button secondary" to="/materiel">
                Trouver du matériel
              </Link>
            )
          }
        />
      ) : (
        <div className="activity-list">
          {data.data.requests.map((row) => {
            const item = data.data!.items.find(
              (r) => r.id === row.equipment_id,
            );
            const own = item?.owner_id === session.user.id;
            const loan = data.data!.loans.find((r) => r.request_id === row.id);
            const counterpart = own ? row.requester_id : item?.owner_id;
            const name = str(
              data.data!.people.find((r) => r.id === counterpart),
              "full_name",
              "Membre de Biguglia Connect",
            );
            const loanStatus =
              loan?.status === "reserve"
                ? "Réservé"
                : loan?.status === "en_cours"
                  ? "Prêt en cours"
                  : loan?.status === "retourne"
                    ? "Retour confirmé"
                    : label(row.status);
            const button = (
              action: string,
              text: string,
              secondary = false,
            ) => (
              <button
                key={action}
                className={`button${secondary ? " secondary" : ""}`}
                disabled={!!busy}
                onClick={() => void act(row.id, action)}
              >
                {busy === row.id ? "Confirmation…" : text}
              </button>
            );
            return (
              <article className="activity" key={row.id}>
                <div>
                  <span className="badge sage">{loanStatus}</span>
                  <h3>
                    <Link to={`/materiel/${row.equipment_id}`}>
                      {str(item, "title", "Matériel")}
                    </Link>
                  </h3>
                  <p>
                    {own ? "Demandé par" : "Proposé par"}{" "}
                    <strong>{name}</strong>
                  </p>
                  <p>{str(row, "message")}</p>
                  <small>
                    Du {formatDate(str(row, "requested_start_date"))} au{" "}
                    {formatDate(str(row, "requested_end_date"))}
                  </small>
                  {loan?.loan_started_at != null && (
                    <p>
                      <small>
                        Remis le {formatDate(str(loan, "loan_started_at"))}
                        {loan.returned_at != null &&
                          ` · Rendu le ${formatDate(str(loan, "returned_at"))}`}
                      </small>
                    </p>
                  )}
                </div>
                <div className="activity-actions">
                  {row.status === "en_attente" &&
                    (own ? (
                      <>
                        {button("accept", "Accepter et réserver")}
                        {button("refuse", "Refuser", true)}
                      </>
                    ) : (
                      button("cancel", "Annuler ma demande", true)
                    ))}
                  {own &&
                    row.status === "acceptee" &&
                    loan?.status === "reserve" &&
                    button("handover", "Confirmer la remise")}
                  {own &&
                    row.status === "acceptee" &&
                    loan?.status === "en_cours" &&
                    button("return", "Confirmer le retour")}
                  {row.status === "acceptee" && !loan && (
                    <p role="status">
                      Le prêt associé est introuvable. Contactez l’assistance
                      avant de poursuivre.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {error && <Failure message={error} />}
      {data.data && data.data.requests.length === 100 && (
        <p>
          Les 100 demandes les plus récentes sont affichées. Ouvrez la fiche
          d’un matériel pour cibler son suivi.
        </p>
      )}
    </section>
  );
}
