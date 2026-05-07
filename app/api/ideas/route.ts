import { NextRequest, NextResponse } from "next/server";
import { IdeaInputSchema, createIdea, listIdeas, countIdeas } from "@/lib/ideas";
import {
  attachClientCookie,
  clientIp,
  combinedFingerprint,
  getOrCreateClientId,
} from "@/lib/request-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    const clientFingerprint =
      typeof json.clientFingerprint === "string" && json.clientFingerprint.trim()
        ? json.clientFingerprint.trim()
        : undefined;

    const parsed = IdeaInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid idea.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { clientId, isNew } = getOrCreateClientId(req);
    const result = await createIdea(parsed.data, {
      ip: clientIp(req),
      clientId,
      fingerprint: combinedFingerprint(req, clientFingerprint),
    });

    if (!result.ok) {
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
    const res = NextResponse.json({ ok: true, data: result.idea }, { status: 201 });
    if (isNew) attachClientCookie(res, clientId);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get("sort") === "new" ? "new" : "top";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 200);
  const skip = Math.max(Number(req.nextUrl.searchParams.get("skip") ?? 0), 0);
  const { clientId, isNew } = getOrCreateClientId(req);
  const [ideas, total] = await Promise.all([
    listIdeas(
      { ip: clientIp(req), clientId, fingerprint: combinedFingerprint(req) },
      { sort, limit, skip },
    ),
    countIdeas(),
  ]);
  const res = NextResponse.json({ ok: true, data: ideas, total });
  if (isNew) attachClientCookie(res, clientId);
  return res;
}
