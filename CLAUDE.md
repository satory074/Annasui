# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build static export for production deployment
- `npm run lint` - Run ESLint code quality checks
- `npx tsc --noEmit` - Run TypeScript type checking without building
- `npx netlify deploy --prod --dir out` - Deploy to Netlify production (requires build first)

## Project Overview

Anasui is a Next.js application for playing and navigating Niconico video medleys with interactive song timelines and chord progressions. It provides a Songle-style annotation interface for Niconico videos through postMessage API integration.

## Core Architecture

### Technology Stack
- Next.js 15.2.1 with React 19.0.0 and TypeScript (static export configured)
- TailwindCSS 4 for styling with Emotion for CSS-in-JS
- Native iframe postMessage API for Niconico player integration
- No external state management library (React hooks only)

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

**State Synchronization:**
- `commandInProgress` flag prevents command overlap and race conditions
- Automatic cleanup of intervals/timeouts on component unmount
- UI-first updates with eventual consistency from player events
- Time sync starts/stops based on playing state to optimize performance

#### Data Flow Architecture
- `page.tsx` coordinates video ID state and integrates NicoPlayer with UI components
- `useCurrentTrack` derives current song/chord from playback time and medley data
- `useMedleyData` loads static configuration for video annotations
- Static medley data in `src/data/medleys.ts` defines song segments and chord progressions

#### Component Integration Pattern
- `NicoPlayer` component handles iframe embedding and debug display
- `useNicoPlayer` hook manages all player communication and state
- UI components (timeline, song list) trigger actions through hook methods
- Seek operations automatically update current track detection

### Production Deployment Configuration
- Next.js configured for static export (`output: 'export'`)
- Builds to `out/` directory for Netlify deployment
- Images unoptimized for static hosting compatibility
- Cross-origin iframe communication works in production environment

### Key Technical Constraints
- Niconico API is undocumented and subject to change without notice
- iframe cross-origin restrictions require postMessage-only communication
- Player events may have delays, requiring defensive timeout handling
- Some player internal errors are expected and don't affect functionality

### Development Testing
- Default video ID "sm500873" (組曲『ニコニコ動画』) for consistent testing
- Console logging enabled for postMessage debugging
- UI debug indicators show player ready state and communication status
- Seek functionality testable through song list click-to-play buttons