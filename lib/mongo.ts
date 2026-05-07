import { MongoClient, type Collection, type Db } from "mongodb";
import type { ReviewDoc } from "./reviews";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }
  if (!globalThis.__mongoClientPromise) {
    globalThis.__mongoClientPromise = new MongoClient(uri).connect();
  }
  return globalThis.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || "vibereview";
  return client.db(dbName);
}

export async function getReviewsCollection(): Promise<Collection<ReviewDoc>> {
  const db = await getDb();
  return db.collection<ReviewDoc>("reviews");
}

export async function ensureIndexes(): Promise<void> {
  const reviews = await getReviewsCollection();
  await Promise.all([
    reviews.createIndex({ gameUrl: 1, createdAt: -1 }),
    reviews.createIndex({ ipHash: 1, createdAt: -1 }),
    reviews.createIndex({ clientId: 1, createdAt: -1 }, { sparse: true }),
    reviews.createIndex({ fpHash: 1, createdAt: -1 }, { sparse: true }),
  ]);
}
