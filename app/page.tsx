import Link from "next/link";
import { games, type Game } from "@/lib/games";
import { getFacets } from "@/lib/facets";
import {
  buildRankedGames,
  dedupeGenres,
  getSelectedGenres,
  normalizePage,
  PAGE_SIZE,
  pickFeaturedIndex,
  type BrowseSearchParams,
} from "@/lib/gameBrowse";
import { slugForGame } from "@/lib/slug";
import { safeAggregateByGame } from "@/lib/reviews";
import { BrowseControls } from "@/components/BrowseControls";
import { GameCard } from "@/components/GameCard";
import { GamesInfiniteGrid } from "@/components/GamesInfiniteGrid";

export const dynamic = "force-dynamic";

type Ranked = { game: Game; reviewCount: number; avgRating: number; lastReviewedAt: Date | null };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>;
}) {
  const sp = await searchParams;
  const page = normalizePage(sp.page);
  const facets = getFacets();
  const selectedGenres = getSelectedGenres(sp.genre);
  const displayGenres = dedupeGenres(facets.genres);
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames(sp, aggMap);

  const allRanked: Ranked[] = games.map((g) => {
    const a = aggMap.get(g.game_url);
    return {
      game: g,
      reviewCount: a?.reviewCount ?? 0,
      avgRating: a?.avgRating ?? 0,
      lastReviewedAt: a?.lastReviewedAt ?? null,
    };
  });

  const totalReviews = allRanked.reduce((sum, item) => sum + item.reviewCount, 0);
  const reviewedGames = allRanked.filter((item) => item.reviewCount > 0).length;
  const averageScore =
    totalReviews > 0
      ? (
          allRanked.reduce((sum, item) => sum + item.avgRating * item.reviewCount, 0) / totalReviews
        ).toFixed(1)
      : "0.0";

  const topRated = [...allRanked]
    .filter((r) => r.reviewCount >= 1)
    .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
    .slice(0, 8);

  const topRailItems = topRated.length > 0 ? topRated : allRanked.slice(0, 8);

  const randomGame = games[pickFeaturedIndex(JSON.stringify(sp), games.length)];
  const randomHref = randomGame ? `/games/${slugForGame(randomGame)}` : "/";

  const gridKey = JSON.stringify({
    q: sp.q ?? "",
    sort: sp.sort ?? "newest",
    made_with: sp.made_with ?? "",
    has_portal: sp.has_portal ?? "",
    genre: selectedGenres,
    page,
  });
  const initialItems = ranked.slice(0, page * PAGE_SIZE).map((item) => ({
    game: item.game,
    reviewCount: item.reviewCount,
    avgRating: item.avgRating,
  }));

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <p className="section-kicker">vibereview arcade feed</p>
        <h1 className="pixel-heading">
          VIBEREVIEW
          <br />
          GAME GRID
        </h1>
        <p className="hero-copy">
          Browse {games.length.toLocaleString()} vibe-coded games, track what players actually rated, and drop an anonymous review without ceremony.
        </p>
        <div className="hero-status">
          <div className="status-banner">Reviews Online</div>
          <div className="chip-grid">
            <div className="stat-chip">
              <span className="stat-chip__value">{games.length.toLocaleString()}</span>
              <span className="stat-chip__label">games indexed</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip__value">{reviewedGames.toLocaleString()}</span>
              <span className="stat-chip__label">games reviewed</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip__value">{totalReviews > 0 ? averageScore : totalReviews.toLocaleString()}</span>
              <span className="stat-chip__label">{totalReviews > 0 ? "avg score" : "reviews posted"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rail">
        <header className="browse-header">
          <div>
            <h2 className="rail__heading">Top rated</h2>
            <p>
              {topRated.length > 0
                ? "The highest-scoring games right now."
                : "No reviews yet — be the first to rate a game."}
            </p>
          </div>
          <Link href="/top-rated" className="arcade-button arcade-button--yellow">
            See all top rated
          </Link>
        </header>
        {topRailItems.length > 0 ? (
          <div className="card-grid">
            {topRailItems.map((r, i) => (
              <GameCard
                key={r.game.game_url}
                game={r.game}
                reviewCount={r.reviewCount}
                avgRating={r.avgRating}
                rank={i + 1}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section id="all-games">
        <header className="browse-header">
          <div>
            <h2 className="section-title">All games</h2>
            <p>
              {ranked.length.toLocaleString()} match{ranked.length === 1 ? "" : "es"} - loaded {initialItems.length.toLocaleString()}
            </p>
          </div>
        </header>

        <BrowseControls
          action="/"
          resetHref="/"
          randomHref={randomHref}
          sp={sp}
          selectedGenres={selectedGenres}
          displayGenres={displayGenres}
        />

        <GamesInfiniteGrid
          key={gridKey}
          initialItems={initialItems}
          total={ranked.length}
          initialPage={page}
          pageSize={PAGE_SIZE}
        />
      </section>
    </div>
  );
}
