# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Prerequisites**: Node.js 18.0.0+, Firebase CLI (`npm install -g firebase-tools`)

### Development
- `npm run dev` - Start development server (http://localhost:3000)
- `ps aux | grep "next-server" | grep -v grep` - Check running dev servers
- `lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9` - Kill all dev servers

### Build & Quality
- `npm run build` - Build production app
- `npm run lint` - Run ESLint checks (note: ignored during builds via `ignoreDuringBuilds: true`)
- `npx tsc --noEmit` - TypeScript type checking
- `npm run build && npx tsc --noEmit && npm run lint` - Pre-deployment validation

**Dependency Management**:
- Use exact versions (no `^` prefix) for critical dependencies like `@supabase/supabase-js` to prevent unexpected upgrades
- After `npm install`, verify `package-lock.json` shows the exact intended version
- Use `npm ci` instead of `npm install` in CI/CD to ensure lockfile is respected

### Deployment
- `firebase deploy --only hosting` - Deploy to production

### Database Backup & Recovery
- `./scripts/backup-database.sh` - Create manual database backup
- `./scripts/restore-database.sh database/backups/backup_YYYYMMDD_HHMMSS.tar.gz` - Restore from backup
- **Automated backups**: Run daily at 3:00 AM JST via GitHub Actions
- **Backup location**: `database/backups/` (30 most recent backups retained)
- **Connection string**: Use Session Pooler (`aws-1-ap-northeast-1.pooler.supabase.com:5432`)
- See [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) for complete disaster recovery procedures

**IMPORTANT**: Always stop dev servers after testing to prevent performance issues

## Testing Strategy
- No automated tests - manual testing only
- Development: http://localhost:3000
- **CRITICAL**: Always verify in production (https://anasui-e6f49.web.app)
- Production differs in: SSR behavior, CORS policies, iframe communication

## Project Overview

**Medlean** - Multi-platform medley annotation platform built with Next.js. Supports Niconico (full integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, nickname-based authentication, contributor tracking, immediate save system.

**Tech Stack**: Next.js 15.5.4 + React 19.0.0 + TypeScript, TailwindCSS 4, Supabase 2.45.0 (database), Firebase Hosting

**Status**: Alpha v0.1.0-alpha.1 with password-protected editing

**Security Status**:
- Next.js 15.5.4: CVE-2025-29927 (CVSS 9.1) fixed - Critical middleware auth bypass vulnerability
- Supabase 2.45.0: Intentionally maintained (newer versions have breaking type changes)
- Run `npm audit` regularly; 2 low-severity vulnerabilities (Supabase auth-js) are acceptable

**Supabase Client Version**: `@supabase/supabase-js@2.45.0` - Do NOT upgrade without testing thoroughly, as newer versions may have breaking type changes

## Core Architecture

### Authentication System
- **Password-based authentication**: Single shared password (`EDIT_PASSWORD` env var) with user-provided nicknames
- **No registration required**: Users enter nickname + password to edit
- **Session persistence**: Uses sessionStorage for maintaining login state
- **Contributor tracking**: All edits record editor nickname in database (`medley_edits` table)
- **AuthContext** (`src/contexts/AuthContext.tsx`): Provides `isAuthenticated`, `nickname`, `login()`, `logout()`
- **API verification**: `/api/auth/verify-password/` with rate limiting (5 attempts/10 min)

### Video Player Integration
- **useNicoPlayer**: Manages Niconico iframe postMessage communication
- **useMedleyEdit**: Timeline editing with immediate save system and editor tracking
- **usePlayerPosition + useMousePosition**: Real-time collision detection for ActiveSongPopup
- **useCurrentTrack**: Determines which song is playing based on current time
- **useMedleyData + useMedleyDataApi**: Data fetching with optimistic UI pattern
  - `loading`: Initial page load only (triggers full loading screen)
  - `isRefetching`: Background data sync (UI remains visible)
  - `isInitialLoad`: Internal flag to distinguish first load from refetch
- Platform-specific players in `app/[platform]/[videoId]/` routes

### API Proxy Pattern
All external API calls must go through Next.js API routes due to CORS:
- Niconico thumbnails: `/api/thumbnail/niconico/[videoId]/`
- Niconico metadata: `/api/metadata/niconico/[videoId]/`
Pattern: Server-side fetch → Process response → Return to client

## Critical Constraints

### Firebase Configuration
- **MUST** use `trailingSlash: true` in next.config.ts
- **MUST** include trailing slashes in API URLs: `/api/thumbnail/niconico/${id}/`
- Reason: Firebase Hosting auto-adds slashes causing redirect loops

### Niconico Player Integration
- **NEVER** use `sandbox` attribute on iframe (blocks postMessage)
- **MUST** convert seconds to milliseconds for Niconico API (`time * 1000`)
- **MUST** use `commandInProgress` flag to prevent command overlap

### Authentication Requirements
- **MUST** check `isAuthenticated` AND `authLoading` before showing edit UI
- **MUST** pass `nickname` parameter to all save operations
- Edit operations: `saveMedley(videoId, title, creator, duration, nickname)`
- Immediate save callbacks: Provide `onAfterAdd`, `onAfterUpdate`, `onAfterDelete`, `onAfterBatchUpdate` to useMedleyEdit
- Environment variable: `EDIT_PASSWORD` (server-side only, no `NEXT_PUBLIC_` prefix)
- **CRITICAL**: Use `authLoading ? <Loading /> : isAuthenticated ? <EditUI /> : <LoginPrompt />` pattern to prevent UI flicker

### API Proxy Requirements
- Use proxy APIs for CORS: `/api/thumbnail/niconico/[videoId]/` and `/api/metadata/niconico/[videoId]/`
- **MUST** include User-Agent header for Niconico API calls
- Server-side XML parsing uses regex (not DOMParser)

## Architecture Patterns

### Authentication Flow
1. Anonymous: Read-only access
2. Authenticated: Full edit access after password verification
3. Contributors tracked: All edits record editor nickname
4. Session persisted: Login state maintained across page loads

### Immediate Save System
- Operations (add/edit/delete) trigger immediate save to database
- Validates songs before saving (no empty titles/artists)
- Requires authentication and nickname for operation
- After save completes, data is refetched from database to ensure consistency
- No debouncing - changes are saved instantly upon operation completion
- **Optimistic UI**: Uses `isRefetching` flag to prevent loading screen during refetch
  - `loading`: Only true on initial page load
  - `isRefetching`: True during background data sync (UI stays visible)
  - Small blue banner shows "データを同期中..." during refetch

### useMedleyEdit State Management
- **Three state layers**: `originalSongs` (from parent/server), `editingSongs` (local edits), `hasChanges` (dirty flag)
- **State synchronization**: useEffect syncs `originalSongs` → `editingSongs` only when:
  1. Content actually differs (JSON.stringify comparison)
  2. User is NOT editing (`editingSongs.length > 0 && originalSongs.length === 0` guard)
  3. NOT currently saving (`!isSaving` guard at line 441)
  4. NOT currently refetching (`!isRefetching` guard at line 441)
- **Immediate save flow**: Operation completes → Callback triggers → Save to DB → Refetch from DB → State updates
- **Callback system**: Use `onAfterAdd`, `onAfterUpdate`, `onAfterDelete`, `onAfterBatchUpdate` props
- **Guard conditions prevent**: Race conditions between save completion and parent refetch

### React State Management with Continuous Updates
**CRITICAL**: When components receive continuous prop updates (e.g., `currentTime` from video playback), carefully manage useEffect dependencies to prevent form state resets:

- **Problem Pattern**: Including rapidly-updating props in useEffect dependency arrays causes the effect to run repeatedly, resetting form state
- **Example**: `SongEditModal.tsx:307` previously had `currentTime` in dependency array, causing form inputs to reset every ~100ms during playback
- **Solution**: Only include dependencies that should trigger re-initialization
  - If a prop is only needed for initial render calculation, reference it directly without adding to dependency array
  - Add `eslint-disable-next-line react-hooks/exhaustive-deps` with explanatory comment
  - Document WHY the dependency is omitted (e.g., "currentTime only needed for initial render, not re-renders")

**Pattern**:
```typescript
// ❌ BAD: currentTime causes form reset during playback
useEffect(() => {
  setFormData(song);
}, [song, currentTime]); // currentTime updates every 100ms!

// ✅ GOOD: currentTime used directly, not in deps
useEffect(() => {
  setFormData({
    ...song,
    startTime: isNew ? currentTime : song.startTime  // Direct reference
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [song, isNew]); // currentTime NOT in deps - only for initial render
```

**When to be cautious**:
- Video player `currentTime` updates (every ~100ms)
- Mouse position tracking (continuous events)
- Animation frame updates
- Any prop that updates multiple times per second

### Timeline Rendering for Multi-Segment Songs
**CRITICAL**: When a song appears multiple times in a medley, segments must be displayed in multiple rows within one section, NOT overlapping.

- **Problem Pattern**: Fixed positioning (`top-1`) causes all segments to overlap when a song has multiple occurrences
- **Solution**: Dynamic height calculation and vertical positioning based on segment index
  - Container height: `${group.segments.length * 32}px` (32px per segment)
  - Segment positioning: `top: ${segmentIndex * 32 + 2}px`
  - Segment height: Fixed `h-7` (28px) with 4px total margin
  - Location: `src/components/features/medley/SongListGrouped.tsx`

**Pattern**:
```typescript
// ❌ BAD: Fixed positioning causes overlap
<div className="h-8">
  {segments.map(segment => (
    <div className="absolute top-1 h-6" />
  ))}
</div>

// ✅ GOOD: Dynamic positioning for multi-row layout
<div style={{ height: `${group.segments.length * 32}px` }}>
  {segments.map((segment, segmentIndex) => (
    <div
      className="absolute h-7"
      style={{ top: `${segmentIndex * 32 + 2}px` }}
    />
  ))}
</div>
```

### Keyboard Shortcuts
- **Spacebar**: Play/pause (global, disabled in inputs/modals)
- **S/E/M keys**: Start/End time, Add song (edit mode only)
- **Ctrl+Z/Y**: Undo/Redo (edit mode only)

### Component Requirements
- Use `logger.debug/info/warn/error()` instead of console.log
- Always include `displayName` for production builds
- Use unique keys for dynamic components
- Check authentication before rendering edit controls

## Common Issues

### Player Issues
- **Seek fails**: Check millisecond conversion (`* 1000`)
- **iframe not responding**: Verify postMessage origin and no sandbox attribute
- **Duration mismatch**: Use `actualPlayerDuration` for timeline

### Authentication Issues
- **Edit buttons missing**: Verify user is authenticated via `useAuth()`
- **Password verification fails**: Check `EDIT_PASSWORD` in `.env.local` (dev) or Firebase env (prod)
- **Session lost**: sessionStorage clears on browser close (expected behavior)
- **Rate limiting**: Max 5 login attempts per 10 minutes

### API Issues
- **Thumbnails not loading**: Check proxy API with trailing slash
- **CORS errors**: Must use server-side proxy, not direct API calls
- **Metadata fails**: Verify User-Agent header and regex parsing

### Database Issues
- **PGRST204 error ("column not found in schema cache")**: Check that INSERT/UPDATE operations don't reference non-existent columns (e.g., `links` column doesn't exist in `songs` table)
- **400 Bad Request from Supabase**: Inspect network request URL for `?columns=...` parameter - ensure all column names exist in the actual database schema
- **Type errors after Supabase client upgrade**: Update Database type definitions in `src/lib/supabase.ts` to match actual schema
- **Schema mismatch**: Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor to refresh PostgREST schema cache (though this won't fix code referencing non-existent columns)

### Timeline Issues
- **Keyboard shortcuts not working**: Check edit mode active and no input focus
- **Immediate save not triggering**: Verify authenticated, valid song data, and callbacks provided to useMedleyEdit
- **Undo/Redo broken**: Check keyboard listeners in edit mode only
- **Songs disappearing after operation**: Verify immediate save callback and refetch are working correctly
- **EditingSongs reset unexpectedly**: Verify useEffect guard conditions (`!isSaving`, `!isRefetching`, `!hasChanges`) in useMedleyEdit:441
- **Loading screen appears during song edit**: Ensure `isRefetching` flag is used (not `loading`) for background sync
- **Form inputs reset during video playback**: Check that `currentTime` is NOT in useEffect dependency arrays for form initialization (see "React State Management with Continuous Updates" section)
- **Edits not saving during playback**: Verify form state preservation and guard conditions in both SongEditModal and useMedleyEdit
- **Multiple segments overlapping**: For songs with multiple occurrences, ensure dynamic height and positioning (see "Timeline Rendering for Multi-Segment Songs" section in SongListGrouped.tsx)

### Production Issues
- **Component missing**: Check displayName and module-level logging
- **ActiveSongPopup hidden**: Verify collision detection uses 116px popup zone
- **Build failures**: Run `npm run build + npx tsc --noEmit + npm run lint`

## File Structure

```
src/
├── app/ - Next.js App Router
│   ├── api/auth/verify-password/ - Password verification endpoint
│   └── [platform]/[videoId]/ - Platform-specific player pages
├── components/
│   ├── features/
│   │   ├── auth/ - LoginModal component
│   │   ├── medley/ - Medley editing, ContributorsDisplay
│   │   └── player/ - NicoPlayer, YouTubePlayer
│   ├── layout/ - AppHeader with login/logout UI
│   ├── pages/ - MedleyPlayer, HomePageClient
│   └── ui/ - Reusable components
├── contexts/
│   └── AuthContext.tsx - Authentication state management
├── hooks/ - useMedleyEdit (with editor tracking), useNicoPlayer
├── lib/
│   ├── api/medleys.ts - Medley CRUD with nickname parameters
│   └── utils/ - Logger, thumbnail, video metadata
└── types/ - TypeScript definitions
```

## Development Workflow

1. **Local**: `npm run dev` (http://localhost:3000)
2. **Type/Lint**: `npx tsc --noEmit && npm run lint`
3. **Build**: `npm run build`
4. **Deploy**: `firebase deploy --only hosting`
5. **Verify**: Test on https://anasui-e6f49.web.app

**CRITICAL**: Always test features in production - SSR/CORS/iframe behavior differs from local.

## Environment Variables

### Development (.env.local)
```bash
EDIT_PASSWORD="your-secure-password-here"
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Production (Firebase Console)
Set via Firebase console or CLI:
- `EDIT_PASSWORD` - Server-side password for authentication (DO NOT use `NEXT_PUBLIC_` prefix)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**IMPORTANT**:
- Never add `NEXT_PUBLIC_` prefix to `EDIT_PASSWORD` (server-side only)
- Actual values are in `.env.local` (not committed to git)
- Production values fallback to hardcoded defaults in `next.config.ts` if env vars not set

## Database Setup

Run migrations in Supabase Dashboard (database/migrations/) **in order**:
1. `003_fix_rick_astley_medley.sql` - Platform corrections
2. `004_add_rick_astley_song_data.sql` - Sample data
3. `006_create_medley_edit_history.sql` - Edit history tracking
4. `010_remove_auth_system.sql` - Remove Google OAuth authentication
5. `011_add_contributor_tracking.sql` - Add password-based contributor tracking

**Optional migrations** (soft delete & enhanced audit logging):
- `012_add_soft_delete.sql` - 30-day recovery window for deleted records
- `013_enhance_audit_log.sql` - IP address, user agent, session tracking

Core tables: `medleys`, `songs`, `medley_edits`

### Backup & Recovery System

**Automated backups** run daily at 3:00 AM JST via GitHub Actions:
- Backs up schema, data, and roles
- Stores in `database/backups/` (30 most recent kept)
- Triggers: Daily schedule, manual via GitHub Actions, on migration changes

**Manual operations**:
```bash
# Create backup
./scripts/backup-database.sh

# Restore from backup
./scripts/restore-database.sh database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

**GitHub Secret required**: `SUPABASE_DB_URL` (Session Pooler connection string)
- Format: `postgresql://postgres.PROJECT_ID:PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`
- **Critical**: Must use Session Pooler (port 5432), not Direct Connection or Transaction Pooler
- See [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) for complete procedures

**IMPORTANT**: The `songs` table does NOT have a `links` column. If you see PGRST204 errors mentioning "column not found in schema cache", verify that INSERT/UPDATE operations don't reference non-existent columns.

**Database Schema Notes**:
- `medleys`: video_id, title, creator, duration, user_id, last_editor, last_edited_at
- `songs`: medley_id, title, artist, start_time, end_time, color, genre, original_link, order_index, last_editor, last_edited_at (NO `links` column)
- `medley_edits`: medley_id, editor_nickname, edit_timestamp, edit_type

**Authentication Evolution**:
- Originally used Google OAuth (migrations 001-009)
- Migration 010 removed OAuth system for open access
- Migration 011 added password-based authentication with nickname tracking
- Current system: Single shared password + user-provided nicknames

## Security Patterns

```typescript
// Check authentication for edits
const { isAuthenticated, nickname } = useAuth();
if (editOperation && !isAuthenticated) {
  setLoginModalOpen(true);
  return;
}

// Use logger, not console
logger.debug('Operation completed', data);

// Pass nickname to save operations
await saveMedley(videoId, title, creator, duration, nickname || undefined);

// Conditional edit UI rendering
onAddSong={isAuthenticated ? handleAddNewSong : undefined}
onEditSong={isAuthenticated ? handleEditSongClick : undefined}

// Immediate save pattern with callbacks
const handleImmediateSave = useCallback(async () => {
  if (!isAuthenticated || !nickname) return;
  const success = await saveMedley(videoId, title, creator, duration, nickname);
  if (success) await refetch(); // Refetch latest data from DB
}, [isAuthenticated, nickname, videoId, title, creator, duration, saveMedley, refetch]);

// Pass callbacks to useMedleyEdit
const { editingSongs, addSong, updateSong, deleteSong } = useMedleyEdit({
  originalSongs: medleySongs,
  onSaveSuccess: refetch,
  onAfterAdd: handleImmediateSave,
  onAfterUpdate: handleImmediateSave,
  onAfterDelete: handleImmediateSave,
  onAfterBatchUpdate: handleImmediateSave
});
```

## Debugging Database Issues

When encountering database errors, follow this systematic approach:

1. **Check Network Tab in Browser DevTools**:
   - Filter by "Fetch/XHR" to see Supabase API calls
   - Look for failed requests (400, 404, 500 status codes)
   - Inspect the request URL for `?columns=...` parameter
   - Check response headers for `proxy-status` (e.g., `PostgREST; error=PGRST204`)

2. **Verify Database Schema**:
   - Open Supabase Dashboard → Database → Tables
   - Compare INSERT/UPDATE operations in code with actual table columns
   - Common issue: Code references columns that were removed or never existed

3. **Check Supabase Client Version**:
   - Inspect network request headers for `x-client-info: supabase-js-web/X.Y.Z`
   - Verify it matches `package.json` version
   - If mismatch, run `rm -rf node_modules package-lock.json && npm install`

4. **Validate TypeScript Types**:
   - Check `src/lib/supabase.ts` Database type definitions
   - Ensure Row/Insert/Update types match actual schema
   - Run `npx tsc --noEmit` to catch type errors before runtime

5. **Test in Production**:
   - Always verify fixes in production (https://anasui-e6f49.web.app)
   - Production uses different Supabase instance and may have schema differences
   - Check Chrome DevTools console for error messages

## Key Implementation Details

### LoginModal Integration
- Import: `import LoginModal from "@/components/features/auth/LoginModal"`
- State: `const [loginModalOpen, setLoginModalOpen] = useState(false)`
- Usage: Show modal when unauthenticated users attempt edits
- Callback: `onLoginSuccess` to proceed with edit action after successful login

### Edit History Display
- Component: `ContributorsDisplay` shows edit history timeline (not ranking)
- Data: Fetched via `getMedleyEditHistory(medleyId, limit)` function
- Display: Shows chronological timeline of edits (latest first) with:
  - Editor nickname with avatar
  - Action type (create, update, add_song, etc.) with color coding
  - Relative timestamp
  - Change details (title, song count)
- **Important**: No ranking or competitive elements (no "top contributor" badges or edit count competition)
- Location: Below song list in MedleyPlayer
- Props: `editHistory` (MedleyEditHistory[]), `lastEditor`, `lastEditedAt`

### Rate Limiting
- Server-side tracking via in-memory Map (per IP address)
- 5 attempts per 10-minute window
- 429 status code on rate limit exceeded
- Auto-cleanup of expired rate limit entries
