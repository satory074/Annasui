-- Add BPM and beat offset to medleys table for beat-based time input
ALTER TABLE medleys ADD COLUMN IF NOT EXISTS bpm REAL;
ALTER TABLE medleys ADD COLUMN IF NOT EXISTS beat_offset REAL;

-- Existing rows will have NULL for both columns (falls back to seconds input)
