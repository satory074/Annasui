-- ========================================
-- Migration 016: Make Artist Field Optional
-- ========================================
-- This migration makes the 'artist' field in song_master table optional.
--
-- Changes:
-- 1. Remove NOT NULL constraint from artist column
-- 2. Update unique_song CHECK constraint to allow empty artist
-- 3. Add index for empty artist queries
--
-- Background:
-- Users may want to add songs without artist information.
-- In such cases, the application will use "Unknown Artist" as a default value.

-- ========================================
-- Step 1: Remove NOT NULL constraint
-- ========================================

ALTER TABLE song_master
  ALTER COLUMN artist DROP NOT NULL;

-- ========================================
-- Step 2: Update CHECK constraint
-- ========================================

-- Drop old constraint
ALTER TABLE song_master
  DROP CONSTRAINT IF EXISTS unique_song;

-- Add new constraint (title must not be empty, artist can be empty)
ALTER TABLE song_master
  ADD CONSTRAINT unique_song CHECK (title != '');

-- ========================================
-- Step 3: Add index for queries
-- ========================================

-- Create index for filtering songs with empty artist
CREATE INDEX idx_song_master_empty_artist ON song_master(artist)
  WHERE artist = '' OR artist IS NULL;

-- ========================================
-- Migration Complete
-- ========================================
-- The 'artist' field in song_master is now optional.
-- Application code will handle empty artist values by using "Unknown Artist" as default.
