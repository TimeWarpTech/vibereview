<div align="center">

# 🎮 VibeReview

**Anonymous reviews for vibe-coded games.**

No login. No accounts. Just honest takes on indie games made with AI tooling.

[Live site](https://vibereview.vercel.app) · [Ranking explained](https://vibereview.vercel.app/how-it-works) · [Ideas](https://vibereview.vercel.app/ideas) · [Changelog](https://vibereview.vercel.app/changelog)

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-reviews-47A248?logo=mongodb&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-styling-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ What it does

- 📝 **Anonymous reviews** — drop a 1-5★ rating + body, no signup required
- 🏆 **Top Rated leaderboard** — Bayesian-weighted so 5★ × 2 reviews can't beat 4.7★ × 20
- 💡 **Ideas board** — community-suggested features, upvoted and tagged with verdicts (Accepted / Shipped / Planned / Rejected)
- 🔍 **Browse 945+ games** — filter by genre, engine, what they were vibe-coded with, multiplayer, and more
- 🛡️ **Spam-resistant by design** — fingerprint + cookie + IP hash; multi-reviews from one author collapse into a single weighted vote

## 🧱 Stack

| Layer | Tech |
|---|---|
| UI + API | Next.js (App Router), React Server Components |
| Storage | MongoDB (`reviews`, `ideas`) |
| Static data | `games.json` (945 entries, treated as read-only) |
| Styling | Tailwind CSS + custom retro/arcade theme |
| Validation | Zod schemas on every server boundary |

## 🗃️ Data model

Games come from `games.json`. The `game_url` field is the stable join key — `game_name` is not unique.

```ts
// reviews collection
{
  _id: ObjectId,
  gameUrl: string,        // matches games.json[].game_url
  rating: 1 | 2 | 3 | 4 | 5,
  body: string,           // <= 2000 chars
  authorName: string,     // defaults to "Anonymous"
  createdAt: Date,
  ipHash: string,         // sha256(ip + secret), never displayed
  clientId?: string,      // hashed anonymous cookie
  fpHash?: string,        // hashed device fingerprint
}
```

## 🛣️ Routes

| Path | Purpose |
|---|---|
| `/` | Landing — Top Rated, Most Reviewed, Newest, with filters |
| `/games/[slug]` | Game detail + reviews + write-a-review form |
| `/ideas` | Community ideas board with voting + verdict filter |
| `/how-it-works` | How the Bayesian ranking and anti-abuse work |
| `/changelog` | Recent fixes, features and tweaks |
| `POST /api/reviews` | Create a review |
| `GET /api/reviews` | List reviews for a `gameUrl` (paginated) |
| `GET /api/games` | Games joined with review aggregates |
| `GET /api/ideas` | List ideas (sort + verdict filter + pagination) |
| `POST /api/ideas` | Submit an idea |
| `POST /api/ideas/[id]/vote` | Up/downvote an idea |

## 🏆 How Top Rated ranks games

A pure average rewards luck — three lucky 5★ reviews shouldn't beat fifty solid 4.7★ ones. VibeReview uses a **Bayesian average** with a moderate prior:

```
score = (n · avg + k · m) / (n + k)

n   = real review count
avg = real average rating
k   = 5  (prior weight)
m   = 4.0 (prior mean)
```

Low-volume games get pulled toward the neutral 4.0; once a game crosses ~15+ reviews, the score is essentially the real average. See [`/how-it-works`](https://vibereview.vercel.app/how-it-works) for the live example and tiebreakers.

## 🛡️ Anti-abuse

Anonymity is a product requirement, so identity is reconstructed from three signals (strongest first):

1. **Device fingerprint** — sha256 of canvas, WebGL, audio, fonts, screen, timezone, UA
2. **Anonymous cookie** — random UUID in `vr_uid`, one year, `httpOnly`
3. **IP hash** — sha256 of IP + server secret, never stored raw

All reviews from the same author are **collapsed into one weighted vote** before averaging, so spamming six 5★ reviews counts the same as posting one.

## 🚀 Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env (`.env.local`):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string |
| `MONGODB_DB` | Database name (default `vibereview`) |
| `IP_HASH_SECRET` | Secret for hashing IPs before storage |

## 📜 Scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

DB inspection / admin scripts (read `.env`, run from repo root):

```bash
node scripts/list-ideas.mjs                      # list every idea (id, author, votes, body)
node scripts/set-verdict.mjs <ideaId> <verdict>  # accepted | rejected | planned | shipped
node scripts/delete-idea.mjs <ideaId>            # remove an idea
node scripts/inspect-reviews.mjs <gameUrl>       # reviews + duplicate-fp/ip groups
node scripts/inspect-game.mjs <gameUrl>          # compact review listing
node scripts/check-aggregate.mjs <gameUrl>       # raw vs per-author rating average
```

## 📁 Project layout

```
.
├── games.json                 # 945 games, source of truth, read-only
├── app/
│   ├── page.tsx               # home: Top Rated / Newest / Most Reviewed
│   ├── games/[slug]/page.tsx  # game detail + reviews + form
│   ├── ideas/page.tsx         # community ideas board
│   ├── how-it-works/page.tsx  # ranking + anti-abuse explained
│   ├── changelog/page.tsx     # release notes
│   └── api/{reviews,ideas,games}/...
├── lib/
│   ├── mongo.ts               # cached Mongo client
│   ├── reviews.ts             # review schema + per-author aggregation
│   ├── ideas.ts               # ideas schema + voting + verdict filter
│   ├── gameBrowse.ts          # ranking, filters, sort, Bayesian score
│   └── changelog.ts           # release notes data
├── components/
│   ├── ReviewForm.tsx         # write-a-review (localStorage-backed name)
│   ├── ReviewListInfinite.tsx # paginated reviews, grouped by author
│   ├── IdeasBoard.tsx         # ideas board client logic
│   └── GameCard.tsx
└── scripts/                   # DB inspection + admin (see above)
```

## 🧭 Conventions

- TypeScript **strict** mode; `any` only with a justifying comment
- Server components by default; `"use client"` only when interactivity demands it
- API routes return `{ ok: boolean, data?, error? }`
- Mongo client is module-cached — never instantiate per request
- Validate every external input with Zod before touching the DB
- Reviews capped at 2000 chars; ideas at 1000

## 📚 More docs

- [`CLAUDE.md`](./CLAUDE.md) — guidance for working in this repo with Claude Code
- [`TASKS.md`](./TASKS.md) — current work breakdown
- [`/how-it-works`](https://vibereview.vercel.app/how-it-works) — ranking + anti-abuse, in plain English
