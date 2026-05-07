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
  authorKey: string;
  authorReviewCount?: number;
};


export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not set.");
  }
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

export function hashClientId(clientId: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not set.");
  return createHash("sha256").update(`cid:${secret}:${clientId}`).digest("hex");
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
  const key = doc.fpHash ?? doc.clientId ?? doc.ipHash;
  return {
    id: doc._id!.toHexString(),
    gameUrl: doc.gameUrl,
    rating: doc.rating,
    body: doc.body,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
    fpId: doc.fpHash ? doc.fpHash.slice(0, 8) : null,
    authorKey: key.slice(0, 16),
  };
}

// Author key for de-duplicating multi-post abuse: prefer fpHash, then clientId, then ipHash.
const AUTHOR_KEY_EXPR = {
  $ifNull: ["$fpHash", { $ifNull: ["$clientId", "$ipHash"] }],
};

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
  const cidHash = identity.clientId ? hashClientId(identity.clientId) : undefined;

  const doc: ReviewDoc = {
    gameUrl: input.gameUrl,
    rating: input.rating,
    body: input.body,
    authorName: input.authorName?.trim() || "Anonymous",
    createdAt: new Date(),
    ipHash,
    ...(cidHash ? { clientId: cidHash } : {}),
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

  // Count reviews per author for this game so the UI can show ×N badges.
  const counts = await reviews
    .aggregate<{ _id: string; count: number }>([
      { $match: { gameUrl } },
      { $group: { _id: AUTHOR_KEY_EXPR, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  const countByKey = new Map(counts.map((c) => [c._id, c.count]));

  return docs.map((doc) => {
    const key = doc.fpHash ?? doc.clientId ?? doc.ipHash;
    const count = countByKey.get(key);
    const view = toView(doc);
    if (count && count > 1) view.authorReviewCount = count;
    return view;
  });
}

export async function countReviewsForGame(gameUrl: string): Promise<number> {
  const reviews = await getReviewsCollection();
  return reviews.countDocuments({ gameUrl });
}

export async function aggregateForGame(
  gameUrl: string,
): Promise<{ reviewCount: number; avgRating: number; rawCount: number }> {
  const reviews = await getReviewsCollection();
  const rows = await reviews
    .aggregate<{
      _id: null;
      reviewCount: number;
      avgRating: number;
      rawCount: number;
    }>([
      { $match: { gameUrl } },
      {
        $group: {
          _id: AUTHOR_KEY_EXPR,
          authorAvg: { $avg: "$rating" },
          authorReviews: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$authorAvg" },
          rawCount: { $sum: "$authorReviews" },
        },
      },
    ])
    .toArray();
  const r = rows[0];
  if (!r) return { reviewCount: 0, avgRating: 0, rawCount: 0 };
  return {
    reviewCount: r.reviewCount,
    avgRating: Math.round(r.avgRating * 10) / 10,
    rawCount: r.rawCount,
  };
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
          _id: { gameUrl: "$gameUrl", author: AUTHOR_KEY_EXPR },
          authorAvg: { $avg: "$rating" },
          authorLast: { $max: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$_id.gameUrl",
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$authorAvg" },
          lastReviewedAt: { $max: "$authorLast" },
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
