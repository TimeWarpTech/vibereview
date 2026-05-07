import { headers, cookies } from "next/headers";
import { IdeasBoard } from "@/components/IdeasBoard";
import { listIdeas, countIdeas, ensureIdeaIndexes } from "@/lib/ideas";

const PAGE_SIZE = 20;

export const metadata = {
  title: "Ideas — VibeReview",
  description: "Suggest features for VibeReview and vote on what others want.",
};

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  await ensureIdeaIndexes().catch(() => {});

  const h = await headers();
  const c = await cookies();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip")?.trim() || "0.0.0.0";
  const clientId = c.get("vr_uid")?.value;
  const fingerprint = [
    h.get("user-agent") ?? "",
    h.get("accept-language") ?? "",
    h.get("sec-ch-ua") ?? "",
    h.get("sec-ch-ua-platform") ?? "",
    h.get("sec-ch-ua-mobile") ?? "",
  ].join("|");

  const [initialIdeas, total] = await Promise.all([
    listIdeas({ ip, clientId, fingerprint }, { sort: "top", limit: PAGE_SIZE }).catch(
      () => [] as Awaited<ReturnType<typeof listIdeas>>,
    ),
    countIdeas().catch(() => 0),
  ]);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <h1 className="pixel-heading">IDEAS</h1>
        <p className="hero-copy">
          Tell us what to build next. Upvote ideas you want to see — we ship the popular ones.
        </p>
      </section>

      <IdeasBoard initialIdeas={initialIdeas} initialTotal={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
