-- Add user_id column to medleys table
ALTER TABLE medleys 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS medleys_user_id_idx ON medleys(user_id);

-- Update existing medleys to have a system user (optional - can be done manually)
-- This creates a system user for existing anonymous medleys
DO $$
BEGIN
    -- Only create system user if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'system@anasui.app') THEN
        -- Note: This requires manual insertion in auth.users first
        -- The developer will need to handle this separately
        NULL;
    END IF;
END $$;

-- Enable RLS policies for medleys with user ownership
DROP POLICY IF EXISTS "Users can view all medleys" ON medleys;
DROP POLICY IF EXISTS "Users can create their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can update their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can delete their own medleys" ON medleys;

-- Create new RLS policies
CREATE POLICY "Anyone can view medleys" ON medleys
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create medleys" ON medleys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medleys" ON medleys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medleys" ON medleys
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous access to medleys without user_id (legacy support)
CREATE POLICY "Allow access to legacy anonymous medleys" ON medleys
    FOR ALL USING (user_id IS NULL);