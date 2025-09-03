-- Setup admin user for approved_users system
-- IMPORTANT: Replace YOUR_ADMIN_USER_ID with your actual admin user ID before running
-- 
-- Steps to get your admin user ID:
-- 1. Login to your app with Google OAuth
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Find your user and copy the UUID
-- 4. Replace YOUR_ADMIN_USER_ID below with the actual UUID
--
-- Example: 12345678-1234-1234-1234-123456789012

-- First, update the RLS policy to use the actual admin user ID
DROP POLICY IF EXISTS "Admin can manage approvals" ON approved_users;
CREATE POLICY "Admin can manage approvals" ON approved_users
    FOR ALL USING (auth.uid()::text = 'YOUR_ADMIN_USER_ID');

-- Insert the admin user into approved_users table
-- This gives the admin user approval permissions
INSERT INTO approved_users (user_id, approved_by, notes)
VALUES 
    ('YOUR_ADMIN_USER_ID'::uuid, 'YOUR_ADMIN_USER_ID'::uuid, 'Initial admin user - auto-approved')
ON CONFLICT (user_id) DO NOTHING;

-- Verify the admin user is set up correctly
-- Run this query to confirm your admin user is approved:
-- SELECT * FROM approved_users WHERE user_id = 'YOUR_ADMIN_USER_ID';