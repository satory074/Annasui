-- ========================================
-- Migration 017: Replace Links with Platform-Specific Columns
-- ========================================
-- This migration replaces the generic 'original_link' and JSONB 'links' columns
-- with individual platform-specific columns for better type safety and simpler UI implementation.
--
-- Changes:
-- 1. song_master: Replace original_link + links with 4 platform columns
-- 2. medley_songs: Replace original_link with 4 platform columns
-- 3. Remove JSONB index on song_master.links
--
-- Background:
-- The project supports exactly 4 platforms (niconico, youtube, spotify, appleMusic).
-- Individual columns provide:
-- - Better TypeScript type safety
-- - Simpler UI implementation (no JSON parsing)
-- - Easier SQL queries
-- - Sufficient for the project's scope

-- ========================================
-- Step 1: Migrate song_master table
-- ========================================

-- Drop existing JSONB index
DROP INDEX IF EXISTS idx_song_master_links;

-- Add new platform-specific columns
ALTER TABLE song_master
  ADD COLUMN niconico_link TEXT,
  ADD COLUMN youtube_link TEXT,
  ADD COLUMN spotify_link TEXT,
  ADD COLUMN applemusic_link TEXT;

-- Migrate existing data from original_link to appropriate platform column
-- (Currently all original_link values are NULL, but this handles future data)
UPDATE song_master
SET niconico_link = original_link
WHERE original_link IS NOT NULL
  AND (original_link LIKE '%nicovideo.jp%' OR original_link LIKE '%nico.ms%');

UPDATE song_master
SET youtube_link = original_link
WHERE original_link IS NOT NULL
  AND (original_link LIKE '%youtube.com%' OR original_link LIKE '%youtu.be%');

UPDATE song_master
SET spotify_link = original_link
WHERE original_link IS NOT NULL
  AND original_link LIKE '%spotify.com%';

UPDATE song_master
SET applemusic_link = original_link
WHERE original_link IS NOT NULL
  AND original_link LIKE '%music.apple.com%';

-- Drop old columns
ALTER TABLE song_master
  DROP COLUMN original_link,
  DROP COLUMN links;

-- Add indexes for platform-specific queries
CREATE INDEX idx_song_master_niconico ON song_master(niconico_link)
  WHERE niconico_link IS NOT NULL;

CREATE INDEX idx_song_master_youtube ON song_master(youtube_link)
  WHERE youtube_link IS NOT NULL;

CREATE INDEX idx_song_master_spotify ON song_master(spotify_link)
  WHERE spotify_link IS NOT NULL;

CREATE INDEX idx_song_master_applemusic ON song_master(applemusic_link)
  WHERE applemusic_link IS NOT NULL;

-- ========================================
-- Step 2: Migrate medley_songs table
-- ========================================

-- Add new platform-specific columns
ALTER TABLE medley_songs
  ADD COLUMN niconico_link TEXT,
  ADD COLUMN youtube_link TEXT,
  ADD COLUMN spotify_link TEXT,
  ADD COLUMN applemusic_link TEXT;

-- Migrate existing data from original_link to appropriate platform column
UPDATE medley_songs
SET niconico_link = original_link
WHERE original_link IS NOT NULL
  AND (original_link LIKE '%nicovideo.jp%' OR original_link LIKE '%nico.ms%');

UPDATE medley_songs
SET youtube_link = original_link
WHERE original_link IS NOT NULL
  AND (original_link LIKE '%youtube.com%' OR original_link LIKE '%youtu.be%');

UPDATE medley_songs
SET spotify_link = original_link
WHERE original_link IS NOT NULL
  AND original_link LIKE '%spotify.com%';

UPDATE medley_songs
SET applemusic_link = original_link
WHERE original_link IS NOT NULL
  AND original_link LIKE '%music.apple.com%';

-- Drop old column
ALTER TABLE medley_songs
  DROP COLUMN original_link;

-- Add indexes for platform-specific queries
CREATE INDEX idx_medley_songs_niconico ON medley_songs(niconico_link)
  WHERE niconico_link IS NOT NULL;

CREATE INDEX idx_medley_songs_youtube ON medley_songs(youtube_link)
  WHERE youtube_link IS NOT NULL;

CREATE INDEX idx_medley_songs_spotify ON medley_songs(spotify_link)
  WHERE spotify_link IS NOT NULL;

CREATE INDEX idx_medley_songs_applemusic ON medley_songs(applemusic_link)
  WHERE applemusic_link IS NOT NULL;

-- ========================================
-- Migration Complete
-- ========================================
-- Both song_master and medley_songs now have platform-specific link columns:
-- - niconico_link
-- - youtube_link
-- - spotify_link
-- - applemusic_link
--
-- Next steps:
-- 1. Update TypeScript types in src/lib/supabase.ts
-- 2. Update songDatabase.ts to handle new columns
-- 3. Update ManualSongAddModal to have 4 link input fields
-- 4. Update SongSearchModal to display platform links
-- 5. Update SongEditModal to edit platform links
