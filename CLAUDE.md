# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Prerequisites**: Node.js 18.0.0 or higher, npm or yarn

- `npm run dev` - Start development server on http://localhost:3000 (or next available port)
- `npm run build` - Build the production application
- `npm run start` - Start production server (after build)
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

### Testing & Deployment
**Testing**: Manual testing only - no dedicated test framework configured
- Development: http://localhost:3000 (or next available port)
- Production: https://anasui-e6f49.web.app (Firebase App Hosting)

**Deployment**: 
- Primary: `firebase deploy --only hosting` (Firebase App Hosting with SSR)
- Alternative: `firebase deploy` (deploys all Firebase services, may cause timeout)
- Build verification: `npm run build` + `npx tsc --noEmit` + `npm run lint`
- GitHub Actions: Automatic deployment on main branch push (configured via `.github/workflows/firebase-hosting-merge.yml`)
- **Prerequisites**: Firebase CLI (`npm install -g firebase-tools`) and authentication (`firebase login`)

### 動作確認の重要事項
**CRITICAL**: 機能の動作確認は必ずプロダクション環境（https://anasui-e6f49.web.app）で行うこと。
ローカル環境とプロダクション環境では、iframe通信やSSR等の違いにより動作が異なる場合がある。

## Project Overview

**Medlean** (formerly Anasui) is a comprehensive multi-platform medley annotation platform built with Next.js. Provides interactive video medleys with synchronized song timelines, advanced editing capabilities, searchable medley database, and user authentication. Supports 4 platforms: Niconico (full integration), YouTube (embed), Spotify (thumbnails), and Apple Music (thumbnails).

**Current Status**: Complete medley annotation platform with full user authentication system, **admin-approval based authorization system**, multi-platform support, advanced timeline editing with multi-segment support, Vibrant Orange design system, comprehensive annotation enhancement features, and full SEO optimization. Dark mode functionality has been completely removed. Production reliability improvements implemented (2025-08-31). **Alpha Version 0.1.0-alpha.1** - Ready for user testing with improved error handling, skeleton loading UI, production-safe logging, and secure admin-controlled user permissions.

## Core Architecture

### Technology Stack
- Next.js 15.2.1 + React 19.0.0 + TypeScript
- TailwindCSS 4 + Emotion for CSS-in-JS
- **Vibrant Orange Design System** (orange-indigo-mint gradients)
- Multi-platform video player support (Niconico postMessage API, YouTube iframe embed)
- Supabase for database + authentication (OAuth with Google only)
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

#### Playback Controls System (Updated 2025-08-31)
**Song List Playback Controls**: Enhanced playback control buttons in the song list section:
- **Location**: Found in SongListGrouped component, below the "楽曲一覧" header
- **Controls**: [最初から] [5秒戻る] [再生/一時停止] [5秒進む] buttons arranged horizontally
- **Functionality**: Direct playback control from the song list area using existing `onSeek` prop
- **Styling**: Small buttons with orange hover effects, 5-second buttons include numeric indicators
- **Conditional Display**: Only appears when both `onTogglePlayPause` and `onSeek` props are available

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

#### User Authentication & Authorization Architecture
**OAuth-Based Authentication System with Admin Approval:**
- **Supabase Auth**: Handles Google OAuth provider only
- **SSR-Compatible**: Uses ClientLayout wrapper for proper Next.js 15 hydration
- **Progressive Enhancement**: App works for anonymous users, enhanced features for authenticated users
- **User Profiles**: Automatic profile creation with avatar and metadata from Google OAuth
- **Admin Authorization**: Two-tier system - authentication (login) + approval (admin permission)

**Authorization Flow:**
1. **Anonymous Users**: Read-only access to all medleys
2. **Authenticated Users**: Can login but cannot edit until approved by admin
3. **Approved Users**: Full CRUD access to create/edit/delete their own medleys
4. **Admin Users**: All approved user permissions + user management capabilities

**Database Schema:**
- **Users Table**: Stores user profiles with automatic creation from OAuth metadata
- **Approved Users Table**: Controls who can edit data (admin-managed)
- **Medleys Extension**: Added `user_id` foreign key for ownership tracking
- **Row Level Security**: Only approved users can edit, admin can manage approvals

#### Data Flow Architecture
**Database-Only Mode:**
- **Supabase PostgreSQL**: Primary and only data source - static fallback deprecated
- **Direct Fetch Implementation**: Uses direct fetch API calls instead of Supabase client SDK
- **Critical**: Never use static data files - all data operations must use Supabase database

#### Component Architecture
- `MedleyPlayer` - Core reusable player with platform detection and song change state management
- `SongList` - Unified timeline with editing and interaction
- Platform-specific players: `NicoPlayer`, `YouTubePlayer`
- Modals: `SongEditModal` (with song change feature), `SongSearchModal` (supports change mode), `CreateMedleyModal`
- Authentication: `AuthProvider`, `AuthModal`, `UserProfileDropdown`, `UserAvatar`
- Authorization: `AuthorizationBanner`, `AdminPage` (user approval management)
- `ActiveSongPopup` - Real-time song display popup that appears during playback (Updated 2025-09-03)

**Modal Interaction Flow:**
- Timeline click → `SongEditModal` opens
- "楽曲を変更" button → `SongSearchModal` opens in change mode (`isChangingSong: true`)
- Song selection → Updates `editingSong` state with new song data, preserving time segments
- Modal closes → Returns to `SongEditModal` with updated song information

#### Header Architecture (Updated 2025-08-31)
**Unified AppHeader System:**
- **AppHeader.tsx**: New unified header component replacing legacy Header.tsx
- **Responsive Design**: Desktop navigation + mobile hamburger menu
- **Variant Support**: `"home"` (light), `"player"` (dark), `"default"` (neutral)
- **Authentication Integration**: UserProfileDropdown with login/logout flows
- **Navigation Items**: Auto-filtered based on authentication state

**Sticky Header Implementation:**
- **Main Header**: Fixed positioning with `z-[100]` to ensure top priority layering
- **Song List Headers**: Sticky positioning with `top-16` and `z-50` to stick below main header
- **Height Accounting**: All page containers use `pt-16` to prevent content overlap
- **Dual-Level Sticking**: Main header stays at viewport top, title/creator area sticks below it

**Key Features:**
- Fixed positioning with proper z-index hierarchy (main header z-[100] > song headers z-50)
- Mobile-first responsive breakpoints
- Integrated Vibrant Orange design system
- Outside-click detection for mobile menu closure
- **Search functionality moved**: Search moved from header to homepage content area

#### Search System Architecture (Updated 2025-08-31)
**Comprehensive Search Implementation:**
- **Dual Search Modes**: Medley search (title/creator) + Song search (title/artist)
- **Real-time Search**: Instant filtering as user types with automatic pagination reset
- **Search UI**: Located below tab navigation in HomePageClient
- **State Management**: Search term preserved across tab switches
- **Keyboard Support**: ESC key clears search, Enter focuses results
- **Clear Functionality**: X button and keyboard shortcut for quick reset
- **No Genre Filtering**: Genre functionality has been removed for simplified UI

**Search Features:**
```typescript
// Search modes with different placeholders
searchMode === "medley" ? "メドレー名または作者名で検索..." : "楽曲名またはアーティスト名で検索..."

// Cross-medley song search results
const songSearchResults = medleys.flatMap(medley => 
  medley.songs.filter(song => matches(song, searchTerm))
);
```

#### Medley Deletion System (Added 2025-08-31)
**Homepage Deletion Functionality:**
- **Deletion Buttons**: Red trash icon buttons displayed on each medley card's top-right corner
- **Authorization Required**: Only approved users (`isApproved`) can see and use deletion buttons
- **Comprehensive Confirmation**: Detailed confirmation dialog showing medley name, creator, song count, and warning
- **Real-time Updates**: Immediate removal from UI after successful deletion without page reload
- **Loading States**: Delete button shows spinner during deletion process
- **Success/Error Handling**: User feedback through alert dialogs

**Deletion Flow:**
1. User clicks delete button (prevents event propagation to card link)
2. Confirmation dialog displays: `「${medley.title}」を完全に削除しますか？\n\n作成者: ${medley.creator}\n楽曲数: ${medley.songs.length}曲\n\nこの操作は取り消せません。`
3. If confirmed, `deleteMedley` API called with loading state management
4. Success: Remove from local state + success message, Error: Error message displayed
5. Loading states cleared regardless of outcome

**Implementation Pattern:**
```typescript
const handleDeleteMedley = async (medley: MedleyData) => {
  if (!user || !isApproved) {
    setShowAuthModal(true);
    return;
  }

  const confirmMessage = `「${medley.title}」を完全に削除しますか？\n\n作成者: ${medley.creator}\n楽曲数: ${medley.songs.length}曲\n\nこの操作は取り消せません。`;
  if (!confirm(confirmMessage)) return;

  try {
    setDeletingMedleyId(medley.videoId);
    const success = await deleteMedley(medley.videoId);
    if (success) {
      setMedleys(prev => prev.filter(m => m.videoId !== medley.videoId));
      alert(`「${medley.title}」を削除しました`);
    }
  } catch (error) {
    // Error handling
  } finally {
    setDeletingMedleyId(null);
  }
};
```

#### Timeline System & Annotation Enhancement Features (Updated 2025-09-01)
**Timeline Display**: Always shows full video duration with simplified position calculations
**Edit Mode Features**: 
- Drag-and-drop editing (0.1s precision)
- Undo/redo (50-action history)
- Keyboard shortcuts (S/E/M keys) with comprehensive visual feedback
- Real-time song bar creation with elapsed time display
- Adjacent song time alignment buttons
- **Song Change**: Double-click song segment → Edit modal → "楽曲を変更" button → Select new song while preserving time segments

**Simplified Edit Interface (Updated 2025-09-01):**
- **Removed buttons**: "楽曲追加" (Add Song), "インポート" (Import), and "クイック" (Quick) buttons have been removed from the edit interface
- **Remaining edit controls**: Edit mode toggle, Undo/Redo buttons only
- **Focused workflow**: Editing now primarily relies on timeline interaction (double-click to edit) and keyboard shortcuts

**Keyboard Shortcuts System:**
- **Spacebar**: Play/pause toggle (global, works outside edit mode)
- **S key**: Set start time (edit mode only)
- **E key**: Set end time (edit mode only)  
- **M key**: Add empty song to timeline (edit mode only)
  - **Short press (< 500ms)**: Creates 30-second empty song at current time
  - **Long press (≥ 500ms)**: Shows real-time purple timeline bar, creates song with actual duration on release
- **Ctrl/Cmd + Z**: Undo (edit mode only)
- **Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z**: Redo (edit mode only)
- **ESC key**: Clear search (search input focused)

**Keyboard Event Handling:**
- Spacebar automatically disabled when input fields are focused or modals are open
- Edit mode shortcuts (S/E/M) only active when `isEditMode` is true
- All keyboard events use `document.addEventListener` with proper cleanup
- Input field detection prevents conflicts with typing

**Multi-Segment Support**: Songs can have multiple appearance segments within a single medley

**Timeline UI Compactification (Updated 2025-08-31)**:
- Main timeline container: 32px → 24px height (25% reduction)
- Timeline bars: 24px → 16px height (33% reduction) 
- MultiSegment preview: 48px → 32px height (33% reduction)
- Removed song title headers from SongListGrouped - titles only shown within timeline bars
- Edit/delete buttons relocated to timeline right side with compact sizing
- Eliminated spacing between song rows for maximum density

**Enhancement Features:**
- **Continuous Input Mode**: Seamless song-to-song workflow with "Save and Next"
- **Preview Playback**: Loop playback within song edit modal for range verification
- **Smart M Key Functionality**: Dual-mode empty song creation
  - Short press: Instantly creates 30-second empty song ("空の楽曲 1", "空の楽曲 2", etc.)
  - Long press: Real-time timeline bar with actual duration capture (500ms threshold)
  - No modal interruption - allows continuous empty song creation workflow
- **Empty Song Visual System**: 
  - Yellow background (`bg-yellow-400`) with orange borders for immediate recognition
  - Warning icons (⚠️) for songs with missing required fields
  - Enhanced text contrast with `text-orange-900` for empty songs
- **Batch Validation on Save**: Comprehensive pre-save validation with detailed error messages
  - Checks for empty titles (including "空の楽曲" prefixed songs)
  - Validates artist fields (including "アーティスト未設定" default values)
  - Displays up to 10 specific validation errors with timestamps

#### Song Database Integration
**Two-Step Flow**: Song selection via `SongSearchModal` → edit via `SongEditModal`
- Real-time search across titles/artists with inline editing capabilities
- Database built from all medley data with deduplication
- Multi-platform URL editing for all songs

#### SongEditModal with Song Change Feature (Updated 2025-09-01)
**Simplified Song Editing Interface**: Streamlined modal interface that guides users to the song database
- **New Song Addition**: Only shows "楽曲データベースから選択" button (manual input fields removed)
- **Existing Song Editing**: Shows read-only song information with "楽曲を変更" button
- **Empty Song Handling**: Displays warning message and directs users to select from database
- **Song Change Flow**: Button opens SongSearchModal in change mode, preserving time segments
- **Time Preservation**: Start/end times are maintained when changing to a different song
- **Modal Integration**: Seamless flow between SongEditModal and SongSearchModal
- **Redundant Field Removal**: Manual input fields, hint sections, and platform URL inputs removed for cleaner interface

**Implementation Pattern:**
```typescript
// In MedleyPlayer.tsx
const handleChangeSong = () => {
  setIsChangingSong(true);
  setSongSearchModalOpen(true);
};

// Song selection preserves timing
if (isChangingSong && editModalOpen && editingSong) {
  setEditingSong({
    ...editingSong,
    title: songTemplate.title,
    artist: songTemplate.artist,
    originalLink: songTemplate.originalLink,
    links: songTemplate.links
    // startTime and endTime preserved
  });
}
```

#### ActiveSongPopup Architecture (Added 2025-09-03)
**Real-time Song Display System**: Popup component that shows currently playing songs during video playback.

**Key Features:**
- **Fixed Positioning**: Right-side overlay with `z-index: 1000` to appear above all content
- **Song Detection**: Automatically detects active songs based on `currentTime` and song time ranges
- **Animation System**: Slide-in animations for new songs, smooth transitions between songs
- **Multi-Song Support**: Can display multiple simultaneous songs with stacked layout
- **Debug Mode**: Comprehensive debug panel available with `?debug=true` URL parameter
- **Production Logging**: Enhanced logging system for production troubleshooting

**Critical Implementation Requirements:**
```typescript
// Tree-shaking prevention pattern - essential for production builds
if (typeof window !== 'undefined') {
  console.log('🔥 ActiveSongPopup: Module loaded in production', {
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
}

// Component must have displayName for production builds
ActiveSongPopup.displayName = 'ActiveSongPopup';
```

**Integration Pattern with MedleyPlayer:**
```typescript
// Runtime component validation to prevent silent failures
if (!ActiveSongPopup) {
  console.error('🚨 CRITICAL: ActiveSongPopup component is undefined!');
  return <ErrorComponent />;
}

return <ActiveSongPopup currentTime={currentTime} songs={songs} isVisible={isVisible} />;
```

**Time-based Song Detection Algorithm:**
- Uses boundary-tolerant checking: `currentTime >= startTime && currentTime < endTime + 0.1`
- Handles multiple segments of same song with unique identifiers
- Deduplicates identical songs appearing in multiple segments
- Updates in real-time with currentTime changes from video player

#### SEO Architecture (Added 2025-08-30)
**Comprehensive SEO Implementation:**
- **Dynamic Sitemap**: Auto-generated `/sitemap.xml` with all pages
- **Robots.txt**: Crawler control with private page exclusions
- **Dynamic Metadata**: Page-specific titles, descriptions, keywords
- **Structured Data**: VideoObject, MusicRecording, BreadcrumbList JSON-LD
- **Image Optimization**: Next.js Image component with WebP conversion
- **Rich Results**: Google validated structured data for enhanced search display

**SEO Files:**
- `/src/app/sitemap.ts` - Dynamic sitemap generation
- `/src/app/robots.ts` - Robots.txt configuration
- `/src/components/ui/Breadcrumb.tsx` - Breadcrumb with structured data
- Individual page `generateMetadata` functions for dynamic SEO

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

**Debouncing Pattern**: Prevent excessive logging and warnings:
```typescript
const lastWarningTime = useRef<number>(0);
const lastWarningKey = useRef<string>('');

// Only warn once per unique issue per 30 seconds
const debouncedWarn = (message: string, key: string) => {
  const now = Date.now();
  if (lastWarningKey.current !== key || (now - lastWarningTime.current) > 30000) {
    logger.warn(message);
    lastWarningTime.current = now;
    lastWarningKey.current = key;
  }
};
```

**Performance Optimization Pattern**: Use React.memo for stable components:
```typescript
const MyComponent = React.memo(function MyComponent({ props }) {
  // Remove debug logging in production
  // Use logger.debug() instead of console.log()
  return <div>{content}</div>;
});
```

**AppHeader Usage Pattern**: Always use AppHeader with appropriate variant:
```typescript
// Home page - light theme
<AppHeader variant="home" />

// Player page - dark theme
<AppHeader variant="player" />

// Other pages - default neutral theme
<AppHeader variant="default" />
```

**Sticky Header Pattern**: Maintain proper header hierarchy:
```typescript
// Main AppHeader - Fixed at top with highest z-index
<header className="fixed top-0 left-0 right-0 z-[100] w-full">

// Page container - Account for fixed header height
<div className="min-h-screen pt-16">

// Song list headers - Sticky below main header
<div className="sticky top-16 z-50 bg-white">
```

**Keyboard Event Handling Pattern**: Proper keyboard shortcut implementation:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check for specific key
    if (e.key === ' ') {
      // Prevent conflicts with input fields
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // Check for modal states
      const isModalOpen = editModalOpen || searchModalOpen;
      
      if (isInputFocused || isModalOpen || !playerReady) {
        return;
      }
      
      e.preventDefault();
      togglePlayPause();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [dependencies]);
```

**M Key Long Press Pattern**: Advanced long press detection for timeline creation:
```typescript
const [isLongPress, setIsLongPress] = useState<boolean>(false);
const mKeyLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);

// Key down - start long press timer
case 'm':
  setIsLongPress(false);
  const longPressTimer = setTimeout(() => {
    setIsLongPress(true);
    setTempTimelineBar({
      startTime: currentTime,
      endTime: currentTime,
      isActive: true
    });
  }, 500); // 500ms threshold
  mKeyLongPressTimerRef.current = longPressTimer;
  break;

// Key up - handle short vs long press
case 'm':
  if (mKeyLongPressTimerRef.current) {
    clearTimeout(mKeyLongPressTimerRef.current);
  }
  
  if (isLongPress) {
    // Long press: Use temp timeline bar duration
    onAddSongFromTempBar(tempBar.startTime, tempBar.endTime);
  } else {
    // Short press: Create default 30s song
    onQuickAddMarker(currentTime);
  }
  
  setIsLongPress(false);
  break;
```

**Tree-Shaking Prevention Pattern**: Essential for components that may be removed in production builds:
```typescript
// Module-level initialization - prevents tree-shaking removal
if (typeof window !== 'undefined') {
  console.log('🔥 ComponentName: Module loaded in production', {
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
}

export const MyComponent = React.FC<Props> = (props) => {
  // Component implementation
  return <div>Content</div>;
};

// Component displayName - helps with production debugging
MyComponent.displayName = 'MyComponent';

// Export verification - ensures bundler includes component
if (typeof window !== 'undefined') {
  console.log('🔥 ComponentName: Component definition exported', {
    displayName: MyComponent.displayName,
    timestamp: new Date().toISOString()
  });
}
```

**Component Existence Validation Pattern**: Runtime checks to prevent silent failures:
```typescript
// In parent component - validate component exists before rendering
if (!MyComponent) {
  console.error('🚨 CRITICAL: MyComponent is undefined!');
  return <div style={{ 
    position: 'fixed', top: '6rem', right: '1rem', zIndex: 1000,
    background: 'red', color: 'white', padding: '1rem' 
  }}>
    ERROR: MyComponent not loaded
  </div>;
}

return <MyComponent {...props} />;
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
- **Edit interface simplification**: As of 2025-09-01, edit interface only shows Edit Mode toggle and Undo/Redo buttons. Song addition is done via timeline double-click or keyboard shortcuts (M key)

### Keyboard Shortcuts Issues
- **Spacebar not working**: Check if player is ready (`playerReady` state) and no modals are open
- **Spacebar scrolling page**: Ensure `e.preventDefault()` is called in spacebar handler
- **Edit shortcuts not responding**: Verify `isEditMode` is true and event listeners are attached
- **Shortcuts working in wrong contexts**: Check input field focus detection (input/textarea/contenteditable)
- **Keyboard events not cleaning up**: Ensure `removeEventListener` is called in useEffect cleanup
- **Modal conflicts**: Verify modal state checks in keyboard handlers (`editModalOpen`, `songSearchModalOpen`, etc.)

### M Key Long Press Issues
- **Long press not triggering**: Verify `isEditMode` is true and user has edit permissions (`isApproved`)
- **Timer getting cleared prematurely**: Check useEffect dependencies don't include timer refs
- **Purple timeline bar not showing**: Ensure `tempTimelineBar` state is properly updated and rendered
- **Duration calculation wrong**: Verify `currentTime` is being captured correctly in timer callback
- **Short press creating modal**: Check that `onQuickAddMarker` creates songs directly without opening modals
- **Empty songs not being created**: Verify `handleAddSongFromTempBar` and `addSong` functions are properly wired
- **Empty songs not visually highlighted**: Ensure visual emphasis system is applied in `SongListGrouped.tsx:634-638`
- **Batch validation not working**: Check `useMedleyEdit.ts:182-208` for proper validation logic implementation
- **Continuous workflow interrupted**: Verify no modal opening calls remain in M key handlers

### Multi-Segment Editor Issues
- **Segments being replaced**: Check array mutation in `addSegment` - use `[...segments].sort()`
- **Timeline preview not showing**: Verify segment mapping and positioning calculations
- **State reset issues**: Remove problematic dependencies from useEffect arrays

### Authentication & Authorization Issues
- **AuthProvider not rendering**: Check ClientLayout wrapper and SSR hydration
- **OAuth redirect loops**: Verify callback URL configuration in Supabase Dashboard
- **User not appearing**: Verify UserProfileDropdown is included in header component tree
- **Edit buttons not showing**: Check if user is both authenticated AND approved
- **Admin page access denied**: Verify user has admin permissions in `approved_users` table
- **Authorization banner showing for admin**: Check `isApproved` state in AuthContext

### Thumbnail Issues
- **Images not loading**: Verify proxy API route is working (`/api/thumbnail/niconico/[videoId]`)
- **CORS errors**: Direct CDN access blocked - must use server-side proxy implementation
- **Fallback failure**: Check all 5-tier fallback hierarchy (CDN L/M/default → getthumbinfo API → legacy)
- **404 responses**: Some video IDs may be invalid or videos deleted from platform
- **Cache issues**: Production deployment may need cache clearing for new proxy API

### Individual Song Thumbnail System (Updated 2025-08-31)
- **Priority System**: Individual song thumbnails take priority over medley thumbnails in song search
- **Data Storage**: Uses `original_link` column in songs table to store individual platform URLs
- **Fallback Hierarchy**: Song's original_link → Medley thumbnail → Default thumbnail
- **Platform Support**: Supports individual links for Niconico and YouTube platforms
- **Search Enhancement**: Song search results now show unique thumbnails per song when available
- **Database Updates**: Use scripts in `/scripts/` directory to add individual links to songs

### Platform Validation Issues
- **Invalid video ID warnings**: Use `platformDetection.ts` utilities to validate before processing
- **Thumbnail loading failures**: Platform auto-correction in HomePageClient prevents mismatched platforms
- **Data inconsistencies**: Run database migrations to fix existing platform mismatches

### Performance Issues
- **Excessive logging**: Use debouncing patterns for repetitive warnings (30s interval minimum)
- **Component re-renders**: Apply React.memo() to stable components like UserProfileDropdown
- **Console spam**: Remove debug logging from production components

### Build & Deployment
- **Firebase deployment**: Use `firebase deploy --only hosting` instead of `firebase deploy`
- **Next.js 15 params**: All routes must handle `params: Promise<{...}>`
- **Authentication deployment**: Ensure database migrations are run and OAuth providers configured
- **Unterminated string literals**: If modifying Tailwind classes (especially dark: prefixes), watch for broken template literals that need closing quotes
- **Component prop validation**: UserAvatar component expects size props as "sm" | "md" | "lg" | "xl", not "large"

### Firebase Deployment Issues
- **409 Conflict Error**: If deployment fails with "unable to queue the operation", wait 30 seconds and retry
- **Function timeout**: Cloud Functions may timeout during first deploy - retry after a few minutes
- **Cache issues**: Production deployment may need cache clearing for logo/favicon updates
- **Logo not displaying**: Check that HomePageClient.tsx uses Logo component, not plain text

### Header System Issues (Updated 2025-08-31)
- **Double header display**: Ensure legacy Header.tsx is replaced with AppHeader.tsx on all pages
- **Missing navigation items**: Verify authenticated navigation items (e.g., "マイメドレー") appear only for logged-in users
- **Mobile menu not closing**: Check outside-click detection and useRef implementation in AppHeader
- **Responsive breakpoints**: Verify mobile hamburger menu toggles at correct screen size (md breakpoint)
- **Search functionality moved**: Search is now in HomePageClient content area, not header
- **Header not sticking**: Ensure main header uses `fixed` positioning with `z-[100]` and all pages have `pt-16` padding
- **Title area hidden**: Song list headers should use `sticky top-16 z-50` to position below main header
- **Z-index conflicts**: Main header (z-[100]) must have higher priority than song list headers (z-50)

### Search System Issues (Updated 2025-08-31)
- **Search input missing**: Ensure search input field is present below tabs in HomePageClient.tsx
- **Search not working**: Check searchTerm state and filtering logic in filteredAndSortedMedleys
- **Tab switching clears search**: Verify search state is preserved when switching between medley/song modes
- **Results not updating**: Ensure useEffect with searchTerm dependency resets pagination to page 1
- **Keyboard shortcuts not working**: Check ESC key handler and clear button functionality
- **Cross-medley song search fails**: Verify songSearchResults array mapping and filtering logic
- **Genre references in legacy code**: Genre filtering has been removed - ensure no genreFilter state or UI remains

### SongEditModal Issues (Updated 2025-09-01)
- **Simplified interface issues**: Modal now only shows "楽曲データベースから選択" button for new songs - no manual input fields
- **Empty song warnings**: Ensure empty songs show appropriate warning messages directing users to database selection
- **Song change button not appearing**: Verify `onChangeSong` prop is passed to SongEditModal and user is editing existing song (not new)
- **Song change not preserving times**: Check `isChangingSong` flag is properly set in `handleSelectSongFromDatabase`
- **Modal state conflicts**: Ensure `isChangingSong` flag is reset when modals are closed
- **Song info not updating**: Verify `setEditingSong` is called with updated song data after selection
- **Platform URL fields removed**: Manual platform URL inputs have been removed - songs from database include this information
- **Hint sections removed**: All hint/help sections removed as interface now guides users directly to database selection

### Playback Controls Issues (Updated 2025-08-31)
- **Controls not displaying**: Verify both `onTogglePlayPause` and `onSeek` props are passed to SongListGrouped
- **onSeek parameter missing**: Ensure `onSeek` is destructured in SongListGrouped component parameters
- **Buttons not functional**: Check that `seek` function is properly passed from MedleyPlayer to SongListGrouped
- **Styling issues**: Verify orange hover effects and 5-second numeric indicators display correctly
- **Wrong location**: Song list controls are in SongListGrouped, not PlayerControls component

### Medley Deletion Issues (Added 2025-08-31)
- **Delete buttons not showing**: Verify user is both authenticated (`user`) and approved (`isApproved`)
- **Delete button clicks navigating**: Ensure `e.preventDefault()` and `e.stopPropagation()` are called in onClick handler
- **Confirmation dialog not appearing**: Check browser popup blockers aren't interfering with `confirm()` dialogs
- **Deletion failing silently**: Verify `deleteMedley` API function is properly imported and returns boolean success
- **UI not updating after deletion**: Ensure `setMedleys(prev => prev.filter(...))` properly updates local state
- **Loading state stuck**: Verify `finally` block always clears `deletingMedleyId` state
- **Authorization bypass**: Check both frontend and backend enforce admin approval for deletion operations
- **Database constraints**: Ensure foreign key relationships allow cascading deletes or proper cleanup

### ActiveSongPopup Issues (Added 2025-09-03)
- **Component not appearing in production**: Check that module-level logging appears (`🔥 ActiveSongPopup: Module loaded`)
- **Tree-shaking removal**: Ensure displayName is set and module-level initialization code is present
- **Silent component failures**: Add runtime component validation before rendering in parent component
- **No debug information**: Verify `?debug=true` URL parameter shows debug panel
- **Song detection not working**: Check `currentTime` is updating and songs array has proper time ranges
- **Multiple songs not stacking**: Ensure unique keys for each ActiveSong and proper z-index layering
- **Animation not triggering**: Verify `isNewSong` detection logic compares against `prevActiveSongs`
- **Popup positioning wrong**: Confirm fixed positioning with `top: 6rem, right: 1rem, zIndex: 1000`
- **Production logging missing**: Use both `console.log()` and `logger.info()` for production visibility

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
- `src/app/page.tsx` - Homepage with SSR medley fetching
- `src/components/pages/HomePageClient.tsx` - Client-side homepage with search functionality
- `src/app/[platform]/[videoId]/page.tsx` - Platform players (Niconico/YouTube)
- `src/components/pages/MedleyPlayer.tsx` - Main player component
- `src/hooks/useNicoPlayer.ts` - Niconico postMessage integration

**Data:**
- `src/lib/api/medleys.ts` - Database API with direct fetch implementation (includes `deleteMedley` function)
- `src/lib/utils/songDatabase.ts` - Song search and caching for cross-medley search
- `src/lib/utils/videoMetadata.ts` - Video metadata extraction

**Database Management:**
- `database/migrations/` - SQL migration files for Supabase setup
- `scripts/` - Node.js scripts for database operations and testing

**Thumbnail System:**
- `src/app/api/thumbnail/niconico/[videoId]/route.ts` - CORS proxy for Niconico thumbnails
- `src/lib/utils/thumbnail.ts` - Multi-platform thumbnail URL generation
- `src/components/ui/song/SongThumbnail.tsx` - Thumbnail display component with retry logic

**Platform Validation System:**
- `src/lib/utils/platformDetection.ts` - Auto-detection of platform from video ID patterns
- Platform auto-correction in HomePageClient.tsx prevents thumbnail loading errors
- Supports Niconico (sm + digits), YouTube (11 chars), Spotify (22 chars), Apple Music (numeric)

**Security & Performance:**
- `src/lib/utils/logger.ts` - Production-safe logging system
- `src/lib/utils/sanitize.ts` - Input sanitization utilities

**Header System:**
- `src/components/layout/AppHeader.tsx` - New unified header component (2025-08-31)
- `src/components/layout/Header.tsx` - Legacy header (being phased out)

**UI System:**
- `src/components/ui/modal/BaseModal.tsx` - Base modal component
- `src/components/ui/song/SongInfoDisplay.tsx` - Unified song display with multi-platform support
- `src/components/ui/song/MultiSegmentTimeEditor.tsx` - Multi-segment editor
- `src/components/ui/song/ActiveSongPopup.tsx` - Real-time current song popup (Added 2025-09-03)
- `src/components/ui/Logo.tsx` - Reusable Medlean logo component with size variations
- `src/components/ui/loading/Skeleton.tsx` - Skeleton loading components for improved UX
- `src/components/ui/loading/PlayerSkeleton.tsx` - Player-specific loading screens and messages

**Logo & Branding System (Updated 2025-08-31):**
- `public/logo.svg` - Main Medlean logo with enhanced wave symbols, animation, and text
- `public/logo-icon.svg` - Icon-only version with animated nodes for compact spaces
- `public/favicon.ico` - Browser icon with orange branding
- Logo Component supports sizes: sm, md, lg, xl with optional text display and SVG animations

**Note**: Dark mode functionality (DarkModeToggle component) has been completely removed from the application as of 2025-08-30.

**Authentication & Authorization System:**
- `src/contexts/AuthContext.tsx` - React context for authentication + approval state
- `src/components/features/auth/AuthModal.tsx` - OAuth login modal
- `src/components/features/auth/UserProfileDropdown.tsx` - User profile menu
- `src/app/auth/callback/page.tsx` - OAuth callback handler
- `src/app/admin/page.tsx` - Admin dashboard route
- `src/components/pages/AdminPage.tsx` - Admin user management interface
- `src/components/ui/AuthorizationBanner.tsx` - Warning banner for unapproved users

**User Profile System:**
- `src/app/profile/page.tsx` - User profile page
- `src/app/my-medleys/page.tsx` - User's medleys management page
- `src/app/settings/page.tsx` - Settings page

**SEO System:**
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - Robots.txt configuration
- `src/components/ui/Breadcrumb.tsx` - Breadcrumb navigation with structured data
- `src/components/seo/StructuredData.tsx` - Structured data utilities

## Development Workflow

**CRITICAL Verification Process:**
1. Local testing: `npm run dev`
2. Type safety: `npx tsc --noEmit` and `npm run lint`
3. Production build: `npm run build` (verify no build errors)
4. Production deployment: `firebase deploy --only hosting` (avoid function conflicts)
5. Production verification: Test on https://anasui-e6f49.web.app
6. **Logo verification**: Confirm Logo component displays with proper gradients
7. **Thumbnail API verification**: Test `/api/thumbnail/niconico/sm500873` directly in production
8. **SEO verification**: 
   - Check `/sitemap.xml` and `/robots.txt` accessibility
   - Test structured data with Google Rich Results Test
   - Verify metadata with browser developer tools

Always verify features work in production environment - SSR behavior, CORS policies, and cross-origin iframe communication differs from local development.

### Firebase App Hosting Setup
**Prerequisites**: Firebase CLI installed (`npm install -g firebase-tools`)

**Commands:**
- `firebase login` - Authenticate with Google account
- `firebase use anasui-e6f49` - Select Firebase project
- `firebase deploy --only hosting` - Deploy to production (recommended over full deploy)

**Environment Variables**: Set in Firebase Console
```
NEXT_PUBLIC_SUPABASE_URL=https://dheairurkxjftugrwdjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[supabase-anon-key]
```

**Critical Setup Requirements:**
1. **Database Migrations**: Run SQL files in `database/migrations/` directory in Supabase Dashboard
   - `001_create_users_table.sql` - User profiles table
   - `002_add_user_id_to_medleys.sql` - User ownership for medleys
   - `003_fix_rick_astley_medley.sql` - Platform corrections (run after major data fixes)
   - `004_add_rick_astley_song_data.sql` - Adds proper song data for Rick Astley medley (fixes 0 songs issue)
   - `005_create_approved_users_table.sql` - **Admin approval system** (requires admin user ID)
   - `006_add_individual_song_links.sql` - Adds individual song links for thumbnail testing
2. **OAuth Configuration**: Configure Google provider in Supabase Auth settings
3. **RLS Policies**: Ensure Row Level Security policies are active for user data protection
4. **Admin Setup**: Replace `REPLACE_WITH_ADMIN_USER_ID` in migration 005 with actual admin user ID

**Current URLs:**
- **Primary**: https://anasui-e6f49.web.app
- **Alternative**: https://anasui-e6f49.firebaseapp.com

## Vibrant Orange Design System

### Color Palette (Updated 2025-08-30)
- **Primary**: Orange gradients (`#ff8c42 → #ffa55c`) - Active, vibrant energy
- **Secondary**: Indigo gradients (`#5b6dee → #4c63d2`) - Complementary contrast  
- **Accent**: Mint gradients (`#00d9a3 → #06b981`) - Fresh, modern accent

### Logo Design (Updated 2025-08-31)
The Medlean logo features three flowing wave forms representing different songs in a medley:
- **Primary Wave (Orange)**: Flowing rhythm layer - main song/melody line with animated pulse nodes
- **Secondary Wave (Indigo)**: Harmonic layer - accompaniment with gradient transparency (0.8 opacity)
- **Accent Wave (Mint)**: Bass foundation - rhythm section with subtle transparency (0.7 opacity)
- **Connection Lines**: Dashed connectors showing medley continuity between song transitions
- **Text**: Enhanced gradient from orange → indigo → mint with improved letter spacing (-0.02em)
- **Animation**: SVG pulse effects on timeline nodes for musical beat visualization
- **Accessibility**: Includes aria-label for screen reader compatibility

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

### Admin Approval System
**Purpose**: Prevent unauthorized database modifications by requiring admin approval for all edit operations.

**Key Components:**
- **AuthContext**: Extended with `isApproved` state and `checkApprovalStatus()` function
- **API Layer**: All CRUD operations (`createMedley`, `updateMedley`, `deleteMedley`, `saveMedleySongs`) check approval
- **UI Layer**: Edit buttons/modals and deletion buttons only shown to approved users, AuthorizationBanner for unapproved users
- **Admin Interface**: `/admin` page for managing user approvals

**Admin Setup Process:**
1. Run `005_create_approved_users_table.sql` migration with admin user ID
2. Admin user gets automatic approval and can access `/admin` page
3. Admin approves/revokes other users via the admin interface

**Database Policies:**
- `approved_users` table: Only admin can INSERT/UPDATE/DELETE, users can view their own status
- `medleys` table: Only approved users can INSERT/UPDATE/DELETE their own records
- `songs` table: Only approved users can manage songs for their own medleys

### Critical Security Patterns
```typescript
// ALWAYS sanitize user input before saving
const sanitized = sanitizeSongSection(userInput);
// ALWAYS use logger instead of console
logger.debug('Operation completed', data);
// ALWAYS validate URLs before processing  
const validated = sanitizeUrl(userUrl);
// ALWAYS use platform auto-detection for data integrity
import { autoCorrectPlatform } from '@/lib/utils/platformDetection';
const correction = autoCorrectPlatform(videoId, declaredPlatform);
if (correction.wasCorrected) {
  logger.warn(`Platform corrected: ${declaredPlatform} -> ${correction.correctedPlatform}`);
}
// ALWAYS check user approval for edit operations
const { user, isApproved } = useAuth();
if (editOperation && (!user || !isApproved)) {
  logger.warn('Edit operation blocked: user not approved');
  return; // or show approval message
}
```

## Alpha Version Features (v0.1.0-alpha.1)

### Alpha Version Indicators
- **Visual Badges**: "ALPHA" badges displayed in header and homepage with orange gradient styling
- **Error Pages**: Enhanced error.tsx with alpha version warnings and bug reporting links
- **Loading States**: Custom skeleton UI components for improved loading experience
- **User Feedback**: Direct links to GitHub Issues for bug reporting and feedback

### Production-Ready Improvements
- **Logging System**: All console.log statements replaced with production-safe logger utility
- **Error Boundaries**: Comprehensive error handling with user-friendly messages
- **Loading UX**: PlayerLoadingMessage and Skeleton components for better perceived performance
- **Build Validation**: Automated build, lint, and type checking in deployment pipeline
- **Admin Authorization**: Complete user approval system with secure database policies
- **Security**: Row Level Security (RLS) prevents unauthorized data access