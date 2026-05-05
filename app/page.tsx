import Link from "next/link";
import { games, type Game } from "@/lib/games";
import { safeAggregateByGame } from "@/lib/reviews";
import { GameCard } from "@/components/GameCard";

export const dynamic = "force-dynamic";

type Ranked = { game: Game; reviewCount: number; avgRating: number; lastReviewedAt: Date | null };

function rank(games: Game[], aggMap: Awaited<ReturnType<typeof safeAggregateByGame>>): Ranked[] {
  return games.map((g) => {
    const a = aggMap.get(g.game_url);
    return {
      game: g,
      reviewCount: a?.reviewCount ?? 0,
      avgRating: a?.avgRating ?? 0,
      lastReviewedAt: a?.lastReviewedAt ?? null,
    };
  });
}

function Rail({ title, items }: { title: string; items: Ranked[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((r) => (
          <GameCard
            key={r.game.game_url}
            game={r.game}
            reviewCount={r.reviewCount}
            avgRating={r.avgRating}
          />
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const aggMap = await safeAggregateByGame();
  const ranked = rank(games, aggMap);

  const mostReviewed = [...ranked]
    .filter((r) => r.reviewCount > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 8);

  const topRated = [...ranked]
    .filter((r) => r.reviewCount >= 1)
    .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
    .slice(0, 8);

  const recent = [...ranked]
    .filter((r) => r.lastReviewedAt)
    .sort((a, b) => (b.lastReviewedAt!.getTime()) - (a.lastReviewedAt!.getTime()))
    .slice(0, 8);

  const haveAny = mostReviewed.length > 0;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Vibe-coded games, honestly reviewed.</h1>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Browse {games.length.toLocaleString()} games. No login. Drop a review on anything you play.
        </p>
        <div className="pt-1">
          <Link
            href="/games"
            className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Browse all games →
          </Link>
        </div>
      </section>

      {haveAny ? (
        <>
          <Rail title="Most reviewed" items={mostReviewed} />
          <Rail title="Top rated" items={topRated} />
          <Rail title="Recently reviewed" items={recent} />
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No reviews yet. <Link href="/games" className="underline">Pick a game</Link> and be the first.
          </p>
        </section>
      )}
    </div>
  );
}
