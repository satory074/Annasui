import { SongSection, MedleyData } from "../../types";
import { getAllMedleys } from "../api/medleys";
import { supabase } from "../supabase";
import { logger } from "./logger";

// 楽曲DBエントリの型定義
export interface SongDatabaseEntry {
  id: string; // 楽曲名_アーティスト名をベースにした一意ID
  title: string;
  artist: string;
  originalLink?: string;
  links?: {
    niconico?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
  usageCount: number; // この楽曲が使用されている回数
  medleys: Array<{ // 使用されているメドレー情報
    medleyTitle: string;
    videoId: string;
    platform: string;
  }>;
}

// カタカナをひらがなに変換
function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

// 全角英数字を半角に変換
function toHalfWidth(text: string): string {
  return text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
  });
}

// 音楽用語の統一
function normalizeMusicTerms(text: string): string {
  return text
    // feat. / featuring の統一
    .replace(/\b(?:feat\.?|featuring|ft\.?)\b/gi, 'feat')
    // vs / versus の統一
    .replace(/\b(?:vs\.?|versus)\b/gi, 'vs')
    // remix の統一
    .replace(/\b(?:rmx|remix)\b/gi, 'remix')
    // cover の統一
    .replace(/\b(?:カバー|cover)\b/gi, 'cover')
    // instrumental の統一
    .replace(/\b(?:inst\.?|instrumental|インスト)\b/gi, 'inst')
    // acoustic の統一
    .replace(/\b(?:acoustic|アコースティック)\b/gi, 'acoustic');
}

// 強化された楽曲名とアーティスト名を正規化（検索用）
function normalizeSongInfo(title: string, artist: string): string {
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()                    // 小文字化
      .replace(/\s+/g, '')             // 全スペース除去
      .replace(/[・･]/g, '')           // 中点除去
      .replace(/[（）()［］\[\]｛｝{}「」『』]/g, '') // 各種括弧除去
      .replace(/[～〜~]/g, '')         // チルダ除去
      .replace(/[！!？?]/g, '')        // 感嘆符・疑問符除去
      .replace(/[＆&]/g, 'and')        // アンパサンド統一
      .replace(/[＋+]/g, 'plus')       // プラス記号統一
      .replace(/[×x]/gi, 'x')          // かける記号統一
      .replace(/[♪♫♬]/g, '')          // 音符記号除去
      .replace(/[★☆]/g, '')           // 星マーク除去
      .replace(/[♡♥]/g, '')           // ハート除去
      .replace(/[※]/g, '')             // 米印除去
      .replace(/[-－ー—–]/g, '')       // ハイフン類統一除去
      .replace(/[。、]/g, '');          // 句読点除去
  };
  
  // カタカナ→ひらがな変換 + 全角→半角変換 + 音楽用語統一 + 正規化
  const normalizedTitle = normalizeText(
    normalizeMusicTerms(
      toHalfWidth(
        katakanaToHiragana(title)
      )
    )
  );
  
  const normalizedArtist = normalizeText(
    normalizeMusicTerms(
      toHalfWidth(
        katakanaToHiragana(artist)
      )
    )
  );
  
  return `${normalizedTitle}_${normalizedArtist}`;
}

// 全メドレーデータから楽曲DBを構築
export async function buildSongDatabase(): Promise<SongDatabaseEntry[]> {
  const allMedleys: MedleyData[] = await getAllMedleys();

  const songMap = new Map<string, SongDatabaseEntry>();

  // 全メドレーから楽曲を収集
  allMedleys.forEach(medley => {
    medley.songs.forEach(song => {
      const normalizedId = normalizeSongInfo(song.title, song.artist);

      if (songMap.has(normalizedId)) {
        // 既存の楽曲エントリを更新
        const existingEntry = songMap.get(normalizedId)!;
        existingEntry.usageCount++;
        existingEntry.medleys.push({
          medleyTitle: medley.title,
          videoId: medley.videoId,
          platform: medley.platform || 'niconico'
        });

        // より詳細な情報があれば更新（originalLink、linksなど）
        if (song.originalLink && !existingEntry.originalLink) {
          existingEntry.originalLink = song.originalLink;
        }
        if (song.links && !existingEntry.links) {
          existingEntry.links = song.links;
        }
      } else {
        // 新しい楽曲エントリを作成
        songMap.set(normalizedId, {
          id: normalizedId,
          title: song.title,
          artist: song.artist,
          originalLink: song.originalLink,
          links: song.links,
          usageCount: 1,
          medleys: [{
            medleyTitle: medley.title,
            videoId: medley.videoId,
            platform: medley.platform || 'niconico'
          }]
        });
      }
    });
  });

  // song_dataテーブルから手動追加された楽曲を取得
  if (supabase) {
    try {
      const { data: manualSongs, error } = await supabase
        .from('song_data')
        .select('*');

      if (error) {
        logger.error('Failed to fetch manual songs from song_data:', error);
      } else if (manualSongs) {
        // 手動追加された楽曲をマップに追加
        type SongDataRow = {
          normalized_id: string;
          title: string;
          artist: string;
          original_link: string | null;
          links: any;
        };

        (manualSongs as SongDataRow[]).forEach((song) => {
          if (songMap.has(song.normalized_id)) {
            // 既に存在する場合はスキップ（メドレーから追加された楽曲が優先）
            return;
          }

          songMap.set(song.normalized_id, {
            id: song.normalized_id,
            title: song.title,
            artist: song.artist,
            originalLink: song.original_link || undefined,
            links: song.links || undefined,
            usageCount: 0, // 手動追加のみでメドレーに未使用
            medleys: []
          });
        });
      }
    } catch (error) {
      logger.error('Error fetching song_data:', error);
    }
  }

  // 使用回数順でソートして配列として返す
  return Array.from(songMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

// 検索結果と優先度
export interface SearchResult extends SongDatabaseEntry {
  searchScore: number;
  matchType: 'exact' | 'startsWith' | 'wordMatch' | 'partialMatch' | 'fuzzyMatch';
  matchedField: 'title' | 'artist' | 'both';
}

// 検索語を正規化（検索時に使用）
function normalizeSearchTerm(searchTerm: string): string {
  return normalizeMusicTerms(
    toHalfWidth(
      katakanaToHiragana(searchTerm.toLowerCase())
    )
  )
  .replace(/\s+/g, '')
  .replace(/[・･]/g, '')
  .replace(/[（）()［］\[\]｛｝{}「」『』]/g, '')
  .replace(/[～〜~]/g, '')
  .replace(/[！!？?]/g, '')
  .replace(/[＆&]/g, 'and')
  .replace(/[＋+]/g, 'plus')
  .replace(/[×x]/gi, 'x')
  .replace(/[♪♫♬]/g, '')
  .replace(/[★☆]/g, '')
  .replace(/[♡♥]/g, '')
  .replace(/[※]/g, '')
  .replace(/[-－ー—–]/g, '')
  .replace(/[。、]/g, '');
}

// 単語境界での一致チェック
function matchesWords(text: string, searchTerm: string): boolean {
  // スペースで区切られた単語での一致をチェック
  const words = text.split(/[\s　]+/).filter(word => word.length > 0);
  const searchWords = searchTerm.split(/[\s　]+/).filter(word => word.length > 0);
  
  return searchWords.every(searchWord => 
    words.some(word => 
      normalizeSearchTerm(word).includes(normalizeSearchTerm(searchWord))
    )
  );
}

// 楽曲検索（多段階検索・スコア付き）
export function searchSongs(
  songs: SongDatabaseEntry[], 
  searchTerm: string
): SearchResult[] {
  if (!searchTerm.trim()) {
    return songs.map(song => ({
      ...song,
      searchScore: 0,
      matchType: 'exact' as const,
      matchedField: 'title' as const
    })).sort((a, b) => b.usageCount - a.usageCount);
  }

  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
  const searchResults: SearchResult[] = [];

  songs.forEach(song => {
    const normalizedTitle = normalizeSearchTerm(song.title);
    const normalizedArtist = normalizeSearchTerm(song.artist);
    const normalizedCombined = `${normalizedTitle}_${normalizedArtist}`;
    
    let matchType: SearchResult['matchType'] | null = null;
    let matchedField: SearchResult['matchedField'] = 'title';
    let baseScore = 0;

    // 1. 完全一致チェック（最高優先度: 100点）
    if (normalizedTitle === normalizedSearchTerm) {
      matchType = 'exact';
      matchedField = 'title';
      baseScore = 100;
    } else if (normalizedArtist === normalizedSearchTerm) {
      matchType = 'exact';
      matchedField = 'artist';
      baseScore = 95;
    } else if (normalizedCombined === normalizedSearchTerm) {
      matchType = 'exact';
      matchedField = 'both';
      baseScore = 90;
    }
    // 2. 前方一致チェック（高優先度: 80点）
    else if (normalizedTitle.startsWith(normalizedSearchTerm)) {
      matchType = 'startsWith';
      matchedField = 'title';
      baseScore = 80;
    } else if (normalizedArtist.startsWith(normalizedSearchTerm)) {
      matchType = 'startsWith';
      matchedField = 'artist';
      baseScore = 75;
    }
    // 3. 単語一致チェック（中優先度: 60点）
    else if (matchesWords(song.title, searchTerm)) {
      matchType = 'wordMatch';
      matchedField = 'title';
      baseScore = 60;
    } else if (matchesWords(song.artist, searchTerm)) {
      matchType = 'wordMatch';
      matchedField = 'artist';
      baseScore = 55;
    }
    // 4. 部分一致チェック（低優先度: 40点）
    else if (normalizedTitle.includes(normalizedSearchTerm)) {
      matchType = 'partialMatch';
      matchedField = 'title';
      baseScore = 40;
    } else if (normalizedArtist.includes(normalizedSearchTerm)) {
      matchType = 'partialMatch';
      matchedField = 'artist';
      baseScore = 35;
    } else if (normalizedCombined.includes(normalizedSearchTerm)) {
      matchType = 'partialMatch';
      matchedField = 'both';
      baseScore = 30;
    }
    // 5. あいまい一致チェック（最低優先度: 20点）
    else {
      // 文字の部分的な一致をチェック
      const titleChars = normalizedTitle.split('');
      const artistChars = normalizedArtist.split('');
      const searchChars = normalizedSearchTerm.split('');
      
      const titleMatchCount = searchChars.filter(char => 
        titleChars.includes(char)
      ).length;
      const artistMatchCount = searchChars.filter(char => 
        artistChars.includes(char)
      ).length;
      
      const titleMatchRate = titleMatchCount / searchChars.length;
      const artistMatchRate = artistMatchCount / searchChars.length;
      
      if (titleMatchRate > 0.5 || artistMatchRate > 0.5) {
        matchType = 'fuzzyMatch';
        matchedField = titleMatchRate > artistMatchRate ? 'title' : 'artist';
        baseScore = Math.max(titleMatchRate, artistMatchRate) * 20;
      }
    }

    if (matchType) {
      // 使用回数によるボーナス（最大20点）
      const usageBonus = Math.min(song.usageCount * 2, 20);
      
      // 文字列の長さによる調整（完全一致に近いほど高スコア）
      const lengthPenalty = matchType === 'exact' ? 0 : 
        Math.max(0, (Math.max(song.title.length, song.artist.length) - searchTerm.length) * 0.1);
      
      const finalScore = baseScore + usageBonus - lengthPenalty;

      searchResults.push({
        ...song,
        searchScore: Math.max(0, finalScore),
        matchType,
        matchedField
      });
    }
  });

  // スコア順でソート（高い順）、同スコアなら使用回数順
  return searchResults.sort((a, b) => {
    if (a.searchScore !== b.searchScore) {
      return b.searchScore - a.searchScore;
    }
    return b.usageCount - a.usageCount;
  });
}

// 楽曲DBからSongSectionを生成（時間は0で初期化）
export function createSongFromDatabase(
  dbEntry: SongDatabaseEntry, 
  startTime: number = 0, 
  endTime: number = 0
): Omit<SongSection, 'id'> {
  return {
    title: dbEntry.title,
    artist: dbEntry.artist,
    startTime,
    endTime,
    color: "bg-blue-500", // 統一カラー
    originalLink: dbEntry.originalLink || "",
    links: dbEntry.links
  };
}

// 楽曲DBを取得（キャッシュ付き）
let cachedSongDatabase: SongDatabaseEntry[] | null = null;

export async function getSongDatabase(): Promise<SongDatabaseEntry[]> {
  if (!cachedSongDatabase) {
    cachedSongDatabase = await buildSongDatabase();
  }

  return cachedSongDatabase;
}

// 手動で楽曲を追加
export async function addManualSong(songData: { title: string; artist: string; originalLink?: string }): Promise<SongDatabaseEntry> {
  const normalizedId = normalizeSongInfo(songData.title, songData.artist);

  // 既存のデータベースで重複チェック
  const database = await getSongDatabase();
  const existingDbSong = database.find(song => song.id === normalizedId);
  if (existingDbSong) {
    logger.info('Song already exists in database:', existingDbSong);
    return existingDbSong;
  }

  // Supabaseのsong_dataテーブルに保存
  if (!supabase) {
    const error = new Error('Supabase client is not initialized');
    logger.error('Cannot add manual song: Supabase client is null');
    throw error;
  }

  try {
    const { data, error } = await supabase
      .from('song_data')
      .insert({
        title: songData.title,
        artist: songData.artist,
        original_link: songData.originalLink,
        normalized_id: normalizedId
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save manual song to database:', error);
      throw error;
    }

    logger.info('Manual song saved to database:', data);

    // キャッシュをクリアして次回のgetSongDatabaseで最新データを取得
    clearSongDatabaseCache();

    const newSong: SongDatabaseEntry = {
      id: normalizedId,
      title: songData.title,
      artist: songData.artist,
      originalLink: songData.originalLink,
      usageCount: 0,
      medleys: []
    };

    return newSong;
  } catch (error) {
    logger.error('Error adding manual song:', error);
    throw error;
  }
}

// キャッシュをクリア（開発用）
export function clearSongDatabaseCache(): void {
  cachedSongDatabase = null;
}