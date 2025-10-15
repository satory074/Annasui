-- ========================================
-- Create song_data table for persistent song database
-- ========================================
-- This table stores manually added songs that can be reused across medleys.
-- Songs are stored with a normalized ID for duplicate detection.

-- Create song_data table
CREATE TABLE IF NOT EXISTS song_data (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  original_link TEXT,
  links JSONB,
  normalized_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_song_data_normalized_id ON song_data(normalized_id);
CREATE INDEX IF NOT EXISTS idx_song_data_title ON song_data(title);
CREATE INDEX IF NOT EXISTS idx_song_data_artist ON song_data(artist);
CREATE INDEX IF NOT EXISTS idx_song_data_created_at ON song_data(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_song_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER song_data_updated_at
  BEFORE UPDATE ON song_data
  FOR EACH ROW
  EXECUTE FUNCTION update_song_data_updated_at();

-- Enable Row Level Security
ALTER TABLE song_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations (open access for manual song management)
CREATE POLICY "Allow public read access to song_data"
  ON song_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to song_data"
  ON song_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to song_data"
  ON song_data FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to song_data"
  ON song_data FOR DELETE
  USING (true);

-- Add comment
COMMENT ON TABLE song_data IS 'Stores manually added songs for reuse across medleys. Duplicate detection uses normalized_id.';
