# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Prerequisites**: Node.js 18.0.0 or higher, npm or yarn

- `npm run dev` - Start development server on http://localhost:3000 (or next available port)
- `npm run build` - Build the production application
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

### Testing & Deployment
**Testing**: Manual testing only - no dedicated test framework configured
- Development: http://localhost:3000 (or next available port)
- Production: https://anasui-e6f49.web.app (Firebase App Hosting)

**Deployment**: 
- Primary: `firebase deploy` (Firebase App Hosting with SSR)
- Build verification: `npm run build` + `npx tsc --noEmit` + `npm run lint`
- GitHub Actions: Automatic deployment on main branch push

### 動作確認の重要事項
**CRITICAL**: 機能の動作確認は必ずプロダクション環境（https://anasui-e6f49.web.app）で行うこと。
ローカル環境とプロダクション環境では、iframe通信やSSR等の違いにより動作が異なる場合がある。

## Project Overview

**Medlean** (formerly Anasui) is a comprehensive multi-platform medley annotation platform built with Next.js. Provides interactive video medleys with synchronized song timelines, advanced editing capabilities, searchable medley database, and user authentication. Supports 4 platforms: Niconico (full integration), YouTube (embed), Spotify (thumbnails), and Apple Music (thumbnails).

**Current Status**: Complete medley annotation platform with full user authentication system, multi-platform support, advanced timeline editing with multi-segment support, Vibrant Orange design system, and comprehensive annotation enhancement features. Dark mode functionality has been completely removed. Recently cleaned and optimized codebase (2025-08-30).

## Core Architecture

### Technology Stack
- Next.js 15.2.1 + React 19.0.0 + TypeScript
- TailwindCSS 4 + Emotion for CSS-in-JS
- **Vibrant Orange Design System** (orange-indigo-mint gradients)
- Multi-platform video player support (Niconico postMessage API, YouTube iframe embed)
- Supabase for database + authentication (OAuth with GitHub/Google)
- Firebase App Hosting for deployment with SSR support

### Critical Implementation Details

#### Niconico Player Integration (`useNicoPlayer` hook)
**CRITICAL**: Core functionality relies on postMessage communication with Niconico's embedded player.

**Key Requirements:**
- **Never use `sandbox` attribute** on iframe - blocks postMessage communication
- **Time Unit Conversion**: Niconico API expects milliseconds, not seconds
  - Seek: `time: seekTimeInSeconds * 1000`
  - Events: `timeInSeconds = timeInMs / 1000`
- **State Management**: `commandInProgress` flag prevents command overlap

**PostMessage Structure:**
```typescript
{
  sourceConnectorType: 1,
  playerId: "1", 
  eventName: "seek" | "play" | "pause" | "getStatus",
  data?: { time: number, _frontendId: 6, _frontendVersion: 0 }
}
```

#### Multi-Platform Architecture
- **Niconico**: Full postMessage integration (seek/play/pause)
- **YouTube**: Basic iframe embed (seek planned for future)
- **Spotify**: oEmbed API for album artwork (no playback integration)
- **Apple Music**: Open Graph meta tag scraping for artwork
- **URL Structure**: `/`, `/niconico/[videoId]`, `/youtube/[videoId]`

#### Multi-Platform Data Structure
```typescript
export type SongSection = {
  // Existing fields...
  originalLink?: string; // Maintained for backward compatibility
  links?: {
    niconico?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
};
```

**Thumbnail Priority System**: Automatic selection based on priority (Niconico > YouTube > Spotify > Apple Music)

#### Thumbnail API Architecture (Added 2025-08-30)
**Critical**: CORS restrictions prevent direct access to Niconico thumbnail APIs from browsers.

**Proxy Server Implementation:**
- **API Route**: `/api/thumbnail/niconico/[videoId]/route.ts` 
- **Multi-Source Fallback**: CDN URLs → getthumbinfo API → legacy APIs
- **Cache Strategy**: 1hr browser cache, 24hr CDN cache via redirect responses
- **URL Pattern**: `/api/thumbnail/niconico/sm500873` returns thumbnail image

**Fallback Hierarchy:**
```typescript
1. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}.L  // Large
2. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}.M  // Medium  
3. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}    // Default
4. https://ext.nicovideo.jp/api/getthumbinfo/{videoId}   // XML API
5. https://tn.smilevideo.jp/smile?i={id}                // Legacy (often fails)
```

**Usage in Components:**
- `getThumbnailUrl()` automatically routes Niconico URLs through proxy
- No changes needed in existing thumbnail display components
- Automatic fallback to `/default-thumbnail.svg` on complete failure

#### User Authentication Architecture
**OAuth-Based Authentication System:**
- **Supabase Auth**: Handles GitHub and Google OAuth providers
- **SSR-Compatible**: Uses ClientLayout wrapper for proper Next.js 15 hydration
- **Progressive Enhancement**: App works for anonymous users, enhanced features for authenticated users
- **User Profiles**: Automatic profile creation with avatar and metadata from OAuth providers

**Database Schema:**
- **Users Table**: Stores user profiles with automatic creation from OAuth metadata
- **Medleys Extension**: Added `user_id` foreign key for ownership tracking
- **Row Level Security**: Users can only edit their own medleys, public read access maintained

#### Data Flow Architecture
**Database-Only Mode:**
- **Supabase PostgreSQL**: Primary and only data source - static fallback deprecated
- **Direct Fetch Implementation**: Uses direct fetch API calls instead of Supabase client SDK
- **Critical**: Never use static data files - all data operations must use Supabase database

#### Component Architecture
- `MedleyPlayer` - Core reusable player with platform detection
- `SongList` - Unified timeline with editing and interaction
- Platform-specific players: `NicoPlayer`, `YouTubePlayer`
- Modals: `SongEditModal`, `SongSearchModal`, `ImportSetlistModal`, `CreateMedleyModal`
- Authentication: `AuthProvider`, `AuthModal`, `UserProfileDropdown`, `UserAvatar`

#### Timeline System & Annotation Enhancement Features
**Timeline Display**: Always shows full video duration with simplified position calculations
**Edit Mode Features**: 
- Drag-and-drop editing (0.1s precision)
- Undo/redo (50-action history)
- Keyboard shortcuts (S/E/M keys) with comprehensive visual feedback
- Real-time song bar creation with elapsed time display
- Adjacent song time alignment buttons

**Multi-Segment Support**: Songs can have multiple appearance segments within a single medley

**Enhancement Features:**
- **Continuous Input Mode**: Seamless song-to-song workflow with "Save and Next"
- **Setlist Import**: Bulk import songs from text format with live preview
- **Preview Playback**: Loop playback within song edit modal for range verification

#### Song Database Integration
**Two-Step Flow**: Song selection via `SongSearchModal` → edit via `SongEditModal`
- Real-time search across titles/artists with inline editing capabilities
- Database built from all medley data with deduplication
- Multi-platform URL editing for all songs

### Key Technical Constraints
- Niconico API is undocumented and may change without notice
- iframe cross-origin restrictions require postMessage-only communication
- Player events may have delays - use defensive timeout handling

### Critical React Patterns
**Component Key Strategy**: Always use unique keys for dynamic components:
```typescript
// Correct: Unique key ensures component re-creation
<SongThumbnail key={`${song.title}-${song.originalLink}`} />
```

**State Reset Pattern**: Reset component state when props change to prevent stale data:
```typescript
useEffect(() => {
  setData(null);
  loadNewData();
}, [dependencies]);
```

**PostMessage Communication**: Handle async iframe communication with defensive programming:
```typescript
const sendCommand = (command) => {
  setCommandInProgress(true);
  iframe.postMessage(command);
  setTimeout(() => {
    if (commandInProgress) {
      setCommandInProgress(false);
      console.warn('Command timeout');
    }
  }, 5000);
};
```

## Common Issues and Solutions

### Player Integration
- **Seek operations fail**: Ensure time conversion to milliseconds (`* 1000`)
- **Player not responding**: Check iframe load and postMessage origin
- **Duration mismatch**: Use `actualPlayerDuration` for timeline calculations

### Timeline & Editing
- **Undo/Redo not working**: Check keyboard listeners in edit mode
- **Timeline duration mismatch**: Songs beyond actual video length show red styling
- **Hotkeys not working**: Ensure edit mode is active and keyboard event listeners attached

### Multi-Segment Editor Issues
- **Segments being replaced**: Check array mutation in `addSegment` - use `[...segments].sort()`
- **Timeline preview not showing**: Verify segment mapping and positioning calculations
- **State reset issues**: Remove problematic dependencies from useEffect arrays

### Authentication Issues
- **AuthProvider not rendering**: Check ClientLayout wrapper and SSR hydration
- **OAuth redirect loops**: Verify callback URL configuration in Supabase Dashboard
- **User not appearing**: Verify UserProfileDropdown is included in header component tree

### Thumbnail Issues
- **Images not loading**: Verify proxy API route is working (`/api/thumbnail/niconico/[videoId]`)
- **CORS errors**: Direct CDN access blocked - must use server-side proxy implementation
- **Fallback failure**: Check all 5-tier fallback hierarchy (CDN L/M/default → getthumbinfo API → legacy)
- **404 responses**: Some video IDs may be invalid or videos deleted from platform
- **Cache issues**: Production deployment may need cache clearing for new proxy API

### Build & Deployment
- **Firebase deployment**: Use `firebase deploy` instead of Netlify
- **Next.js 15 params**: All routes must handle `params: Promise<{...}>`
- **Authentication deployment**: Ensure database migrations are run and OAuth providers configured
- **Unterminated string literals**: If modifying Tailwind classes (especially dark: prefixes), watch for broken template literals that need closing quotes
- **Component prop validation**: UserAvatar component expects size props as "sm" | "md" | "lg" | "xl", not "large"

## File Organization

```
src/
├── app/ - Next.js App Router (platform-specific routes)
├── components/
│   ├── features/ - Feature components (medley, player, share, auth)
│   ├── pages/ - Page-level components
│   └── ui/ - Reusable UI components (modal, song display)
├── contexts/ - React contexts (AuthContext)
├── hooks/ - Data management hooks
├── lib/ - Utilities, API clients, Supabase
└── types/ - Type definitions
docs/ - Documentation (moved from root)
database/ - Database migrations and schema
```

### Key Files
**Core:**
- `src/app/page.tsx` - Homepage
- `src/app/[platform]/[videoId]/page.tsx` - Platform players
- `src/components/pages/MedleyPlayer.tsx` - Main player component
- `src/hooks/useNicoPlayer.ts` - Niconico integration

**Data:**
- `src/lib/api/medleys.ts` - Database API with direct fetch implementation
- `src/lib/utils/songDatabase.ts` - Song search and caching
- `src/lib/utils/videoMetadata.ts` - Video metadata extraction

**Thumbnail System:**
- `src/app/api/thumbnail/niconico/[videoId]/route.ts` - CORS proxy for Niconico thumbnails
- `src/lib/utils/thumbnail.ts` - Multi-platform thumbnail URL generation
- `src/components/ui/song/SongThumbnail.tsx` - Thumbnail display component with retry logic

**Security & Performance:**
- `src/lib/utils/logger.ts` - Production-safe logging system
- `src/lib/utils/sanitize.ts` - Input sanitization utilities

**UI System:**
- `src/components/ui/modal/BaseModal.tsx` - Base modal component
- `src/components/ui/song/SongInfoDisplay.tsx` - Unified song display with multi-platform support
- `src/components/ui/song/MultiSegmentTimeEditor.tsx` - Multi-segment editor

**Note**: Dark mode functionality (DarkModeToggle component) has been completely removed from the application as of 2025-08-30.

**Authentication System:**
- `src/contexts/AuthContext.tsx` - React context for authentication state
- `src/components/features/auth/AuthModal.tsx` - OAuth login modal
- `src/components/features/auth/UserProfileDropdown.tsx` - User profile menu
- `src/app/auth/callback/page.tsx` - OAuth callback handler

**User Profile System:**
- `src/app/profile/page.tsx` - User profile page
- `src/app/my-medleys/page.tsx` - User's medleys management page
- `src/app/settings/page.tsx` - Settings page

## Development Workflow

**CRITICAL Verification Process:**
1. Local testing: `npm run dev`
2. Type safety: `npx tsc --noEmit` and `npm run lint`
3. Production deployment: `firebase deploy`
4. Production verification: Test on https://anasui-e6f49.web.app
5. **Thumbnail API verification**: Test `/api/thumbnail/niconico/sm500873` directly in production

Always verify features work in production environment - SSR behavior, CORS policies, and cross-origin iframe communication differs from local development.

### Firebase App Hosting Setup
**Prerequisites**: Firebase CLI installed (`npm install -g firebase-tools`)

**Commands:**
- `firebase login` - Authenticate with Google account
- `firebase use anasui-e6f49` - Select Firebase project
- `firebase deploy` - Deploy to production

**Environment Variables**: Set in Firebase Console
```
NEXT_PUBLIC_SUPABASE_URL=https://dheairurkxjftugrwdjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[supabase-anon-key]
```

**Critical Setup Requirements:**
1. **Database Migrations**: Run SQL files in `database/migrations/` directory in Supabase Dashboard
   - `001_create_users_table.sql` - User profiles table
   - `002_add_user_id_to_medleys.sql` - User ownership for medleys
2. **OAuth Configuration**: Configure GitHub and Google providers in Supabase Auth settings
3. **RLS Policies**: Ensure Row Level Security policies are active for user data protection

**Current URLs:**
- **Primary**: https://anasui-e6f49.web.app
- **Alternative**: https://anasui-e6f49.firebaseapp.com

## Vibrant Orange Design System

### Color Palette (Updated 2025-08-30)
- **Primary**: Orange gradients (`#ff8c42 → #ffa55c`) - Active, vibrant energy
- **Secondary**: Indigo gradients (`#5b6dee → #4c63d2`) - Complementary contrast  
- **Accent**: Mint gradients (`#00d9a3 → #06b981`) - Fresh, modern accent

**Note**: Only light theme is supported. Dark mode has been completely removed from the application.

### Implementation Details
**CSS Variables** (in `globals.css`):
```css
--gradient-primary: linear-gradient(135deg, #ff8c42 0%, #ffa55c 100%);
--gradient-secondary: linear-gradient(135deg, #5b6dee 0%, #4c63d2 100%);
--gradient-accent: linear-gradient(90deg, #00d9a3 0%, #06b981 100%);
```

**Color Mapping**:
- `orange-600/700` - Primary actions, main brand elements
- `indigo-600/700` - Secondary actions, markers
- `mint-600/700` - Success states, end time controls

## Security & Performance

### Production-Safe Logging
- **Logger Usage**: `import { logger } from '@/lib/utils/logger'`
- **Methods**: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- **Production Behavior**: Only warns/errors logged in production

### Input Sanitization
- **XSS Protection**: Comprehensive input validation for all user-editable fields
- **Usage Pattern**: Always sanitize before saving user input
- **URL Validation**: Strict domain whitelisting for platform URLs only

### Critical Security Patterns
```typescript
// ALWAYS sanitize user input before saving
const sanitized = sanitizeSongSection(userInput);
// ALWAYS use logger instead of console
logger.debug('Operation completed', data);
// ALWAYS validate URLs before processing  
const validated = sanitizeUrl(userUrl);
```