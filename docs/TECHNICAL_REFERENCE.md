# Technical Reference

Detailed technical documentation for the Medlean project architecture and implementation patterns.

## Table of Contents

- [Core Architecture](#core-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Component Architecture](#component-architecture)
- [Data Flow & APIs](#data-flow--apis)
- [Timeline System](#timeline-system)
- [Multi-Platform Integration](#multi-platform-integration)
- [State Management Patterns](#state-management-patterns)
- [Performance Optimization](#performance-optimization)

## Core Architecture

### Technology Stack Details

- **Next.js 15.2.1** with App Router
- **React 19.0.0** with concurrent features
- **TypeScript** for type safety
- **TailwindCSS 4** with CSS-in-JS (Emotion)
- **Supabase** for database and authentication
- **Firebase App Hosting** for SSR deployment

### Trailing Slash Configuration

**Critical Firebase Hosting Issue**: Firebase automatically adds trailing slashes, causing redirect loops without proper configuration.

**Required Configuration**:
```typescript
// next.config.ts
const nextConfig = {
  trailingSlash: true, // MUST be true for Firebase
  // other config...
}
```

**API URL Pattern**:
```typescript
// Correct: Always include trailing slash
return `/api/thumbnail/niconico/${id}/`;

// Incorrect: Causes 308 redirect loops
return `/api/thumbnail/niconico/${id}`;
```

## Authentication & Authorization

### Two-Tier System

1. **Authentication** (Supabase OAuth with Google)
2. **Authorization** (Admin approval system)

### User Flow

```typescript
// Authorization levels
type UserLevel =
  | 'anonymous'    // Read-only access
  | 'authenticated' // Logged in, no edit permissions
  | 'approved'     // Full CRUD access
  | 'admin'        // User management + approved permissions
```

### Secure Profile Auto-Creation System

```typescript
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

### Database Schema

**Users Table**:
- Stores OAuth profile information
- Auto-created on first login
- Foreign key for medley ownership

**Approved Users Table**:
- Controls edit permissions
- Admin-managed only
- Separate from authentication

**Row Level Security Policies**:
- Only approved users can edit their own medleys
- Admin can manage all user approvals
- Anonymous users have read-only access

## Component Architecture

### Core Components

**MedleyPlayer**: Main reusable player with platform detection
**MedleyHeader**: Separated title/creator display (always visible)
**SongList**: Unified timeline with editing capabilities
**ActiveSongPopup**: Real-time song display with collision avoidance

### Modal Interaction Flow

```typescript
// Timeline editing disabled - use alternative access
// - Timeline double-click → DISABLED (as of 2025-09-20)
// - Alternative edit access via other UI elements
// - "楽曲を変更" button → SongSearchModal in change mode
// - Song selection preserves time segments
```

### Header Architecture

**Unified AppHeader System**:
- Fixed positioning with `z-[100]` (highest priority)
- Sticky song headers with `top-16` and `z-50`
- Height accounting: all pages use `pt-16`
- Responsive design with mobile hamburger menu

**Z-Index Hierarchy**:
- Main header: `z-[100]` (top priority)
- Song list headers: `z-50` (below main header)
- Modals: Higher z-index for overlay

## Data Flow & APIs

### Database-Only Architecture

**No Static Fallbacks**: All data operations use Supabase database
**Direct Fetch Implementation**: Uses fetch API instead of Supabase SDK
**Real-time Updates**: Auto-save system with 2-second debounce

### Proxy API Architecture

**CORS Proxy System**: Required for Niconico API access

**Thumbnail API**:
```typescript
// Fallback hierarchy
1. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}.L  // Large
2. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}.M  // Medium
3. https://nicovideo.cdn.nimg.jp/thumbnails/{id}/{id}    // Default
4. https://ext.nicovideo.jp/api/getthumbinfo/{videoId}   // XML API
5. https://tn.smilevideo.jp/smile?i={id}                // Legacy
```

**Metadata API**:
- Server-side XML parsing with regex (Node.js compatible)
- User-Agent header required for Niconico
- 30min cache for success, 5min for errors

### Multi-Platform Data Structure

```typescript
export type SongSection = {
  id: number;
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  color: string;
  originalLink?: string; // Backward compatibility
  links?: {
    niconico?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
};
```

**Thumbnail Priority**: Niconico > YouTube > Spotify > Apple Music

## Timeline System

### Auto-Save System

**Implementation**:
```typescript
// Auto-save configuration with useRef for stability
const autoSaveConfigRef = useRef<{
  enabled: boolean;
  videoId: string;
  medleyTitle: string;
  medleyCreator: string;
  duration: number;
}>({ enabled: false, videoId: '', medleyTitle: '', medleyCreator: '', duration: 0 });

// Debounced auto-save
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimeoutRef.current) {
    clearTimeout(autoSaveTimeoutRef.current);
  }

  autoSaveTimeoutRef.current = setTimeout(() => {
    performAutoSave();
  }, 2000); // 2 second debounce
}, [performAutoSave]);
```

**Validation Logic**:
- Prevents auto-save of incomplete songs
- Checks for empty titles and "空の楽曲" prefixes
- Validates artist fields for "アーティスト未設定"

### Keyboard Shortcuts System

**Global Shortcuts**:
- **Spacebar**: Play/pause (disabled in inputs/modals)

**Edit Mode Only**:
- **S key**: Set start time
- **E key**: Set end time
- **M key**: Add empty song (short/long press modes)
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo

**M Key Long Press Pattern**:
```typescript
const [isLongPress, setIsLongPress] = useState<boolean>(false);
const mKeyLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);

// Key down - start timer
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
    // Long press: Use actual duration
    onAddSongFromTempBar(tempBar.startTime, tempBar.endTime);
  } else {
    // Short press: Create 30s song
    onQuickAddMarker(currentTime);
  }
  break;
```

## Multi-Platform Integration

### Niconico Player Integration

**PostMessage Communication**:
```typescript
{
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "seek" | "play" | "pause" | "getStatus",
  data?: { time: number, _frontendId: 6, _frontendVersion: 0 }
}
```

**Critical Requirements**:
- Never use `sandbox` attribute (blocks postMessage)
- Convert seconds to milliseconds (`time * 1000`)
- Use `commandInProgress` flag to prevent overlap

**Defensive Programming Pattern**:
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

### Platform Detection System

**Auto-Correction Logic**:
```typescript
export function autoCorrectPlatform(videoId: string, declaredPlatform: string) {
  const detectedPlatform = detectPlatformFromVideoId(videoId);

  return {
    correctedPlatform: detectedPlatform,
    wasCorrected: detectedPlatform !== declaredPlatform,
    originalPlatform: declaredPlatform
  };
}
```

**Platform Patterns**:
- Niconico: `sm` + digits
- YouTube: 11 characters
- Spotify: 22 characters
- Apple Music: Numeric

## State Management Patterns

### Component Key Strategy

**Always use unique keys for dynamic components**:
```typescript
// Correct: Ensures component re-creation
<SongThumbnail key={`${song.title}-${song.originalLink}`} />
```

### State Reset Pattern

**Reset state when props change**:
```typescript
useEffect(() => {
  setData(null);
  loadNewData();
}, [dependencies]);
```

### Tooltip State Management

**Handle async state properly**:
```typescript
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

## Performance Optimization

### Production Build Patterns

**Tree-shaking Prevention**:
```typescript
// Essential for production builds
if (typeof window !== 'undefined') {
  console.log('🔥 ComponentName: Module loaded in production');
}
MyComponent.displayName = 'MyComponent';
```

**Runtime Component Validation**:
```typescript
if (!MyComponent) {
  console.error('🚨 CRITICAL: MyComponent is undefined!');
  return <ErrorComponent />;
}
```

### Debouncing Pattern

**Prevent excessive logging**:
```typescript
const lastWarningTime = useRef<number>(0);
const lastWarningKey = useRef<string>('');

const debouncedWarn = (message: string, key: string) => {
  const now = Date.now();
  if (lastWarningKey.current !== key || (now - lastWarningTime.current) > 30000) {
    logger.warn(message);
    lastWarningTime.current = now;
    lastWarningKey.current = key;
  }
};
```

### Essential UI Patterns

**React.memo for stable components**:
```typescript
const MyComponent = React.memo(function MyComponent({ props }) {
  // Use logger.debug() instead of console.log()
  return <div>{content}</div>;
});
```

**Header hierarchy**:
```typescript
// Main header z-[100], song headers z-50
<header className="fixed top-0 left-0 right-0 z-[100] w-full">
<div className="min-h-screen pt-16"> {/* Account for header height */}
<div className="sticky top-16 z-50 bg-white"> {/* Song list headers */}
```

## ActiveSongPopup System

### Mouse Avoidance System

**Real-time collision detection**:
```typescript
// Dynamic switching - no permanent position fixing
if (isMouseNearRightPopup) {
  finalPosition = 'left';   // Move away from mouse
} else if (isMouseNearLeftPopup) {
  finalPosition = 'right';  // Move away from mouse
} else {
  finalPosition = 'right';  // Return to default
}
```

**Collision Detection Implementation**:
```typescript
// Precise popup zone calculation
const popupZoneHeight = popupHeight + popupBottom; // 100px + 16px = 116px

// Rectangle overlap detection
const hasRectangleOverlap = isVisible && !(
  rect.right < popupRect.left ||   // Player left of popup
  rect.left > popupRect.right ||   // Player right of popup
  rect.bottom < popupRect.top ||   // Player above popup
  rect.top > popupRect.bottom      // Player below popup
);

// Final collision decision
if (hasRectangleOverlap || playerInPopupZone || playerIsFullscreen) {
  setShouldHidePopup(true);
}
```

### Song Detection Algorithm

**Time-based detection with boundary tolerance**:
```typescript
// Uses boundary-tolerant checking
const isActive = currentTime >= startTime && currentTime < endTime + 0.1;
```

**Features**:
- Handles multiple segments of same song
- Deduplicates identical songs in multiple segments
- Real-time updates with currentTime changes
- Unique identifiers for segment tracking

## Search System Architecture

### Advanced Multi-Stage Search

**Search Priority System**:
1. **Exact Match** (100-90pts): Perfect title/artist match
2. **Prefix Match** (80-75pts): Search term matches start
3. **Word Match** (60-55pts): Complete word boundary matches
4. **Partial Match** (40-30pts): Traditional substring matching
5. **Fuzzy Match** (20pts): Character-level similarity (>50% threshold)

**Normalization Pipeline**:
- Katakana/Hiragana unification
- Full-width character conversion
- Music term standardization (feat./featuring, remix, etc.)
- Symbol removal and Unicode handling

```typescript
export interface SearchResult extends SongDatabaseEntry {
  searchScore: number;
  matchType: 'exact' | 'startsWith' | 'wordMatch' | 'partialMatch' | 'fuzzyMatch';
  matchedField: 'title' | 'artist' | 'both';
}
```

## Version Management

### Dual-Access System

**Primary Access**: ALPHA badge in AppHeader opens VersionInfoModal
**Secondary Access**: Direct `/version` route with Firebase rewrite fallback
**Changelog**: CHANGELOG.md follows Keep a Changelog format

**Implementation**:
```typescript
// AppHeader integration
<button
  onClick={() => setIsVersionModalOpen(true)}
  className="bg-gradient-to-r from-orange-400 to-orange-500 text-white"
>
  ALPHA
</button>
```

## Security Patterns

### Critical Security Requirements

```typescript
// ALWAYS sanitize user input
const sanitized = sanitizeSongSection(userInput);

// ALWAYS use logger instead of console
logger.debug('Operation completed', data);

// ALWAYS validate URLs
const validated = sanitizeUrl(userUrl);

// ALWAYS check user approval
const { user, isApproved } = useAuth();
if (editOperation && (!user || !isApproved)) {
  logger.warn('Edit operation blocked: user not approved');
  return;
}
```

### Input Sanitization

**XSS Protection**: Comprehensive validation for all user-editable fields
**URL Validation**: Strict domain whitelisting for platform URLs
**SQL Injection Prevention**: Parameterized queries and RLS policies