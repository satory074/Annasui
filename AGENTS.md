# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design reference**: See [`TONMANUAL.md`](./TONMANUAL.md) for the full Tone & Manner guide — color system, typography, component patterns, voice & tone, and accessibility standards.

## Commands

### Development
- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint (ignored during builds via `ignoreDuringBuilds: true`)
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `npm run build && npm run typecheck && npm run lint` — Pre-deployment validation

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

**Medlean** — Multi-platform medley annotation platform. Supports Niconico (full iframe integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, nickname-based authentication, contributor tracking.

**Tech Stack**: Next.js 15.5.7, React 19, TypeScript, TailwindCSS 4, Supabase 2.45.0, Firebase Hosting, Zustand (state + temporal undo/redo via zundo), React Query v5, React Hook Form + Zod v4, Drizzle ORM (local dev only)

## Core Architecture

### Dual Database Client Architecture (CRITICAL)

| Client | Location | Env Var | Works in Firebase? | Use Case |
|--------|----------|---------|-------------------|----------|
| **Supabase JS** | `src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_*` | Yes | Client components, API routes, production |
| **Drizzle ORM** | `src/lib/db/index.ts` | `DATABASE_URL` | **No** | Server Actions (`"use server"`), local dev, migrations |

Production (Firebase Hosting) does NOT have `DATABASE_URL`. Use Supabase JS for all production paths; Drizzle only for `"use server"` and `drizzle-kit`. The Drizzle client uses a lazy Proxy init to avoid throwing at build time.

### New vs Legacy Component Architecture

**New (active, not yet user-facing)** — `src/features/medley/components/MedleyView.tsx`:
- Used by `src/app/(app)/[platform]/[videoId]/page.tsx` — but unreachable for niconico/youtube (see Route Architecture)
- Server page prefetches data with `HydrationBoundary` + React Query
- Zustand stores for timeline and UI state; React Query mutations for saves
- Player abstracted via `PlayerAdapter` interface (`src/features/player/adapters/types.ts`)
- `handleAddSong` opens `SongSearchModal` → user selects from DB → `SongEditModal` opens with `prefill`
- **Keyboard shortcuts** (edit mode): `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo — skipped when INPUT/TEXTAREA focused
- Inline shortcut help bar shown below `PlayerControls` (user: `←`/`→` ±5s; editor adds undo/redo/live)

**Legacy (currently user-facing)** — `src/components/pages/MedleyPlayer.tsx`:
- Rendered by `src/app/niconico/[videoId]/page.tsx` and `src/app/youtube/[videoId]/page.tsx`
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
  - Prefilled new song (from SongSearchModal): `openModalWith("songEdit", { song: null, isNew: true, prefill: { title, artist: string[] } })` — `SongEditModal` reads `prefill` prop to pre-populate title/artist fields
- **`player/store.ts`** — Playback state. Use fine-grained selectors `useCurrentTime()`, `useIsPlaying()`, `useDuration()`, `useVolume()`, `useLiveMode()` to minimize re-renders. Includes `liveMode: boolean` + `setLiveMode()` for live annotation mode.

### Provider Hierarchy (`src/app/providers.tsx`)
QueryClientProvider (staleTime 60s, retry 1) → AuthProvider → Toaster → children (+ ReactQueryDevtools)

### Auth System (`src/features/auth/context`)
Single shared password (`EDIT_PASSWORD` env var, server-side only) + user nicknames. No registration. Session via sessionStorage. API: `/api/auth/verify-password/` with rate limiting (5 attempts/10 min). Import: `import { useAuth } from "@/features/auth/context"`.

### Route Architecture
- Route group `(app)` at `src/app/(app)/` is transparent in URLs
- **`src/app/(app)/[platform]/[videoId]/page.tsx`** renders `MedleyView` (new). Uses Drizzle `HydrationBoundary` prefetch — requires `DATABASE_URL` (unavailable in Firebase production).
- **`src/app/niconico/[videoId]/page.tsx`** and **`src/app/youtube/[videoId]/page.tsx`** render `MedleyPageClient` (legacy). Static segments take priority over `[platform]`, so niconico/youtube URLs never reach the `(app)` route.
- To access `MedleyView` via URL, use a platform value other than `niconico`/`youtube` (e.g. `/nico/sm123`), or migrate the legacy pages.
- Pages using `useAuth` need `export const dynamic = "force-dynamic"`

### Data Flow
1. **Server → Client**: Page prefetches with Drizzle → React Query `HydrationBoundary` → client hydrates
2. **Edit flow**: User edits Zustand store → Save mutation → Supabase JS → query cache invalidated → store synced
3. **External APIs** (Niconico thumbnails/metadata, Spotify thumbnails) proxied through `src/app/api/` to avoid CORS

CRUD for medleys is in `src/lib/api/medleys.ts` (Supabase JS, handles validation + sanitization); server-side queries in `src/features/medley/queries/functions.ts` (Drizzle, `"use server"`).

### Song Database Feature (`src/features/song-database/`)

Parallel to `src/components/features/` (legacy). Used in `MedleyView` for DB-backed song search.

- **`SongSearchModal`** — Searches `song_master` via `useSongSearch` hook with 5-tier scoring: exact (100) → startsWith (80) → wordMatch (60) → partialMatch (40) → fuzzyMatch (similarity > 0.6). On select, opens `SongEditModal` with prefill.
- **`useSongSearch`** (`src/features/song-database/hooks/`) — Client-side search with pagination + sort. When `query` is set, results are ordered by score; otherwise sorted by `sortKey`/`sortDir`. Legacy hook also exists at `src/hooks/useSongSearch.ts` — prefer the `features/` version.
- **`normalize.ts`** — `normalizeSongInfo(title, artist)` generates `dedupKey` (katakana→hiragana, lowercase). Used by both client search and `song_master.normalized_id`.
- **`SongDatabaseEntry.artist`** type is `Array<{ id: string; name: string }>` (from `song_artist_relations`), unlike `SongSection.artist` which is `string[]`. Don't conflate them.
- **`useAutoMatcher`** (`src/features/song-database/hooks/useAutoMatcher.ts`) — Lazy-loads the full song DB and computes best-match scores for `ParsedSetlistEntry[]` via `searchSongs()`. Adapts `.artist` from `{id,name}[]` to `string[]` before scoring. Returns `{ results: AutoMatchResult[], isLoading }`. Score thresholds: ≥80 = green (auto-confirm), 40–79 = yellow (needs review), <40 = no match.

### ImportSetlistModal (`src/components/features/medley/ImportSetlistModal.tsx`)

Enhanced for bulk import:
- **`prefillText?: string`** prop — auto-fills textarea when modal opens (used by "説明文から取り込む")
- **AI mode toggle** — calls `POST /api/import/parse-setlist/` (Gemini 1.5 Flash); falls back to regex with warning banner if `GEMINI_API_KEY` is unset or call fails
- **CSV/TSV tab** — paste or file-upload; auto-detects delimiter + header; column mapping by keyword (title/タイトル/曲名, artist/アーティスト, start/開始, end/終了)
- **DB auto-matching** — `useAutoMatcher` adds color-coded badges per row; confirm (✓) / reject (✕) buttons; confirmed rows get `songId` set on import
- `ParsedSetlistEntry` type lives in `src/features/medley/import/types.ts`

### LiveAnnotationBar (`src/features/medley/components/LiveAnnotationBar.tsx`)

Fixed-bottom bar for real-time annotation during playback (edit mode only in `MedleyView`):
- **Space** (focus outside input): marks current time as song start
- **Enter**: commits song (updates previous song's endTime, adds new song, clears title, keeps artist)
- **Tab**: cycles between title and artist fields
- **Ctrl+L**: exits live mode, sets last song's endTime to currentTime
- Activated via "ライブ入力" button in edit toolbar; controlled by `liveMode` in `player/store.ts`
- Props: `onClose`

### Library Page (`/library`)

`src/app/library/page.tsx` → `LibraryPageClient` — shows `song_master` with usage counts, duplicate detection (`src/lib/utils/duplicateSongs.ts`), and merge UI. Requires `force-dynamic`. `upsertArtist()` and `mergeDuplicateSongs()` are in `src/lib/utils/songDatabase.ts`.

### Player Adapter Pattern
`PlayerAdapter` interface (`src/features/player/adapters/types.ts`) abstracts `play()`, `pause()`, `seek(seconds)`, `setVolume()`, event handlers, etc. Implementations: `NicoPlayerAdapter` (postMessage) and `YouTubePlayerAdapter` (IFrame API).

### FixedPlayerBar (`src/components/features/player/FixedPlayerBar.tsx`)

Shared player bar used by both legacy pages. Key implementation details:
- **Drag-to-seek**: `onMouseDown` → `document.mousemove/mouseup` via `useEffect`. `isDraggingRef` (ref) + `dragTime` (state). Display position = `dragTime ?? currentTime`. Full-screen overlay during drag prevents text selection.
- **Hover tooltip**: `hoverTime` state + absolute tooltip above seek bar. Shows time at cursor position.
- **Mute state**: Local `isMuted` + `preMuteVolume` state in `FixedPlayerBar`. Passed to `VolumeSlider` via `onMuteToggle`/`isMuted` props. `VolumeSlider` speaker icon is a `<button>` with 3 SVG states (muted / low volume / normal).
- **Keyboard**: `role="slider"` + `tabIndex={0}` + `onKeyDown` (←/→ = ±5s).

### SongListGrouped (`src/components/features/medley/SongListGrouped.tsx`)

Song list used by both legacy pages (`MedleyPageClient`). Songs with the same `songId` (or same title+artist if `songId` is absent) are grouped into a single row showing all their segments.

- **Grouping**: `SongGroup { key, color, groupIndex, segments[] }`. Group key = `songId` if present, else `title|artist.join(",")`. Groups ordered by first-appearance (min `startTime`). Header shows `"N楽曲 (M区間)"` when any group has multiple segments, otherwise `"N曲"`.
- **×2 badge**: shown in indigo when `segments.length > 1`. Each segment gets its own time range + edit button in a vertical list.
- **Per-group mini-timeline** (`h-2` strip): one colored bar per segment in the group; red playhead shared. Minimum segment width `max(widthPct%, 3px)`. Click to seek.
- **Color system**: 10-color array `SONG_COLORS`, assigned by group index (`groupIndex % 10`). Stable as long as first-appearance order doesn't change.
- **Row states**: `bg-blue-50` (any segment active), `bg-orange-50` (any segment selected), `bg-red-50 opacity-60` (all segments beyond `actualPlayerDuration`).
- Row click: seeks to active segment's `startTime` if currently playing, else first segment's `startTime`.
- Do **not** revert to a flat per-song list — the grouped design with per-row mini-timelines is intentional UX.

### ID Architecture (3 distinct types)
| ID | Type | Purpose |
|----|------|---------|
| `song_master.id` | UUID | Primary key, FK references |
| `normalized_id` / `dedupKey` | string | Duplicate detection (katakana→hiragana) |
| `SongSection.id` | UUID | From `medley_songs.id`, app memory only |

`SongSection.songId` optionally references `song_master.id` for library linking.

## Database Schema

1. **`medleys`** — `id`, `video_id` (unique), `platform`, `title`, `creator`, `duration`, timestamps
2. **`song_master`** — `id`, `title`, `artist` (nullable, **legacy — NOT used for display**), `normalized_id` (unique), platform links, `description`, timestamps
3. **`artists`** — `id`, `name`, `normalized_name` (required, `name.toLowerCase()`), timestamps
4. **`song_artist_relations`** — `id`, `song_id` (FK→song_master), `artist_id` (FK→artists), `role` (`'artist'|'composer'|'arranger'`), `order_index`, `created_at`
5. **`medley_songs`** — `id`, `medley_id` (FK→medleys, cascade), `song_id` (FK→song_master, nullable), `start_time`/`end_time` (REAL, 0.1s), `order_index`, cached `title`/`artist`/`color`, platform links, timestamps
6. **`medley_edits`** — `id`, `medley_id` (FK), `song_id` (FK), `editor_nickname`, `action`, `changes` (JSONB), timestamp

`medley_songs.song_id` links to `song_master` for library integration. When registering songs, create `song_master` first, then set `medley_songs.song_id`.

### Artist Display Pipeline (CRITICAL)

`SongDatabaseEntry.artist` (shown in library UI) comes from `song_artist_relations` JOIN `artists` (role=`'artist'`), **NOT** from `song_master.artist`. The `song_master.artist` column is a legacy string, kept for historical reasons but not used for display.

- **To create/find an artist**: Use `upsertArtist(name: string)` in `src/lib/utils/songDatabase.ts` — handles `normalized_name = name.toLowerCase()` requirement automatically.
- **To update displayed artist on a song**: Delete existing `song_artist_relations` (role='artist') then insert new row with the artist ID from `upsertArtist()`.
- Falls back to `DEFAULT_ARTIST = "Unknown Artist"` when no relations exist.

### Duplicate Merge (`mergeDuplicateSongs`)

`mergeDuplicateSongs(targetId, sourceIds, overrides?)` in `src/lib/utils/songDatabase.ts` accepts `MergeOverrides`:
```typescript
export interface MergeOverrides {
  title?: string; artist?: string;
  niconicoLink?: string | null; youtubeLink?: string | null;
  spotifyLink?: string | null; applemusicLink?: string | null;
}
```
When `overrides.artist` is provided, the function updates `song_artist_relations` (not just `song_master.artist`) so the library reflects the change. Always pass `artist` in overrides when merging — even when unchanged — to ensure relations are synced.

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
GEMINI_API_KEY=...                     # Server-side only — for AI setlist parser (F1). Without it, AI mode falls back to regex with warning banner.
```

Production env vars set via Firebase console.

## Common Issues

- **Seek fails on Niconico**: Check `* 1000` millisecond conversion
- **PGRST204 error**: Code references a non-existent DB column; check `src/lib/supabase.ts` type definitions and run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor after migrations
- **Thumbnails not loading**: Check proxy API URLs have trailing slashes
- **Build failures**: Drizzle imports `net`/`tls` — never use in client components
- **Form state resets during playback**: Remove `currentTime` from useEffect deps
- **Stale production JS**: Firebase caches aggressively; use incognito
- **Static prerendering fails**: Pages using `useAuth` or sessionStorage must have `export const dynamic = "force-dynamic"`
- **Artist not updating after merge**: `song_master.artist` is NOT displayed in library; artist display comes from `song_artist_relations`. Use `upsertArtist()` + delete/insert on `song_artist_relations` to update. Updating `song_master.artist` alone has no visible effect.
- **MedleyView not loading in (app) route**: Requires `DATABASE_URL` for Drizzle HydrationBoundary prefetch. Without it, `fetchMedley` returns null and view shows "メドレーが見つかりません". Set `DATABASE_URL` in `.env.local` for local testing of `MedleyView`.
- **SongSearchModal not appearing on niconico/youtube pages**: Those pages use the legacy `MedleyPageClient`, not `MedleyView`. The new SongSearchModal (DB-backed search) only exists in `MedleyView`.
- **AI setlist parser returns error**: `GEMINI_API_KEY` not set in Firebase console → UI falls back to regex automatically with a warning banner. Set the key in Firebase App Hosting environment config.
- **「説明文から取り込む」shows no description on YouTube**: YouTube oEmbed doesn't include video descriptions. This is expected; button will show "この動画の説明文が見つかりませんでした".
- **LiveAnnotationBar Space key not working**: Space only marks time when focus is outside an input. If an input is focused, Space types a space character instead.
- **FixedPlayerBar drag seek not firing**: `document.mousemove/mouseup` listeners are registered in `useEffect` — ensure `onSeek` and `duration` are stable references or the effect re-registers correctly. The drag overlay (`pointer-events: all`) must cover the full viewport to capture fast mouse movements.

## Code Conventions

- Use `logger.debug/info/warn/error()` instead of `console.log` (`src/lib/utils/logger.ts`)
- **Never use raw `bg-blue-*` for action buttons** — always use `<Button>` from `src/components/ui/button`. Variants: `default` (orange, primary actions), `destructive` (red, deletes), `outline` (secondary), `secondary` (gray, auxiliary), `ghost` (toolbar/inline), `link`. Exception: `bg-blue-*` is allowed only for brand-color labels (e.g. Facebook) and non-interactive badges.
- Auth guard pattern: `authLoading ? <Loading /> : isAuthenticated ? <EditUI /> : <LoginPrompt />`
- Conditionally pass edit callbacks: `onEdit={isAuthenticated ? handleEdit : undefined}`
- All save operations require `nickname` parameter
- `Searchable` interface must accept `null` for `artist` field (Drizzle schema has `text("artist")` which is `string | null`)
- Modal upsert pattern: `const exists = songs.find(s => s.id === song.id); exists ? updateSong(id, song) : addSong(song)` — used in `handleModalSave` in MedleyView
