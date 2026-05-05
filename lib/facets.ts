import { games } from "./games";

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).map((v) => v.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

let cache: { genres: string[]; engines: string[]; madeWith: string[] } | null = null;

export function getFacets() {
  if (cache) return cache;
  const genres = new Set<string>();
  const engines = new Set<string>();
  const madeWith = new Set<string>();
  for (const g of games) {
    for (const part of String(g.genre ?? "").split(",")) {
      const t = part.trim();
      if (t) genres.add(t);
    }
    if (g.engine) engines.add(g.engine);
    if (g.made_with) madeWith.add(g.made_with);
  }
  cache = {
    genres: uniqueSorted(genres),
    engines: uniqueSorted(engines),
    madeWith: uniqueSorted(madeWith),
  };
  return cache;
}
