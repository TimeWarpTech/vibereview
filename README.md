# VibeReview

Anonymous review site for the games listed in `games.json`. No login — anyone can leave a review. Discover games by most-reviewed, highest-rated, genre, engine, and other parameters.

## Stack

- **Next.js** (App Router) — UI + API routes in one project
- **MongoDB** — review storage (games stay in the static `games.json`)
- **Tailwind CSS** — styling

## Data model

Games are read from `games.json` (945 entries) and treated as read-only. Each game is identified by its `game_url`, which is used as a stable key when joining reviews.

Reviews are stored in MongoDB:

```ts
// reviews collection
{
  _id: ObjectId,
  gameUrl: string,        // matches games.json[].game_url
  rating: number,         // 1-5
  body: string,           // free text review
  authorName: string,     // optional, defaults to "Anonymous"
  createdAt: Date,
  ipHash: string          // hashed IP for light spam control, not displayed
}
```

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing — most reviewed, highest rated, recently reviewed |
| `/games` | Browse all games with filters (genre, engine, made_with, multiplayer, etc.) |
| `/games/[slug]` | Game detail page + reviews + write-a-review form |
| `/api/reviews` | `POST` create review, `GET` list (filter by `gameUrl`) |
| `/api/games` | `GET` games joined with review aggregates (count, avg rating) |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI
npm run dev
```

Required env:

- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB` — database name (default `vibereview`)
- `IP_HASH_SECRET` — server-side secret used to hash IPs before storing them on reviews (for light rate-limiting; never displayed)

## Project layout (planned)

```
.
├── games.json              # static game list
├── app/
│   ├── page.tsx            # landing
│   ├── games/page.tsx      # browse + filters
│   ├── games/[slug]/page.tsx
│   └── api/
│       ├── reviews/route.ts
│       └── games/route.ts
├── lib/
│   ├── games.ts            # load + index games.json
│   └── mongo.ts            # cached Mongo client
└── components/
    ├── ReviewForm.tsx
    ├── ReviewList.tsx
    └── GameCard.tsx
```

See `TASKS.md` for the implementation checklist and `CLAUDE.md` for guidance when working on this repo with Claude Code.
