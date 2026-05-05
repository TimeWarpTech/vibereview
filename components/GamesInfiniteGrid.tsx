"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GameCard } from "@/components/GameCard";
import type { Game } from "@/lib/games";

type RankedGame = {
  game: Game;
  reviewCount: number;
  avgRating: number;
  rank?: number;
};

type Props = {
  initialItems: RankedGame[];
  total: number;
  initialPage: number;
  pageSize: number;
  showRank?: boolean;
};

export function GamesInfiniteGrid({ initialItems, total, initialPage, pageSize, showRank = false }: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMore = items.length < total;

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    return params;
  }, [searchParams]);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;

    const nextPage = page + 1;
    const params = new URLSearchParams(apiQuery.toString());
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    setIsLoading(true);
    try {
      const res = await fetch(`/api/games?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) return;

      setItems((current) => [...current, ...data.data]);
      setPage(nextPage);

      if (typeof window !== "undefined") {
        const nextUrlParams = new URLSearchParams(searchParams.toString());
        nextUrlParams.set("page", String(nextPage));
        window.history.replaceState({}, "", `${pathname}?${nextUrlParams.toString()}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiQuery, hasMore, isLoading, page, pageSize, pathname, searchParams]);

  useEffect(() => {
    if (!hasMore || isLoading || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: "800px 0px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadNextPage]);

  if (items.length === 0) {
    return <div className="neo-panel panel-note">No games match these filters.</div>;
  }

  return (
    <>
      <div className="card-grid">
        {items.map((r, i) => (
          <GameCard
            key={r.game.game_url}
            game={r.game}
            reviewCount={r.reviewCount}
            avgRating={r.avgRating}
            rank={showRank ? r.rank ?? i + 1 : undefined}
          />
        ))}
      </div>
      <div ref={loadMoreRef} className="infinite-sentinel">
        {hasMore ? (
          isLoading ? (
            "Loading more games..."
          ) : (
            <button
              type="button"
              onClick={() => void loadNextPage()}
              className="arcade-button arcade-button--yellow"
            >
              Load More
            </button>
          )
        ) : (
          "End of list"
        )}
      </div>
    </>
  );
}
