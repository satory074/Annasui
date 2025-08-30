-- Fix Rick Astley medley platform issue
-- Change platform from niconico to youtube for Rick Astley medley

-- Update the medley entry to use youtube platform instead of niconico
UPDATE medleys 
SET 
  platform = 'youtube',
  video_id = 'dQw4w9WgXcQ'
WHERE 
  title = 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)'
  AND video_id = 'dQw4w9WgXcQ';

-- Also fix the original_link in songs table if it exists
UPDATE songs 
SET 
  original_link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
WHERE 
  medley_id IN (
    SELECT id FROM medleys 
    WHERE title = 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)'
  );