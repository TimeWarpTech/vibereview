import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const gameUrl = process.argv[2];
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");
const docs = await db
  .collection("reviews")
  .find({ gameUrl })
  .sort({ createdAt: -1 })
  .toArray();
console.log(`Total: ${docs.length}`);
for (const r of docs) {
  console.log(
    JSON.stringify({
      id: r._id.toHexString(),
      rating: r.rating,
      author: r.authorName,
      createdAt: r.createdAt,
      ip: r.ipHash?.slice(0, 8),
      cid: r.clientId?.slice(0, 8),
      fp: r.fpHash?.slice(0, 8),
      body: r.body.slice(0, 80),
    }),
  );
}
await client.close();
