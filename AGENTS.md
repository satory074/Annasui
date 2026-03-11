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
- `npx vitest run src/lib/utils/__tests__/time.test.ts` — Run a single test file
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
- `lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9` — Kill all dev servers
- Always stop dev servers after testing to prevent performance issues

## Project Overview

**Medlean** — Multi-platform medley annotation platform. Supports Niconico (full iframe integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, nickname-based authentication, contributor tracking, BPM-based beat input.

**Tech Stack**: Next.js 15.5.7, React 19, TypeScript, TailwindCSS 4, Supabase 2.45.0, Firebase Hosting, Zustand (state + temporal undo/redo via zundo), React Query v5, React Hook Form + Zod v4, Drizzle ORM (local dev only)

## Core Architecture

### Dual Database Client Architecture (CRITICAL)

| Client | Location | Env Var | Works in Firebase? | Use Case |
|--------|----------|---------|-------------------|----------|
| **Supabase JS** | `src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_*` | Yes | Client components, API routes, production |
| **Drizzle ORM** | `src/lib/db/index.ts` | `DATABASE_URL` | **No** | Server Actions (`"use server"`), local dev, migrations |

Production (Firebase Hosting) does NOT have `DATABASE_URL`. Use Supabase JS for all production paths; Drizzle only for `"use server"` and `drizzle-kit`. The Drizzle client uses a lazy Proxy init to avoid throwing at build time.

### New vs Legacy Component Architecture

**New (active)** — `src/features/medley/components/MedleyView.tsx`:
- Used by the main page `src/app/(app)/[platform]/[videoId]/page.tsx`
- Server page prefetches data with `HydrationBoundary` + React Query
- Zustand stores for timeline and UI state; React Query mutations for saves
- Player abstracted via `PlayerAdapter` interface (`src/features/player/adapters/types.ts`)

**Legacy (being replaced)** — `src/components/pages/MedleyPlayer.tsx`:
- Large monolithic component using `useMedleyEdit` + `useMedleyDataApi` hooks from `src/hooks/`
- Immediate-save system with `!isSaving`, `!isRefetching` guard conditions
- Still in use; do not delete until fully migrated

Many components exist in both `src/components/features/` (legacy) and `src/features/` (new). Prefer `src/features/` for new code. Example: `src/features/medley/components/SongEditModal.tsx` (new, `id: string` UUID) supersedes `src/components/features/medley/SongEditModal.tsx` (legacy, `id: number`).

### Zustand Stores (3 stores in `src/features/`)

- **`medley/store.ts`** — Timeline songs + selection, with `temporal` + `immer` + `devtools` middleware (undo/redo limit 50). Only `songs` array is tracked for undo (not selection). Access via `useTimelineStore()` + `useTimelineHistory()`.
  - Store API: `setSongs(songs)`, `addSong(song)`, `updateSong(id, partial)`, `deleteSong(id)`, `selectSong(id|null)`, `reorderSongs(songIds[])`
  - Inside `useCallback`, use `useTimelineStore.getState().updateSong(...)` (imperative) instead of the hook to avoid stale closures
- **`medley/store-ui.ts`** — Modal state (`openModal: ModalId | null`), edit mode toggle. Modal IDs: `"songEdit"`, `"songSearch"`, `"manualAdd"`, `"login"`, `"restore"`, `"createMedley"`, `"bulkEdit"`, `"importSetlist"`.
  - Open with data: `openModalWith("songEdit", { song })` — read back via `(modalData.song as SongSection) ?? null`
  - New song: `openModalWith("songEdit", { song: null, isNew: true })` — modal checks `isNew={!modalData.song}`
- **`player/store.ts`** — Playback state. Use fine-grained selectors `useCurrentTime()`, `useIsPlaying()`, `useDuration()`, `useVolume()` to minimize re-renders.

### Provider Hierarchy (`src/app/providers.tsx`)
QueryClientProvider (staleTime 60s, retry 1) → AuthProvider → Toaster → children (+ ReactQueryDevtools)

### Auth System (`src/features/auth/context`)
Single shared password (`EDIT_PASSWORD` env var, server-side only) + user nicknames. No registration. Session via sessionStorage. API: `/api/auth/verify-password/` with rate limiting (5 attempts/10 min). Import: `import { useAuth } from "@/features/auth/context"`.

### Route Architecture
- Route group `(app)` at `src/app/(app)/` is transparent in URLs
- `/niconico/[videoId]` and `/youtube/[videoId]` redirect to `/(app)/[platform]/[videoId]`
- Pages using `useAuth` need `export const dynamic = "force-dynamic"`

### Data Flow
1. **Server → Client**: Page prefetches with Drizzle → React Query `HydrationBoundary` → client hydrates
2. **Edit flow**: User edits Zustand store → Save mutation → Supabase JS → query cache invalidated → store synced
3. **External APIs** (Niconico thumbnails/metadata, Spotify thumbnails) proxied through `src/app/api/` to avoid CORS

CRUD for medleys is in `src/lib/api/medleys.ts` (Supabase JS, handles validation + sanitization); server-side queries in `src/features/medley/queries/functions.ts` (Drizzle, `"use server"`).

### Player Adapter Pattern
`PlayerAdapter` interface (`src/features/player/adapters/types.ts`) abstracts `play()`, `pause()`, `seek(seconds)`, `setVolume()`, event handlers, etc. Implementations: `NicoPlayerAdapter` (postMessage) and `YouTubePlayerAdapter` (IFrame API).

### ID Architecture (3 distinct types)
| ID | Type | Purpose |
|----|------|---------|
| `song_master.id` | UUID | Primary key, FK references |
| `normalized_id` / `dedupKey` | string | Duplicate detection (katakana→hiragana) |
| `SongSection.id` | UUID | From `medley_songs.id`, app memory only |

`SongSection.songId` optionally references `song_master.id` for library linking.

## Database Schema

1. **`medleys`** — `id`, `video_id` (unique), `platform`, `title`, `creator`, `duration`, **`bpm`**, **`beat_offset`**, timestamps
2. **`song_master`** — `id`, `title`, `artist` (nullable, **legacy — NOT used for display**), `normalized_id` (unique), platform links, `description`, timestamps
3. **`artists`** — `id`, `name`, `normalized_name` (required, `name.toLowerCase()`), timestamps
4. **`song_artist_relations`** — `id`, `song_id` (FK→song_master), `artist_id` (FK→artists), `role` (`'artist'|'composer'|'arranger'`), `order_index`, `created_at`
5. **`medley_songs`** — `id`, `medley_id` (FK→medleys, cascade), `song_id` (FK→song_master, nullable), `start_time`/`end_time` (REAL, 0.1s), `order_index`, cached `title`/`artist`/`color`, platform links, timestamps
6. **`medley_edits`** — `id`, `medley_id` (FK), `song_id` (FK), `editor_nickname`, `action`, `changes` (JSONB), timestamp

`medley_songs.song_id` links to `song_master` for library integration. When registering songs, create `song_master` first, then set `medley_songs.song_id`.

### Artist Display Pipeline (CRITICAL)

`SongDatabaseEntry.artist` (shown in library UI) comes from `song_artist_relations` JOIN `artists` (role=`'artist'`), **NOT** from `song_master.artist`. The `song_master.artist` column is a legacy string, kept for historical reasons but not used for display.

- **To create/find an artist**: Use `upsertArtist(name: string)` in `songDatabase.ts` — handles `normalized_name = name.toLowerCase()` requirement automatically.
- **To update displayed artist on a song**: Delete existing `song_artist_relations` (role='artist') then insert new row with the artist ID from `upsertArtist()`.
- Falls back to `DEFAULT_ARTIST = "Unknown Artist"` when no relations exist.

### Duplicate Merge (`mergeDuplicateSongs`)

`mergeDuplicateSongs(targetId, sourceIds, overrides?)` in `songDatabase.ts` accepts `MergeOverrides`:
```typescript
export interface MergeOverrides {
  title?: string; artist?: string;
  niconicoLink?: string | null; youtubeLink?: string | null;
  spotifyLink?: string | null; applemusicLink?: string | null;
}
```
When `overrides.artist` is provided, the function updates `song_artist_relations` (not just `song_master.artist`) so the library reflects the change. Always pass `artist` in overrides when merging — even when unchanged — to ensure relations are synced.

### BPM Feature
When `medleys.bpm` is set, time inputs switch from seconds to 1-indexed beat numbers. Beat utilities in `src/lib/utils/beat.ts`:
- `beatToSeconds(beat, bpm, offset)` — 1-indexed beat → seconds
- `secondsToBeat(seconds, bpm, offset)` — seconds → 1-indexed beat
- `hasBpm(bpm)` — type guard

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
- **MUST** add explicit `text-gray-900` to all `input` and `textarea` — TailwindCSS 4 renders text invisible without it

### Zod v4 + React Hook Form
- Use untyped `useForm({})` with explicit `as SongFormValues` cast on defaultValues due to stricter type inference

### useEffect with Continuous Updates
Do NOT include rapidly-updating props (e.g., `currentTime` from video playback) in useEffect dependency arrays — resets form state every ~100ms. Add `eslint-disable-next-line react-hooks/exhaustive-deps` with an explanation comment.

### Supabase Client Version
`@supabase/supabase-js@2.45.0` (exact, no `^`) — newer versions have breaking type changes.

## Environment Variables

```bash
EDIT_PASSWORD="..."                    # Server-side only — NO NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...          # Optional: only for Drizzle ORM (local dev)
```

Production env vars set via Firebase console.

## Common Issues

- **Seek fails on Niconico**: Check `* 1000` millisecond conversion
- **PGRST204 error**: Code references a non-existent DB column; check `src/lib/supabase.ts` type definitions and run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor after migrations
- **BPM button not visible after login**: Component renders `null` when `!isAuthenticated && !hasBpm(bpm)`. Reload the page if state doesn't update after login.
- **Thumbnails not loading**: Check proxy API URLs have trailing slashes
- **Build failures**: Drizzle imports `net`/`tls` — never use in client components
- **Form state resets during playback**: Remove `currentTime` from useEffect deps
- **Stale production JS**: Firebase caches aggressively; use incognito
- **Static prerendering fails**: Pages using `useAuth` or sessionStorage must have `export const dynamic = "force-dynamic"`
- **Artist not updating after merge**: `song_master.artist` is NOT displayed in library; artist display comes from `song_artist_relations`. Use `upsertArtist()` + delete/insert on `song_artist_relations` to update. Updating `song_master.artist` alone has no visible effect.

## Code Conventions

- Use `logger.debug/info/warn/error()` instead of `console.log` (`src/lib/utils/logger.ts`)
- Auth guard pattern: `authLoading ? <Loading /> : isAuthenticated ? <EditUI /> : <LoginPrompt />`
- Conditionally pass edit callbacks: `onEdit={isAuthenticated ? handleEdit : undefined}`
- All save operations require `nickname` parameter
- `Searchable` interface must accept `null` for `artist` field (Drizzle schema has `text("artist")` which is `string | null`)
- Modal upsert pattern: `const exists = songs.find(s => s.id === song.id); exists ? updateSong(id, song) : addSong(song)` — used in `handleModalSave` in MedleyView
