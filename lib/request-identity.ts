import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const CLIENT_ID_COOKIE = "vr_uid";
const CLIENT_ID_MAX_AGE = 60 * 60 * 24 * 365;

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

export function fingerprintFromHeaders(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const chUa = req.headers.get("sec-ch-ua") ?? "";
  const chPlat = req.headers.get("sec-ch-ua-platform") ?? "";
  const chMobile = req.headers.get("sec-ch-ua-mobile") ?? "";
  return [ua, lang, chUa, chPlat, chMobile].join("|");
}

export function getOrCreateClientId(req: NextRequest): { clientId: string; isNew: boolean } {
  const existing = req.cookies.get(CLIENT_ID_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{8,}$/i.test(existing)) {
    return { clientId: existing, isNew: false };
  }
  return { clientId: randomUUID(), isNew: true };
}

export function attachClientCookie(res: NextResponse, clientId: string) {
  res.cookies.set(CLIENT_ID_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_ID_MAX_AGE,
  });
}

export function combinedFingerprint(req: NextRequest, clientFingerprint?: string): string {
  const headerFp = fingerprintFromHeaders(req);
  return clientFingerprint ? `${clientFingerprint}#${headerFp}` : headerFp;
}
