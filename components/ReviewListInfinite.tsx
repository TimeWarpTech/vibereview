"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groups = useMemo(() => {
    const map = new Map<string, ReviewView[]>();
    for (const r of items) {
      const arr = map.get(r.authorKey);
      if (arr) arr.push(r);
      else map.set(r.authorKey, [r]);
    }
    const list: { key: string; reviews: ReviewView[]; avg: number }[] = [];
    for (const [key, reviews] of map) {
      reviews.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      list.push({ key, reviews, avg: Math.round(avg * 10) / 10 });
    }
    list.sort(
      (a, b) =>
        +new Date(b.reviews[0]!.createdAt) - +new Date(a.reviews[0]!.createdAt),
    );
    return list;
  }, [items]);


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
        {groups.map(({ key, reviews, avg }) => {
          const newest = reviews[0]!;
          const isGroup = reviews.length > 1;
          const isOpen = expanded.has(key);
          const older = reviews.slice(1);
          return (
            <li key={key} className="review-card">
              <div className="review-card__top">
                <div className="review-card__author">
                  <StarRating value={avg} />
                  <XHandleLink name={newest.authorName} />
                  {newest.fpId ? (
                    <span className="review-card__fp" title="Device fingerprint id">
                      #{newest.fpId}
                    </span>
                  ) : null}
                  {isGroup ? (
                    <span
                      className="review-card__multi"
                      title={`Average across ${reviews.length} reviews from this author`}
                    >
                      avg {avg}★
                    </span>
                  ) : null}
                </div>
                <span className="review-card__date">{formatDate(newest.createdAt)}</span>
              </div>
              <p className="review-card__body whitespace-pre-wrap">{newest.body}</p>
              {isGroup ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className="review-card__expand"
                    aria-expanded={isOpen}
                  >
                    {isOpen
                      ? "Hide previous reviews"
                      : `Show ${older.length} previous review${older.length === 1 ? "" : "s"}`}
                  </button>
                  {isOpen ? (
                    <ul className="review-tree">
                      {older.map((r) => (
                        <li key={r.id} className="review-tree__item">
                          <div className="review-tree__head">
                            <StarRating value={r.rating} />
                            <span className="review-tree__date">{formatDate(r.createdAt)}</span>
                          </div>
                          <p className="review-tree__body whitespace-pre-wrap">{r.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
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
