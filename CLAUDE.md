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
**Phase 12 Complete**: Timeline Synchronization & Visual Unification
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
- ✅ **Phase 11: Unified Sticky Container**: Integrated all controls into single sticky header, reducing screen usage from 26.8% to ~15%
- ✅ **Song Database Integration**: Complete song database system with search modal for selecting songs from existing medley data when adding new songs in edit mode
- ✅ **TempoTrack System**: Logic Pro-style tempo editing with DIV-based rendering for precise BPM control and visual feedback
- ✅ **Phase 12: Timeline Synchronization**: Perfect alignment of PlayerControls, SongList, and TempoTrack position indicators with unified visual design and zoom integration
- 🔄 Phase 13: User authentication and collaborative editing (planned)

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
- `SongEditModal` - Modal for detailed song editing with time validation and database song selection support
- `SongSearchModal` - Database-driven song selection modal with search functionality and card-based display
- `SongDetailModal` - Read-only modal for displaying song information with play-from-here functionality
- `SongDetailTooltip` - Hover-based lightweight song information display with intelligent positioning and interaction management
- `ShareButtons` - Social sharing with platform-aware URL generation and native share API
- `MedleyStatistics` - Analytics dashboard for genre/artist/creator insights across platforms
- `TempoTrack` - Logic Pro-style tempo editing component with DIV-based rendering, drag-and-drop BPM control, and smart visual feedback

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

**Timeline Click-to-Seek Functionality:**
- **View Mode**: Click empty timeline areas (spaces between songs) to seek to that position and start playback
- **Edit Mode**: Timeline clicks are disabled to prevent accidental seeks during editing
- **Zoom Integration**: Click position calculations respect current zoom state (`visibleStartTime` + `visibleDuration`)
- **Automatic Playback**: After seeking, playback starts automatically for seamless user experience
- **Position Calculation**: `seekTime = visibleStartTime + (clickPosition * visibleDuration)` with bounds validation

#### Song Database Integration System
**CRITICAL**: Complete database-driven song addition system for edit mode functionality.

**Song Database Architecture:**
- `SongDatabaseEntry` interface with id, title, artist, originalLink, genre, usageCount, and medleys array
- Built from all medley data sources (Niconico + YouTube) with automatic deduplication
- Normalized search using `normalizeSongInfo()` for consistent matching across different text formats
- Cached database with `getSongDatabase()` for performance optimization

**Two-Step Song Addition Flow:**
1. **Song Selection Modal**: `SongSearchModal` displays searchable database with real-time filtering
2. **Edit Modal**: `SongEditModal` shows selected song in card format with time input fields only

**Song Search Modal (`SongSearchModal`):**
- Real-time search across song titles and artists with normalized text matching
- Card-based display showing song title, artist, usage count, genre, and medley references
- Manual addition fallback when no search results found
- Integration with `songDatabase.ts` utility for data management

**Enhanced Song Edit Modal:**
- **Database Mode**: Shows selected song information in card format matching search modal
- **Manual Mode**: Traditional input fields for title, artist, and original link
- **Existing Song Edit Mode**: Shows song information in consistent card format (unified UI)
- Card display includes: prominent title, artist subtext, genre badge, original link with icon
- Informational message explaining database selection or edit context
- Only timing fields (start/end time) editable when from database or editing existing songs
- **CRITICAL UI Consistency**: Both new song addition from database AND existing song editing use the same card-based layout for visual consistency

**Key Implementation Files:**
- `src/lib/utils/songDatabase.ts` - Core database utility with search and caching
- `src/components/features/medley/SongSearchModal.tsx` - Search and selection interface
- `src/components/features/medley/SongEditModal.tsx` - Enhanced edit modal with dual modes
- Integration points in `MedleyPlayer.tsx` for two-step flow management

**Database Building Process:**
```typescript
// Extracts and deduplicates songs from all platform data
const songMap = new Map<string, SongDatabaseEntry>();
allMedleys.forEach(medley => {
  medley.songs.forEach(song => {
    const normalizedId = normalizeSongInfo(song.title, song.artist);
    // Aggregates usage count and medley references
  });
});
```

#### Song Detail Modal Architecture
**Read-Only Information Display:**
- Displays comprehensive song information including title, artist, timing, and original links
- **Thumbnail Integration**: Full-size thumbnail display with automatic platform detection (YouTube/Niconico)
- Simplified design with no color indicators - focus on essential information
- Formatted time display with start/end times and calculated duration
- "この曲から再生" button triggers seek operation and closes modal
- Accessible design with proper ARIA labels and keyboard navigation
- Modal state managed at MedleyPlayer level with `onShowSongDetail` callback

#### Thumbnail Display System
**CRITICAL**: Complete multi-platform thumbnail display system for song originalLinks.

**Thumbnail Architecture:**
- `src/lib/utils/thumbnail.ts` - Core utility for thumbnail URL generation
- Multi-platform support: YouTube (`img.youtube.com/vi/{videoId}/{quality}.jpg`) and Niconico (`nicovideo.cdn.nimg.jp/thumbnails/{numericId}/{numericId}.L`)
- Automatic platform detection from originalLink URLs
- Cascading fallback system for error handling

**Next.js Configuration:**
```typescript
// next.config.ts - Required remote image patterns
images: {
  unoptimized: true,
  remotePatterns: [
    { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
    { protocol: 'https', hostname: 'nicovideo.cdn.nimg.jp', pathname: '/thumbnails/**' }
  ]
}
```

**Implementation Components:**
- **SongDetailModal**: Full-size thumbnail (aspect-video) above song details
- **SongDetailTooltip**: Compact thumbnail (80x45px) in tooltip header 
- **SongEditModal**: Card-layout thumbnail (64x36px) for database/existing songs

**Error Handling:**
```typescript
// Progressive fallback for Niconico thumbnails
handleThumbnailError(imgElement, originalLink) {
  // L → M → default → placeholder → hidden
}
```

**Key Features:**
- URL parsing for sm{numericId} extraction from Niconico URLs
- YouTube quality options (default, mqdefault, hqdefault, maxresdefault)
- SVG placeholder generation for failed Niconico thumbnails
- Automatic retry with lower quality on load failures
- Click-through functionality to original video links

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

#### Unified Sticky Container Architecture (Phase 11)
**CRITICAL**: Complete UI integration system for optimal screen space utilization and improved user experience.

**Architecture Overview:**
- Single sticky container (`z-index: 50`) integrates all control functionality
- Reduced screen usage from 26.8% to approximately 15% through efficient layout
- Three-section horizontal layout for maximum information density
- Eliminated duplicate sticky containers in favor of unified approach
- **Play/Pause Control Integration**: Direct playback control added to Section 1 for enhanced user accessibility

**Container Structure:**
```typescript
// Three-section sticky header in SongList component
<div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
  {/* Section 1: Playback Status + Share Area */}
  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900">
    // PlayPauseButton component with small size, current time display, share buttons
  </div>
  
  {/* Section 2: Edit Controls */}
  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800">
    // Edit mode toggle, add song, undo/redo, snap, save/reset
  </div>
  
  {/* Section 3: Zoom Controls */}
  <div className="px-3 py-1 bg-gray-50 dark:bg-gray-900">
    // Zoom slider, auto-follow, preset buttons
  </div>
</div>
```

**Integration Pattern:**
- **MedleyPlayer.tsx**: Removed separate sticky containers, passes all props to SongList
- **SongList.tsx**: Extended interface to accept share, edit, and zoom control props
- **Prop Passing**: Complete control state managed at MedleyPlayer level and passed down
- **State Coordination**: All callbacks properly connected through component hierarchy

**UI Optimization Benefits:**
- **Compact Layout**: Horizontal orientation saves vertical screen space
- **Visual Consistency**: Unified styling with consistent spacing and colors
- **Improved Workflow**: All controls accessible without scrolling
- **Better Mobile Experience**: Optimized for smaller screens with compact button sizes

**Critical Implementation Details:**
- **PlayPauseButton Integration**: Small-sized (`size="sm"`) play/pause control in Section 1 for direct playback control
- **Time Display Enhancement**: Time format changed to "current / total" (e.g., "03:54 / 10:48") for better user experience
- Share functionality integrated directly with simplified share/original video buttons
- Edit controls compacted with smaller button sizes (`px-3 py-1` vs `px-4 py-2`)
- Zoom controls moved from separate container to integrated sticky header
- All state management preserved while eliminating UI duplication
- Responsive design maintained across all screen sizes

#### TempoTrack System (Latest Implementation)
**CRITICAL**: Logic Pro-style tempo editing functionality with professional DAW-like interface and interaction patterns.

**TempoTrack Architecture:**
- **DIV-Based Rendering**: Replaced SVG implementation to eliminate visual distortion caused by `preserveAspectRatio="none"`
- **Dynamic BPM Range**: Automatically calculates display range based on existing tempo points (min BPM - 10 to max BPM + 10)
- **Interactive Grid System**: Horizontal grid lines and numeric labels for precise BPM visualization
- **Real-Time Current Position**: Red vertical indicator shows playback position within tempo track

**Interaction Features:**
```typescript
// Core interaction patterns
- Click: Add tempo change point at cursor position
- Double-click: Edit BPM value via prompt dialog
- Right-click: Delete tempo change point (with confirmation)
- Drag: Move tempo points in both time and BPM dimensions
- Hover: Display tooltip with precise time/BPM values
```

**Visual Design Patterns:**
- **Light Background**: `bg-gray-50 dark:bg-gray-700` for clear contrast with blue tempo line
- **Blue Tempo Line**: `bg-blue-500` for horizontal/vertical segments (3px width)
- **Circular Points**: Blue circles with white borders, hover expansion (3px → 4px radius)
- **BPM Labels**: Left-side numeric labels with dynamic step calculation for optimal density
- **Grid Lines**: Subtle horizontal guidelines at major BPM intervals

**State Management:**
```typescript
interface TempoTrackProps {
  duration: number;
  currentTime: number;
  initialBpm: number;
  tempoChanges: TempoChange[];
  visibleStartTime: number;    // Zoom integration
  visibleDuration: number;     // Zoom integration
  onUpdateTempo: (initialBpm: number, tempoChanges: TempoChange[]) => void;
  isEditMode: boolean;
}
```

**Integration with Timeline System:**
- **Zoom Compatibility**: Tempo track respects timeline zoom settings and visible range
- **Edit Mode Toggle**: Only interactive when edit mode is active
- **Real-Time Updates**: Changes immediately reflected in UI with proper state callbacks
- **Undo/Redo Support**: All tempo modifications integrate with existing history system

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
2. Wait 200ms for seek to complete (using `setTimeout`, not `requestAnimationFrame`)
3. Send play command to start playback automatically
4. This ensures seamless "click song → play from position" experience
5. **Recent Fix**: Improved pause-to-play behavior when clicking timeline during paused state

**YouTube Player:**
- Currently uses basic iframe embed without seek API integration
- Seek functionality logs to console as placeholder for future implementation

#### Player Controls Integration & Timeline Synchronization
**CRITICAL**: Complete timeline synchronization system ensuring perfect alignment across all components.

**PlayerControls Component:**
- **Visual Seek Bar**: Replaced `<input type="range">` with custom div-based timeline bar matching SongList and TempoTrack
- **Red Position Indicator**: `w-0.5 bg-red-500 z-10` line synchronized across all timeline components
- **Zoom-Aware Display**: Respects `visibleStartTime` and `visibleDuration` for consistent scale with other timelines
- Volume control with slider interface
- Play/pause toggle with visual feedback
- Fullscreen toggle button
- Time display with zoom range indicators

**Unified Position Calculation:**
```typescript
// All timeline components use identical positioning logic
const getSeekBarPosition = (time: number): number => {
  if (effectiveVisibleDuration <= 0) return 0;
  // Range validation prevents out-of-bounds display
  if (time < effectiveVisibleStartTime || time > effectiveVisibleStartTime + effectiveVisibleDuration) {
    return -1; // Hide when outside visible range
  }
  return ((time - effectiveVisibleStartTime) / effectiveVisibleDuration) * 100;
};
```

**Timeline Synchronization Architecture:**
- **PlayerControls**: Visual timeline bar with red position indicator and progress bar
- **SongList**: Individual song timeline bars with red position indicators
- **TempoTrack**: Tempo editing interface with red position indicator
- All components use identical height (`h-8`), padding (`px-3 py-2`), and position calculation logic

**Integration Pattern:**
- `useNicoPlayer` hook manages volume state and player communication
- Zoom state managed in `SongList` component and passed up to `MedleyPlayer` via `onZoomChange` callback
- `MedleyPlayer` distributes zoom state (`visibleStartTime`, `visibleDuration`) to all player components
- **CRITICAL**: All position calculations must use the same formula to ensure perfect alignment
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
  - **Timeline empty area clicks**: Click empty spaces between songs to seek to that position and start playback
  - Platform-specific behavior differences visible in console
  - **Recent Enhancement**: Timeline clicks during paused state now properly seek and resume playback

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
- **Database Song Addition**: Click "楽曲追加" button to test song database search modal
- **Song Search Modal**: Search for songs by title/artist, verify card-based display with usage counts
- **Two-Step Addition Flow**: Select song from database → verify card format in edit modal
- **Manual Addition**: Use "手動で新しい楽曲を追加" for traditional input-based song creation
- **Snap Functionality**: Toggle "スナップ: ON/OFF" button to test auto-snap behavior
- **Song Selection**: Click inline timeline bars in song list to see blue ring selection indicator
- **Keyboard Shortcuts**: Select song then use arrow keys (with Shift/Ctrl modifiers)
- **Undo/Redo**: Use Ctrl+Z/Ctrl+Y or click ↶/↷ buttons after making changes
- **Inline Actions**: Edit/delete buttons appear in song list during edit mode
- **Current Time Integration**: Edit modal shows "現在時刻" buttons for time setting
- **History Management**: Make multiple edits to test 50-action history limit
- **Zoom + Edit Integration**: Test all editing features work correctly at different zoom levels

**TempoTrack System Testing:**
- **Tempo Track Display**: Verify tempo track appears below zoom controls when edit mode is active
- **Click to Add**: Click anywhere on tempo track to add tempo change points
- **BPM Grid Display**: Confirm horizontal grid lines and BPM labels (110, 120, 130) are visible
- **Visual Feedback**: Check blue tempo line renders correctly without distortion (DIV-based implementation)
- **Point Interaction**: Test hover effects on tempo change points (3px → 4px expansion)
- **Double-Click Edit**: Double-click tempo points to edit BPM values via prompt
- **Right-Click Delete**: Right-click tempo points to delete with confirmation dialog
- **Drag Functionality**: Drag tempo points to move both time position and BPM value
- **Tooltip Display**: Verify hover tooltips show precise time and BPM information
- **Current Time Indicator**: Check red vertical line moves with playback position
- **Zoom Integration**: Ensure tempo track respects timeline zoom settings and visible range
- **State Persistence**: Verify "未保存の変更があります" message appears after tempo modifications
- **Undo/Redo Integration**: Test Ctrl+Z/Ctrl+Y works for tempo track changes
- **Edit Mode Toggle**: Confirm tempo track is only interactive when edit mode is active

**Song List UI Testing:**
- **Simplified Card-Based Layout**: Each song displays as a clean card with no color indicators, time stamps, or badges
- **Full-Width Timeline Bars**: Visual timeline bar in Gantt chart format with complete song titles displayed (no truncation)
- **Unified Color Scheme**: All timeline bars use consistent blue color (bg-blue-500 dark:bg-blue-600) for visual harmony
- **Song Detail Modal**: Click timeline bars in view mode to open detailed song information
- **Song Edit Modal Consistency**: Click edit button to open modal with consistent card-based song information display
- **Overlap Detection**: Songs with time overlaps show striped patterns (no badges in header)
- **Mashup Support**: When multiple songs play simultaneously, header shows "マッシュアップ: X曲同時再生中"
- **Current Time Indicator**: Red vertical line shows real-time playback position across all timeline bars
- **Enhanced Visual Feedback**: Current playing songs highlighted with blue rings, pulse animation, and shadow effects

**Timeline Click-to-Seek Testing:**
- **View Mode Click**: Click empty areas between songs to seek and start playback from that position
- **Edit Mode Disabled**: Verify timeline clicks are ignored when in edit mode to prevent accidental seeks
- **Zoom Integration**: Test click-to-seek accuracy at different zoom levels (0.5x-5.0x)
- **Boundary Validation**: Confirm clicks outside valid time range (0 to duration) are ignored
- **Automatic Playback**: Verify seeking triggers automatic play command for stopped videos
- **Position Accuracy**: Check that clicked position matches actual seek time using browser console logs
- **Song Bar vs Empty Area**: Ensure song bars still open detail modal while empty areas trigger seeks

**Tooltip System Testing:**
- **Hover Display**: Move mouse over timeline bars in view mode to trigger tooltip appearance
- **Position Adjustment**: Test tooltip positioning near screen edges (top, bottom, left, right)
- **Mouse Movement**: Move mouse from timeline bar to tooltip - tooltip should remain visible
- **Click to Seek**: Click "この曲から再生" button in tooltip to test seek functionality
- **Click Dismissal**: Click anywhere outside tooltip to test dismissal behavior
- **Timeout Behavior**: Move mouse away from both timeline and tooltip - should dismiss after 200ms delay
- **Edit Mode**: Verify tooltip is disabled when edit mode is active
- **Mobile Testing**: Test tap-based interaction on touch devices
- **Thumbnail Display**: Verify thumbnails appear in tooltips for songs with originalLinks

**Thumbnail System Testing:**
- **YouTube Thumbnails**: Test thumbnail display for YouTube originalLinks (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
- **Niconico Thumbnails**: Test thumbnail display for Niconico originalLinks (e.g., `https://www.nicovideo.jp/watch/smXXXXXX`)
- **Fallback Behavior**: Test error handling by accessing songs with invalid/broken originalLinks
- **Modal Integration**: Verify full-size thumbnails in SongDetailModal with click-through to original videos
- **Tooltip Integration**: Verify compact thumbnails in SongDetailTooltip with proper sizing
- **Edit Modal Integration**: Verify card-layout thumbnails in SongEditModal for database/existing songs
- **Cross-Platform Testing**: Test both platforms in production environment to ensure CDN access

**Unified Sticky Container Testing:**
- **Screen Usage Optimization**: Verify total sticky area uses approximately 15% of viewport height (reduced from 26.8%)
- **Three-Section Layout**: Confirm all three sections (playback status, edit controls, zoom controls) are properly integrated
- **Play/Pause Control**: Test small-sized play/pause button in Section 1 for direct playback control
- **Time Display**: Verify time shows as "current / total" format (e.g., "03:54 / 10:48")
- **Share Functionality**: Test share button and original video link work correctly from integrated header
- **Edit Control Integration**: Verify edit mode toggle, add song, undo/redo, snap, save/reset buttons function properly
- **Zoom Control Integration**: Test zoom slider, auto-follow toggle, and preset buttons work from unified header
- **Responsive Behavior**: Confirm layout adapts properly on mobile devices with compact button sizes
- **Visual Consistency**: Check unified styling and spacing across all three sections
- **Scroll Behavior**: Verify sticky container remains fixed at top during song list scrolling
- **State Synchronization**: Confirm all control states properly reflect current application state
- **Prop Passing**: Ensure all functionality works correctly through component prop hierarchy

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

**Timeline Synchronization Issues:**
- **Position indicators misaligned**: Ensure all components (PlayerControls, SongList, TempoTrack) use identical position calculation: `((time - visibleStartTime) / visibleDuration) * 100`
- **Seek bar not matching timeline**: Verify PlayerControls uses same `visibleStartTime` and `visibleDuration` props from zoom state
- **Red indicators at different positions**: Check that all components use same styling: `w-0.5 bg-red-500 z-10`
- **PlayerControls not updating with zoom**: Ensure `onZoomChange` callback properly updates zoom state in MedleyPlayer
- **Range validation failures**: Verify all components hide indicators when `time < visibleStartTime || time > visibleStartTime + visibleDuration`
- **Height inconsistencies**: All timeline containers must use same height class: `h-8`
- **Padding differences**: All components should use consistent padding: `px-3 py-2` for containers

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

**Unified Sticky Container Issues:**
- **Controls not appearing in sticky header**: Verify all props are properly passed from MedleyPlayer to SongList component
- **Play/pause button not working**: Check `isPlaying` and `onTogglePlayPause` props are correctly passed from MedleyPlayer
- **Time display not showing correctly**: Ensure time format displays as "current / total" (e.g., "03:54 / 10:48")
- **Share buttons not working**: Check `shareUrl`, `shareTitle`, and `originalVideoUrl` props are correctly passed and handlers are connected
- **Edit controls not functioning**: Ensure `onToggleEditMode`, `onAddSong`, `onUndo`, `onRedo`, `onSaveChanges`, `onResetChanges` callbacks are properly connected
- **Zoom controls not responding**: Verify zoom state and handlers are correctly managed within SongList component
- **Sticky container not sticking**: Check `position: sticky` and `top: 0` CSS properties are applied correctly
- **Layout breaking on mobile**: Confirm responsive classes and compact button sizes are properly implemented
- **State not synchronizing**: Ensure all control states (`hasChanges`, `isSaving`, `canUndo`, `canRedo`, etc.) are passed correctly
- **Button sizes inconsistent**: Verify unified button sizing (`px-3 py-1` for edit controls, `px-2 py-1` for share buttons)
- **Visual inconsistency**: Check consistent background colors and spacing across all three sections
- **Missing functionality**: Confirm no features were lost during integration - all original controls should be present and functional

**Thumbnail System Issues:**
- **Thumbnails not displaying**: Check `originalLink` field exists and contains valid YouTube/Niconico URLs
- **Next.js image errors**: Ensure `remotePatterns` are configured in `next.config.ts` for both YouTube and Niconico CDNs
- **Niconico thumbnails failing**: Verify CDN URL format matches pattern: `https://nicovideo.cdn.nimg.jp/thumbnails/{numericId}/{numericId}.L`
- **YouTube thumbnails broken**: Check video ID extraction from URLs and ensure public video availability
- **Error handling not working**: Verify `handleThumbnailError` function is properly called with `onError` attribute on img elements
- **Placeholder not showing**: Ensure SVG placeholder generation works for completely failed Niconico thumbnails
- **Click-through broken**: Check thumbnail links use correct `originalLink` URLs with proper `target="_blank"` and `rel="noopener noreferrer"`
- **Sizing issues**: Verify responsive sizing classes for different contexts (modal: `aspect-video`, tooltip: `w-20 h-11`, edit: `w-16 h-9`)
- **Build failures**: Thumbnail URLs are external - ensure Next.js `images.unoptimized: true` for static export compatibility

**TempoTrack System Issues:**
- **Tempo track not appearing**: Ensure edit mode is active - tempo track only displays during editing
- **BPM grid not visible**: Check `generateGridLines()` function and CSS for grid line opacity
- **Click not adding points**: Verify `handleTrackClick` event handler is properly attached to track container
- **Drag not working**: Ensure mouse event listeners are attached when `dragState.isDragging` is true
- **Visual distortion**: DIV-based implementation should eliminate SVG `preserveAspectRatio` issues
- **Tooltip positioning**: Check `isHovered` state and absolute positioning calculations
- **Zoom integration broken**: Verify `visibleStartTime` and `visibleDuration` props are correctly passed
- **BPM range calculation**: Ensure `getAllBpms()`, `getMinBpm()`, `getMaxBpm()` return valid numbers
- **Current time indicator**: Check red line positioning uses correct `timeToX()` conversion
- **State not persisting**: Verify `onUpdateTempo` callback properly updates parent component state
- **useCallback dependencies**: Ensure all dependencies are included to prevent stale closures
- **Event propagation**: Check `e.stopPropagation()` calls to prevent unwanted event bubbling

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
- Song database utility: `src/lib/utils/songDatabase.ts` (song extraction, search, caching)
- Database schema: `supabase/schema.sql`, `supabase/seed.sql`
- Next.js config: `next.config.ts` (static export + image optimization)

**TempoTrack System:**
- Core component: `src/components/features/medley/TempoTrack.tsx` (DIV-based rendering with Logic Pro-style interactions)
- Type definitions: `src/types/features/medley.ts` (TempoChange interface, MedleyData.initialBpm, MedleyData.tempoChanges)
- Integration points: `SongList.tsx` renders TempoTrack in edit mode with proper prop passing

**Platform Integration:**
- Player constants: `src/lib/constants/player.ts`
- Time utilities: `src/lib/utils/time.ts`
- Video validation: `src/lib/utils/videoValidation.ts`
- Thumbnail utilities: `src/lib/utils/thumbnail.ts` (YouTube/Niconico thumbnail generation)

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
**Critical UI Updates:**
- **Header Component (src/components/layout/Header.tsx)**: Complete redesign with gradient background, "Anasui" branding, SVG icons, and responsive layout
- **Homepage (src/app/page.tsx)**: Title updated to "Anasui" branding with larger font (`text-4xl`)
- **Search Interface**: Search bar with integrated magnifying glass icon and improved focus states
- **Navigation**: Tab navigation with SVG icons and proper ARIA labels
- **Result Display**: Enhanced result display with card-style container
- **Platform Indicators**: Platform-specific badge colors and backdrop blur effects
- **Debug Information**: Production optimization with development-only debug displays

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
**Sticky Header Enhancement:**
- **Medley Information Integration**: Added medley title and creator display to sticky header for constant visibility during scrolling
- **Streamlined Header**: Removed duplicate medley title/creator from main header to eliminate redundancy
- **Prominent Display**: Medley title in large font (`text-lg font-bold`) with creator attribution including user icon
- **Conditional Rendering**: Only displays medley information when available, with proper border separation
- **Dark Mode Support**: Consistent styling for both light and dark themes
- **Header Simplification**: Removed redundant medley title/creator props and display to eliminate UI duplication

**Header Design Modernization:**
- **Gradient Background**: Updated from pink (`bg-pink-600`) to modern dark gradient (`bg-gradient-to-r from-gray-800 to-gray-900`)
- **Brand Identity Update**: Changed site name from "ニコニコ楽曲アノテーションプレイヤー" to "Anasui" with eye icon
- **Icon Integration**: Added SVG icons throughout header (home, search, list icons) for intuitive navigation
- **Responsive Layout**: Improved mobile-first design with `flex-col sm:flex-row` for better stacking
- **Enhanced Input Design**: Search field with integrated magnifying glass icon and focus states
- **Visual Hierarchy**: Video information display with larger titles and organized creator information
- **Production Optimization**: Debug information now only displays in development environment (`process.env.NODE_ENV === 'development'`)

**Song List Simplification:**
- **Removed time stamps**: Song card headers no longer show start/end times for cleaner appearance
- **Removed status badges**: "再生中" and "重複" badges eliminated from headers
- **Full song title display**: Timeline bars show complete song titles without truncation
- **Enhanced playing state**: Current songs identified by blue ring, pulse animation, and shadow effects only
- **Streamlined design**: Focus on essential information with reduced visual clutter

**Timeline Layout Optimization:**
- **Removed color dot headers**: Eliminated redundant color indicators since timeline bars already provide color information
- **Minimized spacing**: Card padding (`p-3` → `p-2` → `p-1`), margins reduced throughout for maximum density
- **Repositioned edit controls**: Edit/delete buttons moved to timeline bar right edge in edit mode only
- **Optimized container heights**: Timeline container (`h-10` → `h-8`), bars (`h-8` → `h-6`) for space efficiency
- **Compacted zoom controls**: Reduced padding and button sizes for streamlined interface
- **Increased song density**: List height optimized (`max-h-96` → `max-h-80`) for better screen space utilization

**UI Simplification Phase:**
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