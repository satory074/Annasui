# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

### Testing Commands
No dedicated test framework is currently configured. Testing is performed through:
- Manual testing on `http://localhost:3000` for development
- Production verification on `https://illustrious-figolla-20f57e.netlify.app` for deployment validation
- Browser console monitoring for postMessage communication debugging

### Deployment Commands
- `npx netlify deploy --prod` - Deploy to production on Netlify (auto-builds)
- `npx netlify sites:list` - List existing Netlify sites
- `npx netlify link --id <site-id>` - Link to existing Netlify site

### Development Workflow
**CRITICAL**: After implementing new features or fixes, always follow this verification process:

1. **Local Testing**: Run `npm run dev` and test functionality on http://localhost:3000
2. **Type Safety**: Run `npx tsc --noEmit` and `npm run lint` to ensure code quality
3. **Production Deployment**: Deploy with `npx netlify deploy --prod` 
4. **Production Verification**: Test the deployed application at https://illustrious-figolla-20f57e.netlify.app to ensure:
   - All new features work correctly in production environment
   - Cross-origin iframe communication functions properly
   - Static export generation includes all required routes
   - No console errors or missing resources

This verification step is essential because the production environment uses static export and cross-origin iframe embedding, which can behave differently than local development.

### 動作確認の重要事項
**CRITICAL**: 機能の動作確認は必ずプロダクション環境（https://illustrious-figolla-20f57e.netlify.app）で行うこと。
ローカル環境（localhost）での確認は開発時のみとし、最終的な動作確認は常にプロダクション環境を使用する。
- 問題の報告や機能の検証は、プロダクション環境での動作に基づいて行う
- ローカル環境とプロダクション環境では、iframe通信やstatic export等の違いにより動作が異なる場合がある
- バグ修正や新機能の実装後は、必ずプロダクション環境でテストを実施してから完了とする

## Project Overview

Anasui is a comprehensive multi-platform medley annotation platform built with Next.js. It provides an interactive interface for navigating video medleys with synchronized song timelines, annotation editing capabilities, and a searchable medley database. The application serves as both a player and a collaborative annotation database for the medley community, supporting both Niconico and YouTube platforms.

### Current Implementation Status
**Phase 10 Complete**: Advanced Tooltip System & UX Enhancement
- ✅ Phase 1: Supabase database integration with fallback to static data
- ✅ Phase 2: Drag-and-drop timeline editor with modal-based song editing  
- ✅ Phase 3: Dynamic routing with individual medley pages and OGP metadata
- ✅ Phase 4: Advanced search (cross-medley song search), pagination, and statistics dashboard
- ✅ Phase 5: Multi-platform support (Niconico + YouTube) with unified homepage
- ✅ Phase 6: Modern UI/UX with responsive grid, enhanced cards, and unified search interface
- ✅ Phase 7: Enhanced sorting system with metadata-based ordering (new content discovery)
- ✅ Phase 8: Advanced annotation editing with snap functionality, keyboard shortcuts, and undo/redo
- ✅ **Timeline Unification**: Integrated SongTimeline functionality into SongList component for streamlined UX
- ✅ **Song List UI Redesign**: Simplified layout with clean card design, full song title display, and enhanced visual feedback
- ✅ **Phase 9: Timeline Zoom System**: Complete zoom/pan functionality with dynamic grids, auto-follow, and precision editing
- ✅ **Phase 10: Advanced Tooltip System**: Hover-based song details with intelligent positioning and click-to-dismiss functionality
- ✅ **UI Simplification Phase**: Removed unnecessary visual elements (colors, genres, position controls) for cleaner interface
- ✅ **Player Controls Integration**: Fully functional seek bar with volume control, addressing critical time synchronization issues
- 🔄 Phase 11: User authentication and collaborative editing (planned)

## Core Architecture

### Technology Stack
- Next.js 15.2.1 with React 19.0.0 and TypeScript
- TailwindCSS 4 for styling with Emotion for CSS-in-JS
- Multi-platform video player support:
  - Native iframe postMessage API for Niconico player integration
  - YouTube iframe embed for YouTube videos
  - HLS.js for advanced video streaming capabilities
- Supabase for database and real-time data management (optional)
- Additional capabilities: Axios for HTTP requests, Tone.js/Wavesurfer.js for audio processing (available but not currently used)
- No external state management library (React hooks only)  
- Static export configured for Netlify deployment with PostCSS and optimized builds

### Supabase Configuration (Optional)
If you want to use dynamic data management instead of static files:

1. **Setup Supabase Project**
   - Create account at https://supabase.com
   - Create new project
   - Copy URL and anon key from Settings > API

2. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Database Setup**
   - Run SQL from `supabase/schema.sql` in Supabase SQL Editor
   - Run SQL from `supabase/seed.sql` to migrate existing data

4. **Fallback Behavior**
   - App automatically uses static data if Supabase is not configured
   - No code changes needed - seamless fallback to static files

### Critical Implementation Details

#### Niconico Player Integration (`useNicoPlayer` hook)
The application's core functionality relies on postMessage communication with Niconico's embedded player:

**Player Initialization:**
- **CRITICAL**: Never use `sandbox` attribute on the iframe - it blocks postMessage communication
- Direct initialization without `registerCallback` dependency (registerCallback is unreliable)
- Uses timeout-based fallback initialization after 1000ms delay
- Automatic state management through continuous polling at 100ms intervals

**PostMessage Architecture:**
```typescript
// Command structure (sourceConnectorType: 1)
{
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "seek" | "play" | "pause" | "getStatus",
  data?: { time: number, _frontendId: 6, _frontendVersion: 0 }
}
```

**CRITICAL: Time Unit Conversion**
- Niconico player API expects time values in **milliseconds**, not seconds
- All seek operations must multiply time by 1000: `time: seekTimeInSeconds * 1000`
- **playerMetadataChange events return time in milliseconds** - must convert to seconds: `timeInSeconds = timeInMs / 1000`
- This was a major bug that caused seek operations to fail and seek bar synchronization issues - always handle unit conversion properly

**State Synchronization:**
- `commandInProgress` flag prevents command overlap and race conditions
- Automatic cleanup of intervals/timeouts on component unmount
- UI-first updates with eventual consistency from player events
- Time sync starts/stops based on playing state to optimize performance

#### Multi-Platform Architecture
**Platform Support:**
- **Niconico**: Full integration with postMessage API for seek/play/pause controls
- **YouTube**: Basic iframe embed (seek functionality planned for future implementation)
- **Extensible**: Architecture supports adding new platforms (Twitch, bilibili, etc.)

**URL Structure:**
- `/` - Homepage with unified medley database (searchable across all platforms)
- `/niconico/[videoId]` - Niconico medley player pages with full interactive features
- `/youtube/[videoId]` - YouTube medley player pages with basic playback
- Deep linking support: `?t=seconds` parameter for timestamp links

#### Data Flow Architecture
**Dual-Mode Data Management:**
- **Static Mode**: Falls back to `src/data/medleys.ts` and `src/data/youtubeMedleys.ts` when Supabase is not configured
- **Database Mode**: Uses Supabase PostgreSQL with real-time capabilities when configured
- `useMedleyData` automatically detects and switches between modes based on environment variables
- Platform-specific data files support different video platforms seamlessly

**Component Architecture:**
- `MedleyPlayer` - Core reusable player component with platform detection and edit mode support
- `MedleyPageClient` - Client-side wrapper handling search params for deep linking and platform props
- `NicoPlayer` - Niconico-specific iframe player with postMessage integration
- `YouTubePlayer` - YouTube-specific iframe player (basic embed functionality)
- `PlayerControls` - Complete player control interface with seek bar, play/pause, volume, and fullscreen controls
- `SongList` - Unified card-based song display with integrated Gantt chart timeline bars, complete editing functionality including drag-and-drop, snap, selection, and keyboard shortcuts
- `SongEditModal` - Modal for detailed song editing with time validation
- `SongDetailModal` - Read-only modal for displaying song information with play-from-here functionality
- `SongDetailTooltip` - Hover-based lightweight song information display with intelligent positioning and interaction management
- `ShareButtons` - Social sharing with platform-aware URL generation and native share API
- `MedleyStatistics` - Analytics dashboard for genre/artist/creator insights across platforms

#### Timeline Zoom System (Phase 9)
**CRITICAL**: Complete timeline zoom and navigation system for precision editing and efficient navigation of long medleys.

**Zoom Control Architecture:**
- **Zoom Range**: 0.5x to 5.0x magnification with 0.1x precision
- **Position Control**: Dynamic offset slider for navigating zoomed timeline
- **Auto-Follow Mode**: Automatic centering on current playback position
- **Preset Buttons**: Quick access to 1x, 2x, 5x zoom levels

**State Management:**
```typescript
const [timelineZoom, setTimelineZoom] = useState<number>(1.0); // 0.5-5.0
const [timelineOffset, setTimelineOffset] = useState<number>(0); // Start position
const [autoFollow, setAutoFollow] = useState<boolean>(true); // Auto-center

// Calculated values
const visibleDuration = duration / timelineZoom;
const visibleStartTime = timelineOffset;
const visibleEndTime = Math.min(timelineOffset + visibleDuration, duration);
```

**Advanced Navigation Features:**
- **Mouse Wheel Zoom**: Ctrl/Cmd+wheel for precise zoom control centered on mouse position
- **Smart Clipping**: Automatic filtering of songs outside visible range
- **Dynamic Grids**: Time grid density adapts to zoom level (5x shows 12-second intervals)
- **Time Labels**: Detailed time markers appear at 1.5x+ zoom for precision editing

**Integration with Editing System:**
- All drag-and-drop editing operations work seamlessly with zoom
- Snap functionality adapts to zoom level for precise alignment
- Position calculations automatically account for visible range:
  ```typescript
  // Zoom-aware positioning
  left: `${((song.startTime - visibleStartTime) / visibleDuration) * 100}%`
  width: `${((song.endTime - song.startTime) / visibleDuration) * 100}%`
  ```

#### Integrated Timeline Architecture (SongList Component)
**IMPORTANT**: The timeline functionality has been unified into the SongList component, replacing the separate SongTimeline component.

**Dual-Mode Timeline Behavior:**
- **View Mode**: Click timeline bars to open song detail modal with comprehensive information
- **Edit Mode**: Full drag-and-drop editing with inline Gantt chart timeline bars
- Position calculation: `(e.clientX - rect.left) / rect.width * duration`
- **Always validate duration > 0** before calculating seek time to prevent 0-second seeks

**Advanced Edit Mode Features:**
```typescript
// Drag mode detection based on click position within song segment
let mode: 'move' | 'resize-start' | 'resize-end' = 'move';
if (clickPositionInSong < 8) mode = 'resize-start';
else if (clickPositionInSong > songWidth - 8) mode = 'resize-end';

// Time conversion with bounds checking and snap support
const deltaTime = (deltaX / rect.width) * duration;
const snapPoints = getSnapPoints(draggingSong.id);
newStartTime = snapToNearestPoint(rawStartTime, snapPoints);
```

**Phase 8 Editing Enhancements:**
- **Snap Functionality**: Auto-snap to adjacent song boundaries (1-second threshold)
- **Song Selection**: Click songs to select, visual feedback with blue ring
- **Keyboard Shortcuts**: Arrow keys for precise adjustments
  - `← →`: Move entire song (0.5s steps, Shift: 0.1s, Ctrl: 1s)
  - `↑ ↓`: Extend/shorten end time
  - `Alt + ← →`: Adjust start time only
  - `Esc`: Deselect song
- **Undo/Redo System**: 50-action history with Ctrl+Z/Ctrl+Y shortcuts
- **Inline Song Actions**: Edit/delete buttons directly in song list
- **Current Time Integration**: "Current Time" buttons in edit modal to set boundaries from playback position

**Critical Timeline Patterns (SongList Integration):**
- Child elements use `pointer-events-none` to avoid intercepting parent clicks
- Song titles use `whitespace-nowrap overflow-visible relative z-20` for complete visibility
- Timeline bars styled with `animate-pulse shadow-lg shadow-blue-400/50` when playing
- Resize handles positioned absolutely with `cursor-ew-resize` on timeline bars
- Double-click timeline bars opens edit modal, single-click behavior depends on mode:
  - **View Mode**: Opens song detail modal with comprehensive information
  - **Edit Mode**: Selects song for keyboard editing
- Time values rounded to 0.1 second precision for smooth editing
- Snap toggle button in song list header allows disabling auto-snap when needed
- Timeline container uses `.timeline-container` class for drag operation targeting

#### Song Detail Modal Architecture
**Read-Only Information Display:**
- Displays comprehensive song information including title, artist, timing, and original links
- Simplified design with no color indicators - focus on essential information
- Formatted time display with start/end times and calculated duration
- "この曲から再生" button triggers seek operation and closes modal
- Accessible design with proper ARIA labels and keyboard navigation
- Modal state managed at MedleyPlayer level with `onShowSongDetail` callback

#### Advanced Tooltip System (Phase 10)
**CRITICAL**: Hover-based song detail display with intelligent interaction management.

**Tooltip Architecture:**
- `SongDetailTooltip` component provides lightweight song information on hover
- Intelligent positioning system prevents display cutoff at screen edges
- Automatic position adjustment based on viewport boundaries and tooltip dimensions
- Fixed positioning with z-index layering for proper display hierarchy

**Hover State Management:**
```typescript
const [isHoveringTooltip, setIsHoveringTooltip] = useState<boolean>(false);
const [isHoveringSong, setIsHoveringSong] = useState<boolean>(false);
const [hideTooltipTimeout, setHideTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
```

**Smart Interaction Flow:**
- **Timeline Bar Hover**: Tooltip appears with 0ms delay positioned beside timeline bar
- **Tooltip Hover**: Mouse can move to tooltip, keeping it visible for interaction
- **Click-to-Dismiss**: Clicking anywhere outside tooltip dismisses it immediately
- **Timeout Management**: 200ms delay before hiding when both timeline and tooltip lose hover
- **Click Propagation**: Tooltip clicks use `e.stopPropagation()` to prevent dismissal

**Position Calculation:**
```typescript
// Intelligent positioning with screen edge detection
const adjustedX = position.x + tooltipWidth + padding > window.innerWidth 
  ? position.x - tooltipWidth - padding 
  : position.x;
const adjustedY = position.y + tooltipHeight + padding > window.innerHeight
  ? position.y - tooltipHeight - padding
  : position.y;
```

**Integration Patterns:**
- **View Mode**: Hover shows tooltip, click seeks to song start time
- **Edit Mode**: Hover disabled, click selects song for editing
- **Timeout Cleanup**: All timeouts cleared on component unmount and state changes
- **Event Coordination**: Document click listener only active when tooltip visible

#### Component Integration Pattern
- Platform-specific player components (`NicoPlayer`, `YouTubePlayer`) handle iframe embedding
- `useNicoPlayer` hook manages Niconico player communication and state
- `MedleyPlayer` component conditionally renders players based on platform prop and implements `effectiveDuration` fallback
- SongList component triggers actions through platform-aware seek methods with integrated timeline functionality
- Seek operations automatically update current track detection (Niconico only currently)
- Inline timeline bars support click-to-detail in view mode, drag-to-edit in edit mode

**CRITICAL Duration Handling Pattern:**
```typescript
// UPDATED: Prioritize static data over player data in MedleyPlayer.tsx
const effectiveDuration = medleyDuration || duration;
```
**IMPORTANT**: Static data duration takes priority over player duration to ensure correct timeline positioning. This prevents misalignment when player returns actual video duration that differs from annotation data. This prevents `Infinity%` calculations when `useNicoPlayer` returns `duration=0` before player initialization, and ensures timeline bars are positioned correctly even when player duration doesn't match expected medley length.

#### Seek Operation Implementation
**Niconico Player - Critical Sequence for Stopped Player:**
1. Send seek command with time in milliseconds
2. Wait 200ms for seek to complete
3. Send play command to start playback automatically
4. This ensures seamless "click song → play from position" experience

**YouTube Player:**
- Currently uses basic iframe embed without seek API integration
- Seek functionality logs to console as placeholder for future implementation

#### Player Controls Integration
**PlayerControls Component:**
- Complete seek bar functionality with real-time synchronization
- Volume control with slider interface
- Play/pause toggle with visual feedback
- Fullscreen toggle button
- Time display showing current time and total duration

**Integration Pattern:**
- `useNicoPlayer` hook manages volume state and player communication
- `NicoPlayer` component integrates PlayerControls with proper prop passing
- `MedleyPlayer` handles volume change events and passes callbacks
- **CRITICAL**: Seek bar synchronization requires proper milliseconds/seconds conversion in `playerMetadataChange` events

### Production Deployment Configuration
- Next.js configured for static export (`output: 'export'`, `trailingSlash: true`)
- Static files generated to `.next/` directory
- Images unoptimized for static hosting compatibility
- Cross-origin iframe communication works in production environment
- PostCSS integration with TailwindCSS 4 for build optimization
- **CRITICAL**: All video IDs must be included in `generateStaticParams` for static export
- Current production URL: https://illustrious-figolla-20f57e.netlify.app

### Key Technical Constraints
- Niconico API is undocumented and subject to change without notice
- iframe cross-origin restrictions require postMessage-only communication
- Player events may have delays, requiring defensive timeout handling
- Some player internal errors are expected and don't affect functionality

### Development Testing
- Default Niconico video ID "sm500873" (組曲『ニコニコ動画』) for consistent testing
- Default YouTube video ID "dQw4w9WgXcQ" for multi-platform testing
- Console logging enabled for postMessage debugging (Niconico)
- UI debug indicators show player ready state and communication status
- Platform detection and player switching testable via URL structure
- Seek functionality testable through:
  - Song detail modal "この曲から再生" button (seeks to song start time)
  - Inline timeline bar click opens detail modal in view mode
  - Platform-specific behavior differences visible in console

**Timeline Zoom System Testing:**
- **Zoom Controls**: Use zoom slider (0.5x-5.0x) to test magnification levels
- **Preset Buttons**: Click 1x, 2x, 5x buttons for quick zoom levels
- **Position Navigation**: Use position slider when zoomed to navigate timeline
- **Auto-Follow Mode**: Toggle "自動追従: ON/OFF" to test automatic centering on playback
- **Mouse Wheel Zoom**: Hold Ctrl/Cmd and scroll to zoom centered on mouse position
- **Dynamic Grids**: Observe time grid density changes at different zoom levels
- **Time Labels**: Verify detailed time markers appear at 1.5x+ zoom
- **Range Display**: Check "表示範囲" information updates correctly
- **Song Clipping**: Confirm only visible-range songs appear in timeline

**Annotation Editing Testing:**
- **Edit Mode Features**: Click "編集モード" button to activate advanced editing
- **Snap Functionality**: Toggle "スナップ: ON/OFF" button to test auto-snap behavior
- **Song Selection**: Click inline timeline bars in song list to see blue ring selection indicator
- **Keyboard Shortcuts**: Select song then use arrow keys (with Shift/Ctrl modifiers)
- **Undo/Redo**: Use Ctrl+Z/Ctrl+Y or click ↶/↷ buttons after making changes
- **Inline Actions**: Edit/delete buttons appear in song list during edit mode
- **Current Time Integration**: Edit modal shows "現在時刻" buttons for time setting
- **History Management**: Make multiple edits to test 50-action history limit
- **Zoom + Edit Integration**: Test all editing features work correctly at different zoom levels

**Song List UI Testing:**
- **Simplified Card-Based Layout**: Each song displays as a clean card with no color indicators, time stamps, or badges
- **Full-Width Timeline Bars**: Visual timeline bar in Gantt chart format with complete song titles displayed (no truncation)
- **Unified Color Scheme**: All timeline bars use consistent blue color (bg-blue-500 dark:bg-blue-600) for visual harmony
- **Song Detail Modal**: Click timeline bars in view mode to open detailed song information
- **Overlap Detection**: Songs with time overlaps show striped patterns (no badges in header)
- **Mashup Support**: When multiple songs play simultaneously, header shows "マッシュアップ: X曲同時再生中"
- **Current Time Indicator**: Red vertical line shows real-time playback position across all timeline bars
- **Enhanced Visual Feedback**: Current playing songs highlighted with blue rings, pulse animation, and shadow effects

**Tooltip System Testing:**
- **Hover Display**: Move mouse over timeline bars in view mode to trigger tooltip appearance
- **Position Adjustment**: Test tooltip positioning near screen edges (top, bottom, left, right)
- **Mouse Movement**: Move mouse from timeline bar to tooltip - tooltip should remain visible
- **Click to Seek**: Click "この曲から再生" button in tooltip to test seek functionality
- **Click Dismissal**: Click anywhere outside tooltip to test dismissal behavior
- **Timeout Behavior**: Move mouse away from both timeline and tooltip - should dismiss after 200ms delay
- **Edit Mode**: Verify tooltip is disabled when edit mode is active
- **Mobile Testing**: Test tap-based interaction on touch devices

### Common Issues and Solutions
**Player Integration:**
- **Seek operations fail or reset to beginning**: Ensure time values are converted to milliseconds (`* 1000`)
- **Seek bar synchronization issues**: playerMetadataChange events return time in milliseconds - convert to seconds (`/ 1000`). This was a critical bug where 3 seconds of playback would show as 3000 seconds on the seek bar
- **Timeline clicks returning 0 seconds**: Video duration not loaded yet, check duration > 0
- **Child elements intercepting clicks**: Use `pointer-events-none` on child elements
- **Player not responding**: Check iframe load and postMessage origin verification
- **Seek without automatic playback**: Add play command after seek when player is stopped
- **Duration is 0 causing Infinity% positioning**: Use `effectiveDuration = medleyDuration || duration` fallback pattern (static data priority)
- **Timeline bars positioned incorrectly**: Ensure static data duration is prioritized over player duration to prevent misalignment when video ID doesn't match annotation data

**Data Management:**
- **Database connection fails**: Check Supabase environment variables, app falls back to static data automatically
- **Edit mode not saving**: Verify `useMedleyEdit` hook is properly connected to save handler
- **Search results empty**: Ensure search mode matches expected data (medley vs song search)

**Annotation Editing Issues:**
- **Undo/Redo not working**: Check keyboard event listeners are properly attached in edit mode
- **Song selection not visible**: Ensure `ring-2 ring-blue-500` classes are applied to selected songs
- **Snap not working**: Verify `isSnapEnabled` state and snap threshold (1.0 seconds)
- **Keyboard shortcuts not responding**: Check edit mode is active and song is selected
- **Current time button not updating**: Ensure `currentTime` prop is passed to SongEditModal
- **Timeline selection not updating header**: Check selectedSong state is properly displayed in timeline header

**Multi-Platform Issues:**
- **Wrong player component loading**: Check platform prop is correctly passed from route to MedleyPageClient to MedleyPlayer
- **YouTube videos not playing**: Verify YouTube embed URL format and CORS restrictions
- **Platform detection failing**: Ensure static data includes `platform` field in MedleyData objects

**Timeline Zoom Issues:**
- **Zoom slider not responding**: Check `timelineZoom` state updates and range slider value binding
- **Position slider not appearing**: Verify `timelineZoom > 1` condition and slider visibility logic
- **Auto-follow not working**: Ensure `currentTime` updates trigger useEffect with proper dependencies
- **Mouse wheel zoom not working**: Confirm Ctrl/Cmd key detection and preventDefault on wheel events
- **Songs disappearing when zoomed**: Verify `getVisibleSongs` filter logic and time range calculations
- **Timeline bars positioned incorrectly**: Ensure position calculations use `visibleStartTime` and `visibleDuration`
- **Grid density not updating**: Check grid count calculation based on `timelineZoom` value
- **Time labels not showing**: Verify `timelineZoom > 1.5` condition and label positioning
- **Editing broken in zoom mode**: Ensure drag calculations use `visibleDuration` instead of `duration`

**Song List UI Issues:**
- **Timeline bars not displaying**: Ensure `duration` prop is passed to SongList component
- **Song detail modal not opening**: Check `onShowSongDetail` callback is properly passed and implemented
- **Timeline bars not clickable**: Verify click event handlers on timeline bar elements and edit mode state
- **Song titles overflowing timeline bars**: All song titles should use `overflow: hidden` and `textOverflow: ellipsis` for consistent display
- **Overlap detection not working**: Check `detectOverlaps` function logic for time range intersection
- **Current time indicator not moving**: Verify `currentTime` prop updates and position calculation
- **Pulse animation not showing**: Ensure playing songs have `animate-pulse shadow-lg shadow-blue-400/50` classes
- **Edit/delete buttons missing**: Confirm edit mode is active and buttons are rendered at timeline bar right edge (`absolute right-2 top-1 z-40`)
- **Color-related issues**: All color indicators, dots, and selection interfaces have been removed for simplified UI - timeline bars use unified blue color (bg-blue-500 dark:bg-blue-600)

**Tooltip System Issues:**
- **Tooltip not appearing on hover**: Check `onHoverSong` callback is properly passed to SongList and connected to MedleyPlayer
- **Tooltip appears but immediately disappears**: Verify `isHoveringTooltip` and `isHoveringSong` state management and timeout logic
- **Tooltip positioned incorrectly**: Check `adjustedPosition` calculation in useEffect and ensure viewport boundary detection
- **Tooltip doesn't dismiss on click**: Ensure document click listener is attached when `isTooltipVisible` is true
- **"この曲から再生" button not working**: Verify `onSeek` prop is passed to tooltip and click handler calls seek function
- **Tooltip shows in edit mode**: Check `!isEditMode` condition in hover event handlers
- **Memory leaks with timeouts**: Ensure `hideTooltipTimeout` is cleared in cleanup functions and component unmount
- **Tooltip flickers during mouse movement**: Verify 200ms delay timing and proper timeout management

**Build and Deployment:**
- **Build deployment failing**: Ensure `public/favicon.ico` exists for Next.js build
- **Dynamic routes not generating**: Check `generateStaticParams` includes all required video IDs for both platforms
- **Next.js 15 params errors**: All dynamic route components must handle `params: Promise<{...}>`
- **Missing static paths**: Add new video IDs to respective `generateStaticParams` functions in platform directories
- **404 errors on deployed site**: Video ID not in `generateStaticParams` - add missing IDs and redeploy
- **Netlify deployment issues**: Use `npx netlify deploy --prod` and ensure `.next` directory is published

## Data Management Architecture

### Dual-Source Data Strategy
**Static Fallback System:**
- Primary: Supabase PostgreSQL database for production data management
- Fallback: Platform-specific static definitions when database unavailable:
  - `src/data/medleys.ts` - Niconico video data
  - `src/data/youtubeMedleys.ts` - YouTube video data
- Automatic detection based on environment variable configuration
- Zero-config development experience with graceful degradation

**Database Schema (Supabase):**
```sql
-- Core tables: medleys, songs with RLS policies
-- Automatic updated_at triggers and UUID primary keys
-- Foreign key relationships for data integrity
```

### Key Data Flow Hooks
- `useMedleyData(videoId)`: Dual-source data retrieval with loading states
- `useMedleyDataApi()`: Direct Supabase API access with error handling
- `useMedleyEdit(songs)`: Local editing state with change detection and persistence
- `useCurrentTrack(currentTime, songs)`: Real-time active song calculation
- `useNicoPlayer({videoId, callbacks})`: Complete player state and communication management

### Editing State Management
**Local-First Editing Pattern:**
- Changes stored in local state until explicit save
- `hasChanges` flag tracks unsaved modifications
- Optimistic UI updates with eventual database consistency
- Add/update/delete operations with immediate visual feedback
- Reset functionality to discard unsaved changes

**Advanced Editing Features (Phase 8):**
- **History Management**: `useMedleyEdit` maintains 50-action undo/redo history
- **Atomic Operations**: All edits (add/update/delete/reorder) automatically add to history
- **Keyboard Integration**: Global shortcuts for undo (Ctrl+Z) and redo (Ctrl+Y/Shift+Ctrl+Z)
- **Song Selection State**: Timeline tracks selected song for keyboard editing
- **Snap System**: Configurable snap-to-boundary with 1-second threshold
- **Real-time Feedback**: Visual indicators for selected songs and editing modes

### Component Architecture Patterns
**Feature-Based Organization:**
- `src/components/features/medley/` - Unified song list (with integrated timeline), edit modal, detail modal, and tooltip components
- `src/components/features/player/` - Niconico iframe integration
- `src/components/features/share/` - Social sharing and URL generation
- `src/components/features/statistics/` - Analytics and data visualization
- `src/components/pages/` - Page-level reusable components
- `src/components/layout/` - Navigation and header components

**Page Structure Patterns:**
- Server components for metadata generation (`layout.tsx`, `page.tsx`)
- Client components for interactive features (`*Client.tsx`)
- Dynamic routing with `generateStaticParams` for static export compatibility

### Type System Architecture
**Centralized Type Definitions:**
- `src/types/features/medley.ts` - SongSection, MedleyData types with platform field and metadata
  - Extended with `createdAt`, `updatedAt`, `viewCount` for enhanced sorting
- `src/types/features/player.ts` - PlayerState, PlayerMessage interfaces
- Platform-aware type definitions support 'niconico' | 'youtube' | future platforms
- Database types auto-generated from Supabase schema
- Type conversion utilities between database and application types

### Search and Filtering Architecture
**Multi-Mode Search System:**
- **Medley Search**: Title and creator name matching
- **Song Search**: Cross-medley song and artist search with deep linking
- **Advanced Filtering**: Genre-based filtering with dynamic options
- **Enhanced Sorting**: Multi-field sorting with metadata-based discovery
  - 🆕 新着順 (createdAt desc) - Default for new content discovery
  - 🔥 人気順 (viewCount desc) - Popular content based on view count
  - 📝 更新順 (updatedAt desc) - Recently updated annotations
  - 🎲 ランダム - Random order for content discovery
  - Traditional sorts: title, creator, duration, song count
- **Pagination**: Client-side pagination with configurable page size (8/16/32/64)

### Critical File Locations
**Core Application:**
- Entry points: `src/app/page.tsx` (unified homepage), `src/app/niconico/[videoId]/page.tsx`, `src/app/youtube/[videoId]/page.tsx`
- Player integration: `src/hooks/useNicoPlayer.ts` (Niconico-specific)
- Player components: `src/components/features/player/NicoPlayer.tsx`, `src/components/features/player/YouTubePlayer.tsx`
- Data management: `src/hooks/useMedleyData.ts`, `src/lib/api/medleys.ts`
- Database client: `src/lib/supabase.ts`

**Static Configuration:**
- Niconico medley definitions: `src/data/medleys.ts` (includes metadata for sorting)
- YouTube medley definitions: `src/data/youtubeMedleys.ts` (includes metadata for sorting)
- Database schema: `supabase/schema.sql`, `supabase/seed.sql`
- Next.js config: `next.config.ts` (static export + image optimization)

**Platform Integration:**
- Player constants: `src/lib/constants/player.ts`
- Time utilities: `src/lib/utils/time.ts`
- Video validation: `src/lib/utils/videoValidation.ts`

**Route Structure:**
- Platform-specific layouts: `src/app/niconico/[videoId]/layout.tsx`, `src/app/youtube/[videoId]/layout.tsx`
- Shared components: `src/components/pages/MedleyPlayer.tsx`, `src/components/pages/MedleyPageClient.tsx`

## Adding New Platforms

To add support for a new video platform (e.g., Twitch, bilibili):

1. **Create route structure**: `src/app/[platform]/[videoId]/page.tsx` and `layout.tsx`
2. **Add platform to types**: Update `platform?: 'niconico' | 'youtube' | 'newplatform'` in `src/types/features/medley.ts`
3. **Create player component**: `src/components/features/player/NewPlatformPlayer.tsx`
4. **Update MedleyPlayer**: Add conditional rendering for new platform in `src/components/pages/MedleyPlayer.tsx`
5. **Create data file**: `src/data/newplatformMedleys.ts` with platform-specific medley data including metadata fields
6. **Update homepage**: Import and include new platform data in `src/app/page.tsx`
7. **Add static paths**: Include video IDs in `generateStaticParams` for static export
8. **Update metadata**: Customize OGP images and metadata in layout for platform-specific URLs
9. **Include metadata**: Ensure `createdAt`, `updatedAt`, `viewCount` are populated for sorting features

The architecture is designed for easy platform extensibility with minimal code changes required.

## Modern UI Design Architecture

### Homepage Layout System
**Media Platform-Inspired Design** (implemented in Phase 6):
- **4-Column Responsive Grid**: Adapts from 1 column (mobile) to 4 columns (desktop)
- **Card-Based Content Display**: Enhanced hover effects with scale animations and overlays
- **Unified Search Interface**: Prominent search bar with tab-based mode switching
- **Platform-Specific Visual Indicators**: Color-coded badges (YouTube red, Niconico orange)

### Card Design Patterns
**Modern Card Architecture:**
```typescript
// Card structure with hover states and platform badges
<div className="group hover:scale-[1.02] transition-all duration-300">
  {/* Thumbnail with hover overlay and play button */}
  <div className="aspect-video relative overflow-hidden">
    {/* Platform badge with backdrop blur */}
    <span className="bg-red-600/90 backdrop-blur-sm">YouTube</span>
    {/* Hover overlay with play button */}
    <div className="opacity-0 group-hover:opacity-100">
      <PlayButton />
    </div>
  </div>
  {/* Content with genre tags and metadata */}
</div>
```

### Search and Filter UI Patterns
**Tab-Based Search Interface:**
- Large, prominent search bar with search icon
- Tab-style mode switching (メドレー検索 / 楽曲検索)
- Structured filter panel with labels and organized controls
- Real-time result counts with highlighted numbers

**Filter State Management:**
- `itemsPerPage` state for dynamic pagination (8/16/32/64 options)
- Combined search/filter clearing with visual feedback
- Responsive layout adapting filter controls for mobile

### Visual Design System
**Modern Aesthetic Principles:**
- **Rounded corners**: `rounded-xl` for cards, `rounded-lg` for buttons
- **Backdrop blur effects**: `backdrop-blur-sm` for overlays and badges
- **Smooth transitions**: `transition-all duration-300` for interactions
- **Hover states**: Scale, shadow, and color transitions
- **Platform branding**: Color-coded badges matching platform identity

### Component Modernization Patterns
**Critical UI Updates in src/app/page.tsx:**
- Title updated to "Anasui" branding with larger font (`text-4xl`)
- Search bar with icon and improved focus states
- Tab navigation with SVG icons and proper ARIA labels
- Enhanced result display with card-style container
- Platform-specific badge colors and backdrop blur effects

### Responsive Design Strategy
**Mobile-First Approach:**
- Grid adapts: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Search bar maintains prominence on all screen sizes
- Filter panel stacks appropriately on mobile
- Touch-friendly target sizes (minimum 44px)

### Performance Considerations
**Optimized Layout:**
- Smaller bundle size with efficient component structure
- CSS-in-JS approach with TailwindCSS for minimal runtime overhead
- Proper image optimization warnings addressed for future improvements
- Reduced layout shift with consistent aspect ratios (`aspect-video`)

### Recent UI Improvements (Latest Update)
**Song List Simplification:**
- **Removed time stamps**: Song card headers no longer show start/end times for cleaner appearance
- **Removed status badges**: "再生中" and "重複" badges eliminated from headers
- **Full song title display**: Timeline bars show complete song titles without truncation
- **Enhanced playing state**: Current songs identified by blue ring, pulse animation, and shadow effects only
- **Streamlined design**: Focus on essential information with reduced visual clutter

**Timeline Layout Optimization (Latest Update):**
- **Removed color dot headers**: Eliminated redundant color indicators since timeline bars already provide color information
- **Minimized spacing**: Card padding (`p-3` → `p-2` → `p-1`), margins reduced throughout for maximum density
- **Repositioned edit controls**: Edit/delete buttons moved to timeline bar right edge in edit mode only
- **Optimized container heights**: Timeline container (`h-10` → `h-8`), bars (`h-8` → `h-6`) for space efficiency
- **Compacted zoom controls**: Reduced padding and button sizes for streamlined interface
- **Increased song density**: List height optimized (`max-h-96` → `max-h-80`) for better screen space utilization

**UI Simplification Phase (Latest Update):**
- **Timeline Bar Colors**: Removed individual song colors (bg-red-400, bg-blue-400, etc.), unified to single blue color (bg-blue-500 dark:bg-blue-600)
- **Enhanced Visual Hierarchy**: Timeline bars now use consistent blue coloring that harmonizes with play state indicators (ring-blue-400)
- **Song Title Background**: Semi-transparent background (bg-white/90 dark:bg-slate-900/50) allows blue timeline to show through while maintaining readability
- **Edit Modal Simplification**: Removed color selection and genre input fields from song editing interface
- **Tooltip Cleanup**: Removed color dots and genre display from hover tooltips for cleaner information presentation
- **Detail Modal Streamlining**: Removed color indicator section from song detail modals
- **Zoom Control Simplification**: Removed position slider and display range text, keeping only essential zoom, auto-follow, and preset controls
- **Visual Consistency**: All timeline bars now use consistent blue styling with unified color scheme for better visual harmony

**Implementation Details:**
- Timeline song titles use `overflow: hidden` and `textOverflow: ellipsis` for consistent display within bar boundaries
- Playing songs styled with `ring-2 ring-blue-400 ring-offset-1 animate-pulse shadow-lg shadow-blue-400/50`
- **Card headers completely removed**: No color dots or status indicators - visual feedback concentrated entirely in timeline bars
- **Edit controls integration**: Small edit/delete buttons positioned at timeline bar right edge (`absolute right-2 top-1`) in edit mode
- Grid lines use `border-gray-200 dark:border-gray-700 opacity-50` for subtle background presence
- **Maximum density layout**: Every spacing element minimized for optimal song list display capacity

This design system follows modern media platform patterns (Spotify, YouTube, Niconico) while maintaining the platform's unique annotation-focused functionality.