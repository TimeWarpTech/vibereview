# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

VibeReview is an anonymous review site for the games in `games.json`. Stack: Next.js (App Router) + MongoDB + Tailwind. No auth — anyone can post a review.

## Source of truth
 
- **Games**: `games.json` at the repo root (945 entries). Treat as read-only. Do not write a script to mutate it. If a schema change is needed, document it in `TASKS.md` and ask first.
- **Reviews**: MongoDB `reviews` collection. Schema is defined in `README.md` and `lib/mongo.ts`.

## Game identity

Use `game_url` as the stable key joining reviews to games — `game_name` is not unique and `game_host` can be reused. When generating slugs for `/games/[slug]`, derive deterministically from `game_url` so links stay stable.

## Conventions

- TypeScript strict mode. No `any` unless commented why.
- Server components by default. Add `"use client"` only when interactivity (forms, filters) requires it.
- API routes return JSON with `{ ok: boolean, data?, error? }`.
- MongoDB client is loaded once per process and cached — see `lib/mongo.ts`. Do not create a new client per request.
- Validate review input with Zod on the server before insert. Cap body length (e.g. 2000 chars) and rating range 1–5.

## Things to avoid

- Don't add an auth system unless explicitly asked — anonymity is a product requirement.
- Don't store raw IP addresses. Hash them (sha256 + a server secret) for the `ipHash` field used in light rate-limiting.
- Don't ship secrets. `MONGODB_URI` only via `.env.local` / deploy env vars.
- Don't load `games.json` per request in a hot path — read once at module load and index by `game_url`.

## Commands

```bash
npm run dev          # local dev
npm run build        # prod build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## When in doubt

Check `TASKS.md` for the current work breakdown. If the task isn't listed there, ask before adding scope.
