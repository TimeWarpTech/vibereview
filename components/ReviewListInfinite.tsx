"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewView } from "@/lib/reviews";
import { StarRating } from "./StarRating";
import { XHandleLink } from "./XHandleLink";

type Props = {
  gameUrl: string;
  initialItems: ReviewView[];
  total: number;
  pageSize: number;
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}


export function ReviewListInfinite({ gameUrl, initialItems, total, pageSize }: Props) {
  const [items, setItems] = useState<ReviewView[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = items.length < total;

  useEffect(() => {
    setItems((current) => {
      const seen = new Set(current.map((r) => r.id));
      const merged = [...initialItems];
      const mergedIds = new Set(initialItems.map((r) => r.id));
      for (const r of current) {
        if (!mergedIds.has(r.id)) merged.push(r);
      }
      const changed =
        merged.length !== current.length ||
        merged.some((r, i) => r.id !== current[i]?.id) ||
        initialItems.some((r) => !seen.has(r.id));
      return changed ? merged : current;
    });
  }, [initialItems]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        gameUrl,
        skip: String(items.length),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/reviews?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      setItems((current) => {
        const seen = new Set(current.map((r) => r.id));
        const merged = [...current];
        for (const r of data.data as ReviewView[]) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        }
        return merged;
      });
    } finally {
      setIsLoading(false);
    }
  }, [gameUrl, hasMore, isLoading, items.length, pageSize]);

  useEffect(() => {
    if (!hasMore || isLoading || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  if (items.length === 0) {
    return <div className="review-card review-empty">No reviews yet. Be the first.</div>;
  }

  return (
    <>
      <ul className="review-list">
        {items.map((r) => (
          <li key={r.id} className="review-card">
            <div className="review-card__top">
              <div className="review-card__author">
                <StarRating value={r.rating} />
                <XHandleLink name={r.authorName} />
              </div>
              <span className="review-card__date">{formatDate(r.createdAt)}</span>
            </div>
            <p className="review-card__body whitespace-pre-wrap">{r.body}</p>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="infinite-sentinel">
        {hasMore ? (
          isLoading ? (
            "Loading more reviews..."
          ) : (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="arcade-button arcade-button--yellow"
            >
              Load More
            </button>
          )
        ) : (
          "End of reviews"
        )}
      </div>
    </>
  );
}
