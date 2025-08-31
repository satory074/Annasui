-- Create medley_edits table to track all changes to medleys
CREATE TABLE IF NOT EXISTS medley_edits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medley_id uuid NOT NULL REFERENCES medleys(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    edit_type text NOT NULL CHECK (edit_type IN ('create', 'update_medley', 'add_song', 'update_song', 'delete_song', 'reorder_songs')),
    edit_description text,
    song_id integer, -- For song-specific edits (references songs.order_index)
    changes jsonb, -- Store the specific changes made (before/after values)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS medley_edits_medley_id_idx ON medley_edits(medley_id);
CREATE INDEX IF NOT EXISTS medley_edits_user_id_idx ON medley_edits(user_id);
CREATE INDEX IF NOT EXISTS medley_edits_created_at_idx ON medley_edits(created_at DESC);
CREATE INDEX IF NOT EXISTS medley_edits_medley_user_idx ON medley_edits(medley_id, user_id);

-- Enable Row Level Security
ALTER TABLE medley_edits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view medley edits" ON medley_edits
    FOR SELECT USING (true);

CREATE POLICY "Only approved users can insert medley edits" ON medley_edits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM approved_users 
            WHERE approved_users.user_id = auth.uid()
        )
    );

-- Create view for medley contributors
CREATE OR REPLACE VIEW medley_contributors AS
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

-- Create view for medley statistics
CREATE OR REPLACE VIEW medley_stats AS
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

-- Create function to automatically log medley creation
CREATE OR REPLACE FUNCTION log_medley_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description)
    VALUES (
        NEW.id,
        NEW.user_id,
        'create',
        'Created medley: ' || NEW.title
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for medley creation logging
DROP TRIGGER IF EXISTS log_medley_creation_trigger ON medleys;
CREATE TRIGGER log_medley_creation_trigger
    AFTER INSERT ON medleys
    FOR EACH ROW
    EXECUTE FUNCTION log_medley_creation();

-- Create function to automatically log song changes
CREATE OR REPLACE FUNCTION log_song_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    edit_desc text;
    changes_json jsonb;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Skip if no user (shouldn't happen with RLS, but defensive programming)
    IF current_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        edit_desc := 'Added song: ' || NEW.title || ' by ' || COALESCE(NEW.artist, 'Unknown Artist');
        changes_json := jsonb_build_object('new', row_to_json(NEW));
        
        INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description, song_id, changes)
        VALUES (NEW.medley_id, current_user_id, 'add_song', edit_desc, NEW.order_index, changes_json);
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        edit_desc := 'Updated song: ' || NEW.title || ' by ' || COALESCE(NEW.artist, 'Unknown Artist');
        changes_json := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
        
        INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description, song_id, changes)
        VALUES (NEW.medley_id, current_user_id, 'update_song', edit_desc, NEW.order_index, changes_json);
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        edit_desc := 'Deleted song: ' || OLD.title || ' by ' || COALESCE(OLD.artist, 'Unknown Artist');
        changes_json := jsonb_build_object('deleted', row_to_json(OLD));
        
        INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description, song_id, changes)
        VALUES (OLD.medley_id, current_user_id, 'delete_song', edit_desc, OLD.order_index, changes_json);
        
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for song changes logging
DROP TRIGGER IF EXISTS log_song_changes_trigger ON songs;
CREATE TRIGGER log_song_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION log_song_changes();

-- Create function to log medley metadata updates
CREATE OR REPLACE FUNCTION log_medley_updates()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    edit_desc text;
    changes_json jsonb;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Skip if no user
    IF current_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Only log if meaningful fields changed
    IF OLD.title != NEW.title OR OLD.creator != NEW.creator OR OLD.duration != NEW.duration THEN
        edit_desc := 'Updated medley metadata';
        changes_json := jsonb_build_object(
            'old', jsonb_build_object('title', OLD.title, 'creator', OLD.creator, 'duration', OLD.duration),
            'new', jsonb_build_object('title', NEW.title, 'creator', NEW.creator, 'duration', NEW.duration)
        );
        
        INSERT INTO medley_edits (medley_id, user_id, edit_type, edit_description, changes)
        VALUES (NEW.id, current_user_id, 'update_medley', edit_desc, changes_json);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for medley metadata updates
DROP TRIGGER IF EXISTS log_medley_updates_trigger ON medleys;
CREATE TRIGGER log_medley_updates_trigger
    AFTER UPDATE ON medleys
    FOR EACH ROW
    EXECUTE FUNCTION log_medley_updates();

-- Insert initial edit records for existing medleys (run once during migration)
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