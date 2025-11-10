-- ========================================
-- Migration 018: Add Artist, Composer, Arranger Relations
-- ========================================
-- This migration introduces normalized artist management, allowing multiple
-- artists, composers, and arrangers to be associated with each song.
--
-- Changes:
-- 1. Create 'artists' table - Master table for all artists/composers/arrangers
-- 2. Create 'song_artist_relations' table - Many-to-many relations with roles
-- 3. Migrate existing data from song_master.artist to new tables
-- 4. Keep song_master.artist for backward compatibility (will be removed in future)
--
-- Background:
-- Previously, each song could only have one artist (song_master.artist field).
-- This migration enables:
-- - Multiple artists per song (e.g., collaborations)
-- - Multiple composers per song (e.g., co-composed tracks)
-- - Multiple arrangers per song (e.g., remix credits)
-- - Normalized data structure to prevent duplicate artist names

-- ========================================
-- Step 1: Create artists master table
-- ========================================

CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE artists IS 'Master table for all artists, composers, and arrangers';
COMMENT ON COLUMN artists.name IS 'Display name of the artist';
COMMENT ON COLUMN artists.normalized_name IS 'Normalized name for duplicate detection (katakana→hiragana, symbols removed)';

-- Create index on normalized_name for fast duplicate detection
CREATE INDEX idx_artists_normalized_name ON artists(normalized_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Step 2: Create song-artist relations table
-- ========================================

CREATE TABLE song_artist_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES song_master(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('artist', 'composer', 'arranger')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE song_artist_relations IS 'Many-to-many relations between songs and artists with roles';
COMMENT ON COLUMN song_artist_relations.role IS 'Role: artist (performer), composer (music creator), arranger (arrangement creator)';
COMMENT ON COLUMN song_artist_relations.order_index IS 'Display order when multiple artists have the same role (0-based)';

-- Create indexes for efficient queries
CREATE INDEX idx_song_artist_song_id ON song_artist_relations(song_id);
CREATE INDEX idx_song_artist_artist_id ON song_artist_relations(artist_id);
CREATE INDEX idx_song_artist_role ON song_artist_relations(role);
CREATE INDEX idx_song_artist_song_role ON song_artist_relations(song_id, role);

-- Create unique constraint to prevent duplicate relations
CREATE UNIQUE INDEX idx_song_artist_unique ON song_artist_relations(song_id, artist_id, role);

-- ========================================
-- Step 3: Migrate existing data
-- ========================================

-- Insert existing artists from song_master.artist into artists table
-- Using normalized names for duplicate detection
INSERT INTO artists (name, normalized_name)
SELECT DISTINCT
  artist,
  -- Simple normalization: lowercase + trim whitespace
  -- (Full normalization will be handled by application code)
  LOWER(TRIM(artist))
FROM song_master
WHERE artist IS NOT NULL
  AND artist != ''
  AND artist != 'Unknown Artist'
ON CONFLICT (normalized_name) DO NOTHING;

-- Create relations for existing songs
-- Link each song to its artist with role='artist'
INSERT INTO song_artist_relations (song_id, artist_id, role, order_index)
SELECT
  sm.id,
  a.id,
  'artist',
  0
FROM song_master sm
JOIN artists a ON LOWER(TRIM(sm.artist)) = a.normalized_name
WHERE sm.artist IS NOT NULL
  AND sm.artist != ''
  AND sm.artist != 'Unknown Artist';

-- ========================================
-- Step 4: Add RLS policies (if needed)
-- ========================================

-- Enable RLS for both tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_artist_relations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to artists"
  ON artists FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to song_artist_relations"
  ON song_artist_relations FOR SELECT
  USING (true);

-- Create policies for authenticated insert/update/delete
-- (Note: Current auth system uses shared password, not Supabase auth)
-- These policies allow all operations for now
CREATE POLICY "Allow all operations on artists"
  ON artists FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on song_artist_relations"
  ON song_artist_relations FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- Migration Complete
-- ========================================
-- New tables created:
-- - artists: Master table for all artists/composers/arrangers
-- - song_artist_relations: Many-to-many relations with roles
--
-- Existing data migrated:
-- - All non-empty song_master.artist values → artists table
-- - Corresponding relations created with role='artist'
--
-- Next steps:
-- 1. Update TypeScript types in src/lib/supabase.ts
-- 2. Update songDatabase.ts to fetch artist/composer/arranger arrays
-- 3. Update ManualSongAddModal to accept multiple artists/composers/arrangers
-- 4. Update SongInfoDisplay to display multiple credits
-- 5. Update search functionality to include composers/arrangers
--
-- Note: song_master.artist field is kept for backward compatibility.
-- It will be removed in a future migration after confirming the new system works.
