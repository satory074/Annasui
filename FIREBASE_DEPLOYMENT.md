# Firebase App Hosting Deployment Guide

## Prerequisites Setup Complete ✅

1. **Firebase CLI Installed**: Version 14.14.0
2. **Project Configuration Created**: 
   - `firebase.json` - App Hosting configuration with SSR support
   - `.firebaserc` - Project alias configuration
   - `.gitignore` - Updated with Firebase entries
3. **Environment Variables Ready**: `.env.local` contains Supabase credentials
4. **Production Build Successful**: Next.js application builds without errors

## Next Steps (Manual Firebase Console Setup Required)

Since we cannot complete Firebase login in this CLI environment, you'll need to:

### 1. Create Firebase Project
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create new project with name: `anasui-medley`
3. Enable App Hosting service (requires Blaze plan)

### 2. Connect GitHub Repository  
1. In Firebase Console → App Hosting
2. Connect your GitHub repository: `satory074/Anasui` (or equivalent)
3. Set build configuration:
   - **Framework**: Next.js
   - **Branch**: main
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Configure Environment Variables
In Firebase Console → App Hosting → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://dheairurkxjftugrwdjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8
```

### 4. Deploy and Test
1. Trigger first deployment from Firebase Console
2. Test SSR functionality with dynamic routes:
   - Homepage: Database-driven medley list
   - Player pages: `/niconico/sm500873`, `/youtube/dQw4w9WgXcQ`
3. Verify no 404 errors (unlike Netlify)

## Technical Benefits Over Netlify

- **Native Next.js Support**: Firebase App Hosting is built specifically for Next.js SSR
- **Automatic Scaling**: Scales to zero when not in use, costs only when active
- **Database Integration**: Better compatibility with Supabase API calls
- **No Edge Function Limitations**: Full Node.js environment for complex operations

## Architecture Verification

Current setup is database-only architecture:
- ✅ Static data files removed (`medleys.ts`, `youtubeMedleys.ts`)  
- ✅ Homepage uses SSR with `dynamic = 'force-dynamic'`
- ✅ All routes are server-rendered (`ƒ` in build output)
- ✅ Direct fetch API bypasses Supabase client SDK issues