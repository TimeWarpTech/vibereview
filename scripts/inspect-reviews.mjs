import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const gameUrl = process.argv[2];
if (!gameUrl) {
  console.error("Usage: node scripts/inspect-reviews.mjs <gameUrl>");
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");
const reviews = await db
  .collection("reviews")
  .find({ gameUrl })
  .sort({ createdAt: -1 })
  .toArray();

console.log(`Total reviews for ${gameUrl}: ${reviews.length}`);
for (const r of reviews) {
  console.log(
    JSON.stringify({
      id: r._id.toHexString(),
      rating: r.rating,
      author: r.authorName,
      createdAt: r.createdAt,
      bodyLen: r.body?.length,
      body: r.body,
      ipHash: r.ipHash?.slice(0, 8),
      clientId: r.clientId?.slice(0, 8),
      fpHash: r.fpHash?.slice(0, 8),
    }),
  );
}

const ipGroups = await db
  .collection("reviews")
  .aggregate([
    { $match: { gameUrl } },
    { $group: { _id: "$ipHash", count: { $sum: 1 }, ratings: { $push: "$rating" } } },
    { $match: { count: { $gt: 1 } } },
  ])
  .toArray();
console.log("\nDuplicate IPs:", JSON.stringify(ipGroups, null, 2));

const fpGroups = await db
  .collection("reviews")
  .aggregate([
    { $match: { gameUrl, fpHash: { $exists: true } } },
    { $group: { _id: "$fpHash", count: { $sum: 1 }, ratings: { $push: "$rating" } } },
    { $match: { count: { $gt: 1 } } },
  ])
  .toArray();
console.log("Duplicate fpHash:", JSON.stringify(fpGroups, null, 2));

await client.close();
