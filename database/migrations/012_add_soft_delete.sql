-- ========================================
-- Migration: Add Soft Delete Functionality
-- ========================================
-- This migration adds soft delete functionality to medleys and songs tables.
-- Instead of permanently deleting records, they are marked as deleted with a timestamp.
--
-- Benefits:
-- - Accidental deletions can be recovered within 30 days
-- - Full audit trail of deleted records
-- - Safer than hard deletes for user data
--
-- Recovery window: 30 days (configurable)

-- ========================================
-- Step 1: Add deleted_at columns
-- ========================================

-- Add deleted_at to medleys table
ALTER TABLE medleys
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

COMMENT ON COLUMN medleys.deleted_at IS 'Timestamp when this medley was soft-deleted. NULL means active.';

-- Add deleted_at to songs table
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

COMMENT ON COLUMN songs.deleted_at IS 'Timestamp when this song was soft-deleted. NULL means active.';

-- ========================================
-- Step 2: Create indexes for performance
-- ========================================

-- Index for filtering active medleys (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_medleys_not_deleted
ON medleys(video_id)
WHERE deleted_at IS NULL;

-- Index for filtering active songs
CREATE INDEX IF NOT EXISTS idx_songs_not_deleted
ON songs(medley_id)
WHERE deleted_at IS NULL;

-- Index for finding deleted items (for cleanup job)
CREATE INDEX IF NOT EXISTS idx_medleys_deleted
ON medleys(deleted_at)
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_songs_deleted
ON songs(deleted_at)
WHERE deleted_at IS NOT NULL;

-- ========================================
-- Step 3: Update RLS policies to exclude soft-deleted records
-- ========================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Anyone can view medleys" ON medleys;
DROP POLICY IF EXISTS "Anyone can view songs" ON songs;

-- Recreate SELECT policies with soft delete filter
CREATE POLICY "Anyone can view active medleys" ON medleys
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Anyone can view active songs" ON songs
  FOR SELECT USING (deleted_at IS NULL);

-- ========================================
-- Step 4: Create views for accessing deleted records
-- ========================================

-- View for soft-deleted medleys (admin/recovery use)
CREATE OR REPLACE VIEW deleted_medleys AS
SELECT
  m.*,
  (EXTRACT(EPOCH FROM (NOW() - m.deleted_at)) / 86400)::int AS days_since_deletion,
  (30 - (EXTRACT(EPOCH FROM (NOW() - m.deleted_at)) / 86400)::int) AS days_until_permanent_deletion
FROM medleys m
WHERE m.deleted_at IS NOT NULL
ORDER BY m.deleted_at DESC;

COMMENT ON VIEW deleted_medleys IS 'Soft-deleted medleys with recovery metadata. Automatically cleaned after 30 days.';

-- View for soft-deleted songs (admin/recovery use)
CREATE OR REPLACE VIEW deleted_songs AS
SELECT
  s.*,
  m.title as medley_title,
  (EXTRACT(EPOCH FROM (NOW() - s.deleted_at)) / 86400)::int AS days_since_deletion,
  (30 - (EXTRACT(EPOCH FROM (NOW() - s.deleted_at)) / 86400)::int) AS days_until_permanent_deletion
FROM songs s
LEFT JOIN medleys m ON s.medley_id = m.id
WHERE s.deleted_at IS NOT NULL
ORDER BY s.deleted_at DESC;

COMMENT ON VIEW deleted_songs IS 'Soft-deleted songs with recovery metadata. Automatically cleaned after 30 days.';

-- ========================================
-- Step 5: Create recovery functions
-- ========================================

-- Function to restore a soft-deleted medley
CREATE OR REPLACE FUNCTION restore_medley(medley_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE medleys
  SET deleted_at = NULL,
      last_edited_at = NOW()
  WHERE id = medley_uuid
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_medley(UUID) IS 'Restore a soft-deleted medley by setting deleted_at to NULL';

-- Function to restore a soft-deleted song
CREATE OR REPLACE FUNCTION restore_song(song_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE songs
  SET deleted_at = NULL,
      last_edited_at = NOW()
  WHERE id = song_uuid
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_song(UUID) IS 'Restore a soft-deleted song by setting deleted_at to NULL';

-- Function to permanently delete old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records()
RETURNS TABLE (
  deleted_medleys_count BIGINT,
  deleted_songs_count BIGINT
) AS $$
DECLARE
  medleys_count BIGINT;
  songs_count BIGINT;
BEGIN
  -- Delete medleys older than 30 days
  WITH deleted AS (
    DELETE FROM medleys
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO medleys_count FROM deleted;

  -- Delete songs older than 30 days
  WITH deleted AS (
    DELETE FROM songs
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO songs_count FROM deleted;

  RETURN QUERY SELECT medleys_count, songs_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_deleted_records() IS 'Permanently delete soft-deleted records older than 30 days';

-- ========================================
-- Step 6: Create trigger to cascade soft deletes
-- ========================================

-- When a medley is soft-deleted, also soft-delete all its songs
CREATE OR REPLACE FUNCTION cascade_soft_delete_songs()
RETURNS TRIGGER AS $$
BEGIN
  -- If medley is being soft-deleted (deleted_at changes from NULL to timestamp)
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE songs
    SET deleted_at = NEW.deleted_at,
        last_editor = NEW.last_editor,
        last_edited_at = NEW.last_edited_at
    WHERE medley_id = NEW.id
      AND deleted_at IS NULL;
  END IF;

  -- If medley is being restored (deleted_at changes from timestamp to NULL)
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE songs
    SET deleted_at = NULL,
        last_editor = NEW.last_editor,
        last_edited_at = NEW.last_edited_at
    WHERE medley_id = NEW.id
      AND deleted_at IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cascade_soft_delete_songs_trigger ON medleys;
CREATE TRIGGER cascade_soft_delete_songs_trigger
  AFTER UPDATE OF deleted_at ON medleys
  FOR EACH ROW
  WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
  EXECUTE FUNCTION cascade_soft_delete_songs();

COMMENT ON TRIGGER cascade_soft_delete_songs_trigger ON medleys IS 'Automatically soft-delete/restore songs when parent medley is soft-deleted/restored';

-- ========================================
-- Step 7: Update edit history to record soft deletes
-- ========================================

-- Function to log soft delete actions
CREATE OR REPLACE FUNCTION log_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log soft delete action
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO medley_edits (
      medley_id,
      editor_nickname,
      action,
      changes
    ) VALUES (
      CASE WHEN TG_TABLE_NAME = 'medleys' THEN NEW.id ELSE NEW.medley_id END,
      NEW.last_editor,
      CASE WHEN TG_TABLE_NAME = 'medleys' THEN 'soft_delete_medley' ELSE 'soft_delete_song' END,
      jsonb_build_object(
        'deleted_at', NEW.deleted_at,
        'recoverable_until', NEW.deleted_at + INTERVAL '30 days',
        'record', row_to_json(NEW)
      )
    );
  END IF;

  -- Log restoration action
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    INSERT INTO medley_edits (
      medley_id,
      editor_nickname,
      action,
      changes
    ) VALUES (
      CASE WHEN TG_TABLE_NAME = 'medleys' THEN NEW.id ELSE NEW.medley_id END,
      NEW.last_editor,
      CASE WHEN TG_TABLE_NAME = 'medleys' THEN 'restore_medley' ELSE 'restore_song' END,
      jsonb_build_object(
        'restored_at', NOW(),
        'was_deleted_at', OLD.deleted_at,
        'record', row_to_json(NEW)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add soft delete logging triggers
DROP TRIGGER IF EXISTS log_medley_soft_delete ON medleys;
CREATE TRIGGER log_medley_soft_delete
  AFTER UPDATE OF deleted_at ON medleys
  FOR EACH ROW
  WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
  EXECUTE FUNCTION log_soft_delete();

DROP TRIGGER IF EXISTS log_song_soft_delete ON songs;
CREATE TRIGGER log_song_soft_delete
  AFTER UPDATE OF deleted_at ON songs
  FOR EACH ROW
  WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
  EXECUTE FUNCTION log_soft_delete();

-- ========================================
-- Step 8: Update action enum to include soft delete actions
-- ========================================

-- Add new action types to medley_edits constraint
ALTER TABLE medley_edits DROP CONSTRAINT IF EXISTS medley_edits_action_check;
ALTER TABLE medley_edits ADD CONSTRAINT medley_edits_action_check
  CHECK (action IN (
    'create', 'update', 'delete',
    'song_add', 'song_update', 'song_delete',
    'soft_delete_medley', 'soft_delete_song',
    'restore_medley', 'restore_song'
  ));

-- ========================================
-- Migration Complete
-- ========================================
-- Soft delete system is now ready.
--
-- Usage:
-- - Soft delete: UPDATE medleys SET deleted_at = NOW(), last_editor = 'username' WHERE id = '...';
-- - Restore: SELECT restore_medley('uuid');
-- - View deleted: SELECT * FROM deleted_medleys;
-- - Cleanup old: SELECT * FROM cleanup_old_deleted_records();
--
-- Recommendations:
-- 1. Update application code to set deleted_at instead of DELETE
-- 2. Add "Restore" button in UI for deleted items
-- 3. Schedule cleanup_old_deleted_records() to run weekly
-- 4. Monitor deleted_* views for accidental deletions
