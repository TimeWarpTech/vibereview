import { games, type Game } from "@/lib/games";
import type { GameAggregate } from "@/lib/reviews";

export type BrowseSearchParams = {
  genre?: string | string[];
  made_with?: string;
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
};

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_reviewed", label: "Most Played 24h" },
  { value: "top_rated", label: "Most Played All Time" },
  { value: "portal", label: "Most Portal Transfers" },
  { value: "playtime", label: "Longest Playtime" },
] as const;

export const MADE_WITH_OPTIONS = [
  { value: "cursor", label: "Cursor" },
  { value: "bolt", label: "Bolt.new" },
  { value: "glif", label: "Glif" },
  { value: "tripo", label: "Tripo" },
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

function genreMatches(gameGenre: string, selectedGenres: string[]): boolean {
  if (selectedGenres.length === 0) return true;
  const parts = String(gameGenre ?? "")
    .split(",")
    .map(normalizeGenreLabel)
    .filter(Boolean);
  return selectedGenres.some((genre) => parts.includes(genre));
}

function madeWithMatches(gameMadeWith: string, selected: string): boolean {
  if (!selected) return true;
  return normalizeText(gameMadeWith).includes(selected);
}

function matchesFilters(g: Game, sp: BrowseSearchParams, selectedGenres: string[]): boolean {
  if (!genreMatches(g.genre, selectedGenres)) return false;
  if (!madeWithMatches(g.made_with, sp.made_with ?? "")) return false;
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

export function buildRankedGames(sp: BrowseSearchParams, aggMap: Map<string, GameAggregate>): RankedGame[] {
  const selectedGenres = getSelectedGenres(sp.genre);
  const sort = sp.sort ?? "newest";
  const minRating = parseMinRating(sp.min_rating);

  const ranked = games
    .filter((g) => matchesFilters(g, sp, selectedGenres))
    .map((g) => {
      const a = aggMap.get(g.game_url);
      return {
        game: g,
        reviewCount: a?.reviewCount ?? 0,
        avgRating: a?.avgRating ?? 0,
        lastReviewedAt: a?.lastReviewedAt ?? null,
      };
    })
    .filter((r) => (minRating > 0 ? r.reviewCount > 0 && r.avgRating >= minRating : true));

  ranked.sort((a, b) => {
    if (sort === "most_reviewed") {
      return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
    }
    if (sort === "top_rated") {
      return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount;
    }
    if (sort === "portal") {
      const aPortal = a.game.has_portal === "Yes" ? 1 : 0;
      const bPortal = b.game.has_portal === "Yes" ? 1 : 0;
      return bPortal - aPortal || b.reviewCount - a.reviewCount;
    }
    if (sort === "playtime") {
      return (b.game.no_loading_screens === "Yes" ? 1 : 0) - (a.game.no_loading_screens === "Yes" ? 1 : 0) || b.reviewCount - a.reviewCount;
    }
    return gameTimestamp(b.game) - gameTimestamp(a.game);
  });

  return ranked;
}
