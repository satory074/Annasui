-- Remove BPM feature columns from medleys table
ALTER TABLE medleys DROP COLUMN IF EXISTS bpm;
ALTER TABLE medleys DROP COLUMN IF EXISTS beat_offset;
