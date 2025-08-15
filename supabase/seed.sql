-- Seed data for development/testing
-- This file contains the migration from static data to database

-- Insert sample medleys from the existing data
INSERT INTO public.medleys (video_id, title, creator, duration) VALUES
('sm500873', '組曲『ニコニコ動画』', 'しも', 1062),
('sm38343669', 'ボカロメドレー2025', 'メドレー製作者', 600),
('sm37796813', 'J-POPメドレー2025', 'J-POPメドレー制作委員会', 480)
ON CONFLICT (video_id) DO NOTHING;

-- Insert songs for sm500873 (組曲『ニコニコ動画』)
WITH medley AS (SELECT id FROM public.medleys WHERE video_id = 'sm500873')
INSERT INTO public.songs (medley_id, title, artist, start_time, end_time, color, genre, original_link, order_index) 
SELECT 
    medley.id,
    song_data.title,
    song_data.artist,
    song_data.start_time,
    song_data.end_time,
    song_data.color,
    song_data.genre,
    song_data.original_link,
    song_data.order_index
FROM medley,
(VALUES
    ('Ievan Polkka', '初音ミク', 0, 30, 'bg-cyan-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm982882', 1),
    ('魔理沙は大変なものを盗んでいきました', 'ARM+夕野ヨシミ feat. 焼飯', 30, 80, 'bg-yellow-400', '東方', 'https://www.nicovideo.jp/watch/sm62856', 2),
    ('患部で止まってすぐ溶ける〜狂気の優曇華院', 'ARM', 80, 130, 'bg-purple-400', '東方', 'https://www.nicovideo.jp/watch/sm166406', 3),
    ('最終鬼畜妹フランドール・S', 'ビートまりお', 130, 190, 'bg-red-400', '東方', 'https://www.nicovideo.jp/watch/sm24806', 4),
    ('エージェント夜を往く', '中島らも', 190, 240, 'bg-blue-400', 'その他', NULL, 5),
    ('カラフル', '島谷ひとみ', 240, 290, 'bg-green-400', 'J-POP', NULL, 6),
    ('you', 'Shinji Orito', 290, 340, 'bg-orange-400', 'ゲーム音楽', NULL, 7),
    ('ドナルド教', 'ドナルド・マクドナルド', 340, 390, 'bg-yellow-500', 'MAD', NULL, 8),
    ('創聖のアクエリオン', 'AKINO', 390, 450, 'bg-pink-400', 'アニソン', NULL, 9),
    ('森のキノコにご用心', '中川翔子', 450, 510, 'bg-green-500', 'その他', NULL, 10),
    ('メルト', 'ryo', 510, 580, 'bg-cyan-500', 'ボカロ', 'https://www.nicovideo.jp/watch/sm1715919', 11),
    ('ハレ晴レユカイ', '平野綾, 茅原実里, 後藤邑子', 580, 640, 'bg-yellow-300', 'アニソン', NULL, 12),
    ('God knows...', '平野綾', 640, 720, 'bg-purple-500', 'アニソン', NULL, 13),
    ('思い出は億千万', '檜山修之', 720, 780, 'bg-red-300', 'アニソン', NULL, 14),
    ('愛をとりもどせ!!', 'クリスタルキング', 780, 840, 'bg-orange-300', 'アニソン', NULL, 15),
    ('ガンダム (翔べ!ガンダム)', '池田鴻', 840, 900, 'bg-blue-300', 'アニソン', NULL, 16),
    ('エヴァンゲリオン', '高橋洋子', 900, 960, 'bg-purple-300', 'アニソン', NULL, 17),
    ('True My Heart', 'ave;new feat. 佐倉紗織', 960, 1020, 'bg-pink-300', 'ゲーム音楽', NULL, 18),
    ('Ievan Polkka (エンディング)', '初音ミク', 1020, 1062, 'bg-cyan-300', 'ボカロ', 'https://www.nicovideo.jp/watch/sm982882', 19)
) AS song_data(title, artist, start_time, end_time, color, genre, original_link, order_index);

-- Insert songs for sm38343669 (ボカロメドレー2025)
WITH medley AS (SELECT id FROM public.medleys WHERE video_id = 'sm38343669')
INSERT INTO public.songs (medley_id, title, artist, start_time, end_time, color, genre, original_link, order_index) 
SELECT 
    medley.id,
    song_data.title,
    song_data.artist,
    song_data.start_time,
    song_data.end_time,
    song_data.color,
    song_data.genre,
    song_data.original_link,
    song_data.order_index
FROM medley,
(VALUES
    ('千本桜', '黒うさP', 0, 90, 'bg-red-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm13274270', 1),
    ('マトリョシカ', 'ハチ', 90, 175, 'bg-blue-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm11809611', 2),
    ('メルト', 'ryo', 175, 265, 'bg-yellow-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm1715919', 3),
    ('ワールドイズマイン', 'ryo', 265, 350, 'bg-green-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm3504435', 4),
    ('砂の惑星', 'ハチ', 350, 440, 'bg-orange-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm31606995', 5),
    ('ローリンガール', 'wowaka', 440, 530, 'bg-purple-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm9714351', 6),
    ('それがあなたの幸せとしても', 'heavenz', 530, 600, 'bg-pink-400', 'ボカロ', 'https://www.nicovideo.jp/watch/sm13636066', 7)
) AS song_data(title, artist, start_time, end_time, color, genre, original_link, order_index);

-- Insert songs for sm37796813 (J-POPメドレー2025)
WITH medley AS (SELECT id FROM public.medleys WHERE video_id = 'sm37796813')
INSERT INTO public.songs (medley_id, title, artist, start_time, end_time, color, genre, original_link, order_index) 
SELECT 
    medley.id,
    song_data.title,
    song_data.artist,
    song_data.start_time,
    song_data.end_time,
    song_data.color,
    song_data.genre,
    song_data.original_link,
    song_data.order_index
FROM medley,
(VALUES
    ('Lemon', '米津玄師', 0, 75, 'bg-yellow-400', 'J-POP', 'https://www.youtube.com/watch?v=SX_ViT4Ra7k', 1),
    ('紅蓮華', 'LiSA', 75, 150, 'bg-red-400', 'J-POP', 'https://www.youtube.com/watch?v=CwkzK-F0Y00', 2),
    ('マリーゴールド', 'あいみょん', 150, 240, 'bg-orange-400', 'J-POP', 'https://www.youtube.com/watch?v=0xSiBpUdW4E', 3),
    ('Pretender', 'Official髭男dism', 240, 330, 'bg-blue-400', 'J-POP', 'https://www.youtube.com/watch?v=TQ8WlA2GXbk', 4),
    ('夜に駆ける', 'YOASOBI', 330, 420, 'bg-purple-400', 'J-POP', 'https://www.youtube.com/watch?v=x8VYWazR5mE', 5),
    ('残酷な天使のテーゼ', '高橋洋子', 420, 480, 'bg-green-400', 'アニソン', 'https://www.youtube.com/watch?v=o6wtDPVkKqI', 6)
) AS song_data(title, artist, start_time, end_time, color, genre, original_link, order_index);