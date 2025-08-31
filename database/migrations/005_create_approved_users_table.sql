-- Create approved_users table to manage user authorization
CREATE TABLE IF NOT EXISTS approved_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_approved_users_updated_at 
    BEFORE UPDATE ON approved_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE approved_users ENABLE ROW LEVEL SECURITY;

-- Create policies for approved_users table
-- Only authenticated users can view their own approval status
CREATE POLICY "Users can view their own approval status" ON approved_users
    FOR SELECT USING (auth.uid() = user_id);

-- Only admin users can insert/update/delete approval records
-- Note: You'll need to replace 'ADMIN_USER_ID' with your actual admin user ID
-- Get your user ID by running: SELECT id FROM auth.users WHERE email = 'your@email.com';
CREATE POLICY "Admin can manage approvals" ON approved_users
    FOR ALL USING (auth.uid()::text = 'REPLACE_WITH_ADMIN_USER_ID');

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.approved_users 
        WHERE approved_users.user_id = is_user_approved.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for medleys table to require approval
DROP POLICY IF EXISTS "Users can insert their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can update their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can delete their own medleys" ON medleys;

-- New policies that require user approval
CREATE POLICY "Approved users can insert medleys" ON medleys
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        public.is_user_approved(auth.uid())
    );

CREATE POLICY "Approved users can update their own medleys" ON medleys
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        public.is_user_approved(auth.uid())
    );

CREATE POLICY "Approved users can delete their own medleys" ON medleys
    FOR DELETE USING (
        auth.uid() = user_id AND 
        public.is_user_approved(auth.uid())
    );

-- Update RLS policies for songs table to require approval
DROP POLICY IF EXISTS "Users can manage songs for their medleys" ON songs;

-- New policy that requires user approval for song management
CREATE POLICY "Approved users can manage songs for their medleys" ON songs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM medleys 
            WHERE medleys.id = songs.medley_id 
            AND medleys.user_id = auth.uid()
            AND public.is_user_approved(auth.uid())
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM medleys 
            WHERE medleys.id = songs.medley_id 
            AND medleys.user_id = auth.uid()
            AND public.is_user_approved(auth.uid())
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS approved_users_user_id_idx ON approved_users(user_id);
CREATE INDEX IF NOT EXISTS approved_users_approved_by_idx ON approved_users(approved_by);
CREATE INDEX IF NOT EXISTS approved_users_approved_at_idx ON approved_users(approved_at);

-- Insert initial admin user (replace with your actual user ID)
-- IMPORTANT: Update this query with your actual admin user ID before running
-- You can get your user ID from the Supabase auth dashboard or by running:
-- SELECT id FROM auth.users WHERE email = 'your@email.com';
-- 
-- Example (REPLACE THIS):
-- INSERT INTO approved_users (user_id, approved_by, notes) 
-- VALUES ('YOUR_ADMIN_USER_ID', 'YOUR_ADMIN_USER_ID', 'Initial admin user');