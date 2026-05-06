import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { listReviewsForGame, aggregateForGame } from "@/lib/reviews";
import { StarRating } from "@/components/StarRating";
import { ReviewListInfinite } from "@/components/ReviewListInfinite";
import { ReviewForm } from "@/components/ReviewForm";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { XHandleLink } from "@/components/XHandleLink";

const REVIEWS_PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function YesNoBadge({ label, value }: { label: string; value: string }) {
  const isYes = value === "Yes";
  return (
    <span className="yes-no-badge">
      <span className={isYes ? "yes-no-badge__sigil--yes" : "yes-no-badge__sigil--no"}>
        {isYes ? "+" : "-"}
      </span>
      {label}
    </span>
  );
}

export default async function GameDetail({ params }: Props) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  let initialReviews: Awaited<ReturnType<typeof listReviewsForGame>> = [];
  let totalReviews = 0;
  let average = 0;
  try {
    const [reviews, agg] = await Promise.all([
      listReviewsForGame(game.game_url, { limit: REVIEWS_PAGE_SIZE }),
      aggregateForGame(game.game_url),
    ]);
    initialReviews = reviews;
    totalReviews = agg.reviewCount;
    average = agg.avgRating;
  } catch {
    initialReviews = [];
    totalReviews = 0;
    average = 0;
  }

  return (
    <div className="page-stack">
      <nav>
        <Link href="/" className="site-nav__link">back to games</Link>
      </nav>

      <header className="detail-grid">
        <div className="detail-media">
          <ScreenshotViewer src={game.screenshot} alt={`${game.game_name} screenshot`} />
        </div>

        <div className="neo-panel detail-copy">
          <div>
            <h1>{game.game_name}</h1>
            <p className="section-subtle">{game.genre}</p>
          </div>

          <p>{game.pitch}</p>

          {game.inspiration ? (
            <p className="section-subtle">Inspired by {game.inspiration}</p>
          ) : null}

          <div className="button-row">
            {totalReviews > 0 ? (
              <>
                <StarRating value={average} size="md" />
                <span>
                  {average.toFixed(1)} - {totalReviews} review{totalReviews === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="section-subtle">No reviews yet</span>
            )}
          </div>

          <div className="detail-tags">
            <YesNoBadge label="Mobile" value={game.mobile_ready} />
            <YesNoBadge label="Multiplayer" value={game.multiplayer} />
            <YesNoBadge label="Free/web" value={game.free_web_accessible} />
            <YesNoBadge label="No loading" value={game.no_loading_screens} />
            <YesNoBadge label="AI written" value={game.ai_written} />
          </div>

          <dl className="game-meta">
            <dt>Engine</dt>
            <dd>{game.engine || "-"}</dd>
            <dt>Made with</dt>
            <dd>{game.made_with || "-"}</dd>
            {game.x_username ? (
              <>
                <dt>Author</dt>
                <dd><XHandleLink name={game.x_username} /></dd>
              </>
            ) : null}
          </dl>

          <div className="button-row">
            <a
              href={game.game_url}
              target="_blank"
              rel="noopener noreferrer"
              className="arcade-button arcade-button--yellow"
            >
              Play Game
            </a>
          </div>
        </div>
      </header>

      <section className="detail-bottom">
        <div className="space-y-4">
          <h2 className="section-title">Reviews</h2>
          <ReviewListInfinite
            gameUrl={game.game_url}
            initialItems={initialReviews}
            total={totalReviews}
            pageSize={REVIEWS_PAGE_SIZE}
          />
        </div>
        <div>
          <ReviewForm gameUrl={game.game_url} redirectTo={`/games/${slug}`} />
        </div>
      </section>
    </div>
  );
}
