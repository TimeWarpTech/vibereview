import type { ReviewView } from "@/lib/reviews";
import { StarRating } from "./StarRating";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500">
        No reviews yet. Be the first.
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <StarRating value={r.rating} />
              <span className="text-sm font-medium">{r.authorName}</span>
            </div>
            <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
