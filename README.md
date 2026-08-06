# Health Tracker App

A personal health, workout, and nutrition tracker — installable as a home-screen
web app on iPhone. Full product spec, data model, and phased build plan: see
[`SPEC.md`](./SPEC.md).

## What's in this Phase 1 skeleton

- Next.js (App Router, TypeScript, Tailwind).
- A single-password gate (`src/middleware.ts` + `src/lib/auth.ts`) protecting
  every route except `/login`.
- Supabase client helpers (`src/lib/supabaseClient.ts` for the browser,
  `src/lib/supabaseServer.ts` for server-side/API-route use).
- A `/api/keep-alive` route + `vercel.json` cron entry, so a free Supabase
  project never auto-pauses from a week of inactivity.
- A placeholder home page — Phase 2 onward (weight logging, workout plan,
  nutrition, Google Health sync, readiness score, etc.) builds on top of this.

## First-time setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create your local env file:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in at minimum `APP_PASSWORD` and `AUTH_SECRET` (generate the secret
   with `openssl rand -hex 32`) to run locally. The Supabase and Google
   Health variables can stay blank until those phases start.

3. **Run it locally:**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` — it should redirect to `/login`.

## Getting this onto Vercel + Supabase (Phase 1, continued)

1. Push this folder to a new GitHub repository (`git init`, `git add -A`,
   `git commit -m "Phase 1: project skeleton"`, then follow GitHub's
   instructions for pushing an existing repo).
2. In Vercel, "Add New Project" → import that GitHub repo. It auto-detects
   Next.js — no build settings need changing.
3. In the Vercel project's Settings → Environment Variables, add
   `APP_PASSWORD` and `AUTH_SECRET` (same values as your `.env.local`, or
   generate fresh ones for production).
4. Create a Supabase project, then add `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (from
   Supabase's Project Settings → API) to both Vercel and your local
   `.env.local`.
5. Redeploy (or just push again) — the app is now live at your
   `*.vercel.app` URL, password-gated, with the Supabase keep-alive cron
   running daily.
6. On your iPhone, open the Vercel URL in **Safari** (not Chrome — see
   `SPEC.md` for why) and use Share → "Add to Home Screen" to install it as
   a real standalone app.

## Continuing the build

From here, follow the Requirements and Timeline / Phasing sections in
`SPEC.md` in order — each phase (weight logging, workout plan/logging,
Google Health sync, nutrition, the smart readiness/progressive-overload
engines, then polish) builds on this skeleton. If you're using Claude Code,
just point it at `SPEC.md` and name the phase you're starting.
