import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const [id, verdict] = process.argv.slice(2);
if (!id || !verdict) {
  console.error("Usage: node scripts/set-verdict.mjs <ideaId> <verdict>");
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");
const result = await db
  .collection("ideas")
  .updateOne({ _id: new ObjectId(id) }, { $set: { verdict } });
console.log("matched:", result.matchedCount, "modified:", result.modifiedCount);
await client.close();
