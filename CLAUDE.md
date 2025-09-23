# CLAUDE.md

Guide for Claude Code when working with the Medlean project.

## Commands

**Prerequisites**: Node.js 18.0.0+, Firebase CLI (`npm install -g firebase-tools`)

- `npm run dev` - Start development server
- `npm run build` - Build production app
- `npm run lint` - Run ESLint checks
- `npx tsc --noEmit` - TypeScript type checking
- `firebase deploy --only hosting` - Deploy to production

## Testing Strategy
- No automated tests - manual testing only
- Development: http://localhost:3000
- **CRITICAL**: Always verify in production (https://anasui-e6f49.web.app)
- Production differs in: SSR behavior, CORS policies, iframe communication

## Project Overview

**Medlean** - Multi-platform medley annotation platform built with Next.js. Supports Niconico (full integration), YouTube (embed), Spotify/Apple Music (thumbnails). Features: interactive timelines, advanced editing, user auth with admin approval, auto-save system.

**Tech Stack**: Next.js 15.2.1 + React 19.0.0 + TypeScript, TailwindCSS 4, Supabase (auth/database), Firebase Hosting

**Status**: Alpha v0.1.0-alpha.1 with admin-approval authorization system

## Core Architecture

### Video Player Integration
- **useNicoPlayer hook**: Manages Niconico iframe postMessage communication
- **useMedleyEdit hook**: Handles timeline editing with auto-save system
- **usePlayerPosition + useMousePosition**: Real-time collision detection for ActiveSongPopup
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

### Authorization System
- **MUST** check `isApproved` for all edit operations
- Only approved users can create/edit/delete medleys
- Admin approval required via `/admin` page

### API Proxy Requirements
- Use proxy APIs for CORS: `/api/thumbnail/niconico/[videoId]/` and `/api/metadata/niconico/[videoId]/`
- **MUST** include User-Agent header for Niconico API calls
- Server-side XML parsing uses regex (not DOMParser)

## Architecture Patterns

### Authentication Flow
1. Anonymous: Read-only access
2. Authenticated: Login but no edit until approved
3. Approved: Full CRUD access
4. Admin: User management + all approved permissions

### Auto-Save System
- 2-second debounced auto-save when edit mode active
- Validates songs before saving (no empty titles/artists)
- Visual feedback with "自動保存中..." indicator

### Keyboard Shortcuts
- **Spacebar**: Play/pause (global, disabled in inputs/modals)
- **S/E/M keys**: Start/End time, Add song (edit mode only)
- **Ctrl+Z/Y**: Undo/Redo (edit mode only)

### Component Requirements
- Use `logger.debug/info/warn/error()` instead of console.log
- Always include `displayName` for production builds
- Use unique keys for dynamic components
- Check user approval for edit operations

## Common Issues

### Player Issues
- **Seek fails**: Check millisecond conversion (`* 1000`)
- **iframe not responding**: Verify postMessage origin and no sandbox attribute
- **Duration mismatch**: Use `actualPlayerDuration` for timeline

### Authentication Issues
- **Edit buttons missing**: Verify user is authenticated AND approved
- **OAuth loops**: Check callback URL in Supabase Dashboard
- **Profile creation errors**: Auto-creation system handles missing profiles

### API Issues
- **Thumbnails not loading**: Check proxy API with trailing slash
- **CORS errors**: Must use server-side proxy, not direct API calls
- **Metadata fails**: Verify User-Agent header and regex parsing

### Timeline Issues
- **Keyboard shortcuts not working**: Check edit mode active and no input focus
- **Auto-save not triggering**: Verify edit mode enabled and valid song data
- **Undo/Redo broken**: Check keyboard listeners in edit mode only

### Production Issues
- **Component missing**: Check displayName and module-level logging
- **ActiveSongPopup hidden**: Verify collision detection uses 116px popup zone
- **Build failures**: Run `npm run build + npx tsc --noEmit + npm run lint`

## File Structure

```
src/
├── app/ - Next.js App Router
├── components/
│   ├── features/ - Auth, medley, player components
│   ├── pages/ - Page-level components
│   └── ui/ - Reusable UI components
├── hooks/ - Data management (useMedleyEdit, useNicoPlayer)
├── lib/ - APIs, utilities, Supabase client
└── types/ - TypeScript definitions
```

## Development Workflow

1. **Local**: `npm run dev` (http://localhost:3000)
2. **Type/Lint**: `npx tsc --noEmit && npm run lint`
3. **Build**: `npm run build`
4. **Deploy**: `firebase deploy --only hosting`
5. **Verify**: Test on https://anasui-e6f49.web.app

**CRITICAL**: Always test features in production - SSR/CORS/iframe behavior differs from local.

## Database Setup

Run migrations in Supabase Dashboard (database/migrations/) **in order**:
1. `001_create_users_table.sql` - User profiles
2. `002_add_user_id_to_medleys.sql` - Medley ownership
3. `003_fix_rick_astley_medley.sql` - Platform corrections
4. `004_add_rick_astley_song_data.sql` - Sample data
5. `005_create_approved_users_table.sql` - Admin approval system
6. `006_create_medley_edit_history.sql` - Edit history tracking
7. `007_setup_admin_user.sql` - Replace YOUR_ADMIN_USER_ID with actual UUID

Configure OAuth providers (Google) in Supabase Auth settings.

## Security Patterns

```typescript
// Check approval for edits
const { user, isApproved } = useAuth();
if (editOperation && (!user || !isApproved)) return;

// Use logger, not console
logger.debug('Operation completed', data);

// Sanitize URLs
const validated = sanitizeUrl(userUrl);

// Auto-save pattern
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
  autoSaveTimeoutRef.current = setTimeout(performAutoSave, 2000);
}, [performAutoSave]);
```