-- ========================================
-- Migration 022: Add Decimal Time Support
-- ========================================
-- This migration changes the start_time and end_time columns from INTEGER to REAL
-- to support sub-second precision (0.1 second accuracy).
--
-- Changes:
-- 1. medley_songs.start_time: INTEGER -> REAL
-- 2. medley_songs.end_time: INTEGER -> REAL
--
-- Background:
-- Users need to annotate song segments with sub-second precision for accurate
-- medley playback. The Niconico player already supports millisecond-level seeking,
-- so this change enables the full precision to be stored and utilized.
--
-- Compatibility:
-- - Existing integer values will be automatically converted to REAL (e.g., 90 -> 90.0)
-- - No data loss occurs during migration
-- - TypeScript types already use `number` which supports decimals

-- ========================================
-- Step 1: Alter medley_songs columns
-- ========================================

-- Change start_time from INTEGER to REAL
ALTER TABLE medley_songs
  ALTER COLUMN start_time TYPE REAL;

-- Change end_time from INTEGER to REAL
ALTER TABLE medley_songs
  ALTER COLUMN end_time TYPE REAL;

-- ========================================
-- Migration Complete
-- ========================================
-- medley_songs table now supports decimal time values:
-- - start_time: REAL (e.g., 90.5 for 1:30.5)
-- - end_time: REAL (e.g., 120.3 for 2:00.3)
--
-- The constraint 'valid_time_range CHECK (end_time > start_time)' remains valid
-- as REAL values are comparable.
--
-- Next steps:
-- 1. Update time.ts parseTimeInput() to use parseFloat()
-- 2. Update time.ts formatTimeSimple() to display decimal seconds
-- 3. Adjust UI input field width if needed
