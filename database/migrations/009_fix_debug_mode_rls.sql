-- Fix RLS policies to allow debug mode operations with user_id = NULL
-- This migration adds RLS policies for songs table to support anonymous/debug medleys

-- Add RLS policies for songs table
-- First, enable RLS on songs table if not already enabled
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view songs" ON songs;
DROP POLICY IF EXISTS "Users can manage songs in their medleys" ON songs;
DROP POLICY IF EXISTS "Manage songs in owned or anonymous medleys" ON songs;
DROP POLICY IF EXISTS "Insert songs in owned or anonymous medleys" ON songs;
DROP POLICY IF EXISTS "Update songs in owned or anonymous medleys" ON songs;
DROP POLICY IF EXISTS "Delete songs in owned or anonymous medleys" ON songs;

-- Create SELECT policy (anyone can view)
CREATE POLICY "Anyone can view songs" ON songs
    FOR SELECT USING (true);

-- Create INSERT policy (owned or anonymous medleys)
CREATE POLICY "Insert songs in owned or anonymous medleys" ON songs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM medleys
            WHERE medleys.id = songs.medley_id
            AND (medleys.user_id = auth.uid() OR medleys.user_id IS NULL)
        )
    );

-- Create UPDATE policy (owned or anonymous medleys)
CREATE POLICY "Update songs in owned or anonymous medleys" ON songs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM medleys
            WHERE medleys.id = songs.medley_id
            AND (medleys.user_id = auth.uid() OR medleys.user_id IS NULL)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM medleys
            WHERE medleys.id = songs.medley_id
            AND (medleys.user_id = auth.uid() OR medleys.user_id IS NULL)
        )
    );

-- Create DELETE policy (owned or anonymous medleys)
CREATE POLICY "Delete songs in owned or anonymous medleys" ON songs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM medleys
            WHERE medleys.id = songs.medley_id
            AND (medleys.user_id = auth.uid() OR medleys.user_id IS NULL)
        )
    );

-- Update existing medley (sm2959233) to use NULL for debug mode
UPDATE medleys
SET user_id = NULL
WHERE video_id = 'sm2959233';
