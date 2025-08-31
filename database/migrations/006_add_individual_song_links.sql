-- Add individual song links for thumbnail testing
-- This migration adds Niconico and YouTube links for specific songs to test individual thumbnail functionality

-- Update 千本桜 (Senbonzakura) with individual platform links
UPDATE songs 
SET links = '{"niconico": "https://www.nicovideo.jp/watch/sm15630734", "youtube": "https://www.youtube.com/watch?v=K_xTet06SUo"}'
WHERE title = '千本桜' 
  AND artist = '黒うさP feat. 初音ミク'
  AND medley_id IN (
    SELECT id FROM medleys WHERE video_id = 'sm38343669' AND title = 'ボカロメドレー2025'
  );

-- Update マトリョシカ (Matryoshka) with individual platform links  
UPDATE songs
SET links = '{"niconico": "https://www.nicovideo.jp/watch/sm11809611", "youtube": "https://www.youtube.com/watch?v=HOz-9FzIDf0"}'
WHERE title = 'マトリョシカ'
  AND artist = 'ハチ feat. 初音ミク・GUMI'
  AND medley_id IN (
    SELECT id FROM medleys WHERE video_id = 'sm38343669' AND title = 'ボカロメドレー2025'
  );

-- Verify the updates
SELECT 
  m.title as medley_title,
  s.title as song_title, 
  s.artist,
  s.links,
  s.original_link
FROM songs s
JOIN medleys m ON s.medley_id = m.id
WHERE s.links IS NOT NULL 
  AND s.links != ''
  AND m.video_id = 'sm38343669'
ORDER BY s.order_index;