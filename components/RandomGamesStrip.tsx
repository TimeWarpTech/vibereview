import Link from "next/link";
import { games, type Game } from "@/lib/games";
import { slugForGame } from "@/lib/slug";
import { screenshotUrl } from "@/lib/screenshot";

function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

export function RandomGamesStrip({ count = 8 }: { count?: number }) {
  const picks: Game[] = pickRandom(games, count);
  if (picks.length === 0) return null;

  return (
    <section className="random-strip">
      <header className="random-strip__header">
        <h2 className="random-strip__title">Discover new games</h2>
        <span className="random-strip__hint">refreshes every load</span>
      </header>
      <ul className="random-strip__row">
        {picks.map((g) => {
          const slug = slugForGame(g);
          const img = screenshotUrl(g.screenshot, 320);
          return (
            <li key={g.game_url} className="random-strip__item">
              <Link href={`/games/${slug}`} className="random-strip__card">
                <div className="random-strip__media">
                  {img ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={img}
                      alt={`${g.game_name} screenshot`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="random-strip__placeholder">no image</div>
                  )}
                </div>
                <span className="random-strip__name">{g.game_name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
