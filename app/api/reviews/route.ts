import { NextRequest, NextResponse } from "next/server";
import { ReviewInputSchema, createReview, listReviewsForGame } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ReviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid review.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createReview(parsed.data, clientIp(req));
  if (!result.ok) {
    const status = result.error.startsWith("Too many") ? 429 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true, data: result.review }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const gameUrl = req.nextUrl.searchParams.get("gameUrl");
  if (!gameUrl) {
    return NextResponse.json({ ok: false, error: "gameUrl is required." }, { status: 400 });
  }
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 100);
  const skip = Math.max(Number(req.nextUrl.searchParams.get("skip") ?? 0), 0);

  const reviews = await listReviewsForGame(gameUrl, { limit, skip });
  return NextResponse.json({ ok: true, data: reviews });
}
