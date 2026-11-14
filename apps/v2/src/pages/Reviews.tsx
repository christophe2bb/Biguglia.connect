import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useAuth } from "../lib/auth";
import { request, rpc, errorText, str, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { ReviewCard, reviewSelect } from "./ReviewDisplay";
import {
  Empty,
  Failure,
  Loading,
  LoginPrompt,
  Notice,
  PageHeading,
} from "../components/ui";

function ReviewForm({ quote, onDone }: { quote: Row; onDone: () => void }) {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const payload = {
      p_request: quote.id,
      p_rating: Number(rating),
      p_comment: comment.trim(),
    };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() };
    const id = pending.current.id;
    try {
      if (
        (await rpc<string>("bc_v2_submit_service_review", {
          ...payload,
          p_id: id,
        })) !== id
      )
        throw new Error("L’enregistrement de votre avis n’a pas été confirmé.");
      pending.current = null;
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="review-form" onSubmit={(event) => void submit(event)}>
      <h3>{str(quote, "title")}</h3>
      <Link className="text-button" to={`/demandes/${quote.id}`}>
        Revoir l’intervention
      </Link>
      <label className="form-field">
        Votre note
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        Votre avis public
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={10}
          maxLength={2000}
          rows={3}
          required
        />
      </label>
      {error && <Failure message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Publication…" : "Publier mon avis"}
        <Star size={16} />
      </button>
    </form>
  );
}

export default function Reviews() {
  const { session } = useAuth();
  const [tab, setTab] = useState("pending");
  const [notice, setNotice] = useState("");
  const [params] = useSearchParams();
  const data = useQuery(
    `my-service-reviews-${session?.user.id}`,
    async (signal) => {
      const [quotes, proofs, reviews] = await Promise.all([
        request<Row[]>("service_requests", {
          query: {
            select: "id,title,artisan_id,status",
            resident_id: `eq.${session?.user.id}`,
            artisan_id: "not.is.null",
            status: "eq.completed",
            order: "created_at.desc,id.desc",
            limit: 100,
          },
          signal,
        }),
        request<Row[]>("trust_interactions", {
          query: {
            select:
              "id,source_id,requester_id,review_requester_done,completed_at",
            source_type: "eq.service_request",
            requester_id: `eq.${session?.user.id}`,
            status: "eq.done",
            review_unlocked: "eq.true",
            completed_at: `gte.${new Date(Date.now() - 30 * 86400000).toISOString()}`,
            order: "completed_at.desc",
            limit: 100,
          },
          signal,
        }),
        request<Row[]>("reviews", {
          query: {
            select: reviewSelect,
            or: `(author_id.eq.${session?.user.id},reviewer_id.eq.${session?.user.id},target_user_id.eq.${session?.user.id})`,
            order: "created_at.desc,id.desc",
            limit: 100,
          },
          signal,
        }),
      ]);
      const own = reviews.filter(
        (row) =>
          row.author_id === session?.user.id ||
          row.reviewer_id === session?.user.id,
      );
      const available = quotes.filter(
        (row) =>
          proofs.some(
            (proof) =>
              proof.source_id === row.id && !proof.review_requester_done,
          ) && !own.some((review) => review.artisan_id === row.artisan_id),
      );
      return {
        pending: available.sort(
          (a, b) =>
            Number(b.id === params.get("demande")) -
            Number(a.id === params.get("demande")),
        ),
        given: own,
        received: reviews.filter(
          (row) => row.target_user_id === session?.user.id,
        ),
      };
    },
    !!session,
  );
  if (!session) return <LoginPrompt />;
  return (
    <>
      <PageHeading
        eyebrow="Mon espace"
        title="Mes avis après intervention"
        text="Partagez votre expérience après un devis terminé. Un avis par habitant et artisan, pendant 30 jours après l’intervention."
      />
      <div className="tabs">
        {[
          ["pending", "À donner"],
          ["given", "Avis donnés"],
          ["received", "Avis reçus"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {title}
          </button>
        ))}
      </div>
      {notice && <Notice>{notice}</Notice>}
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <Failure message={data.error} retry={data.reload} />
      ) : tab === "pending" ? (
        data.data?.pending.length ? (
          <div className="panel">
            {data.data.pending.map((quote) => (
              <ReviewForm
                key={quote.id}
                quote={quote}
                onDone={() => {
                  setNotice(
                    "Votre avis est publié. Merci d’avoir partagé votre expérience.",
                  );
                  data.reload();
                }}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="Aucun avis à donner pour le moment"
            text="Les interventions terminées et éligibles apparaîtront ici. Vos avis déjà publiés sont dans l’onglet Avis donnés."
            action={
              <Link className="button secondary" to="/demandes?mes=1">
                Mes demandes et devis
              </Link>
            }
          />
        )
      ) : (tab === "given" ? data.data?.given : data.data?.received)?.length ? (
        <section className="panel">
          {(tab === "given" ? data.data!.given : data.data!.received).map(
            (row) => (
              <ReviewCard key={row.id} row={row} />
            ),
          )}
        </section>
      ) : (
        <Empty
          title={
            tab === "given"
              ? "Vous n’avez pas encore donné d’avis"
              : "Aucun avis reçu pour le moment"
          }
          text="Les avis liés à vos interventions apparaîtront dans cet espace."
        />
      )}
    </>
  );
}
