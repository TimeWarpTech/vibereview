import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const id = "69fc866a0c810b9cae894163";
const verdict = "accepted";
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");
const result = await db
  .collection("ideas")
  .updateOne({ _id: new ObjectId(id) }, { $set: { verdict } });
console.log("matched:", result.matchedCount, "modified:", result.modifiedCount);
await client.close();
