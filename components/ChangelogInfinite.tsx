"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangelogEntry, ChangelogKind } from "@/lib/changelog";

type Props = {
  entries: ChangelogEntry[];
  pageSize: number;
};

const kindLabel: Record<ChangelogKind, string> = {
  fix: "hotfix",
  feature: "feature",
  tweak: "tweak",
};

export function ChangelogInfinite({ entries, pageSize }: Props) {
  const [visibleCount, setVisibleCount] = useState(Math.min(pageSize, entries.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < entries.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + pageSize, entries.length));
  }, [entries.length, pageSize]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const visible = entries.slice(0, visibleCount);

  return (
    <>
      <ul className="changelog-list">
        {visible.map((entry, i) => (
          <li key={`${entry.date}-${i}`} className="changelog-item">
            <div className="changelog-item__meta">
              <span className={`changelog-tag changelog-tag--${entry.kind}`}>
                {kindLabel[entry.kind]}
              </span>
              <time className="changelog-date" dateTime={entry.date}>
                {entry.date}
              </time>
            </div>
            <h2 className="changelog-title">{entry.title}</h2>
            <p className="changelog-body">{entry.body}</p>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="infinite-sentinel">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="arcade-button arcade-button--yellow"
          >
            Load More
          </button>
        ) : (
          "End of changelog"
        )}
      </div>
    </>
  );
}
