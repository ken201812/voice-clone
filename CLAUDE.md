# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A local, single-user voice cloning and text-to-speech web app. It wraps two Fish Audio REST APIs:

- `POST /model` (multipart) creates a persistent clone.
- `POST /v1/tts` (JSON) synthesizes speech from a cloned voice.

The browser never talks to Fish Audio directly. Next.js Route Handlers act as a BFF, so `FISH_API_KEY` stays server-side. SQLite stores metadata; generated audio lives on disk.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), better-sqlite3 + Drizzle ORM, Zod.

## Commands

```bash
npm install
cp .env.example .env.local      # then set FISH_API_KEY (PowerShell: Copy-Item)
npm run dev                     # http://localhost:3000
npm run build
npm start -- -H 127.0.0.1       # production, local only

npm run lint
npm run typecheck

npm run db:generate             # after changing src/db/schema.ts
npm run db:studio
```

There is **no automated test suite or test runner** in this repository. Validate changes with `npm run typecheck`, `npm run lint`, `npm run build`, and manual requests against the dev server. To exercise routes without spending Fish credits, start the server with an empty key:

```powershell
$env:FISH_API_KEY=""; npm start -- -H 127.0.0.1 -p 3100
```

The app then returns the "未配置 FISH_API_KEY" error before any upstream call.

## Architecture

```
Browser (React/shadcn)
  │  /api/*
  ▼
Next.js Route Handlers (server-only FISH_API_KEY)
  ├── SQLite: data/app.db        metadata, migrations
  ├── data/audio/<id>.<ext>      generated audio
  └── https://api.fish.audio     Fish Audio REST
```

- `src/app/page.tsx` — TTS page. Server Component; queries SQLite directly, then renders the client form.
- `src/app/voices/page.tsx` — voice library page. Same server-query + client-manager pattern.
- `src/app/api/voices/route.ts` — `GET` list, `POST` upload + create Fish model.
- `src/app/api/voices/[id]/route.ts` — `GET`, `PATCH` (syncs Fish effective values), `DELETE` (deletes the Fish model too).
- `src/app/api/voices/[id]/status/route.ts` — polls `GET /model/{id}` and updates the local state.
- `src/app/api/tts/route.ts` — validates, calls Fish, writes audio, inserts a generation row.
- `src/app/api/audio/[id]/route.ts` — streams files with HTTP `Range` support.

Voice flow: upload → Fish `POST /model` (`type=tts`, `train_mode=fast`, multipart `voices`) → store `_id` → poll state `created|training|trained|failed` → use `_id` as TTS `reference_id`.

TTS flow: lookup local voice → Fish `POST /v1/tts` with `model` header and `reference_id` → save binary audio → insert `generations` → return `/api/audio/<id>`.

## Data and storage

- `src/db/schema.ts` is the **single source of truth** for tables and indexes.
- `drizzle/` contains generated migrations. The app applies pending migrations automatically at startup; if the directory is missing it throws. After any schema change run `npm run db:generate` and keep the new files.
- `src/db/index.ts` wraps first-run migration in a directory lock (`data/app.db.migrate.lock`). Next.js build workers evaluate the module in parallel; without the lock they race on `CREATE TABLE`. Do not remove it.
- `src/lib/paths.ts` is the only place that resolves `dataDir`, `dbPath`, `audioDir`, `migrationsDir`. `drizzle.config.ts` also imports it after loading `.env.local`, so CLI and app target the same database.
- `DATA_DIR` and `DATABASE_PATH` are optional overrides. `data/` is gitignored.
- Audio rows store POSIX-relative paths (`audio/<uuid>.mp3`) so the data directory stays portable. `Range` and traversal protection live in `src/lib/storage.ts` and the audio route.

## Validation and shared contracts

- `src/lib/validation.ts` owns upload limits (20 files, 25 MB each, 100 MB total, wav/mp3/m4a/opus), TTS text/speed limits, and the Zod schemas. The upload dialog and the API both call `validateVoiceFiles`, so do not duplicate limits in components.
- `src/lib/fish/constants.ts` owns model/format values and UI labels. `TTS_MODEL_VALUES` / `AUDIO_FORMAT_VALUES` drive both the selects and `z.enum(...)`.
- `src/lib/api-error.ts` maps errors: Zod → 400, bad JSON → 400, 401/403 → 502, 404/402/429/503/504 preserved, unknown → 500 with logging.
- `src/lib/api-guard.ts` rejects cross-site mutations. Requests without `Origin`/`Sec-Fetch-Site` (curl) are allowed.
- `src/lib/format.ts` formats dates numerically for deterministic SSR/hydration.

## Fish Audio client rules

- Source of truth: `docs/fish-audio/openapi.json`. Endpoint docs: `docs/fish-audio/api-reference/`. `docs/fish-audio/context7-query-results.md` records known stale/conflicting descriptions (official OpenAPI wins).
- All calls go through `src/lib/fish/client.ts`; timeouts are 120s create, 180s TTS, 30s other model calls.
- `PATCH /model/{id}` returns an **empty 200 body**. Do not `res.json()` it; the client re-fetches `GET /model/{id}` to obtain effective values (Fish may downgrade `visibility`).
- `POST /model` distinguishes request `type=tts` only; `train_mode` is required and must be `fast`.
- Read error bodies once as text, then `JSON.parse` — calling `res.json()` first consumes the body.
- Default dev model is `s2.1-pro-free` (free tier). `s1` is deprecated and retires 2026-12-31. Model is selected with the `model` HTTP header, not a body field.

## Next.js / UI notes

- `AGENTS.md` carries a Next.js warning: this version differs from model training data; read `node_modules/next/dist/docs/` before writing non-trivial Next code.
- Next 16 route handlers receive `params` as a `Promise` — `await context.params` (already done in this repo).
- `next.config.ts` keeps `better-sqlite3` external (`serverExternalPackages`) and wires the Tailwind v4 Turbopack CSS loader. Do not remove either.
- shadcn is configured with the **`base-nova`** style, which uses `@base-ui/react`, not Radix. Components use Base UI props (`render={...}` instead of `asChild`), and `src/lib/utils.ts` re-exports `cn` from the `cn` package.
- Tailwind v4 is CSS-first: tokens/variants live in `src/app/globals.css`; there is no `tailwind.config.ts`.
- Pages query SQLite in Server Components and export `dynamic = "force-dynamic"`. Client components receive serialized `VoiceView` / `GenerationView` objects from `src/lib/serialize.ts`.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `FISH_API_KEY` | yes | Server-only; never prefix with `NEXT_PUBLIC_` |
| `DATA_DIR` | no | Defaults to `./data` |
| `DATABASE_PATH` | no | Defaults to `<DATA_DIR>/app.db` |

`.env.example` must stay empty of real credentials; the actual key belongs in `.env.local` only. Cloning and synthesis happen on Fish Audio's servers, so audio and text leave the machine.
