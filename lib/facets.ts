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

export type MadeWithOption = { value: string; count: number };

let madeWithCache: MadeWithOption[] | null = null;

export function getMadeWithList(): MadeWithOption[] {
  if (madeWithCache) return madeWithCache;
  const grouped = new Map<string, Map<string, number>>();
  for (const g of games) {
    const raw = (g.made_with ?? "").trim();
    if (!raw) continue;
    const norm = raw.toLowerCase();
    let inner = grouped.get(norm);
    if (!inner) {
      inner = new Map();
      grouped.set(norm, inner);
    }
    inner.set(raw, (inner.get(raw) ?? 0) + 1);
  }
  const out: MadeWithOption[] = [];
  for (const inner of grouped.values()) {
    let total = 0;
    let bestLabel = "";
    let bestCount = -1;
    for (const [label, count] of inner.entries()) {
      total += count;
      if (count > bestCount) {
        bestLabel = label;
        bestCount = count;
      }
    }
    out.push({ value: bestLabel, count: total });
  }
  out.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  madeWithCache = out;
  return out;
}
