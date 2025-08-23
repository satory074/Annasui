# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

### Testing & Deployment
**Testing**: Manual testing only - no dedicated test framework configured
- Development: http://localhost:3000
- Production: https://illustrious-figolla-20f57e.netlify.app (use for final verification)

**Deployment**: `npx netlify deploy --prod`

### 動作確認の重要事項
**CRITICAL**: 機能の動作確認は必ずプロダクション環境（https://illustrious-figolla-20f57e.netlify.app）で行うこと。
ローカル環境とプロダクション環境では、iframe通信やstatic export等の違いにより動作が異なる場合がある。

## Project Overview

Anasui is a multi-platform medley annotation platform built with Next.js. Provides interactive video medleys with synchronized song timelines, annotation editing, and searchable medley database. Supports Niconico and YouTube platforms.

**Current Status**: Core features complete (multi-platform support, timeline editing, 20x zoom system, unified UI, annotation enhancement features). Next: user authentication.

## Core Architecture

### Technology Stack
- Next.js 15.2.1 + React 19.0.0 + TypeScript
- TailwindCSS 4 + Emotion for CSS-in-JS
- Multi-platform video player support (Niconico postMessage API, YouTube iframe embed)
- Supabase for database (optional - falls back to static files)
- Static export for Netlify deployment

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
- **URL Structure**: `/`, `/niconico/[videoId]`, `/youtube/[videoId]`
- **Extensible**: Architecture supports adding new platforms

#### Data Flow Architecture
**Dual-Mode Data Management:**
- **Database Mode**: Supabase PostgreSQL when configured
- **Static Mode**: `src/data/medleys.ts` and `src/data/youtubeMedleys.ts` as fallback
- `useMedleyData` automatically detects and switches between modes

#### Component Architecture
- `MedleyPlayer` - Core reusable player with platform detection
- `SongList` - Unified timeline with editing, 20x zoom, interaction
- `TempoTrack` - BPM timeline visualization and editing with advanced modal
- Platform-specific players: `NicoPlayer`, `YouTubePlayer`
- Modals: `SongEditModal`, `SongSearchModal`, `SongDetailModal`, `BpmEditModal`, `ImportSetlistModal`

#### Unified Modal/Tooltip System
**Base Components:**
- `BaseModal` - Reusable modal wrapper with backdrop, ESC key handling, and accessibility
- `BaseTooltip` - Smart-positioning tooltip with edge detection and overflow prevention

**Song Display Components:**
- `SongInfoDisplay` - Unified song information with variants (compact/detailed/card)
- `SongTimeControls` - Standardized time input with ±0.1s buttons and current time setting
- `SongThumbnail` - Consistent thumbnail display with error handling and click behavior

**Integration Pattern:**
```typescript
// Modal usage
<BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md">
  <SongInfoDisplay song={song} variant="detailed" onSeek={onSeek} />
</BaseModal>

// Tooltip usage  
<BaseTooltip isVisible={isVisible} position={position}>
  <SongInfoDisplay song={song} variant="compact" />
</BaseTooltip>
```

#### Timeline System & Annotation Enhancement Features
**Zoom System**: 0.5x-20.0x magnification with auto-follow mode, adaptive mouse wheel zoom
**Edit Mode Features**: Drag-and-drop editing (0.1s precision), undo/redo (50-action history), keyboard shortcuts
**Unified Timeline**: SongList integrates timeline, tooltips, and editing functionality

**NEW - Keyboard Shortcuts (2025-01-23):**
- **S** key: Set current time as start time for new song
- **E** key: Set current time as end time for editing song
- **M** key: Add marker at current time (create new song)
- Active only in edit mode, with visual help displayed in UI

**NEW - Continuous Input Mode:**
- Checkbox option in song edit modal to enable continuous song addition
- "Save and Next" button for seamless workflow
- Auto-time setting: previous song's end time → next song's start time

**NEW - Setlist Import:**
- Bulk import songs from text format via "Import" button
- Supports formats: `MM:SS Song Name / Artist Name`, `MM:SS Song Name - Artist Name`, `MM:SS Song Name`
- Live preview with automatic end time calculation
- Example: `00:00 ロキ / みきとP` → parsed as song from 0:00-0:45

**NEW - Preview Playback:**
- Loop playback of selected time range within song edit modal
- "Preview Start/Stop" button for immediate verification
- Prevents range setting errors

**NEW - Adjacent Song Time Alignment (2025-08-23):**
- **"前の楽曲の終了時刻に合わせる"** button in start time controls - automatically sets current song's start time to previous song's end time
- **"次の楽曲の開始時刻に合わせる"** button in end time controls - automatically sets current song's end time to next song's start time
- **Smart Context Awareness**: Buttons appear only when adjacent songs exist (first song shows only "next", last song shows only "previous")
- **Purple-themed buttons** with hover effects and tooltips showing target time values
- **Seamless Workflow**: Eliminates manual calculation and prevents timeline gaps for perfect song transitions

**State Management:**
```typescript
const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
const visibleDuration = duration / timelineZoom;
```

#### Song Database Integration
**Two-Step Flow**: Song selection via `SongSearchModal` → edit via `SongEditModal`
- Real-time search across titles/artists
- Database built from all medley data with deduplication
- Manual addition fallback when no results found

#### Tempo Track System
**Advanced BPM Editing**: Replaces browser prompt() with comprehensive modal
- **Multiple Input Methods**: Number input, slider, ±1/±10 buttons, tap tempo, presets
- **Tap Tempo**: `useTapTempo` hook with 8-tap averaging and 3-second timeout
- **Keyboard Shortcuts**: ↑↓ (±1 BPM), Shift+↑↓ (±10 BPM), Enter/Escape
- **Grid Snapping**: Optional 5-BPM increment snapping
- **Data Structure**: `initialBpm` + `TempoChange[]` with time/BPM pairs

**Usage Pattern:**
```typescript
// Data type for tempo changes
type TempoChange = { time: number, bpm: number }

// Tempo data in MedleyData
interface MedleyData {
  initialBpm?: number;        // Starting BPM (default: 120)
  tempoChanges?: TempoChange[]; // Array of tempo changes
}
```

#### Critical Duration Pattern
**IMPORTANT**: Duration mismatch handling was recently updated (2025-01-22)
```typescript
// MedleyPlayer uses static data priority for timeline calculations
const effectiveDuration = medleyDuration || duration; 

// SongList now uses actual player duration for display consistency
const effectiveTimelineDuration = actualPlayerDuration || duration;
```

**Duration Synchronization Issues:**
- Static medley data may specify longer durations than actual video
- Timeline now adapts to actual player duration to prevent mismatch
- Songs beyond actual video duration are visually indicated with red styling
- Warning badge appears when medley duration ≠ actual duration

### Key Technical Constraints
- Niconico API is undocumented and may change without notice
- iframe cross-origin restrictions require postMessage-only communication
- Player events may have delays - use defensive timeout handling

## Common Issues and Solutions

### Player Integration
- **Seek operations fail**: Ensure time conversion to milliseconds (`* 1000`)
- **Seek bar sync issues**: playerMetadataChange returns milliseconds - convert to seconds (`/ 1000`)
- **Timeline clicks return 0**: Check `duration > 0` before calculating seek time
- **Duration causing Infinity%**: Use `effectiveDuration = medleyDuration || duration` pattern
- **Player not responding**: Check iframe load and postMessage origin

### Timeline & Editing
- **Undo/Redo not working**: Check keyboard listeners in edit mode
- **Song selection invisible**: Ensure `ring-2 ring-blue-500` classes applied
- **Zoom issues**: Check `timelineZoom` state updates and position calculations
- **High zoom performance**: 20x zoom may require visible song filtering
- **Tooltip problems**: Verify hover state management and timeout cleanup
- **Timeline duration mismatch**: Use `actualPlayerDuration` for timeline calculations, not static `duration`
- **Songs beyond video length**: Check for `isBeyondActualDuration` flag and red styling

### Annotation Enhancement Issues
- **Hotkeys not working**: Ensure edit mode is active and keyboard event listeners are properly attached
- **Continuous input mode not triggering**: Check `continuousMode` state and `onSaveAndNext` callback implementation
- **Setlist import parsing fails**: Verify time format (MM:SS) and delimiter (/ or -) in input text
- **Preview playback not looping**: Check interval setup and seek command implementation with Niconico postMessage
- **Import modal not opening**: Verify `ImportSetlistModal` component is properly integrated in `MedleyPlayer`

### Tempo Track Issues
- **BPM Modal not opening**: Check `isEditMode` state and `onUpdateTempo` callback
- **Tap tempo not working**: Verify `useTapTempo` hook and 3-second timeout behavior
- **Tempo changes not saving**: Implement tempo data persistence in `handleTempoUpdate`
- **Grid snapping issues**: Check 5-BPM rounding logic in `BpmEditModal`

### Modal/Tooltip System Issues
- **Modal not closing on ESC**: Check BaseModal implementation and focus management
- **Tooltip positioning off-screen**: Verify BaseTooltip edge detection logic
- **Time controls not updating**: Check SongTimeControls onChange callback and state binding
- **Thumbnail not loading**: Check SongThumbnail error handling and URL validation
- **Inconsistent styling**: Use SongInfoDisplay variants instead of custom implementations

### Adjacent Song Alignment Issues
- **Alignment buttons not showing**: Verify `findAdjacentSongs` helper function calculates previous/next songs correctly based on sorted timeline
- **Buttons not working**: Check `adjacentTime` and `adjacentLabel` props passed to `SongTimeControls` component
- **Incorrect time alignment**: Ensure songs are sorted by `startTime` before finding adjacent songs in `MedleyPlayer.tsx`
- **Edge cases failing**: Verify first song only shows "next" alignment, last song only shows "previous" alignment

### Build & Deployment
- **Build fails**: Ensure `public/favicon.ico` exists
- **404 on deployed site**: Add video IDs to `generateStaticParams`
- **Next.js 15 params**: All routes must handle `params: Promise<{...}>`

## Data Management Architecture

### File Organization
```
src/
├── app/ - Next.js App Router (platform-specific routes)
├── components/
│   ├── features/ - Feature components (medley, player, share)
│   ├── pages/ - Page-level components
│   └── ui/ - Reusable UI components (modal, song display)
├── data/ - Static data files (medleys.ts, youtubeMedleys.ts)
├── hooks/ - Data management hooks
├── lib/ - Utilities, API clients
└── types/ - Type definitions
```

### Key Files
**Core:**
- `src/app/page.tsx` - Homepage
- `src/app/[platform]/[videoId]/page.tsx` - Platform players
- `src/components/pages/MedleyPlayer.tsx` - Main player component
- `src/hooks/useNicoPlayer.ts` - Niconico integration

**Data:**
- `src/data/medleys.ts` - Niconico medley definitions
- `src/data/youtubeMedleys.ts` - YouTube medley definitions
- `src/lib/utils/songDatabase.ts` - Song search and caching
- `src/lib/utils/time.ts` - Time formatting and parsing utilities

**Tempo System:**
- `src/components/features/medley/TempoTrack.tsx` - BPM timeline visualization
- `src/components/features/medley/BpmEditModal.tsx` - Advanced BPM editing interface
- `src/hooks/useTapTempo.ts` - Tap tempo measurement hook

**UI System:**
- `src/components/ui/modal/BaseModal.tsx` - Base modal component
- `src/components/ui/modal/BaseTooltip.tsx` - Base tooltip component
- `src/components/ui/song/SongInfoDisplay.tsx` - Unified song information display
- `src/components/ui/song/SongTimeControls.tsx` - Time input controls with precision adjustment and adjacent song alignment
- `src/components/ui/song/SongThumbnail.tsx` - Standardized thumbnail component

**Annotation Enhancement:**
- `src/components/features/medley/ImportSetlistModal.tsx` - Bulk setlist import from text format
- Enhanced `SongEditModal.tsx` - Continuous input mode, preview playback, enhanced time controls
- Enhanced `SongList.tsx` - Keyboard shortcuts (S/E/M keys) with visual help display


### Adding New Platforms

1. Create `src/app/[platform]/[videoId]/page.tsx`
2. Add platform to types in `src/types/features/medley.ts`
3. Create player component in `src/components/features/player/`
4. Update `MedleyPlayer.tsx` for conditional rendering
5. Create data file: `src/data/[platform]Medleys.ts`
6. Update homepage to include new platform data
7. Add video IDs to `generateStaticParams` for static export

## Development Workflow

**CRITICAL Verification Process:**
1. Local testing: `npm run dev`
2. Type safety: `npx tsc --noEmit` and `npm run lint`
3. Production deployment: `npx netlify deploy --prod`
4. Production verification: Test on https://illustrious-figolla-20f57e.netlify.app

Always verify features work in production environment - static export and cross-origin iframe behavior differs from local development.

## Tempo Track Usage

**Enable Tempo Editing:**
1. Navigate to any medley page (e.g., `/niconico/sm38343669`)
2. Click "編集モード" to enable edit mode
3. Tempo track appears below song timeline
4. Click "初期BPM" button or double-click tempo change points to edit

**BPM Modal Features:**
- **Number Input**: Direct BPM entry with validation (30-300 range)
- **Slider**: Visual BPM adjustment with real-time feedback
- **±1/±10 Buttons**: Precise increment/decrement controls
- **Tap Tempo**: Click "TAP" button rhythmically to measure BPM
- **Presets**: Quick selection of common BPM values (60, 80, 90, 100, 120, 140, 160, 180, 200)
- **Grid Snap**: Toggle 5-BPM increment snapping
- **Keyboard**: Arrow keys for fine adjustment, Enter/Escape for save/cancel

## Recent Updates

### Annotation Enhancement Features (2025-01-23)
Major update implementing comprehensive workflow improvements for medley annotation:

**Hotkey System:**
- Added keyboard shortcuts (S/E/M) for rapid annotation
- Visual help system displays shortcuts in edit mode UI
- Prevents conflicts with browser shortcuts (Ctrl+S handling)

**Continuous Input Workflow:**
- "Continuous Input Mode" checkbox in song edit modal
- "Save and Next" button creates seamless song-to-song workflow
- Automatic time setting: previous song's end becomes next song's start
- 3x+ speed improvement for bulk annotation tasks

**Setlist Import System:**
- `ImportSetlistModal` component for bulk song import
- Supports multiple text formats with live preview
- Automatic end time calculation between songs
- Error handling for malformed input

**Preview Playback:**
- Loop playback within song edit modal for range verification
- Integrates with Niconico postMessage API for precise seeking
- Prevents annotation errors through immediate feedback

**Production Verification:**
- All features tested and confirmed working in production environment
- Critical for iframe-based communication with Niconico player

### Duration Synchronization Fix (2025-01-22)
Fixed critical issue where timeline display and actual player duration were mismatched:
- **Problem**: Static medley data specified 600s duration, actual video was 246s
- **Solution**: SongList now uses `actualPlayerDuration` for timeline calculations
- **Visual Indicators**: Songs beyond actual video length show red styling and warning tooltips
- **User Notification**: Duration mismatch warning badge with tooltip showing configured vs actual duration

**Key Implementation Details:**
- `SongList.tsx` now calculates timeline based on `effectiveTimelineDuration = actualPlayerDuration || duration`
- Songs with `startTime >= actualPlayerDuration` are flagged with `isBeyondActualDuration`
- Visual styling: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60`
- Timeline bars beyond duration use red colors: `bg-red-400 dark:bg-red-500 opacity-50`

### Adjacent Song Time Alignment Feature (2025-08-23)
Major UX improvement for seamless medley annotation workflow:

**Implementation Details:**
- **SongTimeControls Enhancement**: Added `adjacentTime` and `adjacentLabel` props for contextual alignment buttons
- **Smart Adjacent Song Detection**: `findAdjacentSongs()` helper in `MedleyPlayer.tsx` calculates previous/next songs from sorted timeline
- **Conditional Button Display**: Purple alignment buttons appear only when adjacent songs exist
- **Edge Case Handling**: First song shows only "next" alignment, last song shows only "previous" alignment

**User Experience Benefits:**
- **Eliminates Manual Calculation**: One-click alignment for perfect song transitions  
- **Prevents Timeline Gaps**: Ensures seamless medley playback flow
- **3x+ Faster Annotation**: Significantly speeds up bulk annotation tasks when combined with continuous input mode
- **Visual Feedback**: Tooltips show exact target time values for transparency

**Production Verification:**
- Feature tested and confirmed working in production environment (https://illustrious-figolla-20f57e.netlify.app)
- Critical verification required due to iframe-based Niconico player communication differences between local/production

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.