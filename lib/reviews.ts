import { createHash } from "node:crypto";
import { z } from "zod";
import type { ObjectId } from "mongodb";
import { getReviewsCollection } from "./mongo";
import { gamesByUrl } from "./games";

export const ReviewInputSchema = z.object({
  gameUrl: z.string().url().max(500),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2000),
  authorName: z.string().trim().max(60).optional(),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export type ReviewDoc = {
  _id?: ObjectId;
  gameUrl: string;
  rating: number;
  body: string;
  authorName: string;
  createdAt: Date;
  ipHash: string;
  clientId?: string;
  fpHash?: string;
};

export type ReviewView = Omit<ReviewDoc, "_id" | "ipHash" | "fpHash" | "clientId"> & {
  id: string;
  fpId: string | null;
};

export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set.");
  }
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

export function hashFingerprint(parts: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set.");
  }
  return createHash("sha256").update(`fp:${secret}:${parts}`).digest("hex");
}

export const REVIEW_WINDOW_MS_EXPORT = 4 * 24 * 60 * 60 * 1000;

export function toView(doc: ReviewDoc): ReviewView {
  return {
    id: doc._id!.toHexString(),
    gameUrl: doc.gameUrl,
    rating: doc.rating,
    body: doc.body,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
    fpId: doc.fpHash ? doc.fpHash.slice(0, 8) : null,
  };
}

const REVIEWS_PER_GAME_PER_IP = 1;
const REVIEW_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;

export async function createReview(
  input: ReviewInput,
  identity: { ip: string; clientId?: string; fingerprint?: string },
): Promise<
  | { ok: true; review: ReviewView }
  | { ok: false; error: string; nextAllowedAt?: Date }
> {
  if (!gamesByUrl.has(input.gameUrl)) {
    return { ok: false, error: "Unknown game." };
  }

  const reviews = await getReviewsCollection();
  const ipHash = hashIp(identity.ip);
  const fpHash = identity.fingerprint ? hashFingerprint(identity.fingerprint) : undefined;

  const since = new Date(Date.now() - REVIEW_WINDOW_MS);
  const orFilters: Record<string, unknown>[] = [{ ipHash }];
  if (identity.clientId) orFilters.push({ clientId: identity.clientId });
  if (fpHash) orFilters.push({ fpHash });

  const conflicting = await reviews
    .find({
      gameUrl: input.gameUrl,
      createdAt: { $gte: since },
      $or: orFilters,
    })
    .sort({ createdAt: 1 })
    .limit(1)
    .toArray();

  if (conflicting.length >= REVIEWS_PER_GAME_PER_IP) {
    const oldest = conflicting[0]!.createdAt;
    const nextAllowedAt = new Date(oldest.getTime() + REVIEW_WINDOW_MS);
    return {
      ok: false,
      error: "You have already reviewed this game recently.",
      nextAllowedAt,
    };
  }

  const doc: ReviewDoc = {
    gameUrl: input.gameUrl,
    rating: input.rating,
    body: input.body,
    authorName: input.authorName?.trim() || "Anonymous",
    createdAt: new Date(),
    ipHash,
    ...(identity.clientId ? { clientId: identity.clientId } : {}),
    ...(fpHash ? { fpHash } : {}),
  };
  const result = await reviews.insertOne(doc);
  return { ok: true, review: toView({ ...doc, _id: result.insertedId }) };
}

export async function listReviewsForGame(
  gameUrl: string,
  opts: { limit?: number; skip?: number } = {},
): Promise<ReviewView[]> {
  const reviews = await getReviewsCollection();
  const docs = await reviews
    .find({ gameUrl })
    .sort({ createdAt: -1 })
    .skip(opts.skip ?? 0)
    .limit(opts.limit ?? 50)
    .toArray();
  return docs.map(toView);
}

export async function countReviewsForGame(gameUrl: string): Promise<number> {
  const reviews = await getReviewsCollection();
  return reviews.countDocuments({ gameUrl });
}

export async function aggregateForGame(
  gameUrl: string,
): Promise<{ reviewCount: number; avgRating: number }> {
  const reviews = await getReviewsCollection();
  const rows = await reviews
    .aggregate<{ _id: null; reviewCount: number; avgRating: number }>([
      { $match: { gameUrl } },
      { $group: { _id: null, reviewCount: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
    ])
    .toArray();
  const r = rows[0];
  if (!r) return { reviewCount: 0, avgRating: 0 };
  return { reviewCount: r.reviewCount, avgRating: Math.round(r.avgRating * 10) / 10 };
}

export type GameAggregate = {
  gameUrl: string;
  reviewCount: number;
  avgRating: number;
  lastReviewedAt: Date | null;
};

export async function safeAggregateByGame(): Promise<Map<string, GameAggregate>> {
  try {
    return await aggregateByGame();
  } catch {
    return new Map();
  }
}

export async function aggregateByGame(): Promise<Map<string, GameAggregate>> {
  const reviews = await getReviewsCollection();
  const rows = await reviews
    .aggregate<{
      _id: string;
      reviewCount: number;
      avgRating: number;
      lastReviewedAt: Date;
    }>([
      {
        $group: {
          _id: "$gameUrl",
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          lastReviewedAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();

  const out = new Map<string, GameAggregate>();
  for (const r of rows) {
    out.set(r._id, {
      gameUrl: r._id,
      reviewCount: r.reviewCount,
      avgRating: Math.round(r.avgRating * 10) / 10,
      lastReviewedAt: r.lastReviewedAt ?? null,
    });
  }
  return out;
}
