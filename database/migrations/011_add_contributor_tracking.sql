-- ========================================
-- Migration: Add Contributor Tracking System
-- ========================================
-- This migration adds contributor (editor) tracking to the system.
-- It allows recording who made edits without requiring full user authentication.
--
-- Features:
-- - Track last editor nickname for medleys and songs
-- - Full edit history with timestamps
-- - Works with simple password-based authentication

-- ========================================
-- Step 1: Add last_editor columns
-- ========================================

-- Add last_editor to medleys table
ALTER TABLE medleys
ADD COLUMN IF NOT EXISTS last_editor TEXT,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP DEFAULT NOW();

-- Add last_editor to songs table
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS last_editor TEXT,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP DEFAULT NOW();

-- ========================================
-- Step 2: Create medley_edits table for edit history
-- ========================================

CREATE TABLE IF NOT EXISTS medley_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medley_id UUID REFERENCES medleys(id) ON DELETE CASCADE,
  editor_nickname TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'song_add', 'song_update', 'song_delete')),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_medley_edits_medley_id ON medley_edits(medley_id);
CREATE INDEX IF NOT EXISTS idx_medley_edits_created_at ON medley_edits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medley_edits_editor ON medley_edits(editor_nickname);

-- ========================================
-- Step 3: Add RLS policies for medley_edits
-- ========================================

-- Enable RLS
ALTER TABLE medley_edits ENABLE ROW LEVEL SECURITY;

-- Anyone can view edit history
CREATE POLICY "Anyone can view edit history" ON medley_edits
  FOR SELECT USING (true);

-- Only authenticated users can insert edit history
-- (This will be enforced server-side via API)
CREATE POLICY "Authenticated users can insert edit history" ON medley_edits
  FOR INSERT WITH CHECK (true);

-- ========================================
-- Step 4: Create function to automatically record edits
-- ========================================

-- Function to update last_edited_at timestamp
CREATE OR REPLACE FUNCTION update_last_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for medleys table
DROP TRIGGER IF EXISTS update_medleys_last_edited_at ON medleys;
CREATE TRIGGER update_medleys_last_edited_at
  BEFORE UPDATE ON medleys
  FOR EACH ROW
  EXECUTE FUNCTION update_last_edited_at();

-- Trigger for songs table
DROP TRIGGER IF EXISTS update_songs_last_edited_at ON songs;
CREATE TRIGGER update_songs_last_edited_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_last_edited_at();

-- ========================================
-- Step 5: Create helper function to get recent contributors
-- ========================================

-- Function to get top contributors for a medley
CREATE OR REPLACE FUNCTION get_medley_contributors(medley_uuid UUID, limit_count INT DEFAULT 5)
RETURNS TABLE (
  editor_nickname TEXT,
  edit_count BIGINT,
  last_edit TIMESTAMP
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
-- Contributor tracking system is now ready.
-- Next steps:
-- 1. Update API to record editor nicknames
-- 2. Implement password verification endpoint
-- 3. Update UI to display contributor information
