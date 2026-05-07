import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { toggleVote } from "@/lib/ideas";
import {
  attachClientCookie,
  clientIp,
  combinedFingerprint,
  getOrCreateClientId,
} from "@/lib/request-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "Invalid idea id." }, { status: 400 });
  }
  const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clientFingerprint =
    typeof json.clientFingerprint === "string" && json.clientFingerprint.trim()
      ? json.clientFingerprint.trim()
      : undefined;
  const direction = json.direction === "down" ? "down" : "up";

  const { clientId, isNew } = getOrCreateClientId(req);
  const result = await toggleVote(new ObjectId(id), direction, {
    ip: clientIp(req),
    clientId,
    fingerprint: combinedFingerprint(req, clientFingerprint),
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  const res = NextResponse.json({
    ok: true,
    votes: result.votes,
    upCount: result.upCount,
    downCount: result.downCount,
    myVote: result.myVote,
  });
  if (isNew) attachClientCookie(res, clientId);
  return res;
}
