// 検索システムのテスト用スクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 楽曲データベースの検索テストを開始します...\n');

// メドレーと楽曲データを取得
const { data: medleys, error } = await supabase
  .from('medleys')
  .select(`
    id,
    title,
    creator,
    songs (
      id,
      title,
      artist,
      start_time,
      end_time,
      original_link
    )
  `)
  .limit(3);

if (error) {
  console.error('データベースエラー:', error);
  process.exit(1);
}

if (!medleys || medleys.length === 0) {
  console.log('メドレーデータが見つかりませんでした');
  process.exit(0);
}

console.log(`📊 取得したメドレー数: ${medleys.length}\n`);

// 各メドレーの楽曲を表示
medleys.forEach((medley, index) => {
  console.log(`${index + 1}. ${medley.title} (${medley.creator})`);
  console.log(`   楽曲数: ${medley.songs?.length || 0}`);
  
  if (medley.songs && medley.songs.length > 0) {
    console.log('   楽曲一覧:');
    medley.songs.slice(0, 3).forEach((song, songIndex) => {
      console.log(`     ${songIndex + 1}. ${song.title} - ${song.artist}`);
    });
    if (medley.songs.length > 3) {
      console.log(`     ... 他${medley.songs.length - 3}曲`);
    }
  }
  console.log('');
});

// 検索テスト用の楽曲名をいくつか抽出
const allSongs = medleys.flatMap(medley => medley.songs || []);
const uniqueSongs = new Map();

allSongs.forEach(song => {
  const key = `${song.title}_${song.artist}`;
  if (!uniqueSongs.has(key)) {
    uniqueSongs.set(key, song);
  }
});

const uniqueSongArray = Array.from(uniqueSongs.values());

console.log(`🎵 検索テスト用楽曲データ (重複除去後: ${uniqueSongArray.length}曲):`);
uniqueSongArray.slice(0, 10).forEach((song, index) => {
  console.log(`${index + 1}. 「${song.title}」 - ${song.artist}`);
});

if (uniqueSongArray.length > 10) {
  console.log(`... 他${uniqueSongArray.length - 10}曲`);
}

console.log('\n✅ 検索テスト用データの取得が完了しました');
console.log('💡 ブラウザでメドレーページを開き、楽曲検索モーダルで上記の楽曲名を試してみてください');