import Link from "next/link";
import type { Game } from "@/lib/games";
import { slugForGame } from "@/lib/slug";
import { screenshotUrl } from "@/lib/screenshot";
import { StarRating } from "./StarRating";

type Props = {
  game: Game;
  reviewCount: number;
  avgRating: number;
  rank?: number | "?";
};

export function GameCard({ game, reviewCount, avgRating, rank }: Props) {
  const slug = slugForGame(game);
  const img = screenshotUrl(game.screenshot, 600);

  return (
    <Link
      href={`/games/${slug}`}
      className="game-card group"
    >
      <div className="game-card__media">
        {rank !== undefined ? (
          <span className="game-card__rank">#{rank}</span>
        ) : null}
        {img ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={`${game.game_name} screenshot`}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs uppercase text-[color:var(--muted)]">no image</div>
        )}
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title line-clamp-1">
          <span className="game-card__title-accent">&gt;</span> {game.game_name}
        </h3>
        <p className="game-card__pitch line-clamp-2 flex-1">{game.pitch}</p>
        <div className="game-card__meta">
          <div className="game-card__tags">
            <span className="game-card__genre truncate">[{game.genre}]</span>
            {game.made_with ? (
              <span className="game-card__tool truncate">{`{${game.made_with}}`}</span>
            ) : null}
          </div>
          <span className="game-card__rating shrink-0">
            {reviewCount > 0 ? (
              <>
                <StarRating value={avgRating} />
                <span>{avgRating.toFixed(1)} ({reviewCount})</span>
              </>
            ) : (
              <span className="opacity-60">no reviews</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
