export type ChangelogKind = "fix" | "feature" | "tweak";

export type ChangelogEntry = {
  date: string;
  kind: ChangelogKind;
  title: string;
  body: string;
};

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-05-06",
    kind: "fix",
    title: "X handle linking now requires @",
    body: "Author names only become X profile links when prefixed with @ — plain names like \"jorge\" no longer get auto-linked.",
  },
  {
    date: "2026-05-06",
    kind: "fix",
    title: "Reviews refresh after posting",
    body: "After submitting a review, the list now resyncs cleanly instead of getting stuck in a loading loop that required a manual page refresh.",
  },
  {
    date: "2026-05-06",
    kind: "fix",
    title: "Top Rated infinite scroll preserves sort",
    body: "Loading more games on the home page no longer falls back to Newest — subsequent pages now respect the active Top Rated ordering.",
  },
  {
    date: "2026-05-06",
    kind: "feature",
    title: "Ranking explainer page",
    body: "Added /how-it-works with a plain-language explanation of the Top Rated formula, a live ranking example, and tiebreaker rules.",
  },
  {
    date: "2026-05-06",
    kind: "feature",
    title: "Discover new games strip",
    body: "Home page now shows 8 random games in a horizontal carousel between the hero and the browse grid, refreshed each load.",
  },
  {
    date: "2026-05-06",
    kind: "tweak",
    title: "Neon scrollbars",
    body: "Custom yellow scrollbars across the site (Firefox + WebKit) to match the arcade theme.",
  },
  {
    date: "2026-05-06",
    kind: "tweak",
    title: "Top Rated weighs review volume",
    body: "Top Rated now uses a Bayesian average with a light prior — review count acts as a tiebreaker so a 4.8 with many reviews can edge out a 5.0 with very few.",
  },
  {
    date: "2026-05-06",
    kind: "feature",
    title: "Author handles link to X",
    body: "Author names that look like X handles (in game details and reviews) are now clickable links with the X logo, opening the profile in a new tab.",
  },
  {
    date: "2026-05-06",
    kind: "feature",
    title: "Changelog with infinite scroll",
    body: "The changelog page now lazy-loads entries in batches as you scroll.",
  },
  {
    date: "2026-05-06",
    kind: "feature",
    title: "Reviews lazy-load with infinite scroll",
    body: "Game pages now load 10 reviews at a time and fetch more as you scroll, instead of pulling everything up front.",
  },
  {
    date: "2026-05-06",
    kind: "fix",
    title: "Fractional star ratings",
    body: "Star icons now reflect the actual average (e.g. 4.5 shows half a star) and the numeric score is shown next to them, so 4.8 and 5.0 are no longer indistinguishable.",
  },
  {
    date: "2026-05-05",
    kind: "fix",
    title: "Top Rated now weighs review volume",
    body: "Applied a Bayesian average to Top Rated — games with 5★ and few reviews no longer outrank games with high averages and many votes.",
  },
  {
    date: "2026-05-05",
    kind: "tweak",
    title: "Per-game review rate limit",
    body: "Review submissions are now rate-limited per game with a cap of 6 per IP — cuts spam without blocking people who review many titles.",
  },
  {
    date: "2026-05-05",
    kind: "tweak",
    title: "New favicon",
    body: "Replaced the default favicon with the neon VibeReview logo.",
  },
  {
    date: "2026-05-05",
    kind: "feature",
    title: "Consolidated browse and screenshot viewer",
    body: "Filters fixed and the games grid was consolidated into the home page. You can now open screenshots in an expanded view.",
  },
  {
    date: "2026-05-05",
    kind: "feature",
    title: "/top-rated page with rank badges",
    body: "Top Rated got its own page, and rank badges now show up in the home preview as well.",
  },
  {
    date: "2026-05-05",
    kind: "feature",
    title: "VibeJam cyberpunk styling",
    body: "Neon/arcade visual applied across the whole site.",
  },
  {
    date: "2026-05-05",
    kind: "tweak",
    title: "Refined filters and infinite loading",
    body: "Browse filters cleaned up and incremental loading on scroll.",
  },
  {
    date: "2026-05-04",
    kind: "feature",
    title: "VibeReview launch",
    body: "Anonymous review app for vibe-coded games — no login, just opinions.",
  },
];
