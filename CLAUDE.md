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

#### Trailing Slash Configuration (Updated 2025-09-13)
**CRITICAL**: Firebase Hosting redirect issue resolution - Next.js configuration must use trailing slashes.

**Key Requirements:**
- **Next.js Config**: `next.config.ts` must have `trailingSlash: true`
- **API URLs**: All thumbnail API URLs must include trailing slashes: `/api/thumbnail/niconico/${id}/`
- **Reason**: Firebase Hosting automatically adds trailing slashes causing 308 redirect loops with `trailingSlash: false`
- **Affected Files**: All thumbnail URL generation must use trailing slash format

**Implementation Pattern:**
```typescript
// Correct: Always include trailing slash for API routes
return `/api/thumbnail/niconico/${id}/`;

// Incorrect: Missing trailing slash causes redirect loops in production
return `/api/thumbnail/niconico/${id}`;
```

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

#### Proxy API Architecture (Added 2025-08-30, Updated 2025-09-05)
**Critical**: CORS restrictions prevent direct access to Niconico APIs from browsers.

##### Thumbnail API
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

##### Metadata API (Added 2025-09-05)
**Video Metadata Extraction System:**
- **API Route**: `/api/metadata/niconico/[videoId]/route.ts`
- **Server-Side XML Parsing**: Uses regex-based extraction (Node.js compatible, no DOMParser)
- **Cache Strategy**: 30min browser cache, 1hr CDN cache for successful responses
- **Error Handling**: 5min cache for errors with detailed debug information
- **URL Pattern**: `/api/metadata/niconico/sm500873` returns JSON metadata

**Metadata Response Format:**
```typescript
interface NiconicoMetadataResponse {
  success: boolean;
  title?: string;
  creator?: string;
  duration?: number; // seconds
  thumbnail?: string;
  error?: string;
  debugInfo?: {
    apiUrl: string;
    responseStatus: number;
    responseText?: string;
    errorDetails?: unknown;
    corsError: boolean;
  };
}
```

**Critical Implementation Details:**
- **XML Parsing**: Uses regex patterns instead of DOMParser for Node.js compatibility
- **User-Agent**: Required for successful API calls to Niconico
- **Error Classification**: Distinguishes between network, API, and parsing errors
- **Debug Integration**: Comprehensive debug information for troubleshooting

**Usage in Components:**
- `getNiconicoVideoMetadata()` in `videoMetadata.ts` automatically uses proxy
- Powers the "取得" (Retrieve) button in `CreateMedleyModal`
- Seamless fallback from CORS errors to proxy server

#### User Authentication & Authorization Architecture
**OAuth-Based Authentication System with Admin Approval:**
- **Supabase Auth**: Handles Google OAuth provider only
- **SSR-Compatible**: Uses ClientLayout wrapper for proper Next.js 15 hydration
- **Progressive Enhancement**: App works for anonymous users, enhanced features for authenticated users
- **User Profiles**: Automatic profile creation with avatar and metadata from Google OAuth
- **Admin Authorization**: Two-tier system - authentication (login) + approval (admin permission)

**Secure Profile Auto-Creation System (Added 2025-09-06):**
- **Automatic Profile Creation**: `checkUserApproval()` function creates user profiles on-demand when missing
- **Security Separation**: Profile creation ≠ approval (maintains strict authorization control)
- **Foreign Key Resolution**: Prevents external key constraint errors during medley creation
- **Defensive Programming**: Handles edge cases where OAuth succeeds but profile creation fails
- **Production Safety**: Comprehensive error handling with proper logging

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

**Critical Implementation Pattern:**
```typescript
// checkUserApproval with secure profile auto-creation
async function checkUserApproval(): Promise<{ isApproved: boolean; user: User | null }> {
  // 1. Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // 2. Check if profile exists in users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()
  
  // 3. Auto-create profile if missing (but don't auto-approve)
  if (!userProfile && profileError?.code === 'PGRST116') {
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null
    })
  }
  
  // 4. Check approval status separately (security maintained)
  const { data: approval } = await supabase
    .from('approved_users')
    .select('id')
    .eq('user_id', user.id)
    .single()
    
  return { isApproved: !!approval, user }
}
```

#### Data Flow Architecture
**Database-Only Mode:**
- **Supabase PostgreSQL**: Primary and only data source - static fallback deprecated
- **Direct Fetch Implementation**: Uses direct fetch API calls instead of Supabase client SDK
- **Critical**: Never use static data files - all data operations must use Supabase database

#### Component Architecture
- `MedleyPlayer` - Core reusable player with platform detection and song change state management
- `MedleyHeader` - Separated medley basic info display (title/creator) that always shows regardless of song count (Added 2025-09-07)
- `SongList` - Unified timeline with editing and interaction
- Platform-specific players: `NicoPlayer`, `YouTubePlayer`
- Modals: `SongEditModal` (with song change feature), `SongSearchModal` (supports change mode), `CreateMedleyModal`
- Authentication: `AuthProvider`, `AuthModal`, `UserProfileDropdown`, `UserAvatar`
- Authorization: `AuthorizationBanner`, `AdminPage` (user approval management)
- `ActiveSongPopup` - Real-time song display popup that appears during playback (Updated 2025-09-03)
- Version Management: `VersionPage`, `VersionInfoModal` (dual-access version system)

**Modal Interaction Flow:**
- Timeline double-click → **DISABLED** (as of 2025-09-20)
- Alternative edit access → `SongEditModal` opens via other methods
- "楽曲を変更" button → `SongSearchModal` opens in change mode (`isChangingSong: true`)
- Song selection → Updates `editingSong` state with new song data, preserving time segments
- Modal closes → Returns to `SongEditModal` with updated song information

#### MedleyHeader Architecture (Added 2025-09-07)
**Separated Basic Information Display:**
- **Component**: `MedleyHeader.tsx` - Dedicated component for medley title and creator display
- **Always Visible**: Shows medley basic info regardless of song count (fixes empty medley display issue)
- **UI Consistency**: Maintains uniform appearance between populated and empty medleys
- **Sticky Positioning**: Uses `sticky top-16 z-50` to position below main AppHeader
- **Link Integration**: Title becomes clickable link to original video when `originalVideoUrl` provided

**Implementation Pattern:**
```typescript
// MedleyPlayer.tsx integration
{!loading && !error && (
    <MedleyHeader
        title={medleyTitle || (videoMetadata ? videoMetadata.title : undefined)}
        creator={medleyCreator || (videoMetadata ? videoMetadata.creator : undefined)}
        originalVideoUrl={generateOriginalVideoUrl()}
    />
)}
```

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

#### Version Management Architecture (Added 2025-09-04)
**Dual-Access Version Information System:**
- **Primary Access**: ALPHA badge in AppHeader opens VersionInfoModal (reliable, route-independent)
- **Secondary Access**: Direct `/version` route with Firebase hosting rewrite fallback
- **Keep a Changelog**: CHANGELOG.md follows standard format for version tracking
- **Firebase Integration**: Static route rewrites in firebase.json for routing resilience

**Version Modal Features:**
- Complete v0.1.0-alpha.1 release information display
- Detailed technical stack, security features, and change history
- External links to production environment and feedback channels
- Vibrant Orange design system integration with gradient styling
- No routing dependencies - always accessible via ALPHA badge click

**Implementation Pattern:**
```typescript
// AppHeader integration - ALPHA badge click handler
<button 
  onClick={() => setIsVersionModalOpen(true)}
  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-400 to-orange-500 text-white"
>
  ALPHA
</button>

// VersionInfoModal displays comprehensive release information
const packageInfo = {
  name: "medlean",
  version: "0.1.0-alpha.1",
  description: "メドレー楽曲アノテーション プラットフォーム"
};
```

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

#### Loading & Error Handling Architecture (Updated 2025-09-08)
**Enhanced User Experience for Loading States:**
- **Extended Timeouts**: API timeout increased from 10s→30s, player initialization from 10s→20s for improved reliability
- **Progressive Loading Messages**: Real-time loading timer, troubleshooting hints after 15s, comprehensive error guidance
- **Production Logging**: Enhanced debug information with video ID tracking, detailed initialization states
- **Intelligent Feedback**: Loading screens show elapsed time, specific video IDs, and actionable troubleshooting steps

**PlayerLoadingMessage Improvements:**
```typescript
interface PlayerLoadingMessageProps {
  videoId?: string; // Shows specific video being loaded
}

// Progressive enhancement based on loading time
const showTroubleshooting = loadingTime > 15; // 15 seconds
```

**Critical Timeout Configuration:**
- **API Data Fetching**: 30-second timeout in `useMedleyDataApi.ts` prevents premature failures
- **Player Initialization**: 20-second timeout in `useNicoPlayer.ts` allows complex iframe communication
- **Retry Logic**: Enhanced 3-attempt retry system with exponential backoff

#### Timeline System & Annotation Enhancement Features (Updated 2025-09-20)
**Timeline Display**: Always shows full video duration with simplified position calculations
**Edit Mode Features**:
- Drag-and-drop editing (0.1s precision)
- Undo/redo (50-action history)
- Keyboard shortcuts (S/E/M keys) with comprehensive visual feedback
- Real-time song bar creation with elapsed time display
- Adjacent song time alignment buttons
- **Timeline Interaction**: Double-click editing disabled (as of 2025-09-20) - use alternative edit access methods

**Simplified Edit Interface (Updated 2025-09-20):**
- **Removed buttons**: "楽曲追加" (Add Song), "インポート" (Import), and "クイック" (Quick) buttons have been removed from the edit interface
- **UI Simplification**: "変更を保存" (Save Changes) and "リセット" (Reset) buttons removed - editing now auto-saves via timeline interactions
- **Icon Removal**: Individual song edit/delete icon buttons removed to reduce UI clutter
- **Double-Click Disabled**: Timeline song bars no longer open edit modal on double-click (disabled 2025-09-20)
- **Remaining edit controls**: Edit mode toggle, Undo/Redo buttons only
- **Focused workflow**: Editing now primarily relies on keyboard shortcuts and alternative edit access methods

**Auto-Save System (Added 2025-09-07):**
- **Automatic Persistence**: Song data automatically saved to database 2 seconds after changes without requiring manual save button
- **Smart Validation**: Prevents auto-save of incomplete songs (empty titles, "空の楽曲" prefixes, "アーティスト未設定" artists)
- **Edit Mode Integration**: Auto-save enabled when edit mode is activated, disabled when deactivated
- **Visual Feedback**: "自動保存中..." loading indicator shows during save operations
- **Debounced Saves**: Multiple rapid changes consolidated into single save operation after 2-second delay
- **Error Handling**: Graceful fallback if auto-save fails, with user notification

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

#### Song Database Integration & Advanced Search System (Updated 2025-09-08)
**High-Precision Multi-Stage Search System**: Comprehensive search implementation that eliminates ambiguous search issues through advanced normalization and scoring.

**Key Features:**
- **Enhanced Normalization**: Katakana→Hiragana conversion, full-width→half-width conversion, music terminology standardization
- **Multi-Stage Search Algorithm**: Exact match (100pts) → Prefix match (80pts) → Word match (60pts) → Partial match (40pts) → Fuzzy match (20pts)
- **Intelligent Scoring**: Usage frequency bonus, string length penalty, field-specific weighting
- **Visual Search Results**: Color-coded match type badges, score visibility, result categorization

**Implementation Architecture:**
```typescript
export interface SearchResult extends SongDatabaseEntry {
  searchScore: number;
  matchType: 'exact' | 'startsWith' | 'wordMatch' | 'partialMatch' | 'fuzzyMatch';
  matchedField: 'title' | 'artist' | 'both';
}
```

**Normalization Pipeline:**
- Katakana/Hiragana unification: `katakanaToHiragana()`
- Full-width character conversion: `toHalfWidth()`
- Music term standardization: feat./featuring, vs/versus, remix, cover, etc.
- Symbol removal: brackets, punctuation, musical symbols
- Comprehensive Unicode handling for Japanese text

**Search Priority System:**
1. **Exact Match** (100-90pts): Perfect title/artist match - highest precision
2. **Prefix Match** (80-75pts): Search term matches start of title/artist
3. **Word Match** (60-55pts): Complete word boundary matches
4. **Partial Match** (40-30pts): Traditional substring matching
5. **Fuzzy Match** (20pts): Character-level similarity matching (>50% threshold)

**UI Improvements:**
- Match type badges with color coding (green=exact, blue=prefix, orange=partial, etc.)
- Real-time search score display
- Match field indication (title/artist/both)
- Usage frequency display
- Result categorization summary

**Two-Step Flow**: Song selection via enhanced `SongSearchModal` → edit via `SongEditModal`
- Real-time high-precision search across titles/artists with inline editing capabilities
- Database built from all medley data with intelligent deduplication
- Multi-platform URL editing for all songs
- Search result caching and performance optimization

#### SongEditModal with Song Change Feature (Updated 2025-09-14)
**Simplified Song Editing Interface**: Streamlined modal interface that guides users to the song database
- **New Song Addition**: Only shows "楽曲データベースから選択" button (manual input fields removed)
- **Existing Song Editing**: Shows read-only song information with "楽曲を変更" button
- **Empty Song Handling**: Displays warning message and directs users to select from database
- **Song Change Flow**: Button opens SongSearchModal in change mode, preserving time segments
- **Time Preservation**: Start/end times are maintained when changing to a different song
- **Modal Integration**: Seamless flow between SongEditModal and SongSearchModal
- **Redundant Field Removal**: Manual input fields, hint sections, and platform URL inputs removed for cleaner interface
- **Thumbnail Display (Added 2025-09-14)**: Shows song thumbnails after database selection
  - **Existing Songs**: Thumbnail displays in gray background section with responsive layout
  - **New Songs**: Thumbnail displays in green "選択された楽曲" section with success styling
  - **Multi-Platform Support**: Automatic thumbnail selection based on platform priority
  - **Responsive Layout**: Thumbnail on left, song info on right with proper spacing

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

// In SongEditModal.tsx - Thumbnail display pattern
import SongThumbnail from "@/components/ui/song/SongThumbnail";

<div className="flex items-start gap-4">
  {/* Thumbnail display */}
  <div className="flex-shrink-0">
    <SongThumbnail
      key={`${formData.title}-${formData.originalLink || JSON.stringify(formData.links)}`}
      originalLink={formData.originalLink}
      title={formData.title}
      size="md"
      links={formData.links}
    />
  </div>
  
  {/* Song information */}
  <div className="flex-1 space-y-3">
    {/* Song details */}
  </div>
</div>
```

#### ActiveSongPopup Architecture (Updated 2025-09-11)
**Real-time Song Display System**: Popup component that shows currently playing songs during video playback with intelligent positioning to avoid overlap and mouse interference.

**Key Features:**
- **Bottom-Right Positioning**: Fixed positioning in screen bottom area with left/right switching for mouse avoidance (Updated 2025-09-11)
- **Mouse Avoidance System**: Real-time mouse tracking that moves popup away from cursor to prevent UI interference
- **Overlap Prevention**: Hides completely when popup would interfere with video viewing
- **Song Detection**: Automatically detects active songs based on `currentTime` and song time ranges
- **Animation System**: Slide-in animations for new songs, smooth transitions between songs with mouse avoidance feedback
- **Multi-Song Support**: Can display multiple simultaneous songs with stacked layout
- **Debug Mode**: Comprehensive debug panel available with `?debug=true` URL parameter
- **Production Logging**: Enhanced logging system for production troubleshooting

**Mouse Avoidance System (`useMousePosition` + `usePlayerPosition`):**
- **Real-time Tracking**: Monitors mouse position with 16ms debounced updates for optimal performance
- **Edge Detection**: Automatically detects when mouse approaches screen edges (150px threshold)
- **Collision Avoidance**: Moves popup away when mouse enters 100px buffer zone around popup area
- **Position Fixing (Updated 2025-09-03)**: After mouse avoidance, popup stays in new position for 4 seconds
- **Visual Feedback**: Shows enhanced orange shadow and scale animation during position fixing
- **Smart Positioning**: Prioritizes mouse avoidance → position fixing → edge avoidance
- **Smooth Transitions**: 0.3s CSS transitions for natural movement

**Position Logic (`usePlayerPosition` hook - Updated 2025-09-11):**
- **Bottom Positioning**: Uses `bottom: 1rem` instead of `top: 6rem` for screen bottom placement
- **Left/Right Switching**: Dynamic positioning between left-bottom and right-bottom based on mouse proximity
- **Mobile/Desktop Consistent**: Both mobile and desktop use bottom positioning with mouse avoidance
- **Mouse Override**: Position changes dynamically based on cursor proximity to bottom area
- **Hide Conditions**: Popup hidden when player occupies large areas:
  - Height > 60% of viewport
  - Width > 80% of viewport  
  - Large center area (20%-80% vertical + height > 30% viewport)

**Position Fixing System (Added 2025-09-03):**
- **Duration**: 4 seconds (configurable via `POSITION_FIX_DURATION` constant)
- **Trigger**: Automatically activated when mouse avoidance occurs
- **Clearing Conditions**: Position fix clears when user scrolls >100px or timer expires
- **Visual State**: Enhanced orange borders, shadows, and "(位置固定)" status text
- **Debug Support**: Real-time countdown and state displayed in debug mode (`?debug=true`)

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

**Essential UI Patterns:**
```typescript
// Performance: Use React.memo for stable components
const MyComponent = React.memo(function MyComponent({ props }) {
  // Use logger.debug() instead of console.log()
  return <div>{content}</div>;
});

// Header variants: "home" (light), "player" (dark), "default" (neutral)
<AppHeader variant="player" />

// Sticky header hierarchy: Main header z-[100], song headers z-50
<header className="fixed top-0 left-0 right-0 z-[100] w-full">
<div className="min-h-screen pt-16"> {/* Account for header height */}
<div className="sticky top-16 z-50 bg-white"> {/* Song list headers */}
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

**Production Build Patterns:**
```typescript
// Tree-shaking prevention for critical components
if (typeof window !== 'undefined') {
  console.log('🔥 ComponentName: Module loaded in production');
}
MyComponent.displayName = 'MyComponent';

// Runtime component validation to prevent silent failures
if (!MyComponent) {
  console.error('🚨 CRITICAL: MyComponent is undefined!');
  return <div style={{ position: 'fixed', top: '6rem', left: '1rem',
    zIndex: 1000, background: 'red', color: 'white', padding: '1rem' }}>
    ERROR: MyComponent not loaded
  </div>;
}
```

**State Management Patterns:**
```typescript
// Tooltip: Use state setter callbacks to prevent stale closures
const handleTooltipMouseLeave = () => {
  setIsHoveringTooltip(false);
  const timeout = setTimeout(() => {
    setIsHoveringTooltip(current => {
      setIsHoveringSong(currentSong => {
        if (!current && !currentSong) {
          setIsTooltipVisible(false);
          setTooltipSong(null);
        }
        return currentSong;
      });
      return current;
    });
  }, 200);
  setHideTooltipTimeout(timeout);
};
```

**Auto-Save Pattern**: Debounced auto-save with validation and proper cleanup:
```typescript
// Auto-save configuration with useRef for stable reference
const autoSaveConfigRef = useRef<{
  enabled: boolean;
  videoId: string;
  medleyTitle: string;
  medleyCreator: string;
  duration: number;
}>({ enabled: false, videoId: '', medleyTitle: '', medleyCreator: '', duration: 0 });

const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Debounced auto-save function
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimeoutRef.current) {
    clearTimeout(autoSaveTimeoutRef.current);
  }
  
  autoSaveTimeoutRef.current = setTimeout(() => {
    performAutoSave();
  }, 2000); // 2 second debounce
}, [performAutoSave]);

// Auto-save with validation
const performAutoSave = useCallback(async () => {
  const config = autoSaveConfigRef.current;
  if (!config.enabled || isAutoSaving || !config.videoId) return;

  // Validate songs before saving
  const invalidSongs = editingSongs.filter(song => {
    const isTitleEmpty = !song.title || song.title.trim() === '' || song.title.startsWith('空の楽曲');
    const isArtistEmpty = !song.artist || song.artist.trim() === '' || song.artist === 'アーティスト未設定';
    return isTitleEmpty || isArtistEmpty;
  });

  if (invalidSongs.length > 0) return; // Skip auto-save for invalid songs

  setIsAutoSaving(true);
  // Perform save operation
  setIsAutoSaving(false);
}, [editingSongs, isAutoSaving]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  };
}, []);
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
- **Edit interface simplification**: As of 2025-09-20, edit interface only shows Edit Mode toggle and Undo/Redo buttons. Timeline double-click editing has been disabled. Song addition is done via keyboard shortcuts (M key) or alternative edit access methods. Manual save/reset buttons and individual song edit/delete icons have been removed for streamlined auto-save workflow

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

#### Medley Creation Errors (Fixed 2025-09-06)
- **"Key is not present in table 'users'" error**: Fixed by secure profile auto-creation system
- **Foreign key constraint violations**: Resolved by `checkUserApproval()` automatically creating missing user profiles
- **OAuth success but creation fails**: System now handles edge cases where authentication succeeds but profile creation initially fails
- **Security concerns**: Profile auto-creation maintains strict separation from approval process - no unauthorized access granted

### API Proxy Issues
#### Thumbnail Issues
- **Images not loading**: Verify proxy API route is working (`/api/thumbnail/niconico/[videoId]/`) - Note trailing slash requirement
- **CORS errors**: Direct CDN access blocked - must use server-side proxy implementation
- **Fallback failure**: Check all 5-tier fallback hierarchy (CDN L/M/default → getthumbinfo API → legacy)
- **404 responses**: Some video IDs may be invalid or videos deleted from platform
- **Cache issues**: Production deployment may need cache clearing for new proxy API
- **Redirect loops**: Ensure `trailingSlash: true` in `next.config.ts` and all API URLs end with `/`

#### Metadata API Issues (Added 2025-09-05)
- **"取得" button fails**: Check `/api/metadata/niconico/[videoId]` proxy API is working
- **DOMParser errors in production**: Server-side code must use regex-based XML parsing, not DOMParser
- **CORS errors in browser**: Metadata fetching must go through proxy server, not direct API calls
- **XML parsing failures**: Check regex patterns match Niconico's getthumbinfo XML response format
- **Missing User-Agent**: Niconico API requires proper User-Agent header for successful requests
- **Debug panel not showing**: Ensure `?debug=create` parameter enables CreateMedleyDebugPanel
- **Cache issues**: Metadata cache is 30min for success, 5min for errors - may need cache clearing

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

### Search System Issues (Updated 2025-09-08)
- **Search input missing**: Ensure search input field is present below tabs in HomePageClient.tsx
- **Search not working**: Check searchTerm state and filtering logic in filteredAndSortedMedleys
- **Tab switching clears search**: Verify search state is preserved when switching between medley/song modes
- **Results not updating**: Ensure useEffect with searchTerm dependency resets pagination to page 1
- **Keyboard shortcuts not working**: Check ESC key handler and clear button functionality
- **Cross-medley song search fails**: Verify songSearchResults array mapping and filtering logic
- **Genre references in legacy code**: Genre filtering has been removed - ensure no genreFilter state or UI remains

#### Advanced Search System Issues (Added 2025-09-08)
- **Search precision issues**: Verify `SearchResult` interface is properly imported and used in `SongSearchModal`
- **Normalization not working**: Check that `normalizeSearchTerm()`, `katakanaToHiragana()`, and `toHalfWidth()` functions are working correctly
- **Match type badges not displaying**: Ensure `getMatchTypeInfo()` function is implemented and match type colors are properly applied
- **Search scores incorrect**: Verify scoring algorithm in `searchSongs()` function includes usage bonus and length penalty calculations
- **Fuzzy search too permissive**: Adjust character match threshold from 0.5 to more restrictive value if needed
- **Music term normalization failing**: Check `normalizeMusicTerms()` regex patterns for feat/remix/cover standardization
- **Japanese text search issues**: Ensure proper Unicode handling in text processing pipeline
- **Search performance slow**: Consider implementing search result caching or debouncing for large datasets
- **Match field detection wrong**: Verify `matchedField` assignment logic correctly identifies title vs artist matches
- **Result categorization broken**: Check `resultsByMatchType` grouping logic in search modal useMemo hook

### SongEditModal Issues (Updated 2025-09-14)
- **Simplified interface issues**: Modal now only shows "楽曲データベースから選択" button for new songs - no manual input fields
- **Empty song warnings**: Ensure empty songs show appropriate warning messages directing users to database selection
- **Song change button not appearing**: Verify `onChangeSong` prop is passed to SongEditModal and user is editing existing song (not new)
- **Song change not preserving times**: Check `isChangingSong` flag is properly set in `handleSelectSongFromDatabase`
- **Modal state conflicts**: Ensure `isChangingSong` flag is reset when modals are closed
- **Song info not updating**: Verify `setEditingSong` is called with updated song data after selection
- **Platform URL fields removed**: Manual platform URL inputs have been removed - songs from database include this information
- **Hint sections removed**: All hint/help sections removed as interface now guides users directly to database selection
- **Thumbnail not displaying**: Verify `SongThumbnail` component is imported and `formData.links` or `formData.originalLink` contain valid URLs
- **Thumbnail key warnings**: Ensure proper key prop using song title and links for re-rendering when song changes
- **Layout issues**: Check responsive flexbox layout with `flex items-start gap-4` for proper thumbnail positioning

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

### ActiveSongPopup Issues (Updated 2025-09-03)
- **Component not appearing in production**: Check that module-level logging appears (`🔥 ActiveSongPopup: Module loaded`)
- **Tree-shaking removal**: Ensure displayName is set and module-level initialization code is present
- **Silent component failures**: Add runtime component validation before rendering in parent component
- **No debug information**: Verify `?debug=true` URL parameter shows debug panel
- **Song detection not working**: Check `currentTime` is updating and songs array has proper time ranges
- **Multiple songs not stacking**: Ensure unique keys for each ActiveSong and proper z-index layering
- **Animation not triggering**: Verify `isNewSong` detection logic compares against `prevActiveSongs`
- **Production logging missing**: Use both `console.log()` and `logger.info()` for production visibility
- **Popup overlapping video**: Check `usePlayerPosition` hook is properly detecting player position and setting `shouldHidePopup`
- **Position not updating on scroll**: Verify `playerContainerRef` is passed and scroll/resize event listeners are active
- **Hide logic too aggressive**: Adjust thresholds in hide conditions (currently 60% height, 80% width, 30% center area)
- **Mobile positioning issues**: Ensure mobile detection (`window.innerWidth < 768`) forces left positioning
- **Debug panel not showing position data**: Confirm `playerPosition.rect` is being populated with player boundaries

### Position Fixing Issues (Added 2025-09-03)
- **Position not staying fixed**: Verify `isPositionFixed` flag is properly destructured in ActiveSongPopup component
- **Timer not working**: Check `currentTime` variable name conflicts - use unique names in `usePlayerPosition`
- **Position clearing too early**: Ensure scroll threshold (100px) is appropriate for user interaction
- **Visual feedback missing**: Confirm orange styling and "(位置固定)" text appear during position fixing
- **Debug countdown not showing**: Verify debug panel displays `timeUntilFixExpires` with real-time countdown
- **Mouse avoidance not triggering fix**: Check that position fixing state is set when avoidance occurs
- **Scroll clearing not working**: Ensure `lastScrollY` state and `scrollDelta` calculation work correctly

### Song Segment Time Editing Issues (Added 2025-09-03)
- **Time values reverting to original**: Check useEffect dependencies in SongEditModal - avoid including `currentTime`, `maxDuration`, `allSongs` that can cause race conditions
- **MultiSegmentTimeEditor timing conflicts**: Increase setTimeout delay from 50ms to 200ms for better state synchronization
- **Edit buttons non-functional for unauthorized users**: Implement conditional rendering based on `onEditSong` prop availability with clear user feedback messages
- **State overwrites during editing**: Use minimal dependency arrays in useEffect to prevent editing state resets

### Tooltip System Issues (Added 2025-09-03)
- **Tooltip not disappearing on hover exit**: Use state setter callback functions in setTimeout to get current state values instead of relying on closure values
- **Tooltip state race conditions**: Ensure timeout clearing logic properly handles multiple rapid hover events
- **Stale state in tooltip handlers**: Implement the Tooltip State Management Pattern for proper async state handling
- **Tooltip flickering**: Check that mouse events are properly debounced and timeout values are appropriate (200ms recommended)
- **Tooltip positioning issues**: Verify BaseTooltip component handles viewport bounds and collision detection correctly

### MedleyHeader Display Issues (Added 2025-09-07)
- **Header not showing for empty medleys**: Verify `MedleyHeader` component is called outside conditional song list rendering
- **Title/creator missing**: Check that `medleyTitle` and `medleyCreator` states are properly set from API or metadata
- **Header overlapping content**: Ensure proper z-index hierarchy (`z-50`) and sticky positioning (`top-16`)
- **Original video link not working**: Verify `generateOriginalVideoUrl()` function returns valid URL for the platform
- **Metadata not loading**: Check Niconico metadata API proxy is working and `videoMetadata` state is populated

### Auto-Save Issues (Added 2025-09-07)
- **Auto-save not triggering**: Verify edit mode is active and `enableAutoSave` has been called with proper configuration
- **Auto-save skipping songs**: Check for incomplete song data (empty titles, "空の楽曲" prefixes, "アーティスト未設定" artists)
- **Multiple auto-saves firing**: Ensure debounce timeout (2 seconds) is properly clearing previous timeouts
- **Auto-save failing silently**: Check `updateMedley` and `createMedley` API functions are working and user is approved
- **Visual feedback missing**: Verify `isAutoSaving` state is properly connected to UI loading indicators
- **Auto-save continuing after edit mode disabled**: Ensure `disableAutoSave` properly clears timeout and resets configuration
- **Memory leaks from timeouts**: Verify useEffect cleanup removes timeout references on component unmount

### Loading & Timeout Issues (Updated 2025-09-08)
- **Persistent loading states**: Check API timeout configuration (should be 30s in `useMedleyDataApi.ts`)
- **Player initialization failures**: Verify player timeout is 20s in `useNicoPlayer.ts` with proper retry logic
- **Loading message not showing progress**: Ensure `PlayerLoadingMessage` receives `videoId` prop for debugging
- **Troubleshooting hints not appearing**: Check 15-second threshold in loading component
- **iframe communication failures**: Verify postMessage origin and player initialization sequence
- **Production debugging**: Use enhanced logging with video ID tracking for issue identification

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
- `src/components/features/medley/MedleyHeader.tsx` - Medley basic info display (title/creator) separated from song list (Added 2025-09-07)
- `src/hooks/useNicoPlayer.ts` - Niconico postMessage integration
- `src/hooks/usePlayerPosition.ts` - ActiveSongPopup positioning and overlap detection

**Version Management System:**
- `src/app/version/page.tsx` - Version information page route
- `src/components/pages/VersionPage.tsx` - Version page component with comprehensive release information
- `src/components/ui/VersionInfoModal.tsx` - Modal component for reliable version access (primary method)
- `CHANGELOG.md` - Keep a Changelog format version tracking with detailed release notes
- Firebase hosting rewrites in `firebase.json` for `/version` route static serving

**Data & Auto-Save:**
- `src/lib/api/medleys.ts` - Database API with direct fetch implementation (includes `deleteMedley` function)
- `src/hooks/useMedleyEdit.ts` - Core medley editing hook with auto-save functionality (Added 2025-09-07)
- `src/lib/utils/songDatabase.ts` - **Advanced multi-stage search system** with high-precision normalization and scoring (Updated 2025-09-08)
- `src/lib/utils/videoMetadata.ts` - Video metadata extraction
- `src/components/features/medley/SongSearchModal.tsx` - Enhanced search UI with match type visualization and result categorization (Updated 2025-09-08)

**Database Management:**
- `database/migrations/` - SQL migration files for Supabase setup
- `scripts/` - Node.js scripts for database operations and testing (see `scripts/README.md` for usage guide)

**API Proxy System:**
- `src/app/api/thumbnail/niconico/[videoId]/route.ts` - CORS proxy for Niconico thumbnails
- `src/app/api/metadata/niconico/[videoId]/route.ts` - CORS proxy for Niconico video metadata (Added 2025-09-05)
- `src/lib/utils/thumbnail.ts` - Multi-platform thumbnail URL generation
- `src/lib/utils/videoMetadata.ts` - Video metadata extraction with proxy integration
- `src/components/ui/song/SongThumbnail.tsx` - Thumbnail display component with retry logic
- `src/components/ui/debug/CreateMedleyDebugPanel.tsx` - Debug panel for metadata API troubleshooting

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
1. **Database Migrations**: Run SQL files in `database/migrations/` directory in Supabase Dashboard (in order)
   - `001_create_users_table.sql` - User profiles table
   - `002_add_user_id_to_medleys.sql` - User ownership for medleys
   - `003_fix_rick_astley_medley.sql` - Platform corrections (run after major data fixes)
   - `004_add_rick_astley_song_data.sql` - Adds proper song data for Rick Astley medley (fixes 0 songs issue)
   - `005_create_approved_users_table.sql` - **Admin approval system** (requires admin user ID)
   - `006_create_medley_edit_history.sql` - Edit history tracking and contributors view
   - `006_add_individual_song_links.sql` - Adds individual song links for thumbnail testing
   - `007_setup_admin_user.sql` - **Admin user setup** (replace YOUR_ADMIN_USER_ID with actual admin UUID)
   - `008_ensure_medley_contributors_view.sql` - Ensures contributors view exists and works properly
2. **OAuth Configuration**: Configure Google provider in Supabase Auth settings
3. **RLS Policies**: Ensure Row Level Security policies are active for user data protection
4. **Admin Setup**: 
   - Get your admin user ID from Supabase Dashboard > Authentication > Users after OAuth login
   - Edit `007_setup_admin_user.sql` and replace `YOUR_ADMIN_USER_ID` with your actual UUID
   - Run the migration in Supabase Dashboard > SQL Editor to set up admin permissions

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
- **Migration**: All `console.log()` statements have been replaced with appropriate logger methods (completed 2025-09-10)

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
- **Code Quality**: Recent improvements (2025-09-10) include React Hook dependency fixes, Image optimization for SEO, unified logging system, and project organization cleanup