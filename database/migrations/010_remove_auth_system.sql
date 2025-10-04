-- ========================================
-- Migration: Remove Google OAuth Authentication System
-- ========================================
-- This migration removes all authentication-related tables, views,
-- functions, triggers, and policies to transition away from Google OAuth.
--
-- WARNING: This is a destructive operation that will delete:
-- - All user data
-- - All approval records
-- - All edit history
-- - All authentication-related policies
--
-- Make sure to backup your database before running this migration!

-- ========================================
-- Step 1: Drop Views
-- ========================================

DROP VIEW IF EXISTS medley_stats CASCADE;
DROP VIEW IF EXISTS medley_contributors CASCADE;

-- ========================================
-- Step 2: Drop Triggers
-- ========================================

DROP TRIGGER IF EXISTS log_medley_updates_trigger ON medleys;
DROP TRIGGER IF EXISTS log_medley_creation_trigger ON medleys;
DROP TRIGGER IF EXISTS log_song_changes_trigger ON songs;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_approved_users_updated_at ON approved_users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- ========================================
-- Step 3: Drop Functions
-- ========================================

DROP FUNCTION IF EXISTS log_medley_updates() CASCADE;
DROP FUNCTION IF EXISTS log_medley_creation() CASCADE;
DROP FUNCTION IF EXISTS log_song_changes() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_approved(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- Step 4: Drop Tables
-- ========================================

DROP TABLE IF EXISTS medley_edits CASCADE;
DROP TABLE IF EXISTS approved_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- Step 5: Remove user_id from medleys table
-- ========================================

-- Drop ALL existing RLS policies (including any already created ones)
DROP POLICY IF EXISTS "Anyone can view medleys" ON medleys;
DROP POLICY IF EXISTS "Anyone can insert medleys" ON medleys;
DROP POLICY IF EXISTS "Anyone can update medleys" ON medleys;
DROP POLICY IF EXISTS "Anyone can delete medleys" ON medleys;
DROP POLICY IF EXISTS "Approved users can insert medleys" ON medleys;
DROP POLICY IF EXISTS "Approved users can update their own medleys" ON medleys;
DROP POLICY IF EXISTS "Approved users can delete their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can insert their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can update their own medleys" ON medleys;
DROP POLICY IF EXISTS "Users can delete their own medleys" ON medleys;
DROP POLICY IF EXISTS "Everyone can view medleys" ON medleys;

-- Remove user_id column from medleys table
ALTER TABLE medleys DROP COLUMN IF EXISTS user_id CASCADE;

-- Create new open access policies for medleys (no authentication required)
CREATE POLICY "Anyone can view medleys" ON medleys
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert medleys" ON medleys
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update medleys" ON medleys
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete medleys" ON medleys
    FOR DELETE USING (true);

-- ========================================
-- Step 6: Update songs table RLS policies
-- ========================================

-- Drop ALL existing RLS policies (including any already created ones)
DROP POLICY IF EXISTS "Anyone can view songs" ON songs;
DROP POLICY IF EXISTS "Anyone can insert songs" ON songs;
DROP POLICY IF EXISTS "Anyone can update songs" ON songs;
DROP POLICY IF EXISTS "Anyone can delete songs" ON songs;
DROP POLICY IF EXISTS "Approved users can manage songs for their medleys" ON songs;
DROP POLICY IF EXISTS "Users can manage songs for their medleys" ON songs;

-- Create new open access policies for songs (no authentication required)
CREATE POLICY "Anyone can view songs" ON songs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert songs" ON songs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update songs" ON songs
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete songs" ON songs
    FOR DELETE USING (true);

-- ========================================
-- Migration Complete
-- ========================================
-- All authentication-related structures have been removed.
-- The system is now open for anonymous access without user authentication.
