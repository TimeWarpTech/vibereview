import type { ReviewView } from "@/lib/reviews";
import { StarRating } from "./StarRating";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  if (reviews.length === 0) {
    return (
      <div className="review-card review-empty">
        No reviews yet. Be the first.
      </div>
    );
  }

  return (
    <ul className="review-list">
      {reviews.map((r) => (
        <li key={r.id} className="review-card">
          <div className="review-card__top">
            <div className="review-card__author">
              <StarRating value={r.rating} />
              <span>{r.authorName}</span>
            </div>
            <span className="review-card__date">{formatDate(r.createdAt)}</span>
          </div>
          <p className="review-card__body whitespace-pre-wrap">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
