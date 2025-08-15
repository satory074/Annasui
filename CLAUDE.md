# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

### Deployment Commands
- `npx netlify deploy --prod` - Deploy to production on Netlify (auto-builds)
- `npx netlify sites:list` - List existing Netlify sites
- `npx netlify link --id <site-id>` - Link to existing Netlify site

## Project Overview

Anasui is a dedicated Niconico medley annotation player built with Next.js. It provides an interactive interface for navigating video medleys with synchronized song timelines and chord progressions, similar to Songle's annotation style. The application integrates with Niconico's embedded player through postMessage API communication.

## Core Architecture

### Technology Stack
- Next.js 15.2.1 with React 19.0.0 and TypeScript
- TailwindCSS 4 for styling with Emotion for CSS-in-JS
- Native iframe postMessage API for Niconico player integration
- No external state management library (React hooks only)
- Static export configured for Netlify deployment

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
- This was a major bug that caused seek operations to fail - always convert seconds to milliseconds

**State Synchronization:**
- `commandInProgress` flag prevents command overlap and race conditions
- Automatic cleanup of intervals/timeouts on component unmount
- UI-first updates with eventual consistency from player events
- Time sync starts/stops based on playing state to optimize performance

#### Data Flow Architecture
- `page.tsx` is the main application entry point, coordinating video ID state and integrating all components
- The app operates in **medley annotation mode only** - no mode switching functionality
- `useCurrentTrack` derives currently playing song/chord from playback time and medley data
- `useMedleyData` loads static configuration for video annotations
- Static medley data in `src/data/medleys.ts` defines song segments and chord progressions
- All UI components (timeline, chord bar, song list) are always visible and functional

#### Interactive Timeline Architecture
**Critical Implementation Pattern for Timeline/Chord Clicking:**
- Parent containers handle click events with `onClick` handlers that calculate position
- Child elements (songs/chords) use `pointer-events-none` to avoid intercepting clicks
- Position calculation: `(e.clientX - rect.left) / rect.width * duration`
- **Always validate duration > 0** before calculating seek time to prevent 0-second seeks
- Example pattern:
```tsx
<div onClick={(e) => {
  if (duration <= 0) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const seekTime = duration * ratio;
  onSeek(seekTime);
}}>
  {items.map(item => (
    <div className="pointer-events-none">{item.content}</div>
  ))}
</div>
```

#### Component Integration Pattern
- `NicoPlayer` component handles iframe embedding and debug display
- `useNicoPlayer` hook manages all player communication and state
- UI components (timeline, song list) trigger actions through hook methods
- Seek operations automatically update current track detection
- Timeline and chord progression bars support click-to-seek anywhere on the bar

#### Seek Operation Implementation
**Critical Sequence for Stopped Player:**
1. Send seek command with time in milliseconds
2. Wait 200ms for seek to complete
3. Send play command to start playback automatically
4. This ensures seamless "click song → play from position" experience

### Production Deployment Configuration
- Next.js configured for static export (`output: 'export'`)
- Static files generated to `.next/` directory
- Images unoptimized for static hosting compatibility
- Cross-origin iframe communication works in production environment
- Current production URL: https://illustrious-figolla-20f57e.netlify.app

### Key Technical Constraints
- Niconico API is undocumented and subject to change without notice
- iframe cross-origin restrictions require postMessage-only communication
- Player events may have delays, requiring defensive timeout handling
- Some player internal errors are expected and don't affect functionality

### Development Testing
- Default video ID "sm500873" (組曲『ニコニコ動画』) for consistent testing
- Console logging enabled for postMessage debugging
- UI debug indicators show player ready state and communication status
- Seek functionality testable through:
  - Song list click-to-play buttons
  - Timeline click-to-seek (anywhere on timeline bar)
  - Chord progression click-to-seek (anywhere on chord bar)

### Common Issues and Solutions
- **Seek operations fail or reset to beginning**: Ensure time values are converted to milliseconds (`* 1000`)
- **Timeline clicks returning 0 seconds**: Video duration not loaded yet, check duration > 0
- **Child elements intercepting clicks**: Use `pointer-events-none` on child elements
- **Player not responding**: Check iframe load and postMessage origin verification
- **Seek without automatic playback**: Add play command after seek when player is stopped
- **Build deployment failing**: Ensure `public/favicon.ico` exists for Next.js build

## Data Management Architecture

### Medley Data Structure
- Static medley definitions stored in `src/data/medleys.ts`
- Each medley contains songs array with timing, colors, and metadata
- Chord progression data with time-synced annotations
- Video ID mapping system for dynamic data lookup

### Key Data Flow Hooks
- `useMedleyData(videoId)`: Retrieves medley configuration by video ID
- `useCurrentTrack(currentTime, songs, chords)`: Derives active song/chord from playback position
- `useNicoPlayer({videoId, callbacks})`: Manages all player state and communication

### Component Architecture Patterns
- Feature-based component organization under `src/components/features/`
- Layout components in `src/components/layout/` (Header)
- Player components handle iframe integration and controls (`NicoPlayer`)
- Medley components manage timeline visualization and interaction (`SongTimeline`, `ChordBar`, `SongList`)
- **Note**: No mode toggle component exists - app is medley annotation only

### Type System
- Central type definitions for medley data structures
- Strict typing for player communication interfaces
- Time-based data validation utilities in `src/lib/utils/`

### Important File Locations
- Main application: `src/app/page.tsx` 
- Core player hook: `src/hooks/useNicoPlayer.ts`
- Medley data management: `src/hooks/useMedleyData.ts`, `src/hooks/useCurrentTrack.ts`
- Static medley definitions: `src/data/medleys.ts`
- Player constants: `src/lib/constants/player.ts`
- Time utilities: `src/lib/utils/time.ts`
- Video validation: `src/lib/utils/videoValidation.ts`