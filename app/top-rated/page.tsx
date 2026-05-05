import { games } from "@/lib/games";
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
import { GamesInfiniteGrid } from "@/components/GamesInfiniteGrid";

export const dynamic = "force-dynamic";

export default async function TopRatedPage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "top_rated";
  const effectiveSp: BrowseSearchParams = { ...sp, sort };
  const page = normalizePage(sp.page);
  const facets = getFacets();
  const selectedGenres = getSelectedGenres(sp.genre);
  const displayGenres = dedupeGenres(facets.genres);
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames(effectiveSp, aggMap);
  const gridKey = JSON.stringify({
    q: sp.q ?? "",
    sort,
    made_with: sp.made_with ?? "",
    has_portal: sp.has_portal ?? "",
    min_rating: sp.min_rating ?? "",
    genre: selectedGenres,
    page,
  });
  const initialItems = ranked.slice(0, page * PAGE_SIZE).map((item, index) => ({
    game: item.game,
    reviewCount: item.reviewCount,
    avgRating: item.avgRating,
    rank: index + 1,
  }));

  const randomGame = games[pickFeaturedIndex(JSON.stringify(sp), games.length)];
  const randomHref = randomGame ? `/games/${slugForGame(randomGame)}` : "/top-rated";

  return (
    <div className="page-stack">
      <BrowseControls
        action="/top-rated"
        resetHref="/top-rated"
        randomHref={randomHref}
        sp={effectiveSp}
        selectedGenres={selectedGenres}
        displayGenres={displayGenres}
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
