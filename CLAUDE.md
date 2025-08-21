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

**Current Status**: Core features complete (multi-platform support, timeline editing, 20x zoom system, unified UI). Next: user authentication.

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
- Platform-specific players: `NicoPlayer`, `YouTubePlayer`
- Modals: `SongEditModal`, `SongSearchModal`, `SongDetailModal`

#### Timeline System
**Zoom System**: 0.5x-20.0x magnification with auto-follow mode, adaptive mouse wheel zoom
**Edit Mode Features**: Drag-and-drop editing (0.1s precision), undo/redo (50-action history), keyboard shortcuts
**Unified Timeline**: SongList integrates timeline, tooltips, and editing functionality

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

#### Critical Duration Pattern
```typescript
const effectiveDuration = medleyDuration || duration; // Static data priority
```

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
│   └── pages/ - Page-level components
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