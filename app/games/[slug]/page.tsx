import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { listReviewsForGame } from "@/lib/reviews";
import { screenshotUrl } from "@/lib/screenshot";
import { StarRating } from "@/components/StarRating";
import { ReviewList } from "@/components/ReviewList";
import { ReviewForm } from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

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

  let reviews: Awaited<ReturnType<typeof listReviewsForGame>> = [];
  try {
    reviews = await listReviewsForGame(game.game_url, { limit: 100 });
  } catch {
    reviews = [];
  }

  const ratings = reviews.map((r) => r.rating);
  const average = avg(ratings);
  const img = screenshotUrl(game.screenshot, 1200);

  return (
    <div className="page-stack">
      <nav>
        <Link href="/" className="site-nav__link">back to games</Link>
      </nav>

      <header className="detail-grid">
        <div className="detail-media">
          {img ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={img}
              alt={`${game.game_name} screenshot`}
              className="w-full h-full object-cover aspect-video"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-[color:var(--muted)]">No image</div>
          )}
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
            {reviews.length > 0 ? (
              <>
                <StarRating value={average} size="md" />
                <span>
                  {average.toFixed(1)} - {reviews.length} review{reviews.length === 1 ? "" : "s"}
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
                <dd>{game.x_username}</dd>
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
          <ReviewList reviews={reviews} />
        </div>
        <div>
          <ReviewForm gameUrl={game.game_url} redirectTo={`/games/${slug}`} />
        </div>
      </section>
    </div>
  );
}
