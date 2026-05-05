import { NextRequest, NextResponse } from "next/server";
import { buildRankedGames, normalizePage, PAGE_SIZE, type BrowseSearchParams } from "@/lib/gameBrowse";
import { safeAggregateByGame } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const sp: BrowseSearchParams = {
    genre: params.getAll("genre"),
    made_with: params.get("made_with") ?? undefined,
    has_portal: params.get("has_portal") ?? undefined,
    sort: params.get("sort") ?? undefined,
    q: params.get("q") ?? undefined,
    page: params.get("page") ?? undefined,
  };
  const page = normalizePage(params.get("page") ?? undefined);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") ?? PAGE_SIZE), 1), 100);
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames(sp, aggMap);
  const start = (page - 1) * pageSize;
  const end = page * pageSize;

  return NextResponse.json({
    ok: true,
    data: ranked.slice(start, end),
    total: ranked.length,
    page,
    pageSize,
  });
}
