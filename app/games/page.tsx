import Link from "next/link";
import { games, type Game } from "@/lib/games";
import { safeAggregateByGame } from "@/lib/reviews";
import { getFacets } from "@/lib/facets";
import { GameCard } from "@/components/GameCard";

export const dynamic = "force-dynamic";

type SP = {
  genre?: string;
  engine?: string;
  made_with?: string;
  multiplayer?: string;
  mobile_ready?: string;
  sort?: string;
  q?: string;
};

const PAGE_SIZE = 24;

function matchesFilters(g: Game, sp: SP): boolean {
  if (sp.genre && !String(g.genre ?? "").toLowerCase().includes(sp.genre.toLowerCase())) return false;
  if (sp.engine && g.engine !== sp.engine) return false;
  if (sp.made_with && g.made_with !== sp.made_with) return false;
  if (sp.multiplayer && g.multiplayer !== sp.multiplayer) return false;
  if (sp.mobile_ready && g.mobile_ready !== sp.mobile_ready) return false;
  if (sp.q) {
    const q = sp.q.toLowerCase();
    if (!g.game_name.toLowerCase().includes(q) && !g.pitch.toLowerCase().includes(q)) return false;
  }
  return true;
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = sp.sort ?? "most_reviewed";
  const facets = getFacets();
  const aggMap = await safeAggregateByGame();

  const ranked = games
    .filter((g) => matchesFilters(g, sp))
    .map((g) => {
      const a = aggMap.get(g.game_url);
      return {
        game: g,
        reviewCount: a?.reviewCount ?? 0,
        avgRating: a?.avgRating ?? 0,
        lastReviewedAt: a?.lastReviewedAt ?? null,
      };
    });

  ranked.sort((a, b) => {
    if (sort === "top_rated") {
      return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount;
    }
    if (sort === "recent") {
      const ax = a.lastReviewedAt?.getTime() ?? 0;
      const bx = b.lastReviewedAt?.getTime() ?? 0;
      return bx - ax;
    }
    if (sort === "name") {
      return a.game.game_name.localeCompare(b.game.game_name);
    }
    return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
  });

  const items = ranked.slice(0, PAGE_SIZE);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
      <aside>
        <form method="get" className="space-y-4 text-sm">
          <div>
            <h2 className="font-semibold mb-2">Search</h2>
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Name or pitch…"
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
            />
          </div>

          <FacetSelect label="Sort" name="sort" value={sort} options={[
            { value: "most_reviewed", label: "Most reviewed" },
            { value: "top_rated", label: "Top rated" },
            { value: "recent", label: "Recently reviewed" },
            { value: "name", label: "Name (A–Z)" },
          ]} />

          <FacetSelect
            label="Genre"
            name="genre"
            value={sp.genre ?? ""}
            options={[{ value: "", label: "Any" }, ...facets.genres.map((v) => ({ value: v, label: v }))]}
          />
          <FacetSelect
            label="Engine"
            name="engine"
            value={sp.engine ?? ""}
            options={[{ value: "", label: "Any" }, ...facets.engines.map((v) => ({ value: v, label: v }))]}
          />
          <FacetSelect
            label="Made with"
            name="made_with"
            value={sp.made_with ?? ""}
            options={[{ value: "", label: "Any" }, ...facets.madeWith.map((v) => ({ value: v, label: v }))]}
          />
          <FacetSelect
            label="Multiplayer"
            name="multiplayer"
            value={sp.multiplayer ?? ""}
            options={[{ value: "", label: "Any" }, { value: "Yes", label: "Yes" }, { value: "No", label: "No" }]}
          />
          <FacetSelect
            label="Mobile ready"
            name="mobile_ready"
            value={sp.mobile_ready ?? ""}
            options={[{ value: "", label: "Any" }, { value: "Yes", label: "Yes" }, { value: "No", label: "No" }]}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
            >
              Apply
            </button>
            <Link
              href="/games"
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700"
            >
              Reset
            </Link>
          </div>
        </form>
      </aside>

      <section>
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Browse games</h1>
            <p className="text-sm text-zinc-500">
              {ranked.length.toLocaleString()} match{ranked.length === 1 ? "" : "es"} · showing first {Math.min(PAGE_SIZE, ranked.length)}
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500">
            No games match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((r) => (
              <GameCard
                key={r.game.game_url}
                game={r.game}
                reviewCount={r.reviewCount}
                avgRating={r.avgRating}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FacetSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="font-semibold block mb-1">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
