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
  try {
    let body: unknown;
    let redirectPath = "/";
    const contentType = req.headers.get("content-type") ?? "";
    const isFormPost =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    if (isFormPost) {
      const form = await req.formData();
      redirectPath = String(form.get("redirectTo") ?? "/");
      body = {
        gameUrl: String(form.get("gameUrl") ?? ""),
        rating: Number(form.get("rating") ?? 0),
        body: String(form.get("body") ?? ""),
        authorName: String(form.get("authorName") ?? "").trim() || undefined,
      };
    } else {
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
      }
    }

    const parsed = ReviewInputSchema.safeParse(body);
    if (!parsed.success) {
      if (isFormPost) {
        return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin), 303);
      }
      return NextResponse.json(
        { ok: false, error: "Invalid review.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createReview(parsed.data, clientIp(req));
    if (!result.ok) {
      if (isFormPost) {
        return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin), 303);
      }
      const status = result.error.startsWith("Too many") ? 429 : 400;
      return NextResponse.json(result, { status });
    }
    if (isFormPost) {
      return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin), 303);
    }
    return NextResponse.json({ ok: true, data: result.review }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
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
