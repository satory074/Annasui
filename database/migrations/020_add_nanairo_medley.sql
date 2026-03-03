-- ========================================
-- Migration 020: Add Nanairo no Nico Nico Douga Medley
-- ========================================
-- 七色のニコニコ動画 (sm7233711) の楽曲データを一括登録
-- Total: 74 songs including Time Signal x2
--
-- Source: https://niconicomedley.fandom.com/wiki/Nanairo_no_Nico_Nico_Douga
-- Composer: しも (simoyuki)
-- Release Date: June 3rd, 2009

-- ========================================
-- Step 1: Create the medley
-- ========================================
INSERT INTO medleys (video_id, platform, title, creator, duration, last_editor)
VALUES ('sm7233711', 'niconico', '七色のニコニコ動画', 'しも', 700, 'system')
ON CONFLICT (video_id) DO UPDATE SET
  title = EXCLUDED.title,
  creator = EXCLUDED.creator,
  duration = EXCLUDED.duration;

-- ========================================
-- Step 2: Delete existing songs (for re-run safety)
-- ========================================
DELETE FROM medley_songs
WHERE medley_id = (SELECT id FROM medleys WHERE video_id = 'sm7233711');

-- ========================================
-- Step 3: Insert songs into medley_songs
-- ========================================
-- Note: Using direct insert without song_master linking for simplicity
-- artist field contains the source/composer information

WITH medley AS (
  SELECT id FROM medleys WHERE video_id = 'sm7233711'
)
INSERT INTO medley_songs (medley_id, start_time, end_time, order_index, title, artist, color, last_editor)
SELECT
  medley.id,
  v.start_time,
  v.end_time,
  v.order_index,
  v.title,
  v.artist,
  v.color,
  'system'
FROM medley, (VALUES
  -- Main section (00:18 - 09:43)
  (18, 38, 1, 'Black★Rock Shooter', 'ryo (supercell)', '#3B82F6'),
  (38, 60, 2, 'Heavenly Star', 'Genki Rockets', '#8B5CF6'),
  (60, 82, 3, 'Do-Dai', 'THE iDOLM@STER', '#EC4899'),
  (82, 92, 4, 'みwなwぎwっwてwきwたwww', 'ShimashimaP', '#F59E0B'),
  (82, 92, 5, 'Under My Skin', 'Paffendorf', '#6366F1'),
  (92, 102, 6, 'Night of Nights', 'beatMARIO', '#EF4444'),
  (92, 102, 7, 'Dancing☆Samurai', 'mathru@KanimisoP', '#10B981'),
  (102, 113, 8, 'Stage: Comical (Sand Canyon)', 'Kirby''s Dream Land 3', '#F472B6'),
  (113, 123, 9, 'Candy Mountain (Skyhigh)', 'Kirby Super Star', '#FBBF24'),
  (113, 123, 10, 'Planet Popstar', 'Kirby 64', '#34D399'),
  (123, 133, 11, 'Got The Groove', 'SM-Trax', '#A78BFA'),
  (133, 144, 12, 'Septette for a Dead Princess', 'Touhou Koumakyou', '#F87171'),
  (144, 155, 13, 'Bad Apple!! feat. nomico', 'Alstroemeria Records', '#60A5FA'),
  (155, 165, 14, 'Ora Tokyo sa Iguda', 'Ikuzo Yoshi', '#4ADE80'),
  (165, 186, 15, 'RAINBOW GIRL', 'Tonasa', '#FB923C'),
  (186, 208, 16, 'Starry Sky', 'capsule', '#C084FC'),
  (208, 229, 17, 'Hello Windows', 'Hige Driver', '#2DD4BF'),
  (229, 240, 18, 'Saikyou Pare Parade', 'The Melancholy of Haruhi Suzumiya', '#FCA5A5'),
  (240, 254, 19, 'Sora', 'THE IDOLM@STER', '#93C5FD'),
  (254, 275, 20, 'celluloid', 'baker', '#86EFAC'),
  (275, 289, 21, 'Hatsune Miku no Shoushitsu', 'cosMo@BousouP', '#FCD34D'),
  (289, 295, 22, 'Time Signal', 'Niconico', '#9CA3AF'),
  (295, 318, 23, 'Lion', 'Macross Frontier', '#F472B6'),
  (318, 351, 24, 'Seikan Hikou', 'Macross Frontier', '#A5B4FC'),
  (351, 371, 25, 'Nihon no Mikata', 'Yazima Beauty Salon', '#6EE7B7'),
  (371, 382, 26, 'promise', 'Kohmi Hirose', '#FCA5A5'),
  (382, 395, 27, 'Tamashii no Refrain', 'Neon Genesis Evangelion', '#818CF8'),
  (395, 405, 28, 'World is Mine', 'ryo (supercell)', '#34D399'),
  (405, 438, 29, 'Tomboyish Girl in Love', 'Touhou Koumakyou', '#F87171'),
  (438, 444, 30, 'Town (Tettettee)', 'THE iDOLM@STER', '#FBBF24'),
  (444, 449, 31, 'PoPiPo', 'LamazeP', '#4ADE80'),
  (449, 459, 32, 'Mizonokuchi Taiyou Zoku', 'Tentai Senshi Sunred', '#FB7185'),
  (459, 466, 33, 'Gake no Ue no Ponyo', 'Ponyo', '#60A5FA'),
  (466, 468, 34, 'Hakata no Shio', 'Hakata no Shio', '#A78BFA'),
  (468, 479, 35, 'smooooch・∀・', 'beatmania IIDX', '#F59E0B'),
  (479, 489, 36, 'Double Lariat', 'AgoanikiP', '#10B981'),
  (489, 509, 37, 'Tewi! ~Eien Tewi Ver~', 'Sekkenya', '#EC4899'),
  (509, 519, 38, 'Meltdown', 'iroha (sasaki)', '#6366F1'),
  (519, 529, 39, 'Ojamajo Carnival!!', 'Ojamajo Doremi', '#F472B6'),
  (529, 537, 40, 'Aoku Moeru Honoo', 'Musical Prince of Tennis', '#3B82F6'),
  (537, 542, 41, 'The Regulars', 'Musical Prince of Tennis', '#8B5CF6'),
  (542, 552, 42, 'Hammer Melody', 'Donkey Kong', '#EF4444'),
  (552, 583, 43, 'RED ZONE', 'beatmania IIDX', '#DC2626'),

  -- HEROES section (09:43 - 10:27)
  (583, 588, 44, 'Konayuki', '1 Litre no Namida', '#FBBF24'),
  (583, 588, 45, 'ENDLESS RAIN', 'X JAPAN', '#A78BFA'),
  (588, 591, 46, 'Uninstall', 'Bokurano', '#4ADE80'),
  (588, 591, 47, 'true my heart', 'Nursery Rhyme', '#F472B6'),
  (591, 593, 48, 'Let''s Go! Onmyouji', 'Shin Gouketsuji Ichizoku', '#60A5FA'),
  (593, 595, 49, 'Marisa wa Taihen na Mono wo Nusunde Ikimashita', 'ARM (IOSYS)', '#F87171'),
  (593, 595, 50, 'Futari no Mojipittan', 'Mojipittan', '#34D399'),
  (595, 598, 51, 'SKILL', '2nd Super Robot Wars Alpha', '#6366F1'),
  (595, 598, 52, 'Dr. Wily Stage 1', 'Mega Man 2', '#EC4899'),
  (598, 601, 53, 'Tsurupettan', 'NYO (Silver Forest)', '#FB923C'),
  (598, 601, 54, 'Hare Hare Yukai', 'The Melancholy of Haruhi Suzumiya', '#FCA5A5'),
  (598, 601, 55, 'Gacha Gacha Cute - Figu@mate', 'Figu@mate', '#93C5FD'),
  (601, 603, 56, 'Agent Yoru wo Yuku', 'THE iDOLM@STER', '#86EFAC'),
  (603, 606, 57, 'Aitsu Koso ga Tennis no Oujisama', 'Musical Prince of Tennis', '#C084FC'),
  (606, 608, 58, 'you', 'Higurashi When They Cry', '#818CF8'),
  (606, 608, 59, 'Motteke! Sailor Fuku', 'Lucky Star', '#F472B6'),
  (608, 611, 60, 'Help me, ERINNNNNN!!', 'beatMARIO (COOL&CREATE)', '#EF4444'),
  (611, 613, 61, 'GO MY WAY!!', 'THE iDOLM@STER', '#10B981'),
  (611, 613, 62, 'Air Man ga Taosenai', 'Team.Nekokan', '#3B82F6'),
  (613, 616, 63, 'Melt', 'ryo', '#F59E0B'),
  (613, 616, 64, 'Little Busters!', 'Little Busters!', '#6EE7B7'),
  (616, 621, 65, 'God knows...', 'The Melancholy of Haruhi Suzumiya', '#8B5CF6'),
  (616, 621, 66, 'Cheetahmen Theme', 'Cheetahmen II', '#A78BFA'),
  (616, 621, 67, 'Sousei no Aquarion', 'Genesis of Aquarion', '#2DD4BF'),
  (621, 627, 68, 'Miku Miku ni Shite Ageru♪', 'ika', '#34D399'),
  (621, 627, 69, 'Caramelldansen', 'Caramell', '#FB7185'),
  (621, 627, 70, 'U.N. Owen Was Her?', 'Touhou Koumakyou', '#DC2626'),
  (621, 627, 71, 'Makka na Chikai', 'Buso Renkin', '#F87171'),

  -- Ending section (10:27 - 11:15+)
  (627, 647, 72, 'Don''t say "lazy"', 'K-ON!', '#EC4899'),
  (647, 675, 73, 'Time Signal', 'Niconico', '#9CA3AF'),
  (675, 700, 74, 'Reach Out To The Truth', 'Persona 4', '#6366F1')
) AS v(start_time, end_time, order_index, title, artist, color);

-- ========================================
-- Step 4: Verify insertion
-- ========================================
-- Run these queries to verify:
-- SELECT COUNT(*) FROM medley_songs WHERE medley_id = (SELECT id FROM medleys WHERE video_id = 'sm7233711');
-- Expected: 74 rows
