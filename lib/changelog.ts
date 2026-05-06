export type ChangelogKind = "fix" | "feature" | "tweak";

export type ChangelogEntry = {
  date: string;
  kind: ChangelogKind;
  title: string;
  body: string;
};

export const changelog: ChangelogEntry[] = [
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
