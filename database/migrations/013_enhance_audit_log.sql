-- ========================================
-- Migration: Enhance Audit Logging System
-- ========================================
-- This migration enhances the audit logging system with additional metadata:
-- - IP address tracking
-- - User agent tracking
-- - Session identifier
-- - More detailed change tracking
--
-- Benefits:
-- - Better security monitoring
-- - Detailed forensics for unauthorized changes
-- - Track which device/browser made changes
-- - Detect suspicious patterns

-- ========================================
-- Step 1: Add new columns to medley_edits
-- ========================================

-- Add IP address column
ALTER TABLE medley_edits
ADD COLUMN IF NOT EXISTS ip_address INET;

COMMENT ON COLUMN medley_edits.ip_address IS 'IP address of the user who made this edit';

-- Add user agent column
ALTER TABLE medley_edits
ADD COLUMN IF NOT EXISTS user_agent TEXT;

COMMENT ON COLUMN medley_edits.user_agent IS 'Browser/client user agent string';

-- Add session identifier
ALTER TABLE medley_edits
ADD COLUMN IF NOT EXISTS session_id TEXT;

COMMENT ON COLUMN medley_edits.session_id IS 'Session identifier for grouping edits from same session';

-- Add change summary (human-readable)
ALTER TABLE medley_edits
ADD COLUMN IF NOT EXISTS change_summary TEXT;

COMMENT ON COLUMN medley_edits.change_summary IS 'Human-readable summary of the change';

-- ========================================
-- Step 2: Create indexes for security queries
-- ========================================

-- Index for searching by IP address (security monitoring)
CREATE INDEX IF NOT EXISTS idx_medley_edits_ip_address
ON medley_edits(ip_address)
WHERE ip_address IS NOT NULL;

-- Index for searching by session (track session activity)
CREATE INDEX IF NOT EXISTS idx_medley_edits_session
ON medley_edits(session_id, created_at)
WHERE session_id IS NOT NULL;

-- Composite index for security analysis
CREATE INDEX IF NOT EXISTS idx_medley_edits_security
ON medley_edits(editor_nickname, ip_address, created_at DESC);

-- ========================================
-- Step 3: Create views for security monitoring
-- ========================================

-- View for suspicious activity detection
CREATE OR REPLACE VIEW suspicious_edits AS
SELECT
  me.id,
  me.medley_id,
  me.editor_nickname,
  me.action,
  me.ip_address,
  me.created_at,
  me.change_summary,
  -- Count edits from same IP in last hour
  (SELECT COUNT(*)
   FROM medley_edits me2
   WHERE me2.ip_address = me.ip_address
     AND me2.created_at > me.created_at - INTERVAL '1 hour'
     AND me2.created_at <= me.created_at
  ) AS edits_from_ip_last_hour,
  -- Count edits from same nickname with different IPs in last day
  (SELECT COUNT(DISTINCT ip_address)
   FROM medley_edits me3
   WHERE me3.editor_nickname = me.editor_nickname
     AND me3.created_at > me.created_at - INTERVAL '1 day'
     AND me3.created_at <= me.created_at
     AND me3.ip_address IS NOT NULL
  ) AS different_ips_last_day
FROM medley_edits me
WHERE me.created_at > NOW() - INTERVAL '7 days'
ORDER BY me.created_at DESC;

COMMENT ON VIEW suspicious_edits IS 'Recent edits with suspicious activity indicators';

-- View for editor activity summary
CREATE OR REPLACE VIEW editor_activity_summary AS
SELECT
  editor_nickname,
  COUNT(*) AS total_edits,
  COUNT(DISTINCT medley_id) AS medleys_edited,
  COUNT(DISTINCT ip_address) AS unique_ips,
  COUNT(DISTINCT session_id) AS unique_sessions,
  MIN(created_at) AS first_edit,
  MAX(created_at) AS last_edit,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS edits_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS edits_last_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS edits_last_30d
FROM medley_edits
WHERE editor_nickname IS NOT NULL
GROUP BY editor_nickname
ORDER BY total_edits DESC;

COMMENT ON VIEW editor_activity_summary IS 'Summary of editing activity by nickname';

-- View for IP address activity
CREATE OR REPLACE VIEW ip_activity_summary AS
SELECT
  ip_address,
  COUNT(DISTINCT editor_nickname) AS unique_editors,
  COUNT(*) AS total_edits,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  array_agg(DISTINCT editor_nickname) AS nicknames_used
FROM medley_edits
WHERE ip_address IS NOT NULL
GROUP BY ip_address
ORDER BY total_edits DESC;

COMMENT ON VIEW ip_activity_summary IS 'Summary of editing activity by IP address';

-- ========================================
-- Step 4: Create function to record edit with metadata
-- ========================================

-- Helper function to extract change summary from changes JSONB
CREATE OR REPLACE FUNCTION generate_change_summary(
  action_type TEXT,
  changes_data JSONB
)
RETURNS TEXT AS $$
DECLARE
  summary TEXT;
  old_data JSONB;
  new_data JSONB;
BEGIN
  CASE action_type
    WHEN 'create' THEN
      summary := 'Created new medley';

    WHEN 'update' THEN
      old_data := changes_data->'old';
      new_data := changes_data->'new';
      summary := 'Updated ';

      -- Detect what changed
      IF (old_data->>'title') IS DISTINCT FROM (new_data->>'title') THEN
        summary := summary || 'title ';
      END IF;
      IF (old_data->>'creator') IS DISTINCT FROM (new_data->>'creator') THEN
        summary := summary || 'creator ';
      END IF;
      IF (old_data->>'duration') IS DISTINCT FROM (new_data->>'duration') THEN
        summary := summary || 'duration ';
      END IF;

    WHEN 'song_add' THEN
      new_data := changes_data->'new';
      summary := format('Added song: %s by %s',
        new_data->>'title',
        COALESCE(new_data->>'artist', 'Unknown'));

    WHEN 'song_update' THEN
      old_data := changes_data->'old';
      new_data := changes_data->'new';
      summary := format('Updated song: %s',
        new_data->>'title');

    WHEN 'song_delete' THEN
      old_data := changes_data->'deleted';
      summary := format('Deleted song: %s by %s',
        old_data->>'title',
        COALESCE(old_data->>'artist', 'Unknown'));

    WHEN 'soft_delete_medley' THEN
      summary := 'Soft-deleted medley (recoverable for 30 days)';

    WHEN 'soft_delete_song' THEN
      summary := 'Soft-deleted song (recoverable for 30 days)';

    WHEN 'restore_medley' THEN
      summary := 'Restored soft-deleted medley';

    WHEN 'restore_song' THEN
      summary := 'Restored soft-deleted song';

    ELSE
      summary := action_type;
  END CASE;

  RETURN summary;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_change_summary(TEXT, JSONB) IS 'Generate human-readable summary from action and changes JSONB';

-- Backfill change_summary for existing records
UPDATE medley_edits
SET change_summary = generate_change_summary(action, changes)
WHERE change_summary IS NULL;

-- ========================================
-- Step 5: Create function to record edit with full metadata
-- ========================================

-- Function to insert edit with metadata (called from application)
CREATE OR REPLACE FUNCTION record_edit_with_metadata(
  p_medley_id UUID,
  p_editor_nickname TEXT,
  p_action TEXT,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  edit_id UUID;
  summary TEXT;
BEGIN
  -- Generate change summary
  summary := generate_change_summary(p_action, p_changes);

  -- Insert edit record
  INSERT INTO medley_edits (
    medley_id,
    editor_nickname,
    action,
    changes,
    ip_address,
    user_agent,
    session_id,
    change_summary
  ) VALUES (
    p_medley_id,
    p_editor_nickname,
    p_action,
    p_changes,
    p_ip_address,
    p_user_agent,
    p_session_id,
    summary
  )
  RETURNING id INTO edit_id;

  RETURN edit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_edit_with_metadata IS 'Insert edit record with full metadata including IP, user agent, and session';

-- ========================================
-- Step 6: Create function to detect anomalies
-- ========================================

-- Function to detect potentially suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  lookback_hours INT DEFAULT 24
)
RETURNS TABLE (
  editor_nickname TEXT,
  anomaly_type TEXT,
  anomaly_description TEXT,
  edit_count BIGINT,
  severity TEXT
) AS $$
BEGIN
  -- High edit rate from single IP
  RETURN QUERY
  SELECT
    me.editor_nickname,
    'high_edit_rate_per_ip'::TEXT,
    format('%s edits from IP %s in %s hours', COUNT(*), me.ip_address, lookback_hours),
    COUNT(*),
    CASE
      WHEN COUNT(*) > 100 THEN 'high'
      WHEN COUNT(*) > 50 THEN 'medium'
      ELSE 'low'
    END::TEXT
  FROM medley_edits me
  WHERE me.created_at > NOW() - (lookback_hours || ' hours')::INTERVAL
    AND me.ip_address IS NOT NULL
  GROUP BY me.editor_nickname, me.ip_address
  HAVING COUNT(*) > 20;

  -- Multiple IPs for same nickname
  RETURN QUERY
  SELECT
    me.editor_nickname,
    'multiple_ips'::TEXT,
    format('%s different IPs used in %s hours', COUNT(DISTINCT me.ip_address), lookback_hours),
    COUNT(DISTINCT me.ip_address),
    CASE
      WHEN COUNT(DISTINCT me.ip_address) > 5 THEN 'high'
      WHEN COUNT(DISTINCT me.ip_address) > 3 THEN 'medium'
      ELSE 'low'
    END::TEXT
  FROM medley_edits me
  WHERE me.created_at > NOW() - (lookback_hours || ' hours')::INTERVAL
    AND me.ip_address IS NOT NULL
  GROUP BY me.editor_nickname
  HAVING COUNT(DISTINCT me.ip_address) > 2;

  -- Many deletions in short time
  RETURN QUERY
  SELECT
    me.editor_nickname,
    'high_deletion_rate'::TEXT,
    format('%s deletions in %s hours', COUNT(*), lookback_hours),
    COUNT(*),
    CASE
      WHEN COUNT(*) > 20 THEN 'high'
      WHEN COUNT(*) > 10 THEN 'medium'
      ELSE 'low'
    END::TEXT
  FROM medley_edits me
  WHERE me.created_at > NOW() - (lookback_hours || ' hours')::INTERVAL
    AND me.action IN ('delete', 'song_delete', 'soft_delete_medley', 'soft_delete_song')
  GROUP BY me.editor_nickname
  HAVING COUNT(*) > 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_suspicious_activity(INT) IS 'Detect potentially suspicious editing patterns in recent history';

-- ========================================
-- Step 7: Create utility functions for forensics
-- ========================================

-- Function to get full edit history for a specific session
CREATE OR REPLACE FUNCTION get_session_history(p_session_id TEXT)
RETURNS TABLE (
  edit_id UUID,
  medley_id UUID,
  medley_title TEXT,
  action TEXT,
  change_summary TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.medley_id,
    m.title,
    me.action,
    me.change_summary,
    me.created_at
  FROM medley_edits me
  LEFT JOIN medleys m ON me.medley_id = m.id
  WHERE me.session_id = p_session_id
  ORDER BY me.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_session_history(TEXT) IS 'Get all edits from a specific session';

-- Function to compare edits from different IPs for same nickname
CREATE OR REPLACE FUNCTION get_nickname_ip_comparison(p_nickname TEXT)
RETURNS TABLE (
  ip_address INET,
  edit_count BIGINT,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  actions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.ip_address,
    COUNT(*),
    MIN(me.created_at),
    MAX(me.created_at),
    array_agg(DISTINCT me.action)
  FROM medley_edits me
  WHERE me.editor_nickname = p_nickname
    AND me.ip_address IS NOT NULL
  GROUP BY me.ip_address
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_nickname_ip_comparison(TEXT) IS 'Compare editing patterns from different IPs for same nickname';

-- ========================================
-- Migration Complete
-- ========================================
-- Enhanced audit logging system is now ready.
--
-- New capabilities:
-- - IP address tracking for all edits
-- - User agent tracking for device/browser identification
-- - Session tracking for grouping related edits
-- - Automatic change summaries
-- - Suspicious activity detection
-- - Forensic analysis functions
--
-- Next steps:
-- 1. Update API to pass ip_address, user_agent, session_id to record_edit_with_metadata()
-- 2. Set up monitoring dashboard using suspicious_edits view
-- 3. Schedule detect_suspicious_activity() to run hourly
-- 4. Review ip_activity_summary weekly for unusual patterns
