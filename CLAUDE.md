# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building

## Project Overview

Anasui is a Next.js application for playing and navigating Niconico video medleys with interactive song timelines and chord progressions. It integrates with Niconico's embedded player through postMessage API communication.

## Core Architecture

### Technology Stack
- Next.js 15.2.1 with React 19.0.0 and TypeScript
- TailwindCSS 4 for styling with Emotion for CSS-in-JS
- Wavesurfer.js for audio visualization
- Tone.js for audio processing
- HLS.js for video streaming

### Key Features
- **Video Player Integration**: Niconico video embedding with postMessage API control
- **Song Timeline**: Visual navigation through medley segments
- **Chord Progression**: Time-based chord visualization
- **Interactive Navigation**: Click-to-seek functionality

### Component Architecture

#### Feature Components (`src/components/features/`)
- `medley/` - Song timeline, chord bars, and song list components
- `player/` - HLS player, controls, and volume slider
- `video/` - Video information display

#### Data Models (`src/types/features/`)
- `medley.ts` - Song sections, chord progressions, and medley data structures
- `player.ts` - Player state, events, and message interfaces

#### State Management
The app uses React hooks for state management:
- `useCurrentTrack` - Tracks current song and chord based on playback time
- `useMedleyData` - Loads medley data for video ID
- `useNicoPlayer` - Manages Niconico player integration

#### Player Communication
Niconico player integration uses postMessage API with specific event types:
- `loadComplete` - Player initialization
- `playerMetadataChange` - Video metadata updates  
- `seekStatusChange` - Seek operation status
- `statusChange` - Playback state changes

Message structure follows this pattern:
```typescript
{
  sourceConnectorType: 1,
  playerId: "1", 
  eventName: "play" | "pause" | "seek" | "volumeChange",
  data?: {
    time?: number,        // For seek operations (seconds)
    volume?: number,      // For volume (0-1 range)
    _frontendId: 6,
    _frontendVersion: 0
  }
}
```

Player communication requires specific initialization sequence and proper error handling due to iframe cross-origin restrictions.

### File Structure Notes
- `src/data/medleys.ts` - Static medley data configuration
- `src/lib/utils/` - Time formatting, video validation utilities
- `src/lib/constants/player.ts` - Player configuration constants
- Main page logic in `src/app/page.tsx` with video ID management and seek functionality

### Development Notes
- Default video ID is "sm500873" for testing
- Player uses iframe communication with `https://embed.nicovideo.jp`
- Component state managed through React hooks, no external state management library
- TypeScript strict mode enabled for type safety

## Important Implementation Details

### PostMessage API Integration
- All Niconico player communication uses `window.postMessage` with origin verification
- Seek operations require complex sequencing: pause → seek → resume playing state
- Events may have processing delays, requiring defensive programming with timeouts
- Player initialization needs specific message sequence with proper timing intervals

### Data Flow Architecture
- `page.tsx` serves as the main state coordinator, managing video ID and seek operations
- Custom hooks (`useCurrentTrack`, `useMedleyData`, `useNicoPlayer`) handle specific data concerns
- Song and chord data flows from static configuration through hooks to UI components
- Time-based state synchronization between player events and UI components requires careful handling

### Key Technical Constraints
- Cross-origin iframe restrictions limit direct player access to postMessage only
- Niconico API is undocumented and may change without notice
- Player state synchronization can be inconsistent, requiring UI-first updates with eventual consistency