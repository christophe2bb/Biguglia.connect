import { useAuth } from "../lib/auth";
import { request, str, type Row } from "../lib/client";
import { useQuery } from "../lib/hooks";
import { formatDate } from "../lib/format";
import { Failure, Loading } from "../components/ui";

export const reviewSelect =
  "id,artisan_id,reviewer_id,author_id,target_user_id,source_type,source_id,rating,comment,moderation_status,created_at";

export function ReviewCard({ row }: { row: Row }) {
  return (
    <article className="review">
      <span className="stars" aria-label={`${row.rating} sur 5`}>
        {"★".repeat(Number(row.rating))}
      </span>
      <p>{str(row, "comment")}</p>
      <small>
        {formatDate(str(row, "created_at"))}
        {row.moderation_status !== "visible" ? " · En cours de modération" : ""}
      </small>
    </article>
  );
}

export function VerifiedReviews({ artisanId }: { artisanId: string }) {
  const { session } = useAuth();
  const data = useQuery(
    `verified-reviews-${artisanId}-${session?.user.id || "public"}`,
    (signal) =>
      request<Row[]>("reviews", {
        query: {
          select: reviewSelect,
          artisan_id: `eq.${artisanId}`,
          source_type: "eq.service_request",
          moderation_status: "eq.visible",
          order: "created_at.desc,id.desc",
          limit: 30,
        },
        signal,
      }),
  );
  return (
    <section className="detail-section">
      <h2>Les avis après intervention</h2>
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <Failure message={data.error} retry={data.reload} />
      ) : data.data?.length ? (
        data.data.map((row) => <ReviewCard key={row.id} row={row} />)
      ) : (
        <p>Aucun avis vérifié après intervention pour le moment.</p>
      )}
    </section>
  );
}
