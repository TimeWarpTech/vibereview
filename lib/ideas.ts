import { z } from "zod";
import type { ObjectId } from "mongodb";
import { getDb } from "./mongo";
import { hashIp, hashFingerprint, hashClientId } from "./reviews";

export const IdeaInputSchema = z.object({
  body: z.string().trim().min(5).max(1000),
  authorName: z.string().trim().max(60).optional(),
});

export type IdeaInput = z.infer<typeof IdeaInputSchema>;

export type IdeaStatus = "new" | "reviewing" | "done";
export type IdeaVerdict = "accepted" | "rejected" | "planned" | "shipped";

export type IdeaDoc = {
  _id?: ObjectId;
  body: string;
  authorName: string;
  createdAt: Date;
  ipHash: string;
  clientId?: string;
  fpHash?: string;
  status: IdeaStatus;
  verdict?: IdeaVerdict | null;
  votes: number;
  votersUp: string[];
  votersDown: string[];
};

export type IdeaView = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
  status: IdeaStatus;
  verdict: IdeaVerdict | null;
  votes: number;
  upCount: number;
  downCount: number;
  fpId: string | null;
  myVote: "up" | "down" | null;
};

const IDEAS_PER_USER_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
const IDEAS_PER_USER_WINDOW = 1;

async function ideasCollection() {
  const db = await getDb();
  return db.collection<IdeaDoc>("ideas");
}

export async function ensureIdeaIndexes(): Promise<void> {
  const ideas = await ideasCollection();
  await Promise.all([
    ideas.createIndex({ createdAt: -1 }),
    ideas.createIndex({ votes: -1, createdAt: -1 }),
    ideas.createIndex({ ipHash: 1, createdAt: -1 }),
    ideas.createIndex({ clientId: 1, createdAt: -1 }, { sparse: true }),
    ideas.createIndex({ fpHash: 1, createdAt: -1 }, { sparse: true }),
  ]);
}

function voterKey(identity: { ip: string; clientId?: string; fingerprint?: string }): string {
  const parts = [
    `ip:${hashIp(identity.ip)}`,
    identity.clientId ? `c:${hashClientId(identity.clientId)}` : "",
    identity.fingerprint ? `f:${hashFingerprint(identity.fingerprint)}` : "",
  ].filter(Boolean);
  return parts.join("|");
}

function matchesViewer(voters: string[] | undefined, viewerKey: string): boolean {
  if (!voters || voters.length === 0) return false;
  const keys = viewerKey.split("|");
  return voters.some((v) => keys.some((k) => v.includes(k)));
}

function toView(doc: IdeaDoc, viewerKey: string): IdeaView {
  const up = doc.votersUp?.length ?? 0;
  const down = doc.votersDown?.length ?? 0;
  const voted = matchesViewer(doc.votersUp, viewerKey)
    ? "up"
    : matchesViewer(doc.votersDown, viewerKey)
      ? "down"
      : null;
  return {
    id: doc._id!.toHexString(),
    body: doc.body,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
    status: doc.status,
    verdict: doc.verdict ?? null,
    votes: doc.votes,
    upCount: up,
    downCount: down,
    fpId: doc.fpHash ? doc.fpHash.slice(0, 8) : null,
    myVote: voted,
  };
}

export async function createIdea(
  input: IdeaInput,
  identity: { ip: string; clientId?: string; fingerprint?: string },
): Promise<
  | { ok: true; idea: IdeaView }
  | { ok: false; error: string; nextAllowedAt?: Date }
> {
  const ideas = await ideasCollection();
  const ipHash = hashIp(identity.ip);
  const fpHash = identity.fingerprint ? hashFingerprint(identity.fingerprint) : undefined;
  const cidHash = identity.clientId ? hashClientId(identity.clientId) : undefined;

  const since = new Date(Date.now() - IDEAS_PER_USER_WINDOW_MS);
  const orFilters: Record<string, unknown>[] = [{ ipHash }];
  if (cidHash) orFilters.push({ clientId: cidHash });
  if (fpHash) orFilters.push({ fpHash });

  const conflicting = await ideas
    .find({ createdAt: { $gte: since }, $or: orFilters })
    .sort({ createdAt: 1 })
    .limit(1)
    .toArray();

  if (conflicting.length >= IDEAS_PER_USER_WINDOW) {
    const oldest = conflicting[0]!.createdAt;
    return {
      ok: false,
      error: "You have already submitted an idea recently.",
      nextAllowedAt: new Date(oldest.getTime() + IDEAS_PER_USER_WINDOW_MS),
    };
  }

  const doc: IdeaDoc = {
    body: input.body,
    authorName: input.authorName?.trim() || "Anonymous",
    createdAt: new Date(),
    ipHash,
    ...(cidHash ? { clientId: cidHash } : {}),
    ...(fpHash ? { fpHash } : {}),
    status: "new",
    votes: 0,
    votersUp: [],
    votersDown: [],
  };
  const result = await ideas.insertOne(doc);
  return { ok: true, idea: toView({ ...doc, _id: result.insertedId }, voterKey(identity)) };
}

export type IdeaVerdictFilter = "all" | "none" | IdeaVerdict;

function verdictFilter(filter: IdeaVerdictFilter | undefined): Record<string, unknown> {
  if (!filter || filter === "all") return {};
  if (filter === "none") return { $or: [{ verdict: null }, { verdict: { $exists: false } }] };
  return { verdict: filter };
}

export async function countIdeas(filter?: IdeaVerdictFilter): Promise<number> {
  const ideas = await ideasCollection();
  return ideas.countDocuments(verdictFilter(filter));
}

export async function listIdeas(
  identity: { ip: string; clientId?: string; fingerprint?: string },
  opts: {
    sort?: "top" | "new";
    limit?: number;
    skip?: number;
    verdict?: IdeaVerdictFilter;
  } = {},
): Promise<IdeaView[]> {
  const ideas = await ideasCollection();
  const sortSpec: Record<string, 1 | -1> =
    opts.sort === "new" ? { createdAt: -1 } : { votes: -1, createdAt: -1 };
  const docs = await ideas
    .find(verdictFilter(opts.verdict))
    .sort(sortSpec)
    .skip(opts.skip ?? 0)
    .limit(opts.limit ?? 100)
    .toArray();
  const key = voterKey(identity);
  return docs.map((d) => toView(d, key));
}

export async function toggleVote(
  ideaId: ObjectId,
  direction: "up" | "down",
  identity: { ip: string; clientId?: string; fingerprint?: string },
): Promise<
  | {
      ok: true;
      votes: number;
      upCount: number;
      downCount: number;
      myVote: "up" | "down" | null;
    }
  | { ok: false; error: string }
> {
  const ideas = await ideasCollection();
  const key = voterKey(identity);
  const doc = await ideas.findOne({ _id: ideaId });
  if (!doc) return { ok: false, error: "Idea not found." };

  const inUp = (doc.votersUp ?? []).includes(key);
  const inDown = (doc.votersDown ?? []).includes(key);

  let votersUp = (doc.votersUp ?? []).filter((v) => v !== key);
  let votersDown = (doc.votersDown ?? []).filter((v) => v !== key);
  let myVote: "up" | "down" | null;

  if (direction === "up") {
    if (inUp) {
      myVote = null;
    } else {
      votersUp = [...votersUp, key];
      myVote = "up";
    }
  } else {
    if (inDown) {
      myVote = null;
    } else {
      votersDown = [...votersDown, key];
      myVote = "down";
    }
  }

  const upCount = votersUp.length;
  const downCount = votersDown.length;
  const votes = upCount - downCount;

  const after = await ideas.findOneAndUpdate(
    { _id: ideaId },
    { $set: { votersUp, votersDown, votes } },
    { returnDocument: "after" },
  );
  if (!after) return { ok: false, error: "Vote failed." };
  return { ok: true, votes, upCount, downCount, myVote };
}
