-- ========================================
-- Migration 023: Add Nico Nico Douga Ryuuseigun Medley
-- ========================================
-- ニコニコ動画流星群 (sm2959233) の楽曲データを一括登録
-- Total: 48 songs + 9 ED repeats = 57 entries
--
-- Source: https://niconicomedley.fandom.com/wiki/Nico_Nico_Douga_Ryuuseigun
-- Composer: しも (simoyuki)
-- Release Date: April 11th, 2008

-- ========================================
-- Step 1: Create the medley
-- ========================================
INSERT INTO medleys (video_id, platform, title, creator, duration, last_editor)
VALUES ('sm2959233', 'niconico', 'ニコニコ動画流星群', 'しも', 840, 'system')
ON CONFLICT (video_id) DO UPDATE SET
  title = EXCLUDED.title,
  creator = EXCLUDED.creator,
  duration = EXCLUDED.duration;

-- ========================================
-- Step 2: Delete existing songs (for re-run safety)
-- ========================================
DELETE FROM medley_songs
WHERE medley_id = (SELECT id FROM medleys WHERE video_id = 'sm2959233');

-- ========================================
-- Step 3: Insert songs into medley_songs
-- ========================================
-- Note: artist field contains actual vocalist/performer names
-- Chaos Mixes (simultaneous songs) have the same start_time/end_time

WITH medley AS (
  SELECT id FROM medleys WHERE video_id = 'sm2959233'
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
  -- Main section (00:00 - 11:52)
  (0, 23, 1, '時報', 'ニコニコ動画', '#9CA3AF'),
  (23, 46, 2, 'STAR RISE', '広橋涼, 豊口めぐみ, 小島幸子, 桑島法子, 佐藤利奈', '#3B82F6'),
  (46, 67, 3, '寝・逃・げでリセット！', '福原香織', '#EC4899'),
  (67, 89, 4, 'ハナマル☆センセイション', '喜多村英梨', '#F59E0B'),
  (67, 89, 5, 'Caramelldansen', 'Caramell', '#A78BFA'),
  (89, 111, 6, '激突！グルメレース', '石川淳', '#FBBF24'),
  (111, 122, 7, 'nowhere', 'FictionJunction YUUKA', '#6366F1'),
  (122, 144, 8, 'チーターマンのテーマ', 'Active Enterprises', '#EF4444'),
  (144, 165, 9, 'Ievan Polkka', 'Loituma', '#10B981'),
  (165, 187, 10, 'バラライカ', '月島きらり starring 久住小春', '#F472B6'),
  (187, 198, 11, '男女', '太郎', '#60A5FA'),
  (198, 208, 12, 'モンタギュー家とキャピュレット家', 'Sergei Prokofiev', '#8B5CF6'),
  (208, 212, 13, 'I''m Lovin'' It', 'Justin Timberlake', '#DC2626'),
  (212, 226, 14, '志々雄真実の組曲', '朝倉紀行', '#F97316'),
  (226, 237, 15, 'クリアまでは眠らない！', 'Team.Nekokan feat. 藤宮ゆき', '#14B8A6'),
  (237, 248, 16, '明日への咆哮', 'JAM Project', '#EF4444'),
  (248, 270, 17, 'エアーマンが倒せない', 'Team.Nekokan feat. recog', '#3B82F6'),
  (270, 286, 18, 'メルト', 'ryo (supercell) feat. 初音ミク', '#06B6D4'),
  (286, 310, 19, 'だんご大家族', '茶太', '#FCD34D'),
  (310, 330, 20, '風の憧憬', '光田康典', '#34D399'),
  (330, 357, 21, '雪、無音、窓辺にて。', '茅原実里', '#A5B4FC'),
  (357, 389, 22, 'you', 'dai feat. 癒月', '#C084FC'),
  (389, 431, 23, '魔理沙は大変なものを盗んでいきました', 'ARM (IOSYS) feat. miko', '#F87171'),
  (431, 452, 24, 'U.N.オーエンは彼女なのか?', 'ZUN', '#EF4444'),
  (452, 464, 25, 'お嫁にしなさいっ！', 'ARM (IOSYS) feat. miko', '#EC4899'),
  (464, 485, 26, 'Dr.ワイリー Stage 1', '立石孝', '#6366F1'),
  (485, 506, 27, 'När ni tar saken i egna händer', 'After Dark', '#9333EA'),
  (485, 506, 28, 'ハレ晴レユカイ', '平野綾, 茅原実里, 後藤邑子', '#FBBF24'),
  (506, 518, 29, 'God knows...', '平野綾', '#F59E0B'),
  (506, 518, 30, 'JOINT', '川田まみ', '#DC2626'),
  (518, 526, 31, '解読不能', 'ジン', '#7C3AED'),
  (518, 526, 32, '人生オワタ＼(^o^)／の大冒険', 'SAKA-ROW組', '#22C55E'),
  (526, 536, 33, 'Perfect Star, Perfect Style', 'Perfume', '#F472B6'),
  (536, 547, 34, '患部で止まってすぐ溶ける', 'ARM (IOSYS) feat. miko', '#10B981'),
  (547, 558, 35, 'Help me, ERINNNNNN!!', 'beatMARIO (COOL&CREATE)', '#EF4444'),
  (547, 558, 36, '千年幻想郷', 'ZUN', '#8B5CF6'),
  (558, 582, 37, 'Little Busters!', 'Rita', '#3B82F6'),
  (582, 601, 38, '1000%SPARKING!', '佐藤利奈, 神田朱未, 野中藍', '#F97316'),
  (593, 601, 39, '勇気VS意地', 'テニミュキャスト', '#14B8A6'),
  (601, 604, 40, 'あいつこそがテニスの王子様', 'テニミュキャスト', '#06B6D4'),
  (604, 624, 41, 'エージェント夜を往く', '三浦あずさ (CV: たかはし智秋)', '#EC4899'),
  (624, 645, 42, 'ネイティブフェイス', 'ZUN', '#10B981'),
  (645, 657, 43, 'true my heart', 'ave;new feat. 佐倉紗織', '#F472B6'),
  (645, 657, 44, 'ケロ⑨destiny', 'Silver Forest feat. めらみぽっぷ', '#22C55E'),
  (657, 678, 45, 'YATTA!', 'はっぱ隊', '#FBBF24'),
  (678, 712, 46, 'みくみくにしてあげる♪', 'ika feat. 初音ミク', '#06B6D4'),
  (712, 739, 47, 'レッツゴー！陰陽師', '陰陽師', '#EF4444'),

  -- ED section (12:19 - 12:42) - Repeat songs
  (739, 741, 48, '魔理沙は大変なものを盗んでいきました', 'ARM (IOSYS) feat. miko', '#F87171'),
  (741, 744, 49, 'Dr.ワイリー Stage 1', '立石孝', '#6366F1'),
  (744, 747, 50, 'ハレ晴レユカイ', '平野綾, 茅原実里, 後藤邑子', '#FBBF24'),
  (747, 749, 51, '寝・逃・げでリセット！', '福原香織', '#EC4899'),
  (749, 755, 52, 'みくみくにしてあげる♪', 'ika feat. 初音ミク', '#06B6D4'),
  (755, 757, 53, '激突！グルメレース', '石川淳', '#FBBF24'),
  (757, 759, 54, 'U.N.オーエンは彼女なのか?', 'ZUN', '#EF4444'),
  (759, 762, 55, 'ケロ⑨destiny', 'Silver Forest feat. めらみぽっぷ', '#22C55E'),
  (762, 797, 56, 'みくみくにしてあげる♪', 'ika feat. 初音ミク', '#06B6D4'),

  -- Final section (13:17 - end)
  (797, 840, 57, 'G線上のアリア', 'J.S.バッハ', '#9CA3AF')
) AS v(start_time, end_time, order_index, title, artist, color);

-- ========================================
-- Verification query
-- ========================================
-- Run this query to verify the data was inserted correctly:
-- SELECT order_index, title, artist, start_time, end_time
-- FROM medley_songs
-- WHERE medley_id = (SELECT id FROM medleys WHERE video_id = 'sm2959233')
-- ORDER BY order_index;
