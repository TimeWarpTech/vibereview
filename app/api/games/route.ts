import { NextRequest, NextResponse } from "next/server";
import { games, type Game } from "@/lib/games";
import { slugForGame } from "@/lib/slug";
import { aggregateByGame, type GameAggregate } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sort = "most_reviewed" | "top_rated" | "recent";

const SORTS: ReadonlySet<Sort> = new Set(["most_reviewed", "top_rated", "recent"]);

const FILTERABLE = ["genre", "engine", "made_with", "multiplayer", "mobile_ready"] as const;
type FilterKey = (typeof FILTERABLE)[number];

const EMPTY_AGG: Omit<GameAggregate, "gameUrl"> = {
  reviewCount: 0,
  avgRating: 0,
  lastReviewedAt: null,
};

export type GameListItem = Game & {
  slug: string;
  reviewCount: number;
  avgRating: number;
  lastReviewedAt: string | null;
};

function matches(game: Game, filters: Partial<Record<FilterKey, string>>): boolean {
  for (const key of FILTERABLE) {
    const wanted = filters[key];
    if (!wanted) continue;
    const value = String(game[key] ?? "").toLowerCase();
    if (key === "genre") {
      if (!value.includes(wanted.toLowerCase())) return false;
    } else if (value !== wanted.toLowerCase()) {
      return false;
    }
  }
  return true;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const sortRaw = params.get("sort") ?? "most_reviewed";
  const sort: Sort = SORTS.has(sortRaw as Sort) ? (sortRaw as Sort) : "most_reviewed";
  const limit = Math.min(Number(params.get("limit") ?? 60), 200);
  const skip = Math.max(Number(params.get("skip") ?? 0), 0);

  const filters: Partial<Record<FilterKey, string>> = {};
  for (const key of FILTERABLE) {
    const v = params.get(key);
    if (v) filters[key] = v;
  }

  let aggMap: Map<string, GameAggregate>;
  try {
    aggMap = await aggregateByGame();
  } catch {
    aggMap = new Map();
  }

  const items: GameListItem[] = games
    .filter((g) => matches(g, filters))
    .map((g) => {
      const agg = aggMap.get(g.game_url) ?? { ...EMPTY_AGG, gameUrl: g.game_url };
      return {
        ...g,
        slug: slugForGame(g),
        reviewCount: agg.reviewCount,
        avgRating: agg.avgRating,
        lastReviewedAt: agg.lastReviewedAt ? agg.lastReviewedAt.toISOString() : null,
      };
    });

  items.sort((a, b) => {
    if (sort === "top_rated") {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.reviewCount - a.reviewCount;
    }
    if (sort === "recent") {
      const ax = a.lastReviewedAt ? Date.parse(a.lastReviewedAt) : 0;
      const bx = b.lastReviewedAt ? Date.parse(b.lastReviewedAt) : 0;
      return bx - ax;
    }
    if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
    return b.avgRating - a.avgRating;
  });

  return NextResponse.json({
    ok: true,
    data: items.slice(skip, skip + limit),
    total: items.length,
  });
}
