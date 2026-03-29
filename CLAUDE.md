# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design reference**: See [`TONMANUAL.md`](./TONMANUAL.md) for the full Tone & Manner guide — color system, typography, component patterns, voice & tone, and accessibility standards.

## Commands

### Development
- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint flat config (`eslint.config.mjs`, NOT `.eslintrc`; ignored during builds via `ignoreDuringBuilds: true`)
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
- **Node version**: Must use Node 20 (pinned in `.nvmrc`). Homebrew's Node (`/opt/homebrew/bin/node`) may differ from nvm — ensure `firebase` CLI resolves to nvm's Node 20: `PATH="$HOME/.nvm/versions/node/v20.19.3/bin:$PATH" firebase deploy --only hosting`
- **Cloud Run auto-updates disabled**: The Cloud Function uses `--runtime-update-policy=on-deploy` (not `automaticUpdatePolicy`). Do NOT re-enable automatic base image updates — it causes 409 revision conflicts during hosting finalize.

### Server Management
- `lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9` — Kill all dev servers
- Always stop dev servers after testing to prevent performance issues

### CI/CD (GitHub Actions)
- `.github/workflows/firebase-hosting-pull-request.yml` — Firebase preview deploy on PR
- `.github/workflows/firebase-hosting-merge.yml` — Production deploy on merge to main
- `.github/workflows/supabase-backup.yml` — Automated Supabase DB backups

## Project Overview

**Medlean** — Multi-platform medley annotation platform. Supports Niconico (full iframe integration), YouTube (full IFrame API integration), Spotify/Apple Music (thumbnails). Features: song list with playback tracking, advanced editing, nickname-based authentication, contributor tracking.

**Tech Stack**: Next.js 15.5.7, React 19, TypeScript, TailwindCSS 4, Supabase 2.45.0, Firebase Hosting, Zustand (state + temporal undo/redo via zundo), React Query v5, React Hook Form + Zod v4, Drizzle ORM (local dev only)

## Core Architecture

### Database Client Architecture

| Client | Location | Env Var | Works in Firebase? | Use Case |
|--------|----------|---------|-------------------|----------|
| **Supabase JS** | `src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_*` | Yes | All runtime paths (client, server, production) |
| **Drizzle ORM** | `src/lib/db/index.ts` | `DATABASE_URL` | **No** | `drizzle-kit` only (migrations, studio) — NOT used at runtime |

All runtime data fetching and mutations use Supabase JS via `src/lib/api/medleys.ts` and `src/features/medley/queries/functions-supabase.ts`. Drizzle is retained only for `drizzle-kit` tooling (schema management, studio). The Drizzle client uses a lazy Proxy init to avoid throwing at build time.

### Component Architecture

**MedleyView** — `src/features/medley/components/MedleyView.tsx`:
- Rendered by both `src/app/niconico/[videoId]/page.tsx` and `src/app/youtube/[videoId]/page.tsx`
- Server pages prefetch data via Supabase JS with `HydrationBoundary` + React Query
- Zustand stores for timeline and UI state; React Query mutations for saves
- Player abstracted via `PlayerAdapter` interface (`src/features/player/adapters/types.ts`)
- `handleAddSong` opens `SongSearchModal` → user selects from DB → `SongEditModal` opens with `prefill`
- **Keyboard shortcuts** (edit mode): `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo — skipped when INPUT/TEXTAREA focused
- `FixedPlayerBar` rendered at bottom (hidden during live annotation mode)
- **PiP mode**: Video can be toggled to picture-in-picture (draggable via `useDraggable` hook). Position resets to bottom-right on mode exit.
- **Viewport-constrained layout**: Video player capped at `max-h-[50vh]`, main content area uses CSS custom properties (`--header-height`, `--breadcrumb-height`) for viewport calc so the entire page fits without scrolling on 1080p screens. Layout dimensions are centralized in `src/app/globals.css` `:root`.

### Unified Page Layout

All non-player pages follow this exact DOM structure pattern:
```tsx
<>
  <AppHeader />
  <div className="min-h-screen bg-[var(--background)] pt-[var(--header-height)]">
    <div className="max-w-[var(--content-max-w-TYPE)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page content */}
    </div>
  </div>
</>
```

Key rules:
- **AppHeader is always OUTSIDE the content wrapper** — wrapped in a Fragment, never nested inside the `min-h-screen` div.
- **Header**: White `AppHeader` (default variant `"home"`). Only player pages (`variant="player"`) use the dark header.
- **Header inner max-width**: Always `--content-max-w-wide` (80rem) for non-player pages — matches the widest content page (Library).
- **Background**: `bg-[var(--background)]` (`#fffbf7` warm white) — never use `bg-gray-50`, `bg-gray-100`, or gradients for page backgrounds.
- **Vertical padding**: `py-8` on all non-player pages (no exceptions).
- **Max-width tiers** (CSS custom properties in `globals.css`):

| Tier | CSS Variable | Value | Pages |
|------|-------------|-------|-------|
| Player | `--content-max-w-player` | 1920px | Niconico, YouTube |
| Home | `--content-max-w-home` | 72rem | Home |
| Wide | `--content-max-w-wide` | 80rem | Library, Stats |
| Narrow | `--content-max-w-narrow` | 56rem | Settings, Profile, Version, Privacy, Terms |

Legal pages (Privacy, Terms) use client components (`PrivacyPageClient`, `TermsPageClient`) with `AppHeader` and `force-dynamic`.

All new code goes in `src/features/`. Legacy `src/components/features/` retains only `ImportSetlistModal` and library components still used by active pages.

### Zustand Stores (3 stores in `src/features/`)

- **`medley/store.ts`** — Timeline songs + selection, with `temporal` + `immer` + `devtools` middleware (undo/redo limit 50). Only `songs` array is tracked for undo (not selection). Access via `useTimelineStore()` + `useTimelineHistory()`.
  - Store API: `setSongs(songs)`, `addSong(song)`, `updateSong(id, partial)`, `deleteSong(id)`, `selectSong(id|null)`, `reorderSongs(songIds[])`
  - Inside `useCallback`, use `useTimelineStore.getState().updateSong(...)` (imperative) instead of the hook to avoid stale closures
- **`medley/store-ui.ts`** — Modal state (`openModal: ModalId | null`), edit mode toggle. Modal IDs: `"songEdit"`, `"songSearch"`, `"manualAdd"`, `"login"`, `"restore"`, `"createMedley"`, `"importSetlist"`.
  - Open with data: `openModalWith("songEdit", { song })` — read back via `(modalData.song as SongSection) ?? null`
  - New song: `openModalWith("songEdit", { song: null, isNew: true })` — modal checks `isNew={!modalData.song}`
  - Prefilled new song (from SongSearchModal): `openModalWith("songEdit", { song: null, isNew: true, prefill: { title, artist: string[] } })` — `SongEditModal` reads `prefill` prop to pre-populate title/artist fields
- **`player/store.ts`** — Playback state + adapter dispatch. Use fine-grained selectors `useCurrentTime()`, `useIsPlaying()`, `useDuration()`, `useVolume()`, `useLiveMode()` to minimize re-renders. Includes `liveMode: boolean` + `setLiveMode()` for live annotation mode.
  - **Adapter registration**: `usePlayer` hook calls `registerAdapter({ play, pause, seek, setVolume, toggleFullscreen })` on mount, `unregisterAdapter()` on cleanup. This exposes player controls globally.
  - **Public dispatch**: `play()`, `pause()`, `seek(time)`, `togglePlayPause()`, `toggleFullscreen()` — delegate to `_adapter` (null-safe). Call via `usePlayerStore.getState().seek(time)` from any component (e.g., `FixedPlayerBar`, `SongList`).
  - **IMPORTANT**: For seek, always use `usePlayerStore.getState().seek(time)` (dispatches to adapter + updates state), NOT `setCurrentTime(time)` (state-only, doesn't move the player).

### Provider Hierarchy (`src/app/providers.tsx`)
QueryClientProvider (staleTime 60s, retry 1) → AuthProvider → Toaster → children (+ ReactQueryDevtools)

### Auth System (`src/features/auth/context`)
Single shared password (`EDIT_PASSWORD` env var, server-side only) + user nicknames. No registration. Session via sessionStorage. API: `/api/auth/verify-password/` with rate limiting (5 attempts/10 min). Import: `import { useAuth } from "@/features/auth/context"`.

### Route Architecture
- **`src/app/niconico/[videoId]/page.tsx`** and **`src/app/youtube/[videoId]/page.tsx`** render `MedleyView` with Supabase JS `HydrationBoundary` prefetch
- Pages using `useAuth` need `export const dynamic = "force-dynamic"`

### Data Flow
1. **Server → Client**: Page prefetches with Supabase JS (`functions-supabase.ts`) → React Query `HydrationBoundary` → client hydrates
2. **Edit flow**: User edits Zustand store → Save mutation (`saveMedley-supabase.ts`) → Supabase JS → query cache invalidated → store synced
3. **External APIs** (Niconico thumbnails/metadata, Spotify thumbnails) proxied through `src/app/api/` to avoid CORS

CRUD for medleys is in `src/lib/api/medleys.ts` (Supabase JS, handles validation + sanitization); query wrappers in `src/features/medley/queries/functions-supabase.ts`.

### Color Extraction API (`/api/color/extract/`)

Extracts a dominant color from song thumbnails for UI accent colors. Resolves platform links to thumbnails (Niconico CDN → YouTube → Spotify oEmbed), runs through node-vibrant, then converts to pastel via `toPastelHex()` (`src/lib/utils/color.ts`).

**3-pass cascade algorithm**:
1. Named swatches (Vibrant → DarkVibrant → LightVibrant → Muted → DarkMuted → LightMuted) — skip skin tones (hue 10-50°, moderate sat) and low saturation (<15%)
2. Quantized colors scored by `sat² × pop⁰·⁵` (saturation-dominant) — filter: sat > 0.35, lightness 0.1-0.9, no skin tones
3. Fallback: any non-null named swatch (skin tone acceptable)

Result stored in `medley_songs.color`. Batch update: `node scripts/batch-update-colors.js` (hits production API, `--dry-run` for preview).

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

### Stats Page (`/stats`) — `src/features/stats/`

5-tab analytics dashboard (概要 / 楽曲 / アーティスト / メドレー / 探索). No auth required.

- **Data layer**: `src/lib/api/stats.ts` — fetches all tables via Supabase JS, aggregates client-side (data is small enough). Uses `buildArtistMap()` for proper artist display from `song_artist_relations`.
- **Hooks**: `src/features/stats/hooks/useStatsData.ts` — React Query hooks with 5-minute staleTime. Each tab calls only the hooks it needs.
- **Charts**: Recharts (`recharts` package) — `ResponsiveContainer` wraps all charts. Chart components in `src/features/stats/components/charts/`.
- **Explorer tab**: Two modes — CrossTabBuilder (dynamic chart generation from data source + axis selection) and QueryBuilder (WHERE-clause filtering on raw table data). Both operate on `getAllRawData()` results client-side.
- **Types**: `src/features/stats/types.ts` — includes `DIMENSION_OPTIONS`, `TABLE_COLUMNS`, `OPERATOR_LABELS` constants.

### Library Page (`/library`)

`src/app/library/page.tsx` → `LibraryPageClient` — shows `song_master` with usage counts, duplicate detection (`src/lib/utils/duplicateSongs.ts`), and merge UI. Requires `force-dynamic`. `upsertArtist()` and `mergeDuplicateSongs()` are in `src/lib/utils/songDatabase.ts`.

### Song List Grouping (View Mode Only)

`src/features/medley/utils/groupSongs.ts` — In view mode, `SongList` groups sections sharing the same `songId` into a single `GroupedSongRow` with a multi-segment position bar. Edit mode always shows individual rows. View mode hides time ranges (`0:46→1:07`) for a cleaner display; edit mode shows them. `findNearestSection(sections, currentTime)` determines which section to seek when a grouped row is clicked. Types: `GroupedSongRow | SingleSongRow` → `SongListRow`.

### Player System (`src/features/player/`)

**Adapter pattern**: `PlayerAdapter` interface (`adapters/types.ts`) abstracts `play()`, `pause()`, `seek(seconds)`, `setVolume()`, event handlers. Implementations: `NicoPlayerAdapter` (postMessage) and `YouTubePlayerAdapter` (IFrame API).

**Key components**:
- **`VideoPlayer`** — Wrapper for Niconico/YouTube iframe embeds with loading, error, and retry states. `overlay` prop enables PiP styling.
- **`FixedPlayerBar`** — Fixed-bottom player bar (`fixed bottom-0 z-50`). 3-column layout: title/creator | playback controls + seek bar | volume + fullscreen. Hidden when `liveMode && isEditMode`.
- **`RightSidebar`** — Shows currently playing songs (via `useCurrentTrack`), deduplicates by title, displays thumbnails with full-width progress bar flush under each thumbnail, and platform links.

**Key hooks** (`hooks/`):
- **`usePlayer`** — Creates/registers `PlayerAdapter`, manages lifecycle and event subscriptions.
- **`useCurrentTrack(songs)`** — Returns `SongSection[]` matching `currentTime` (supports overlapping segments).
- **`useDraggable()`** — Pointer events-based drag hook for PiP window. Returns `{ position, isDragging, handlePointerDown, resetPosition }`. Skips drag on `button`/`a`/`[role="button"]` clicks. Clamps to viewport.

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
DATABASE_URL=postgresql://...          # Optional: only for drizzle-kit (migrations, studio) — NOT used at runtime
GEMINI_API_KEY=...                     # Server-side only — for AI setlist parser (F1). Without it, AI mode falls back to regex with warning banner.
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...    # Optional: GA4 measurement ID. Without it, analytics script is not loaded.
# Debug (development only)
NEXT_PUBLIC_DEBUG_LOGS=true            # Optional: enable debug logging
NEXT_PUBLIC_DEBUG_BYPASS_AUTH=true     # Optional: bypass auth on localhost
NEXT_PUBLIC_DEBUG_PASSWORD=...         # Optional: debug mode via ?debug=true&debug_key=...
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
- **AI setlist parser returns error**: `GEMINI_API_KEY` not set in Firebase console → UI falls back to regex automatically with a warning banner. Set the key in Firebase App Hosting environment config.
- **「説明文から取り込む」shows no description on YouTube**: YouTube oEmbed doesn't include video descriptions. This is expected; button will show "この動画の説明文が見つかりませんでした".
- **LiveAnnotationBar Space key not working**: Space only marks time when focus is outside an input. If an input is focused, Space types a space character instead.
- **Firebase deploy 409 "Failed to replace Run service"**: Cloud Run's `automaticUpdatePolicy` causes revision naming conflicts during hosting finalize. Fix: `gcloud functions deploy ssranasuie6f49 --gen2 --region=asia-northeast1 --project=anasui-e6f49 --runtime-update-policy=on-deploy --source=.firebase/anasui-e6f49/functions --entry-point=ssranasuie6f49 --runtime=nodejs20 --trigger-http`
- **Firebase deploy uses wrong Node version**: Homebrew Node (`/opt/homebrew/bin/node`) may be v24+ while `firebase-frameworks` requires `^16 || ^18 || ^20 || ^22`. Ensure nvm Node 20 is first in PATH when running `firebase deploy`.

## Code Conventions

- Use `logger.debug/info/warn/error()` instead of `console.log` (`src/lib/utils/logger.ts`)
- **Never use `blue-*` outside debug panels** — use `indigo-*` for info/tabs/metadata, `orange-*` for focus rings/brand. Always use `<Button>` from `src/components/ui/button` for action buttons. Variants: `default` (orange, primary actions), `destructive` (red, deletes), `outline` (secondary), `secondary` (gray, auxiliary), `ghost` (toolbar/inline), `link`.
- **Focus rings**: `focus:ring-orange-500` (inputs) or `focus-visible:ring-ring` (buttons). Never `focus:ring-blue-500`.
- **Info/metadata backgrounds**: `bg-indigo-50` + `text-indigo-700`. Never `bg-blue-50`.
- **Semantic colors**: Success=Mint, Warning=Amber, Error=Red, Info=Indigo. See TONMANUAL.md §2.
- Auth guard pattern: `authLoading ? <Loading /> : isAuthenticated ? <EditUI /> : <LoginPrompt />`
- Conditionally pass edit callbacks: `onEdit={isAuthenticated ? handleEdit : undefined}`
- All save operations require `nickname` parameter
- `Searchable` interface must accept `null` for `artist` field (Drizzle schema has `text("artist")` which is `string | null`)
- Modal upsert pattern: `const exists = songs.find(s => s.id === song.id); exists ? updateSong(id, song) : addSong(song)` — used in `handleModalSave` in MedleyView

## Additional Documentation
- [`TONMANUAL.md`](./TONMANUAL.md) — Full design system: color palette, typography, component patterns, voice & tone
- [`docs/TECHNICAL_REFERENCE.md`](./docs/TECHNICAL_REFERENCE.md) — Detailed technical specs and architecture
- [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) — Comprehensive troubleshooting guide
- [`CHANGELOG.md`](./CHANGELOG.md) — Version history
