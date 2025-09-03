-- Ensure medley_contributors view is created properly
-- This migration ensures the contributors functionality works correctly

-- First, check if medley_edits table exists and create if needed
-- (This should already exist from 006_create_medley_edit_history.sql, but defensive programming)
CREATE TABLE IF NOT EXISTS medley_edits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medley_id uuid NOT NULL REFERENCES medleys(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    edit_type text NOT NULL CHECK (edit_type IN ('create', 'update_medley', 'add_song', 'update_song', 'delete_song', 'reorder_songs')),
    edit_description text,
    song_id integer,
    changes jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS medley_edits_medley_id_idx ON medley_edits(medley_id);
CREATE INDEX IF NOT EXISTS medley_edits_user_id_idx ON medley_edits(user_id);
CREATE INDEX IF NOT EXISTS medley_edits_created_at_idx ON medley_edits(created_at DESC);
CREATE INDEX IF NOT EXISTS medley_edits_medley_user_idx ON medley_edits(medley_id, user_id);

-- Enable Row Level Security
ALTER TABLE medley_edits ENABLE ROW LEVEL SECURITY;

-- Create/update RLS policies for medley_edits
DROP POLICY IF EXISTS "Anyone can view medley edits" ON medley_edits;
CREATE POLICY "Anyone can view medley edits" ON medley_edits
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only approved users can insert medley edits" ON medley_edits;
CREATE POLICY "Only approved users can insert medley edits" ON medley_edits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM approved_users 
            WHERE approved_users.user_id = auth.uid()
        )
    );

-- Recreate the medley_contributors view to ensure it exists
DROP VIEW IF EXISTS medley_contributors;
CREATE VIEW medley_contributors AS
SELECT 
    me.medley_id,
    me.user_id,
    u.name,
    u.email,
    u.avatar_url,
    COUNT(*) as edit_count,
    MIN(me.created_at) as first_contribution,
    MAX(me.created_at) as last_contribution,
    -- Check if this user is the original creator
    (me.user_id = m.user_id) as is_creator
FROM medley_edits me
LEFT JOIN users u ON me.user_id = u.id
LEFT JOIN medleys m ON me.medley_id = m.id
GROUP BY me.medley_id, me.user_id, u.name, u.email, u.avatar_url, m.user_id
ORDER BY is_creator DESC, edit_count DESC, first_contribution ASC;

-- Create medley_stats view (useful for analytics)
DROP VIEW IF EXISTS medley_stats;
CREATE VIEW medley_stats AS
SELECT 
    m.id as medley_id,
    m.video_id,
    m.title,
    COUNT(DISTINCT me.user_id) as contributor_count,
    COUNT(me.id) as total_edits,
    MIN(me.created_at) as first_edit,
    MAX(me.created_at) as last_edit,
    -- Original creator info
    creator.name as creator_name,
    creator.avatar_url as creator_avatar
FROM medleys m
LEFT JOIN medley_edits me ON m.id = me.medley_id
LEFT JOIN users creator ON m.user_id = creator.id
GROUP BY m.id, m.video_id, m.title, creator.name, creator.avatar_url;

-- Insert initial edit records for existing medleys if they don't have any
INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description, created_at)
SELECT 
    id as medley_id,
    user_id,
    'create',
    'Migrated: Created medley ' || title,
    COALESCE(created_at, now()) as created_at
FROM medleys
WHERE NOT EXISTS (
    SELECT 1 FROM medley_edits 
    WHERE medley_edits.medley_id = medleys.id 
    AND medley_edits.edit_type = 'create'
);

-- Verify the view works by testing a simple query
-- This will help identify any issues during migration
DO $$
DECLARE
    view_count integer;
BEGIN
    -- Test the view exists and can be queried
    SELECT COUNT(*) INTO view_count FROM medley_contributors LIMIT 1;
    RAISE NOTICE 'medley_contributors view created successfully - test query returned % rows', view_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'medley_contributors view may have issues: %', SQLERRM;
END
$$;