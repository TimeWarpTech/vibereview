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
  if (items.length === 0) return null;
  return (
    <section className="rail">
      <h2 className="rail__heading">{title}</h2>
      <div className="card-grid">
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
  const totalReviews = ranked.reduce((sum, item) => sum + item.reviewCount, 0);
  const reviewedGames = ranked.filter((item) => item.reviewCount > 0).length;
  const averageScore =
    totalReviews > 0
      ? (
          ranked.reduce((sum, item) => sum + item.avgRating * item.reviewCount, 0) / totalReviews
        ).toFixed(1)
      : "0.0";

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
    <div className="page-stack">
      <section className="hero-panel">
        <p className="section-kicker">vibereview arcade feed</p>
        <h1 className="pixel-heading">
          VIBEREVIEW
          <br />
          GAME GRID
        </h1>
        <p className="hero-copy">
          Browse {games.length.toLocaleString()} vibe-coded games, track what players actually rated, and drop an anonymous review without ceremony.
        </p>
        <div className="hero-status">
          <div className="status-banner">Reviews Online</div>
          <div className="chip-grid">
            <div className="stat-chip">
              <span className="stat-chip__value">{games.length.toLocaleString()}</span>
              <span className="stat-chip__label">games indexed</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip__value">{reviewedGames.toLocaleString()}</span>
              <span className="stat-chip__label">games reviewed</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip__value">{totalReviews > 0 ? averageScore : totalReviews.toLocaleString()}</span>
              <span className="stat-chip__label">{totalReviews > 0 ? "avg score" : "reviews posted"}</span>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <Link href="/games" className="arcade-button">
            Browse Games
          </Link>
          <Link href="/games?sort=top_rated" className="arcade-button arcade-button--yellow">
            Top Rated
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
        <section className="neo-panel panel-note">
          <p>
            no reviews yet. <Link href="/games" style={{ color: "var(--yellow)" }} className="underline">pick a game</Link> and start the board.
          </p>
        </section>
      )}
    </div>
  );
}
