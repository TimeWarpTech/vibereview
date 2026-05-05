# Tasks

Implementation checklist for VibeReview. Work top-to-bottom; each section is a coherent slice that can be merged on its own.

## 1. Project bootstrap

- [x] `npx create-next-app@latest` — TypeScript, App Router, Tailwind, ESLint
- [x] Add `mongodb` and `zod` to dependencies
- [x] Create `.env.example` with `MONGODB_URI`, `MONGODB_DB`, `IP_HASH_SECRET`
- [x] Add `npm run typecheck` script (`tsc --noEmit`)

## 2. Data layer

- [x] `lib/games.ts` — load `games.json` once, export typed `Game[]` and a `Map<gameUrl, Game>` index
- [x] `lib/slug.ts` — deterministic slug from `game_url` (used in routes)
- [x] `lib/mongo.ts` — cached MongoDB client, exported `getReviewsCollection()`
- [x] Define `Review` type and Zod schema in `lib/reviews.ts`
- [x] `lib/screenshot.ts` — convert Drive open URLs to embeddable thumbnails
- [x] `lib/facets.ts` — derive unique genres/engines/made_with from games.json

## 3. API routes

- [x] `POST /api/reviews` — validate body, hash IP, insert review
  - body: `{ gameUrl, rating (1-5), body (<=2000 chars), authorName? }`
  - rate-limit: max 5 reviews per ipHash per hour
- [x] `GET /api/reviews?gameUrl=...` — list reviews for a game, newest first
- [x] `GET /api/games` — return games joined with `{ reviewCount, avgRating }` aggregate
  - support `?sort=most_reviewed | top_rated | recent`
  - support filters: `genre`, `engine`, `made_with`, `multiplayer`, `mobile_ready`

## 4. UI — browse & discover

- [x] `/` landing — three rails: Most Reviewed, Top Rated, Recently Reviewed
- [x] `/games` browse page with filter sidebar (search + genre, engine, made_with, mobile_ready, multiplayer, sort)
- [x] `components/GameCard.tsx` — thumbnail, name, pitch, rating, review count

## 5. UI — game detail

- [x] `/games/[slug]` — game info, screenshot, link out to `game_url`
- [x] `components/ReviewList.tsx` — newest first
- [x] `components/ReviewForm.tsx` — client component, posts to `/api/reviews`, refresh on success
- [x] Aggregate header: average rating + total reviews

## 6. Quality

- [x] Honeypot field on the review form (basic bot defense — no captcha)
- [x] Server-side rate limit (5/hr per ipHash via Mongo countDocuments)
- [x] Empty states for "no reviews yet" / "no games match filters"
- [ ] Loading skeletons on rails and game grid
- [ ] Pagination for browse (currently first 24 only) and review list

## 7. Deploy

- [ ] Deploy to Vercel
- [ ] Provision MongoDB Atlas cluster, set env vars (`MONGODB_URI`, `MONGODB_DB`, `IP_HASH_SECRET`)
- [ ] Run `ensureIndexes()` once after first deploy (or via a one-off route)
- [ ] Smoke test: post a review, verify it appears, verify it counts in aggregates

## Out of scope (for now)

- User accounts / login
- Edit or delete reviews (anonymity makes ownership ambiguous)
- Comment threads on reviews
- Image uploads in reviews
