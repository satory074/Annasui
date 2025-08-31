-- Add proper song data for Rick Astley medley
-- The Rick Astley "Never Gonna Give You Up" should have one song entry

-- First, find the medley ID for Rick Astley
DO $$
DECLARE
    rick_medley_id INTEGER;
BEGIN
    -- Get the medley ID
    SELECT id INTO rick_medley_id 
    FROM medleys 
    WHERE title = 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)'
    AND video_id = 'dQw4w9WgXcQ'
    LIMIT 1;
    
    -- If the medley exists but has no songs, add the song
    IF rick_medley_id IS NOT NULL THEN
        -- Check if song already exists
        IF NOT EXISTS (SELECT 1 FROM songs WHERE medley_id = rick_medley_id) THEN
            -- Insert the song data
            INSERT INTO songs (
                medley_id,
                title,
                artist,
                start_time,
                end_time,
                order_index,
                original_link,
                links,
                created_at,
                updated_at
            ) VALUES (
                rick_medley_id,
                'Never Gonna Give You Up',
                'Rick Astley',
                0,
                213, -- 3:33 in seconds
                1,
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                '{"youtube": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Added song data for Rick Astley medley (ID: %)', rick_medley_id;
        ELSE
            RAISE NOTICE 'Rick Astley medley (ID: %) already has song data', rick_medley_id;
        END IF;
    ELSE
        RAISE NOTICE 'Rick Astley medley not found';
    END IF;
END $$;