-- ========================================
-- Database Complete Rebuild Migration
-- ========================================
-- This migration completely rebuilds the database with an ideal structure.
-- WARNING: This will DELETE ALL EXISTING DATA!
--
-- Changes:
-- 1. medleys: Add platform column, remove initial_bpm, unify timezone
-- 2. songs → medley_songs: Rename table, add song_id reference, remove genre, unify timezone
-- 3. song_data → song_master: Rename table (structure unchanged)
-- 4. medley_edits: Add song_id reference, unify timezone
-- 5. tempo_changes: Delete unused table
--
-- New structure: 4 tables (medleys, song_master, medley_songs, medley_edits)

-- ========================================
-- Step 1: Drop all existing tables
-- ========================================

DROP TABLE IF EXISTS tempo_changes CASCADE;
DROP TABLE IF EXISTS medley_edits CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS song_data CASCADE;
DROP TABLE IF EXISTS medleys CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_medley_contributors(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS update_last_edited_at() CASCADE;
DROP FUNCTION IF EXISTS update_song_data_updated_at() CASCADE;

-- ========================================
-- Step 2: Create new tables
-- ========================================

-- ----------------------------------------
-- Table 1: medleys (メドレー基本情報)
-- ----------------------------------------
CREATE TABLE medleys (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Video identification
  video_id VARCHAR NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL DEFAULT 'niconico',

  -- Medley information
  title TEXT NOT NULL,
  creator TEXT,
  duration INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_editor TEXT,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT platform_check CHECK (platform IN ('niconico', 'youtube', 'spotify', 'appleMusic'))
);

-- Indexes
CREATE INDEX idx_medleys_platform ON medleys(platform);
CREATE INDEX idx_medleys_video_id ON medleys(video_id);
CREATE INDEX idx_medleys_creator ON medleys(creator);

-- RLS policies
ALTER TABLE medleys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medleys" ON medleys
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert medleys" ON medleys
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update medleys" ON medleys
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete medleys" ON medleys
  FOR DELETE USING (true);

-- ----------------------------------------
-- Table 2: song_master (楽曲マスタ)
-- ----------------------------------------
CREATE TABLE song_master (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Song information
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  normalized_id TEXT NOT NULL UNIQUE,

  -- Links (JSONB format)
  original_link TEXT,
  links JSONB,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_song CHECK (title != '' AND artist != '')
);

-- Indexes
CREATE INDEX idx_song_master_normalized_id ON song_master(normalized_id);
CREATE INDEX idx_song_master_title ON song_master(title);
CREATE INDEX idx_song_master_artist ON song_master(artist);
CREATE INDEX idx_song_master_links ON song_master USING gin(links);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_song_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER song_master_updated_at
  BEFORE UPDATE ON song_master
  FOR EACH ROW
  EXECUTE FUNCTION update_song_master_updated_at();

-- RLS policies
ALTER TABLE song_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view song_master" ON song_master
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert song_master" ON song_master
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update song_master" ON song_master
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete song_master" ON song_master
  FOR DELETE USING (true);

-- Comment
COMMENT ON TABLE song_master IS 'Stores manually added songs for reuse across medleys. Duplicate detection uses normalized_id.';

-- ----------------------------------------
-- Table 3: medley_songs (メドレー内楽曲配置)
-- ----------------------------------------
CREATE TABLE medley_songs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  medley_id UUID NOT NULL REFERENCES medleys(id) ON DELETE CASCADE,
  song_id UUID REFERENCES song_master(id) ON DELETE SET NULL,

  -- Timeline information
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  order_index INTEGER NOT NULL,

  -- Display information (cached from song_master)
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  original_link TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_editor TEXT,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_position UNIQUE (medley_id, order_index)
);

-- Indexes
CREATE INDEX idx_medley_songs_medley_id ON medley_songs(medley_id);
CREATE INDEX idx_medley_songs_song_id ON medley_songs(song_id);
CREATE INDEX idx_medley_songs_order ON medley_songs(medley_id, order_index);

-- Trigger for last_edited_at
CREATE OR REPLACE FUNCTION update_last_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medley_songs_last_edited_at
  BEFORE UPDATE ON medley_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_last_edited_at();

-- RLS policies
ALTER TABLE medley_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medley_songs" ON medley_songs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert medley_songs" ON medley_songs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update medley_songs" ON medley_songs
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete medley_songs" ON medley_songs
  FOR DELETE USING (true);

-- ----------------------------------------
-- Table 4: medley_edits (編集履歴)
-- ----------------------------------------
CREATE TABLE medley_edits (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  medley_id UUID REFERENCES medleys(id) ON DELETE CASCADE,
  song_id UUID REFERENCES medley_songs(id) ON DELETE SET NULL,

  -- Edit information
  editor_nickname TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT action_check CHECK (action IN (
    'create_medley', 'update_medley', 'delete_medley',
    'add_song', 'update_song', 'delete_song', 'reorder_songs'
  ))
);

-- Indexes
CREATE INDEX idx_medley_edits_medley_id ON medley_edits(medley_id);
CREATE INDEX idx_medley_edits_song_id ON medley_edits(song_id);
CREATE INDEX idx_medley_edits_created_at ON medley_edits(created_at DESC);
CREATE INDEX idx_medley_edits_editor ON medley_edits(editor_nickname);

-- RLS policies
ALTER TABLE medley_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view edit history" ON medley_edits
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert edit history" ON medley_edits
  FOR INSERT WITH CHECK (true);

-- ========================================
-- Step 3: Create helper functions
-- ========================================

-- Trigger for medleys table
CREATE TRIGGER update_medleys_last_edited_at
  BEFORE UPDATE ON medleys
  FOR EACH ROW
  EXECUTE FUNCTION update_last_edited_at();

-- Function to get top contributors for a medley
CREATE OR REPLACE FUNCTION get_medley_contributors(medley_uuid UUID, limit_count INT DEFAULT 5)
RETURNS TABLE (
  editor_nickname TEXT,
  edit_count BIGINT,
  last_edit TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.editor_nickname,
    COUNT(*) as edit_count,
    MAX(me.created_at) as last_edit
  FROM medley_edits me
  WHERE me.medley_id = medley_uuid
  GROUP BY me.editor_nickname
  ORDER BY edit_count DESC, last_edit DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration Complete
-- ========================================
-- New database structure is ready with 4 tables:
-- 1. medleys (with platform support)
-- 2. song_master (renamed from song_data)
-- 3. medley_songs (renamed from songs, with song_master reference)
-- 4. medley_edits (with song_id reference)
--
-- Next steps:
-- 1. Update TypeScript types in src/lib/supabase.ts
-- 2. Update API code in src/lib/api/medleys.ts
-- 3. Update songDatabase.ts to use song_master table
-- 4. Test and deploy
