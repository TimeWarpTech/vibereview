import Link from "next/link";
import type { ReactNode } from "react";
import { games } from "@/lib/games";
import { getFacets } from "@/lib/facets";
import { slugForGame } from "@/lib/slug";
import {
  buildRankedGames,
  dedupeGenres,
  getSelectedGenres,
  MADE_WITH_OPTIONS,
  normalizePage,
  PAGE_SIZE,
  pickFeaturedIndex,
  SORT_OPTIONS,
  type BrowseSearchParams,
} from "@/lib/gameBrowse";
import { safeAggregateByGame } from "@/lib/reviews";
import { GenreMultiSelect } from "@/components/GenreMultiSelect";
import { GamesInfiniteGrid } from "@/components/GamesInfiniteGrid";

export const dynamic = "force-dynamic";

export default async function BrowsePage({ searchParams }: { searchParams: Promise<BrowseSearchParams> }) {
  const sp = await searchParams;
  const sort = sp.sort ?? "newest";
  const page = normalizePage(sp.page);
  const facets = getFacets();
  const selectedGenres = getSelectedGenres(sp.genre);
  const displayGenres = dedupeGenres(facets.genres);
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames(sp, aggMap);
  const randomGame = games[pickFeaturedIndex(JSON.stringify(sp), games.length)];
  const gridKey = JSON.stringify({
    q: sp.q ?? "",
    sort,
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
      <form method="get" className="games-controls">
        <div className="games-controls__search">
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search games, authors, pitches..."
            className="retro-input"
          />
        </div>

        <ControlRow label="Sort:">
          {SORT_OPTIONS.map((option) => (
            <ControlButton
              key={option.value}
              name="sort"
              value={option.value}
              currentValue={sort}
              label={option.label}
            />
          ))}
        </ControlRow>

        <ControlRow label="Made with:">
          {MADE_WITH_OPTIONS.map((option) => (
            <ControlButton
              key={option.value}
              name="made_with"
              value={option.value}
              currentValue={sp.made_with ?? ""}
              label={option.label}
            />
          ))}
        </ControlRow>

        <div className="filter-group">
          <GenreMultiSelect options={displayGenres} selected={selectedGenres} />
          <GenreCheckbox value="Yes" checked={sp.has_portal === "Yes"} label="Has Portal" name="has_portal" />
        </div>

        <div className="games-controls__actions">
          <button type="submit" className="arcade-button arcade-button--yellow">
            Apply
          </button>
          <Link href={randomGame ? `/games/${slugForGame(randomGame)}` : "/games"} className="arcade-button arcade-button--yellow">
            Random Game
          </Link>
          <Link href="/games" className="arcade-button">
            Reset
          </Link>
        </div>
      </form>

      <section>
        <header className="browse-header">
          <div>
            <h1>Browse Games</h1>
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
        />
      </section>
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sort-group">
      <label className="sort-label">{label}</label>
      <div className="sort-group__buttons">{children}</div>
    </div>
  );
}

function ControlButton({
  name,
  value,
  currentValue,
  label,
}: {
  name: string;
  value: string;
  currentValue: string;
  label: string;
}) {
  const isActive = currentValue === value;

  return (
    <label className={`sort-btn ${isActive ? "sort-btn--active" : ""}`}>
      <input type="radio" name={name} value={value} defaultChecked={isActive} className="sort-btn__input" />
      <span>{label}</span>
    </label>
  );
}

function GenreCheckbox({
  value,
  checked,
  label,
  name = "genre",
}: {
  value: string;
  checked: boolean;
  label: string;
  name?: string;
}) {
  return (
    <label className="retro-checkbox">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="retro-checkbox__input"
      />
      <span className="checkbox-mark" />
      {label.toUpperCase()}
    </label>
  );
}
