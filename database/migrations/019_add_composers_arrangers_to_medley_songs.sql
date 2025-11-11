-- ========================================
-- Migration 019: Add Composers and Arrangers to medley_songs
-- ========================================
-- This migration adds composers and arrangers fields to the medley_songs table,
-- enabling display and caching of composer/arranger information in medleys.
--
-- Changes:
-- 1. Add 'composers' column to medley_songs - Comma-separated list (like 'artist')
-- 2. Add 'arrangers' column to medley_songs - Comma-separated list (like 'artist')
--
-- Background:
-- Migration 018 created the normalized artist system with song_artist_relations.
-- However, medley_songs still only cached the 'artist' field for display.
-- This migration extends caching to include composers and arrangers.
--
-- Rationale:
-- - Backward compatible: Uses same comma-separated format as existing 'artist' field
-- - Performance: Cached data avoids complex joins during medley playback
-- - Consistency: Matches existing medley_songs.artist pattern
-- - Source of truth: song_artist_relations remains the authoritative data source

-- ========================================
-- Step 1: Add composers and arrangers columns
-- ========================================

ALTER TABLE medley_songs
  ADD COLUMN composers TEXT,  -- Comma-separated list of composer names (e.g., "Composer A, Composer B")
  ADD COLUMN arrangers TEXT;   -- Comma-separated list of arranger names (e.g., "Arranger X, Arranger Y")

-- Add comments for documentation
COMMENT ON COLUMN medley_songs.composers IS 'Cached comma-separated list of composers for display (source: song_artist_relations with role=composer)';
COMMENT ON COLUMN medley_songs.arrangers IS 'Cached comma-separated list of arrangers for display (source: song_artist_relations with role=arranger)';

-- ========================================
-- Step 2: Populate existing records
-- ========================================
-- For existing medley_songs linked to song_master, populate composers/arrangers
-- from song_artist_relations

UPDATE medley_songs ms
SET composers = (
  SELECT STRING_AGG(a.name, ', ' ORDER BY sar.order_index)
  FROM song_artist_relations sar
  JOIN artists a ON sar.artist_id = a.id
  WHERE sar.song_id = ms.song_id
    AND sar.role = 'composer'
)
WHERE ms.song_id IS NOT NULL;

UPDATE medley_songs ms
SET arrangers = (
  SELECT STRING_AGG(a.name, ', ' ORDER BY sar.order_index)
  FROM song_artist_relations sar
  JOIN artists a ON sar.artist_id = a.id
  WHERE sar.song_id = ms.song_id
    AND sar.role = 'arranger'
)
WHERE ms.song_id IS NOT NULL;

-- ========================================
-- Migration Complete
-- ========================================
-- Columns added:
-- - medley_songs.composers: TEXT (nullable)
-- - medley_songs.arrangers: TEXT (nullable)
--
-- Data migrated:
-- - All medley_songs with song_id populated with composers/arrangers from song_artist_relations
--
-- Next steps:
-- 1. Update TypeScript types in src/lib/supabase.ts
-- 2. Update convertDbRowToSongSection() in medleys.ts to parse composers/arrangers
-- 3. Update saveMedleySongs() to include composers/arrangers when inserting
-- 4. Update SongEditModal to display composers/arrangers (read-only)
-- 5. Update SongInfoDisplay to show composers/arrangers
--
-- Note: Like 'artist', composers/arrangers are cached for performance.
-- The source of truth remains song_artist_relations table.
