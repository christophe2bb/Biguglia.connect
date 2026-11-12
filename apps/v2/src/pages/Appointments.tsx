import { useRef, useState, type FormEvent } from "react";
import { CalendarCheck, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/auth";
import { request, rpc, str, errorText, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { formatDate } from "../lib/format";
import { Empty, Failure, Loading, Modal, Notice } from "../components/ui";

const appointmentSelect =
  "id,request_id,resident_id,artisan_id,proposed_by,proposed_date,proposed_time,duration_minutes,notes,status,created_at";
const stateLabels: Record<string, string> = {
  pending: "Date proposée",
  accepted: "Rendez-vous confirmé",
  declined: "Proposition refusée",
  cancelled: "Rendez-vous annulé",
  completed: "Intervention terminée",
  rescheduled: "Date à revoir",
};
function todayInCorsica() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join("-");
}

export function Appointments({
  row,
  onChange,
}: {
  row: Row;
  onChange: () => void;
}) {
  const { session, profile } = useAuth();
  const [form, setForm] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<{
    appointment: Row;
    action: string;
  } | null>(null);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const data = useQuery(
    `appointments-${row.id}-${session?.user.id}`,
    async (signal) => {
      const [appointments, artisans] = await Promise.all([
        request<Row[]>("appointments", {
          query: {
            select: appointmentSelect,
            request_id: `eq.${row.id}`,
            order: "created_at.desc,id.desc",
            limit: 50,
          },
          signal,
        }),
        request<Row[]>("artisan_profiles", {
          query: {
            select: "id,user_id,business_name,is_verified",
            id: `eq.${row.artisan_id}`,
            limit: 1,
          },
          signal,
        }),
      ]);
      return { appointments, artisan: artisans[0] };
    },
    !!session && !!row.artisan_id,
  );
  if (!session || !row.artisan_id) return null;
  const resident = row.resident_id === session.user.id;
  const artisan = data.data?.artisan?.user_id === session.user.id;
  const party = resident || artisan;
  const closed = ["completed", "cancelled"].includes(str(row, "status"));
  const active = data.data?.appointments.some((a) =>
    ["pending", "accepted"].includes(str(a, "status")),
  );
  const canPropose =
    party &&
    !closed &&
    !active &&
    profile?.status === "active" &&
    profile.is_active !== false &&
    data.data?.artisan?.is_verified === true;
  const propose = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canPropose) return;
    setBusy("proposal");
    setError("");
    setNotice("");
    const payload = {
      p_request: row.id,
      p_date: date,
      p_time: time,
      p_duration_minutes: Number(duration),
      p_notes: notes.trim() || null,
    };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() };
    const id = pending.current.id;
    try {
      const result = await rpc<string>("bc_v2_propose_appointment", {
        ...payload,
        p_id: id,
      });
      if (result !== id)
        throw new Error("La proposition n’a pas été confirmée.");
      pending.current = null;
      setForm(false);
      setDate("");
      setTime("");
      setNotes("");
      setNotice(
        "Votre proposition est enregistrée. Votre correspondant peut l’accepter ou la refuser.",
      );
      data.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };
  const act = async (event: FormEvent) => {
    event.preventDefault();
    if (!decision || busy) return;
    setBusy(decision.appointment.id);
    setError("");
    setNotice("");
    try {
      const result = await rpc<string>("bc_v2_appointment_action", {
        p_id: decision.appointment.id,
        p_action: decision.action,
      });
      if (result !== decision.appointment.id)
        throw new Error("La décision n’a pas été confirmée.");
      setDecision(null);
      data.reload();
      onChange();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };
  const openDecision = (appointment: Row, action: string) => {
    setError("");
    setDecision({ appointment, action });
  };
  return (
    <section className="detail-section">
      <div className="section-heading">
        <div>
          <h2>Le rendez-vous du devis</h2>
          <p>
            Heure de Corse · Europe/Paris. Une proposition devient un
            rendez-vous lorsque votre correspondant l’accepte.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Actualiser les rendez-vous"
          disabled={data.loading || !!busy}
          onClick={data.reload}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {notice && <Notice>{notice}</Notice>}
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <Failure message={data.error} retry={data.reload} />
      ) : (
        <>
          {!data.data?.appointments.length ? (
            <Empty
              title="Convenez d’une date ensemble"
              text="Vous pouvez proposer une date et une durée pour cette intervention."
            />
          ) : (
            <div className="activity-list">
              {data.data.appointments.map((appointment) => {
                const status = str(appointment, "status");
                const ownProposal = appointment.proposed_by === session.user.id;
                const canDecide =
                  party &&
                  !closed &&
                  status === "pending" &&
                  !!appointment.proposed_by &&
                  !ownProposal;
                return (
                  <article className="activity" key={appointment.id}>
                    <CalendarCheck size={24} />
                    <div>
                      <span className="badge sage">
                        {stateLabels[status] || status}
                      </span>
                      <h3>
                        {formatDate(str(appointment, "proposed_date"))} à{" "}
                        {str(appointment, "proposed_time").slice(0, 5)}
                      </h3>
                      <p>
                        {str(appointment, "duration_minutes")} minutes ·{" "}
                        {ownProposal
                          ? "Votre proposition"
                          : appointment.proposed_by === row.resident_id
                            ? "Proposition du résident"
                            : "Proposition de l’artisan"}
                      </p>
                      {!!appointment.notes && (
                        <p>{str(appointment, "notes")}</p>
                      )}
                      {status === "pending" && ownProposal && (
                        <small>
                          En attente de la réponse de votre correspondant.
                        </small>
                      )}
                    </div>
                    <div className="activity-actions">
                      {canDecide && (
                        <>
                          <button
                            className="button"
                            disabled={!!busy}
                            onClick={() => openDecision(appointment, "accept")}
                          >
                            Accepter cette date
                          </button>
                          <button
                            className="button secondary"
                            disabled={!!busy}
                            onClick={() => openDecision(appointment, "decline")}
                          >
                            Refuser cette date
                          </button>
                        </>
                      )}
                      {party &&
                        !closed &&
                        ["pending", "accepted"].includes(status) && (
                          <button
                            className="text-button danger"
                            disabled={!!busy}
                            onClick={() => openDecision(appointment, "cancel")}
                          >
                            Annuler ce rendez-vous
                          </button>
                        )}
                      {resident && !closed && status === "accepted" && (
                        <button
                          className="button"
                          disabled={!!busy}
                          onClick={() => openDecision(appointment, "complete")}
                        >
                          Intervention terminée
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {canPropose && !form && (
            <button
              className="button secondary"
              onClick={() => {
                setError("");
                setForm(true);
              }}
            >
              <Plus size={18} />
              Proposer une date
            </button>
          )}
          {canPropose && form && (
            <form
              className="form-grid"
              onSubmit={(event) => void propose(event)}
            >
              <label className="form-field">
                Date proposée
                <input
                  type="date"
                  min={todayInCorsica()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                Heure proposée
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                Durée estimée
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  {[30, 60, 90, 120, 180, 240, 480].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field wide">
                Précisions (facultatif)
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
              <div className="form-actions wide">
                <button className="button" disabled={!!busy}>
                  {busy ? "Enregistrement…" : "Envoyer la proposition"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => setForm(false)}
                >
                  Fermer
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {error && !decision && <Failure message={error} />}
      {decision && (
        <Modal
          title={
            decision.action === "complete"
              ? "Confirmer la fin de l’intervention"
              : "Confirmer votre choix"
          }
          onClose={() => {
            if (!busy) setDecision(null);
          }}
        >
          <form onSubmit={(event) => void act(event)}>
            <p>
              {
                (
                  {
                    accept: "Accepter ce rendez-vous et programmer le devis ?",
                    decline:
                      "Refuser cette date ? Vous pourrez en proposer une autre.",
                    cancel: "Annuler ce rendez-vous ? Le devis restera ouvert.",
                    complete:
                      "Confirmer que l’intervention est terminée ? Le devis sera clôturé et vous pourrez donner votre avis.",
                  } as Record<string, string>
                )[decision.action]
              }
            </p>
            <p>
              <strong>
                {formatDate(str(decision.appointment, "proposed_date"))} à{" "}
                {str(decision.appointment, "proposed_time").slice(0, 5)}
              </strong>
            </p>
            {error && <Failure message={error} />}
            <button className="button full" disabled={!!busy}>
              {busy ? "Enregistrement…" : "Confirmer"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
