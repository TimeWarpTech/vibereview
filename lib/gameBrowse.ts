import { games, type Game } from "@/lib/games";
import type { GameAggregate } from "@/lib/reviews";

export type BrowseSearchParams = {
  genre?: string | string[];
  made_with?: string | string[];
  has_portal?: string;
  sort?: string;
  q?: string;
  page?: string;
  min_rating?: string;
};

export const MIN_RATING_OPTIONS = [
  { value: "", label: "Any" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "4.5", label: "4.5+" },
] as const;

export function parseMinRating(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 5) return 5;
  return n;
}

export type RankedGame = {
  game: Game;
  reviewCount: number;
  avgRating: number;
  lastReviewedAt: Date | null;
  rank?: number;
};

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_reviewed", label: "Most Reviewed" },
  { value: "top_rated", label: "Top Rated" },
] as const;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeGenreLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function pickFeaturedIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getSelectedGenres(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const values = Array.isArray(input) ? input : [input];
  return values
    .filter(Boolean)
    .map(normalizeGenreLabel)
    .filter((value) => normalizeText(value) !== "all");
}

export function getSelectedMadeWith(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const values = Array.isArray(input) ? input : [input];
  return values
    .map((v) => v.trim())
    .filter(Boolean);
}

function genreMatches(gameGenre: string, selectedGenres: string[]): boolean {
  if (selectedGenres.length === 0) return true;
  const parts = String(gameGenre ?? "")
    .split(",")
    .map(normalizeGenreLabel)
    .filter(Boolean);
  return selectedGenres.some((genre) => parts.includes(genre));
}

function madeWithMatches(gameMadeWith: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const norm = normalizeText(gameMadeWith);
  return selected.some((s) => norm.includes(normalizeText(s)));
}

function matchesFilters(
  g: Game,
  sp: BrowseSearchParams,
  selectedGenres: string[],
  selectedMadeWith: string[],
): boolean {
  if (!genreMatches(g.genre, selectedGenres)) return false;
  if (!madeWithMatches(g.made_with, selectedMadeWith)) return false;
  if (sp.has_portal === "Yes" && g.has_portal !== "Yes") return false;
  if (sp.q) {
    const q = sp.q.toLowerCase();
    if (!g.game_name.toLowerCase().includes(q) && !g.pitch.toLowerCase().includes(q) && !g.x_username.toLowerCase().includes(q)) {
      return false;
    }
  }
  return true;
}

function gameTimestamp(g: Game): number {
  const ts = Date.parse(g.timestamp);
  return Number.isNaN(ts) ? 0 : ts;
}

export function dedupeGenres(values: string[]): string[] {
  const map = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!map.has(normalized)) {
      map.set(normalized, normalizeGenreLabel(value));
    }
  }
  return Array.from(map.values());
}

export function normalizePage(value: string | undefined): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

// Top Rated: Bayesian average with a light prior so review volume acts as a
// tiebreaker between similar ratings (e.g. 4.8 with 10 reviews beats 5.0 with 2).
export const TOP_RATED_PRIOR_VOTES = 2;
export const TOP_RATED_PRIOR_MEAN = 4.0;

export function topRatedScore(reviewCount: number, avgRating: number): number {
  if (reviewCount <= 0) return 0;
  return (
    (reviewCount * avgRating + TOP_RATED_PRIOR_VOTES * TOP_RATED_PRIOR_MEAN) /
    (reviewCount + TOP_RATED_PRIOR_VOTES)
  );
}

function compareTopRated(
  a: { reviewCount: number; avgRating: number },
  b: { reviewCount: number; avgRating: number },
): number {
  return (
    topRatedScore(b.reviewCount, b.avgRating) - topRatedScore(a.reviewCount, a.avgRating) ||
    b.reviewCount - a.reviewCount ||
    b.avgRating - a.avgRating
  );
}

export function globalTopRatedRanks(aggMap: Map<string, GameAggregate>): Map<string, number> {
  const reviewed = games
    .map((g) => {
      const a = aggMap.get(g.game_url);
      return {
        url: g.game_url,
        reviewCount: a?.reviewCount ?? 0,
        avgRating: a?.avgRating ?? 0,
      };
    })
    .filter((r) => r.reviewCount > 0)
    .sort(compareTopRated);
  const out = new Map<string, number>();
  reviewed.forEach((r, i) => out.set(r.url, i + 1));
  return out;
}

export function buildRankedGames(sp: BrowseSearchParams, aggMap: Map<string, GameAggregate>): RankedGame[] {
  const selectedGenres = getSelectedGenres(sp.genre);
  const selectedMadeWith = getSelectedMadeWith(sp.made_with);
  const sort = sp.sort ?? "newest";
  const minRating = parseMinRating(sp.min_rating);
  const ranks = globalTopRatedRanks(aggMap);

  const ranked = games
    .filter((g) => matchesFilters(g, sp, selectedGenres, selectedMadeWith))
    .map((g) => {
      const a = aggMap.get(g.game_url);
      return {
        game: g,
        reviewCount: a?.reviewCount ?? 0,
        avgRating: a?.avgRating ?? 0,
        lastReviewedAt: a?.lastReviewedAt ?? null,
        rank: ranks.get(g.game_url),
      };
    })
    .filter((r) => (minRating > 0 ? r.reviewCount > 0 && r.avgRating >= minRating : true));

  ranked.sort((a, b) => {
    if (sort === "most_reviewed") {
      return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
    }
    if (sort === "top_rated") {
      return compareTopRated(a, b);
    }
    return gameTimestamp(b.game) - gameTimestamp(a.game);
  });

  return ranked;
}
