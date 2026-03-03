# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint (ignored during builds via `ignoreDuringBuilds: true`)
- `npx tsc --noEmit` — TypeScript type checking
- `npm run build && npx tsc --noEmit && npm run lint` — Pre-deployment validation

### Testing
- `npm run test` — Run unit tests (Vitest, jsdom, files in `src/**/__tests__/`)
- `npm run test:watch` — Watch mode
- `npm run test:coverage` — Coverage report
- `npm run test:e2e` — Playwright e2e tests (`e2e/` directory, auto-starts dev server)

### Database (Drizzle ORM — local dev only, requires `DATABASE_URL`)
- `npm run db:generate` — Generate migrations from schema changes
- `npm run db:migrate` — Run pending migrations
- `npm run db:studio` — Open Drizzle Studio GUI

### Deployment
- `firebase deploy --only hosting` — Deploy to production
- `rm -rf .next && npm run build && firebase deploy --only hosting` — Clean build + deploy (when cache causes issues)
- Always verify in production: https://anasui-e6f49.web.app

### Server Management
- `ps aux | grep "next-server" | grep -v grep` — Check running dev servers
- `lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9` — Kill all dev servers
- Always stop dev servers after testing to prevent performance issues

## Project Overview

**Medlean** — Multi-platform medley annotation platform. Supports Niconico (full iframe integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, nickname-based authentication, contributor tracking, immediate save system.

**Tech Stack**: Next.js 15.5.7, React 19, TypeScript, TailwindCSS 4, Supabase 2.45.0 (database), Firebase Hosting, Zustand (state with temporal undo/redo), React Query v5 (data fetching), React Hook Form + Zod v4 (forms), Drizzle ORM (server-side DB, local dev only)

**Status**: Alpha v0.1.0-alpha.1

## Core Architecture

### Dual Database Client Architecture (CRITICAL)

| Client | Location | Env Var | Works in Firebase? | Use Case |
|--------|----------|---------|-------------------|----------|
| **Supabase JS** | `src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_*` | Yes | Client components, API routes, production |
| **Drizzle ORM** | `src/lib/db/index.ts` | `DATABASE_URL` | **No** | Server Actions (`"use server"`), local dev, migrations |

Production (Firebase Hosting) does NOT have `DATABASE_URL`. Pages using Drizzle will crash in production. Use Supabase JS client for all pages; reserve Drizzle for `"use server"` functions and `drizzle-kit` commands.

### Architecture Layers

**Provider hierarchy** (`src/app/providers.tsx`): QueryClientProvider → AuthProvider → children (+ ReactQueryDevtools)

**Auth system** (`src/features/auth/context`): Single shared password (`EDIT_PASSWORD` env var) + user nicknames. No registration. Session via sessionStorage. API: `/api/auth/verify-password/` with rate limiting (5 attempts/10 min). Import: `import { useAuth } from "@/features/auth/context"`.

**State management**: Two Zustand stores in `src/features/`:
- `medley/store.ts` — Timeline state (songs, selection) with temporal middleware (undo/redo via zundo) and immer
- `player/store.ts` — Playback state (currentTime, isPlaying, duration, volume)

**Data fetching**: React Query v5 with Supabase JS client. CRUD operations in `src/lib/api/medleys.ts`. All external API calls go through Next.js API routes due to CORS (Niconico thumbnails, metadata; Spotify thumbnails).

**Legacy hooks** (in `src/hooks/`): `useMedleyEdit` (timeline editing with immediate save), `useNicoPlayer` (iframe postMessage), `useCurrentTrack`, `useSongSearch`. These coexist with the newer `src/features/` modules.

### Route Architecture
- Route group `(app)` at `src/app/(app)/` is transparent in URLs
- **Conflict**: `src/app/(app)/library/page.tsx` conflicts with `src/app/library/page.tsx` — only one can be active. Currently active: `src/app/library/page.tsx`
- Pages using components with `useAuth` need `export const dynamic = "force-dynamic"`

### ID Architecture (3 distinct types)
| ID | Type | Location | Purpose |
|----|------|----------|---------|
| `song_master.id` | UUID | Database | Primary key, FK references |
| `normalized_id` / `dedupKey` | string | DB + App | Duplicate detection (katakana→hiragana normalization) |
| `SongSection.id` | string (UUID) | App memory | From `medley_songs.id` |

`SongSection.songId` is an optional UUID reference back to `song_master` for library linking.

## Critical Constraints

### Firebase Hosting
- **MUST** use `trailingSlash: true` in `next.config.ts`
- **MUST** include trailing slashes in API URLs: `/api/thumbnail/niconico/${id}/`
- Firebase auto-adds slashes causing redirect loops without this

### Niconico Player
- **NEVER** use `sandbox` attribute on iframe (blocks postMessage)
- **MUST** convert seconds to milliseconds for Niconico API (`time * 1000`)
- **MUST** use `commandInProgress` flag to prevent command overlap

### TailwindCSS 4
- **MUST** add explicit `text-gray-900` to all `input` and `textarea` elements — TailwindCSS 4 may render text invisible without it

### Zod v4 + React Hook Form
- Use untyped `useForm({})` with explicit `as SongFormValues` cast on defaultValues due to stricter type inference

### useEffect with Continuous Updates
When components receive rapidly-updating props (e.g., `currentTime` from video playback), do NOT include them in useEffect dependency arrays — this resets form state every ~100ms. Reference the prop directly and add `eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why.

### Supabase Client Version
`@supabase/supabase-js@2.45.0` — Do NOT upgrade without thorough testing; newer versions have breaking type changes.

## Immediate Save System

Operations (add/edit/delete) trigger immediate save to database — no debouncing. Flow:
1. User operation → `useMedleyEdit` callback triggers
2. `saveMedleySongs()` writes to DB + creates edit history snapshot
3. Data refetched from DB to ensure consistency
4. UI uses `isRefetching` flag (NOT `loading`) to stay visible during background sync

Guard conditions in `useMedleyEdit` state sync prevent race conditions: `!isSaving`, `!isRefetching`, `!hasChanges`, `!saveFailed`.

## Database Schema (4 tables)

1. **`medleys`** — `id` (UUID), `video_id` (unique), `platform`, `title`, `creator`, `duration`, timestamps
2. **`song_master`** — `id` (UUID), `title`, `artist` (nullable), `normalized_id` (unique), platform links (`niconico_link`, `youtube_link`, `spotify_link`, `applemusic_link`), timestamps
3. **`medley_songs`** — `id` (UUID), `medley_id` (FK), `song_id` (FK nullable → song_master), `start_time`/`end_time` (REAL, 0.1s precision), `order_index`, cached `title`/`artist`/`color`, platform links, timestamps
4. **`medley_edits`** — `id` (UUID), `medley_id` (FK), `song_id` (FK), `editor_nickname`, `action`, `changes` (JSONB), timestamp

Key: `medley_songs.song_id` links to `song_master` for library integration. When registering songs, create `song_master` record first, then set `medley_songs.song_id`.

## Environment Variables

```bash
# .env.local (dev)
EDIT_PASSWORD="..."                    # Server-side only, no NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=https://...   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Supabase anon key
DATABASE_URL=postgresql://...          # Optional: only for Drizzle ORM
```

Production env vars set via Firebase console. `EDIT_PASSWORD` must NOT have `NEXT_PUBLIC_` prefix.

## Common Issues

- **Seek fails**: Check millisecond conversion (`* 1000`) for Niconico
- **CORS errors**: Must use server-side proxy routes, not direct API calls
- **Thumbnails not loading**: Check proxy API URLs have trailing slashes
- **Input text invisible**: Add `text-gray-900` to inputs (TailwindCSS 4 issue)
- **Build failures with Drizzle pages**: Only Supabase JS client works in Firebase production
- **PGRST204 error**: Code references non-existent DB columns; check schema
- **Schema mismatch after migration**: Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor
- **Form state resets during playback**: Remove `currentTime` from useEffect deps
- **Stale production JS**: Firebase caches aggressively; use incognito or clear caches
- **HMR errors in dev**: May be local-only; verify with `npm run build` first, then deploy to production to confirm

## Code Conventions

- Use `logger.debug/info/warn/error()` instead of `console.log`
- Import auth: `import { useAuth } from "@/features/auth/context"`
- Auth guard pattern: `authLoading ? <Loading /> : isAuthenticated ? <EditUI /> : <LoginPrompt />`
- Conditionally pass edit callbacks: `onEdit={isAuthenticated ? handleEdit : undefined}`
- All save operations require `nickname` parameter
- Use exact version for `@supabase/supabase-js` (no `^` prefix)
