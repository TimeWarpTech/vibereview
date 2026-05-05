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
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <span className={isYes ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}>
        {isYes ? "✓" : "·"}
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
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/games" className="hover:underline">← Back to games</Link>
      </nav>

      <header className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6">
        <div className="rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-video">
          {img ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={img}
              alt={`${game.game_name} screenshot`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">No image</div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{game.game_name}</h1>
            <p className="text-sm text-zinc-500 mt-1">{game.genre}</p>
          </div>

          <p className="text-zinc-700 dark:text-zinc-300">{game.pitch}</p>

          {game.inspiration && (
            <p className="text-sm text-zinc-500 italic">Inspiration: {game.inspiration}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            {reviews.length > 0 ? (
              <>
                <StarRating value={average} size="md" />
                <span className="text-sm">
                  <span className="font-semibold">{average.toFixed(1)}</span>
                  <span className="text-zinc-500"> · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
                </span>
              </>
            ) : (
              <span className="text-sm text-zinc-500">No reviews yet</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <YesNoBadge label="Mobile" value={game.mobile_ready} />
            <YesNoBadge label="Multiplayer" value={game.multiplayer} />
            <YesNoBadge label="Free / web" value={game.free_web_accessible} />
            <YesNoBadge label="No loading" value={game.no_loading_screens} />
            <YesNoBadge label="AI-written" value={game.ai_written} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pt-2">
            <dt className="text-zinc-500">Engine</dt>
            <dd>{game.engine || "—"}</dd>
            <dt className="text-zinc-500">Made with</dt>
            <dd>{game.made_with || "—"}</dd>
            {game.x_username && (
              <>
                <dt className="text-zinc-500">Author</dt>
                <dd className="truncate">{game.x_username}</dd>
              </>
            )}
          </dl>

          <div className="pt-3">
            <a
              href={game.game_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Play game ↗
            </a>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Reviews</h2>
          <ReviewList reviews={reviews} />
        </div>
        <div>
          <ReviewForm gameUrl={game.game_url} />
        </div>
      </section>
    </div>
  );
}
