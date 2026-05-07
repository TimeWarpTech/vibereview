import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ReviewInputSchema,
  createReview,
  listReviewsForGame,
  countReviewsForGame,
} from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ID_COOKIE = "vr_uid";
const CLIENT_ID_MAX_AGE = 60 * 60 * 24 * 365;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

function fingerprintFromHeaders(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const chUa = req.headers.get("sec-ch-ua") ?? "";
  const chPlat = req.headers.get("sec-ch-ua-platform") ?? "";
  const chMobile = req.headers.get("sec-ch-ua-mobile") ?? "";
  return [ua, lang, chUa, chPlat, chMobile].join("|");
}

function getOrCreateClientId(req: NextRequest): { clientId: string; isNew: boolean } {
  const existing = req.cookies.get(CLIENT_ID_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{8,}$/i.test(existing)) {
    return { clientId: existing, isNew: false };
  }
  return { clientId: randomUUID(), isNew: true };
}

function attachClientCookie(res: NextResponse, clientId: string) {
  res.cookies.set(CLIENT_ID_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_ID_MAX_AGE,
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    let redirectPath = "/";
    const contentType = req.headers.get("content-type") ?? "";
    const isFormPost =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let clientFingerprint: string | undefined;
    if (isFormPost) {
      const form = await req.formData();
      redirectPath = String(form.get("redirectTo") ?? "/");
      const fp = String(form.get("clientFingerprint") ?? "").trim();
      if (fp) clientFingerprint = fp;
      body = {
        gameUrl: String(form.get("gameUrl") ?? ""),
        rating: Number(form.get("rating") ?? 0),
        body: String(form.get("body") ?? ""),
        authorName: String(form.get("authorName") ?? "").trim() || undefined,
      };
    } else {
      try {
        const json = (await req.json()) as Record<string, unknown>;
        if (typeof json.clientFingerprint === "string" && json.clientFingerprint.trim()) {
          clientFingerprint = json.clientFingerprint.trim();
        }
        body = json;
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

    const { clientId, isNew } = getOrCreateClientId(req);
    const headerFp = fingerprintFromHeaders(req);
    const fingerprint = clientFingerprint
      ? `${clientFingerprint}#${headerFp}`
      : headerFp;
    const result = await createReview(parsed.data, {
      ip: clientIp(req),
      clientId,
      fingerprint,
    });

    if (!result.ok) {
      if (isFormPost) {
        const res = NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin), 303);
        if (isNew) attachClientCookie(res, clientId);
        return res;
      }
      const status = result.error.startsWith("You have already") ? 429 : 400;
      const res = NextResponse.json(
        {
          ok: false,
          error: result.error,
          ...(result.nextAllowedAt ? { nextAllowedAt: result.nextAllowedAt.toISOString() } : {}),
        },
        { status },
      );
      if (isNew) attachClientCookie(res, clientId);
      return res;
    }
    if (isFormPost) {
      const res = NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin), 303);
      if (isNew) attachClientCookie(res, clientId);
      return res;
    }
    const res = NextResponse.json({ ok: true, data: result.review }, { status: 201 });
    if (isNew) attachClientCookie(res, clientId);
    return res;
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

  const [reviews, total] = await Promise.all([
    listReviewsForGame(gameUrl, { limit, skip }),
    countReviewsForGame(gameUrl),
  ]);
  return NextResponse.json({ ok: true, data: reviews, total });
}
