import { games } from "@/lib/games";
import { getFacets, getMadeWithList } from "@/lib/facets";
import {
  buildRankedGames,
  dedupeGenres,
  getSelectedGenres,
  getSelectedMadeWith,
  normalizePage,
  PAGE_SIZE,
  pickFeaturedIndex,
  type BrowseSearchParams,
} from "@/lib/gameBrowse";
import { slugForGame } from "@/lib/slug";
import { safeAggregateByGame } from "@/lib/reviews";
import { BrowseControls } from "@/components/BrowseControls";
import { GamesInfiniteGrid } from "@/components/GamesInfiniteGrid";
import { RandomGamesStrip } from "@/components/RandomGamesStrip";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "top_rated";
  const effectiveSp: BrowseSearchParams = { ...sp, sort };
  const page = normalizePage(sp.page);
  const facets = getFacets();
  const madeWithOptions = getMadeWithList().map((o) => o.value);
  const selectedGenres = getSelectedGenres(sp.genre);
  const selectedMadeWith = getSelectedMadeWith(sp.made_with);
  const displayGenres = dedupeGenres(facets.genres);
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames(effectiveSp, aggMap);

  let totalReviews = 0;
  let reviewedGames = 0;
  let weightedRatingSum = 0;
  for (const agg of aggMap.values()) {
    if (agg.reviewCount <= 0) continue;
    totalReviews += agg.reviewCount;
    reviewedGames += 1;
    weightedRatingSum += agg.avgRating * agg.reviewCount;
  }
  const averageScore = totalReviews > 0 ? (weightedRatingSum / totalReviews).toFixed(1) : "0.0";

  const gridKey = JSON.stringify({
    q: sp.q ?? "",
    sort,
    made_with: selectedMadeWith,
    has_portal: sp.has_portal ?? "",
    min_rating: sp.min_rating ?? "",
    genre: selectedGenres,
    page,
  });
  const initialItems = ranked.slice(0, page * PAGE_SIZE).map((item) => ({
    game: item.game,
    reviewCount: item.reviewCount,
    avgRating: item.avgRating,
    rank: item.rank,
  }));

  const randomGame = games[pickFeaturedIndex(JSON.stringify(sp), games.length)];
  const randomHref = randomGame ? `/games/${slugForGame(randomGame)}` : "/";

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-title-row">
          <h1 className="pixel-heading">VIBEREVIEW</h1>
          <a
            href="https://vibej.am/2026/"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-jam-link"
          >
            ↗ VibeJam 2026
          </a>
        </div>
        <p className="hero-copy">
          Browse {games.length.toLocaleString()} vibe-coded games from <a href="https://vibej.am/2026/" target="_blank" rel="noopener noreferrer" className="hero-inline-link">VibeJam 2026</a>, track what players actually rated, and drop an anonymous review without ceremony.
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
              <span className="stat-chip__value">
                {totalReviews > 0 ? averageScore : totalReviews.toLocaleString()}
              </span>
              <span className="stat-chip__label">{totalReviews > 0 ? "avg score" : "reviews posted"}</span>
            </div>
          </div>
        </div>
      </section>

      <RandomGamesStrip count={8} />

      <BrowseControls
        action="/"
        resetHref="/"
        randomHref={randomHref}
        sp={effectiveSp}
        selectedGenres={selectedGenres}
        displayGenres={displayGenres}
        selectedMadeWith={selectedMadeWith}
        madeWithOptions={madeWithOptions}
        showMinRating
        defaultSort="top_rated"
      />

      <section>
        <header className="browse-header">
          <div>
            <h1>Top Rated</h1>
            <p>
              {ranked.length.toLocaleString()} match{ranked.length === 1 ? "" : "es"} - loaded {initialItems.length.toLocaleString()}
            </p>
          </div>
        </header>

        <GamesInfiniteGrid
          key={gridKey}
          initialItems={initialItems}
          total={ranked.length}
          initialPage={page}
          pageSize={PAGE_SIZE}
          showRank
        />
      </section>
    </div>
  );
}
