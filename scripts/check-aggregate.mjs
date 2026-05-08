import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const gameUrl = process.argv[2];
if (!gameUrl) {
  console.error("Usage: node scripts/check-aggregate.mjs <gameUrl>");
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");

const AUTHOR_KEY_EXPR = {
  $ifNull: ["$fpHash", { $ifNull: ["$clientId", "$ipHash"] }],
};

const [old] = await db
  .collection("reviews")
  .aggregate([
    { $match: { gameUrl } },
    { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
  ])
  .toArray();

const [next] = await db
  .collection("reviews")
  .aggregate([
    { $match: { gameUrl } },
    { $group: { _id: AUTHOR_KEY_EXPR, authorAvg: { $avg: "$rating" }, n: { $sum: 1 } } },
    { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$authorAvg" }, raw: { $sum: "$n" } } },
  ])
  .toArray();

console.log("Old (raw):", old);
console.log("New (per author):", next);
await client.close();
