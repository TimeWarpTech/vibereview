import Link from "next/link";
import type { Game } from "@/lib/games";
import { slugForGame } from "@/lib/slug";
import { screenshotUrl } from "@/lib/screenshot";
import { StarRating } from "./StarRating";

type Props = {
  game: Game;
  reviewCount: number;
  avgRating: number;
};

export function GameCard({ game, reviewCount, avgRating }: Props) {
  const slug = slugForGame(game);
  const img = screenshotUrl(game.screenshot, 600);

  return (
    <Link
      href={`/games/${slug}`}
      className="group flex flex-col rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
    >
      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
        {img ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={`${game.game_name} screenshot`}
            className="w-full h-full object-cover group-hover:scale-105 transition"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">No image</div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold leading-tight line-clamp-1">{game.game_name}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-1">{game.pitch}</p>
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span className="truncate">{game.genre}</span>
          <span className="flex items-center gap-1.5 shrink-0">
            {reviewCount > 0 ? (
              <>
                <StarRating value={avgRating} />
                <span>({reviewCount})</span>
              </>
            ) : (
              <span className="text-zinc-400">no reviews</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
