import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "vibereview");
const ideas = await db.collection("ideas").find({}).sort({ createdAt: -1 }).toArray();

console.log(`Total ideas: ${ideas.length}\n`);
for (const i of ideas) {
  console.log(
    JSON.stringify({
      id: i._id.toHexString(),
      author: i.authorName,
      createdAt: i.createdAt,
      votes: i.votes,
      body: i.body,
    }),
  );
}
await client.close();
