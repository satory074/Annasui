# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues in the Medlean project.

## Table of Contents

- [Player Integration Issues](#player-integration-issues)
- [Authentication & Authorization Issues](#authentication--authorization-issues)
- [Timeline & Editing Issues](#timeline--editing-issues)
- [API & Network Issues](#api--network-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Performance Issues](#performance-issues)
- [Production-Specific Issues](#production-specific-issues)
- [Component-Specific Issues](#component-specific-issues)

## Player Integration Issues

### Niconico Player Problems

**Seek operations fail**:
- ✅ **Check**: Time conversion to milliseconds (`seekTime * 1000`)
- ✅ **Check**: `commandInProgress` flag is not stuck
- ✅ **Verify**: postMessage structure is correct
- ✅ **Debug**: Console for postMessage errors

**Player not responding**:
- ✅ **Check**: iframe load event completed
- ✅ **Verify**: postMessage origin matches
- ✅ **Never**: Use `sandbox` attribute on iframe
- ✅ **Debug**: iframe.contentWindow is accessible

**Duration mismatch**:
- ✅ **Use**: `actualPlayerDuration` for timeline calculations
- ✅ **Avoid**: Video metadata duration (may be inaccurate)
- ✅ **Check**: Player ready state before using duration

### Player Loading Issues

**Extended timeouts**:
- ✅ **API timeout**: 30 seconds in `useMedleyDataApi.ts`
- ✅ **Player timeout**: 20 seconds in `useNicoPlayer.ts`
- ✅ **Retry logic**: 3-attempt system with exponential backoff

**Loading messages**:
- ✅ **Progress**: Show elapsed time and video ID
- ✅ **Troubleshooting**: Hints after 15 seconds
- ✅ **Debug**: Enhanced logging with video ID tracking

## Authentication & Authorization Issues

### OAuth Problems

**AuthProvider not rendering**:
- ✅ **Check**: ClientLayout wrapper is present
- ✅ **Verify**: SSR hydration is working
- ✅ **Debug**: Next.js 15 hydration issues

**OAuth redirect loops**:
- ✅ **Check**: Callback URL in Supabase Dashboard
- ✅ **Verify**: Environment variables are set
- ✅ **Format**: `https://anasui-e6f49.web.app/auth/callback`

**User profile missing**:
- ✅ **Check**: UserProfileDropdown in header tree
- ✅ **Verify**: Auto-creation system triggered
- ✅ **Debug**: `checkUserApproval()` function logs

### Authorization Problems

**Edit buttons not showing**:
- ✅ **Verify**: User is authenticated (`user` exists)
- ✅ **Verify**: User is approved (`isApproved === true`)
- ✅ **Check**: Both conditions must be true

**Admin page access denied**:
- ✅ **Check**: User in `approved_users` table
- ✅ **Verify**: Admin permissions granted
- ✅ **Run**: `007_setup_admin_user.sql` migration

**Authorization banner for admin**:
- ✅ **Check**: `isApproved` state in AuthContext
- ✅ **Debug**: Admin user approval status

### Profile Creation Errors

**"Key not present in table 'users'" error**:
- ✅ **Fixed**: Secure profile auto-creation system
- ✅ **Verify**: `checkUserApproval()` creates missing profiles
- ✅ **Security**: Profile creation ≠ approval

**Foreign key constraint violations**:
- ✅ **Check**: User profile exists before medley creation
- ✅ **Verify**: Auto-creation handles edge cases
- ✅ **Debug**: Profile creation success logs

## Timeline & Editing Issues

### Keyboard Shortcuts

**Spacebar not working**:
- ✅ **Check**: Player ready state (`playerReady`)
- ✅ **Verify**: No modals are open
- ✅ **Check**: Input fields not focused
- ✅ **Ensure**: `e.preventDefault()` called

**Edit shortcuts not responding**:
- ✅ **Verify**: `isEditMode` is true
- ✅ **Check**: Event listeners attached in edit mode
- ✅ **Debug**: Keyboard event handlers

**Modal conflicts**:
- ✅ **Check**: Modal state in keyboard handlers
- ✅ **Verify**: `editModalOpen`, `songSearchModalOpen` states
- ✅ **Ensure**: Input field detection works

### M Key Long Press Issues

**Long press not triggering**:
- ✅ **Verify**: `isEditMode` is true
- ✅ **Check**: User has edit permissions (`isApproved`)
- ✅ **Debug**: Timer setup and clearing

**Purple timeline bar not showing**:
- ✅ **Check**: `tempTimelineBar` state updates
- ✅ **Verify**: Component renders timeline bar
- ✅ **Debug**: State changes in dev tools

**Duration calculation wrong**:
- ✅ **Check**: `currentTime` captured correctly
- ✅ **Verify**: Timer callback timing
- ✅ **Debug**: Timeline bar start/end times

**Empty songs not created**:
- ✅ **Verify**: `handleAddSongFromTempBar` wiring
- ✅ **Check**: `addSong` function implementation
- ✅ **Debug**: Function call chain

### Auto-Save Issues

**Auto-save not triggering**:
- ✅ **Verify**: Edit mode is active
- ✅ **Check**: `enableAutoSave` called with config
- ✅ **Debug**: Auto-save configuration state

**Auto-save skipping songs**:
- ✅ **Check**: Empty titles ("空の楽曲" prefixes)
- ✅ **Verify**: Artist validation ("アーティスト未設定")
- ✅ **Debug**: Validation logic in auto-save

**Multiple auto-saves firing**:
- ✅ **Check**: Debounce timeout (2 seconds)
- ✅ **Verify**: Previous timeouts cleared
- ✅ **Debug**: Timeout reference management

**Visual feedback missing**:
- ✅ **Check**: `isAutoSaving` state connection
- ✅ **Verify**: Loading indicators display
- ✅ **Debug**: UI state updates

### Undo/Redo Issues

**Undo/Redo not working**:
- ✅ **Check**: Keyboard listeners in edit mode
- ✅ **Verify**: History stack management
- ✅ **Debug**: Action recording

**Timeline duration mismatch**:
- ✅ **Check**: Songs beyond video length (red styling)
- ✅ **Verify**: Duration validation
- ✅ **Use**: Actual player duration

## API & Network Issues

### Thumbnail Problems

**Images not loading**:
- ✅ **Verify**: Proxy API route `/api/thumbnail/niconico/[videoId]/`
- ✅ **Check**: Trailing slash in URLs
- ✅ **Debug**: Network tab for API responses

**CORS errors**:
- ✅ **Must use**: Server-side proxy implementation
- ✅ **Never**: Direct CDN access from browser
- ✅ **Check**: Proxy API is working

**Fallback failure**:
- ✅ **Check**: All 5-tier fallback hierarchy
- ✅ **Debug**: Each fallback URL
- ✅ **Verify**: Default thumbnail as final fallback

**404 responses**:
- ✅ **Check**: Video ID validity
- ✅ **Verify**: Video not deleted from platform
- ✅ **Debug**: Manual URL testing

### Metadata API Issues

**"取得" button fails**:
- ✅ **Check**: `/api/metadata/niconico/[videoId]` proxy
- ✅ **Verify**: API endpoint accessibility
- ✅ **Debug**: Network requests in dev tools

**DOMParser errors in production**:
- ✅ **Must use**: Regex-based XML parsing
- ✅ **Never**: DOMParser in server-side code
- ✅ **Check**: Node.js compatibility

**XML parsing failures**:
- ✅ **Check**: Regex patterns match XML format
- ✅ **Verify**: Niconico API response structure
- ✅ **Debug**: XML content in logs

**Missing User-Agent**:
- ✅ **Required**: User-Agent header for Niconico
- ✅ **Check**: Header in proxy API
- ✅ **Debug**: Request headers

### CORS and Proxy Issues

**Redirect loops**:
- ✅ **Ensure**: `trailingSlash: true` in next.config.ts
- ✅ **Check**: All API URLs end with `/`
- ✅ **Debug**: Network tab for 308 redirects

**Cache issues**:
- ✅ **Production**: May need cache clearing
- ✅ **Check**: Cache headers in responses
- ✅ **Debug**: Hard refresh to bypass cache

## Build & Deployment Issues

### Firebase Deployment

**409 Conflict Error**:
- ✅ **Solution**: Wait 30 seconds and retry
- ✅ **Cause**: Operation queue conflict
- ✅ **Prevention**: Use `--only hosting` flag

**Function timeout**:
- ✅ **Solution**: Retry after a few minutes
- ✅ **Cause**: Cloud Functions first deploy
- ✅ **Alternative**: Use hosting-only deploy

**Cache issues**:
- ✅ **Solution**: Clear production cache
- ✅ **Check**: Logo/favicon updates
- ✅ **Debug**: Browser hard refresh

### Build Problems

**Next.js 15 params**:
- ✅ **Required**: All routes handle `params: Promise<{...}>`
- ✅ **Check**: Async param destructuring
- ✅ **Update**: Route components

**Unterminated string literals**:
- ✅ **Check**: Tailwind class strings
- ✅ **Verify**: Template literal closing
- ✅ **Debug**: Syntax errors

**Component prop validation**:
- ✅ **UserAvatar**: Use "sm"|"md"|"lg"|"xl", not "large"
- ✅ **Check**: Type definitions
- ✅ **Debug**: TypeScript errors

### Authentication Deployment

**Database migrations missing**:
- ✅ **Run**: All migrations in order
- ✅ **Check**: Supabase Dashboard execution
- ✅ **Verify**: Table structure

**OAuth providers not configured**:
- ✅ **Enable**: Google in Supabase Auth
- ✅ **Set**: Callback URLs
- ✅ **Check**: Environment variables

## Performance Issues

### Excessive Logging

**Console spam**:
- ✅ **Use**: Debouncing patterns (30s intervals)
- ✅ **Replace**: console.log with logger
- ✅ **Remove**: Debug logging from production

**Component re-renders**:
- ✅ **Apply**: React.memo() to stable components
- ✅ **Check**: UserProfileDropdown optimization
- ✅ **Debug**: React DevTools Profiler

### Memory Leaks

**Timeout cleanup**:
- ✅ **Verify**: useEffect cleanup functions
- ✅ **Clear**: Timeout references on unmount
- ✅ **Debug**: Memory tab in dev tools

**Event listener cleanup**:
- ✅ **Ensure**: removeEventListener in cleanup
- ✅ **Check**: Keyboard event handlers
- ✅ **Debug**: Event listener count

## Production-Specific Issues

### Component Loading Issues

**Component not appearing**:
- ✅ **Check**: Module-level logging (`🔥 ComponentName: Module loaded`)
- ✅ **Verify**: displayName is set
- ✅ **Debug**: Tree-shaking prevention

**Silent component failures**:
- ✅ **Add**: Runtime component validation
- ✅ **Check**: Component existence before rendering
- ✅ **Debug**: Error boundaries

### SSR/Hydration Issues

**Hydration mismatches**:
- ✅ **Check**: Client/server rendering differences
- ✅ **Verify**: SSR compatibility
- ✅ **Debug**: Next.js hydration errors

**iframe communication failures**:
- ✅ **Verify**: postMessage origin
- ✅ **Check**: Player initialization sequence
- ✅ **Debug**: Cross-origin restrictions

## Component-Specific Issues

### ActiveSongPopup Issues

**Popup not visible**:
- ✅ **Check**: Song detection algorithm
- ✅ **Verify**: `currentTime` updates
- ✅ **Debug**: Song time ranges

**Collision detection problems**:
- ✅ **Use**: Precise popup zone (116px)
- ✅ **Check**: Rectangle overlap math
- ✅ **Debug**: Player position tracking

**Mouse avoidance not working**:
- ✅ **Verify**: Dynamic position switching
- ✅ **Check**: 100px buffer zone calculation
- ✅ **Debug**: Mouse position tracking

**Position stuck after avoidance**:
- ✅ **Ensure**: Dynamic switching (no position fixing)
- ✅ **Check**: Real-time position updates
- ✅ **Debug**: Position change logic

### Header System Issues

**Double header display**:
- ✅ **Replace**: Legacy Header.tsx with AppHeader.tsx
- ✅ **Check**: All pages use new header
- ✅ **Debug**: Component tree

**Mobile menu not closing**:
- ✅ **Check**: Outside-click detection
- ✅ **Verify**: useRef implementation
- ✅ **Debug**: Event handlers

**Z-index conflicts**:
- ✅ **Ensure**: Main header z-[100]
- ✅ **Check**: Song headers z-50
- ✅ **Debug**: CSS z-index hierarchy

### Search System Issues

**Search not working**:
- ✅ **Check**: searchTerm state updates
- ✅ **Verify**: Filter logic in components
- ✅ **Debug**: Search function implementation

**Advanced search precision**:
- ✅ **Verify**: Normalization functions
- ✅ **Check**: Match type scoring
- ✅ **Debug**: Search result ranking

**Cross-medley search fails**:
- ✅ **Check**: Array mapping and filtering
- ✅ **Verify**: Song search results logic
- ✅ **Debug**: Search scope

### SongEditModal Issues

**Simplified interface problems**:
- ✅ **Check**: Modal shows database selection button
- ✅ **Verify**: No manual input fields
- ✅ **Debug**: Modal state management

**Song change not preserving times**:
- ✅ **Check**: `isChangingSong` flag
- ✅ **Verify**: Time preservation logic
- ✅ **Debug**: State updates

**Thumbnail not displaying**:
- ✅ **Check**: SongThumbnail component import
- ✅ **Verify**: Valid URLs in formData
- ✅ **Debug**: Thumbnail loading

### Multi-Segment Editor Issues

**Segments being replaced**:
- ✅ **Use**: `[...segments].sort()` (avoid mutation)
- ✅ **Check**: Array handling in addSegment
- ✅ **Debug**: State updates

**Timeline preview not showing**:
- ✅ **Verify**: Segment mapping calculations
- ✅ **Check**: Positioning logic
- ✅ **Debug**: Component rendering

**State reset issues**:
- ✅ **Remove**: Problematic useEffect dependencies
- ✅ **Check**: Dependency arrays
- ✅ **Debug**: Component lifecycle

## Debug Strategies

### Production Debugging

1. **Check console logs**: Look for module loading messages
2. **Network tab**: Verify API calls and responses
3. **React DevTools**: Check component state and props
4. **Performance tab**: Identify performance bottlenecks
5. **Application tab**: Check local storage and cookies

### Development Debugging

1. **Logger usage**: Use appropriate log levels
2. **State debugging**: React DevTools and state logs
3. **Network debugging**: Check proxy APIs locally
4. **Component debugging**: Add debug props and logging
5. **Performance debugging**: React Profiler and Lighthouse

### Common Debug Parameters

- `?debug=true` - Enable debug panels
- `?debug=create` - Enable CreateMedleyDebugPanel
- Browser dev tools Network/Console tabs
- React DevTools Components and Profiler tabs