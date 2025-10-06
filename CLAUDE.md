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

### Deployment
- `firebase deploy --only hosting` - Deploy to production

**IMPORTANT**: Always stop dev servers after testing to prevent performance issues

## Testing Strategy
- No automated tests - manual testing only
- Development: http://localhost:3000
- **CRITICAL**: Always verify in production (https://anasui-e6f49.web.app)
- Production differs in: SSR behavior, CORS policies, iframe communication

## Project Overview

**Medlean** - Multi-platform medley annotation platform built with Next.js. Supports Niconico (full integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, nickname-based authentication, contributor tracking, immediate save system.

**Tech Stack**: Next.js 15.2.1 + React 19.0.0 + TypeScript, TailwindCSS 4, Supabase (auth/database), Firebase Hosting

**Status**: Alpha v0.1.0-alpha.1 with password-protected editing

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
- **useMedleyData + useMedleyDataApi**: Data fetching and state management for medley information
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

### useMedleyEdit State Management
- **Three state layers**: `originalSongs` (from parent/server), `editingSongs` (local edits), `hasChanges` (dirty flag)
- **State synchronization**: useEffect syncs `originalSongs` → `editingSongs` only when:
  1. Content actually differs (JSON.stringify comparison)
  2. User is NOT editing (`editingSongs.length > 0 && originalSongs.length === 0` guard)
- **Immediate save flow**: Operation completes → Callback triggers → Save to DB → Refetch from DB → State updates
- **Callback system**: Use `onAfterAdd`, `onAfterUpdate`, `onAfterDelete`, `onAfterBatchUpdate` props
- **Guard conditions prevent**: Race conditions between save completion and parent refetch

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

### Timeline Issues
- **Keyboard shortcuts not working**: Check edit mode active and no input focus
- **Immediate save not triggering**: Verify authenticated, valid song data, and callbacks provided to useMedleyEdit
- **Undo/Redo broken**: Check keyboard listeners in edit mode only
- **Songs disappearing after operation**: Verify immediate save callback and refetch are working correctly
- **EditingSongs reset unexpectedly**: Verify useEffect guard condition for `originalSongs.length === 0`

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

Core tables: `medleys`, `songs`, `medley_edits`

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

## Key Implementation Details

### LoginModal Integration
- Import: `import LoginModal from "@/components/features/auth/LoginModal"`
- State: `const [loginModalOpen, setLoginModalOpen] = useState(false)`
- Usage: Show modal when unauthenticated users attempt edits
- Callback: `onLoginSuccess` to proceed with edit action after successful login

### Contributor Display
- Component: `ContributorsDisplay` shows edit history
- Data: Fetched via `getMedleyContributors(medleyId)` helper function
- Display: Shows top 5 contributors with edit counts and last edit timestamp
- Location: Below song list in MedleyPlayer

### Rate Limiting
- Server-side tracking via in-memory Map (per IP address)
- 5 attempts per 10-minute window
- 429 status code on rate limit exceeded
- Auto-cleanup of expired rate limit entries
