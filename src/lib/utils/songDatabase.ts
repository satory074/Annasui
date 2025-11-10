import { SongSection, MedleyData } from "../../types";
import { getAllMedleys } from "../api/medleys";
import { supabase, type Database } from "../supabase";
import { logger } from "./logger";

// 楽曲DBエントリの型定義
export interface SongDatabaseEntry {
  id: string; // 楽曲名_アーティスト名をベースにした一意ID
  title: string;
  artist: Array<{ id: string; name: string }>; // アーティスト（複数可）
  composers: Array<{ id: string; name: string }>; // 作曲者（複数可）
  arrangers: Array<{ id: string; name: string }>; // 編曲者（複数可）
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
  usageCount: number; // この楽曲が使用されている回数
  medleys: Array<{ // 使用されているメドレー情報
    medleyTitle: string;
    videoId: string;
    platform: string;
  }>;
  createdAt?: string; // 作成日時
  updatedAt?: string; // 更新日時
}

// アーティスト名が空の場合のデフォルト値
const DEFAULT_ARTIST = "Unknown Artist";

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
export function normalizeSongInfo(title: string, artist: string): string {
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

  // アーティスト名が空の場合は"unknown"を使用
  const effectiveArtist = artist && artist.trim() ? artist : "unknown";
  const normalizedArtist = normalizeText(
    normalizeMusicTerms(
      toHalfWidth(
        katakanaToHiragana(effectiveArtist)
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
      const normalizedId = normalizeSongInfo(song.title, song.artist.join(", "));

      if (songMap.has(normalizedId)) {
        // 既存の楽曲エントリを更新
        const existingEntry = songMap.get(normalizedId)!;
        existingEntry.usageCount++;
        existingEntry.medleys.push({
          medleyTitle: medley.title,
          videoId: medley.videoId,
          platform: medley.platform || 'niconico'
        });

        // より詳細な情報があれば更新（各プラットフォームのリンク）
        if (song.niconicoLink && !existingEntry.niconicoLink) {
          existingEntry.niconicoLink = song.niconicoLink;
        }
        if (song.youtubeLink && !existingEntry.youtubeLink) {
          existingEntry.youtubeLink = song.youtubeLink;
        }
        if (song.spotifyLink && !existingEntry.spotifyLink) {
          existingEntry.spotifyLink = song.spotifyLink;
        }
        if (song.applemusicLink && !existingEntry.applemusicLink) {
          existingEntry.applemusicLink = song.applemusicLink;
        }
      } else {
        // 新しい楽曲エントリを作成
        songMap.set(normalizedId, {
          id: normalizedId,
          title: song.title,
          artist: song.artist.map(a => ({ id: '', name: a })), // 配列に変換
          composers: song.composers ? song.composers.map(c => ({ id: '', name: c })) : [],
          arrangers: song.arrangers ? song.arrangers.map(a => ({ id: '', name: a })) : [],
          niconicoLink: song.niconicoLink,
          youtubeLink: song.youtubeLink,
          spotifyLink: song.spotifyLink,
          applemusicLink: song.applemusicLink,
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

  // song_masterテーブルから手動追加された楽曲を取得
  if (supabase) {
    try {
      const { data: manualSongs, error } = await supabase
        .from('song_master')
        .select('*');

      if (error) {
        logger.error('Failed to fetch manual songs from song_master:', error);
      } else if (manualSongs) {
        // 手動追加された楽曲をマップに追加
        type SongDataRow = {
          id: string;
          normalized_id: string;
          title: string;
          artist: string | null;
          niconico_link: string | null;
          youtube_link: string | null;
          spotify_link: string | null;
          applemusic_link: string | null;
          created_at: string | null;
          updated_at: string | null;
        };

        // 全楽曲のIDを収集
        const songIds = (manualSongs as SongDataRow[]).map(s => s.id);

        // song_artist_relationsとartistsをJOIN取得して作曲者・編曲者を取得
        const { data: relations, error: relError } = await supabase
          .from('song_artist_relations')
          .select('song_id, role, order_index, artists(id, name)')
          .in('song_id', songIds);

        if (relError) {
          logger.error('Failed to fetch song_artist_relations:', relError);
        }

        // song_idごとにrelationsをグループ化
        type RelationRow = {
          song_id: string;
          role: 'artist' | 'composer' | 'arranger';
          order_index: number;
          artists: { id: string; name: string } | null;
        };

        const relationsBySongId = new Map<string, RelationRow[]>();
        if (relations && Array.isArray(relations)) {
          relations.forEach((rel: any) => {
            const typedRel: RelationRow = {
              song_id: rel.song_id as string,
              role: rel.role as 'artist' | 'composer' | 'arranger',
              order_index: rel.order_index as number,
              artists: rel.artists ? { id: rel.artists.id as string, name: rel.artists.name as string } : null
            };
            if (!relationsBySongId.has(typedRel.song_id)) {
              relationsBySongId.set(typedRel.song_id, []);
            }
            relationsBySongId.get(typedRel.song_id)!.push(typedRel);
          });
        }

        (manualSongs as SongDataRow[]).forEach((song) => {
          const normalizedId = song.normalized_id;
          const manualTitle = song.title;
          const manualNiconico = song.niconico_link || undefined;
          const manualYoutube = song.youtube_link || undefined;
          const manualSpotify = song.spotify_link || undefined;
          const manualAppleMusic = song.applemusic_link || undefined;

          // song_artist_relationsからアーティスト・作曲者・編曲者を取得
          const songRelations = relationsBySongId.get(song.id) || [];
          const artists = songRelations
            .filter(r => r.role === 'artist' && r.artists)
            .sort((a, b) => a.order_index - b.order_index)
            .map(r => ({ id: r.artists!.id, name: r.artists!.name }));
          const composers = songRelations
            .filter(r => r.role === 'composer' && r.artists)
            .sort((a, b) => a.order_index - b.order_index)
            .map(r => ({ id: r.artists!.id, name: r.artists!.name }));
          const arrangers = songRelations
            .filter(r => r.role === 'arranger' && r.artists)
            .sort((a, b) => a.order_index - b.order_index)
            .map(r => ({ id: r.artists!.id, name: r.artists!.name }));

          // アーティストが空の場合はデフォルト値を使用
          const finalArtists = artists.length > 0 ? artists : [{ id: '', name: DEFAULT_ARTIST }];

          if (songMap.has(normalizedId)) {
            const existingEntry = songMap.get(normalizedId)!;

            // 手動登録のメタデータを優先して反映（リンクの追加・更新もここで行う）
            existingEntry.title = manualTitle;
            existingEntry.artist = finalArtists;
            existingEntry.composers = composers;
            existingEntry.arrangers = arrangers;
            existingEntry.niconicoLink = manualNiconico;
            existingEntry.youtubeLink = manualYoutube;
            existingEntry.spotifyLink = manualSpotify;
            existingEntry.applemusicLink = manualAppleMusic;
            existingEntry.createdAt = song.created_at || undefined;
            existingEntry.updatedAt = song.updated_at || undefined;
            return;
          }

          songMap.set(normalizedId, {
            id: normalizedId,
            title: manualTitle,
            artist: finalArtists,
            composers,
            arrangers,
            niconicoLink: manualNiconico,
            youtubeLink: manualYoutube,
            spotifyLink: manualSpotify,
            applemusicLink: manualAppleMusic,
            usageCount: 0, // 手動追加のみでメドレーに未使用
            medleys: [],
            createdAt: song.created_at || undefined,
            updatedAt: song.updated_at || undefined
          });
        });
      }
    } catch (error) {
      logger.error('Error fetching song_master:', error);
    }
  }

  // 使用回数順でソートして配列として返す
  return Array.from(songMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

// 検索結果と優先度
export interface SearchResult extends SongDatabaseEntry {
  searchScore: number;
  matchType: 'exact' | 'startsWith' | 'wordMatch' | 'partialMatch' | 'fuzzyMatch';
  matchedField: 'title' | 'artist' | 'both' | 'composer' | 'arranger';
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
    const normalizedArtist = normalizeSearchTerm(song.artist.map(a => a.name).join(", "));
    const normalizedComposers = song.composers?.map(c => normalizeSearchTerm(c.name)) || [];
    const normalizedArrangers = song.arrangers?.map(a => normalizeSearchTerm(a.name)) || [];
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
    } else if (normalizedComposers.some(c => c === normalizedSearchTerm)) {
      matchType = 'exact';
      matchedField = 'composer';
      baseScore = 92;
    } else if (normalizedArrangers.some(a => a === normalizedSearchTerm)) {
      matchType = 'exact';
      matchedField = 'arranger';
      baseScore = 91;
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
    } else if (normalizedComposers.some(c => c.startsWith(normalizedSearchTerm))) {
      matchType = 'startsWith';
      matchedField = 'composer';
      baseScore = 72;
    } else if (normalizedArrangers.some(a => a.startsWith(normalizedSearchTerm))) {
      matchType = 'startsWith';
      matchedField = 'arranger';
      baseScore = 71;
    }
    // 3. 単語一致チェック（中優先度: 60点）
    else if (matchesWords(song.title, searchTerm)) {
      matchType = 'wordMatch';
      matchedField = 'title';
      baseScore = 60;
    } else if (matchesWords(song.artist.map(a => a.name).join(", "), searchTerm)) {
      matchType = 'wordMatch';
      matchedField = 'artist';
      baseScore = 55;
    } else if (song.composers?.some(c => matchesWords(c.name, searchTerm))) {
      matchType = 'wordMatch';
      matchedField = 'composer';
      baseScore = 52;
    } else if (song.arrangers?.some(a => matchesWords(a.name, searchTerm))) {
      matchType = 'wordMatch';
      matchedField = 'arranger';
      baseScore = 51;
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
    } else if (normalizedComposers.some(c => c.includes(normalizedSearchTerm))) {
      matchType = 'partialMatch';
      matchedField = 'composer';
      baseScore = 32;
    } else if (normalizedArrangers.some(a => a.includes(normalizedSearchTerm))) {
      matchType = 'partialMatch';
      matchedField = 'arranger';
      baseScore = 31;
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

      // Composer and arranger fuzzy matching
      const composerMatchCounts = normalizedComposers.map(composer =>
        searchChars.filter(char => composer.split('').includes(char)).length
      );
      const arrangerMatchCounts = normalizedArrangers.map(arranger =>
        searchChars.filter(char => arranger.split('').includes(char)).length
      );

      const titleMatchRate = titleMatchCount / searchChars.length;
      const artistMatchRate = artistMatchCount / searchChars.length;
      const composerMaxMatchRate = composerMatchCounts.length > 0
        ? Math.max(...composerMatchCounts) / searchChars.length
        : 0;
      const arrangerMaxMatchRate = arrangerMatchCounts.length > 0
        ? Math.max(...arrangerMatchCounts) / searchChars.length
        : 0;

      const maxMatchRate = Math.max(titleMatchRate, artistMatchRate, composerMaxMatchRate, arrangerMaxMatchRate);

      if (maxMatchRate > 0.5) {
        matchType = 'fuzzyMatch';
        // Determine which field has the highest match rate
        if (maxMatchRate === titleMatchRate) {
          matchedField = 'title';
        } else if (maxMatchRate === artistMatchRate) {
          matchedField = 'artist';
        } else if (maxMatchRate === composerMaxMatchRate) {
          matchedField = 'composer';
        } else {
          matchedField = 'arranger';
        }
        baseScore = maxMatchRate * 20;
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
    artist: dbEntry.artist.map(a => a.name), // Array<{id, name}> → string[]
    composers: dbEntry.composers.length > 0 ? dbEntry.composers.map(c => c.name) : undefined,
    arrangers: dbEntry.arrangers.length > 0 ? dbEntry.arrangers.map(a => a.name) : undefined,
    startTime,
    endTime,
    color: "bg-blue-500", // 統一カラー
    niconicoLink: dbEntry.niconicoLink || "",
    youtubeLink: dbEntry.youtubeLink || "",
    spotifyLink: dbEntry.spotifyLink || "",
    applemusicLink: dbEntry.applemusicLink || ""
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

// 全アーティストを取得（マスタDBから選択用）
export async function fetchAllArtists(): Promise<Array<{ id: string; name: string }>> {
  if (!supabase) {
    logger.error('Supabase client is not initialized');
    return [];
  }

  try {
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch all artists:', error);
      return [];
    }

    if (!artists) {
      return [];
    }

    // Type assertion to ensure correct types
    return (artists as any[]).map(a => ({
      id: a.id as string,
      name: a.name as string
    }));
  } catch (error) {
    logger.error('Error fetching all artists:', error);
    return [];
  }
}

// ヘルパー関数: アーティスト名を正規化してartistsテーブルに挿入（重複チェック付き）
async function upsertArtist(name: string): Promise<string> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Artist name cannot be empty');

  // 正規化（簡易版: lowercase + trim）
  const normalizedName = trimmedName.toLowerCase();

  // 既存のアーティストをチェック
  const { data: existing, error: selectError } = await supabase
    .from('artists')
    .select('id')
    .eq('normalized_name', normalizedName)
    .single();

  if (selectError && (selectError as any).code !== 'PGRST116') { // PGRST116 = 見つからない
    logger.error('Failed to check existing artist:', selectError);
    throw selectError;
  }

  if (existing) {
    return (existing as any).id as string; // 既存のアーティストIDを返す
  }

  // 新規アーティストを挿入
  const { data: newArtist, error: insertError } = await supabase
    .from('artists')
    .insert({ name: trimmedName, normalized_name: normalizedName })
    .select('id')
    .single();

  if (insertError) {
    logger.error('Failed to insert new artist:', insertError);
    throw insertError;
  }

  if (!newArtist) {
    throw new Error('Failed to create artist - no data returned');
  }

  return (newArtist as any).id as string;
}

// 手動で楽曲を追加
export async function addManualSong(songData: {
  title: string;
  artist: string[]; // アーティスト名の配列
  composers?: string[]; // 作曲者名の配列
  arrangers?: string[]; // 編曲者名の配列
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}): Promise<SongDatabaseEntry> {
  // アーティスト名が空の場合はデフォルト値を使用
  const artistNames = songData.artist && songData.artist.length > 0 ? songData.artist : [DEFAULT_ARTIST];
  const effectiveArtist = artistNames[0]; // 下位互換性のため最初のアーティストをsong_master.artistに保存
  const normalizedId = normalizeSongInfo(songData.title, effectiveArtist);

  // 既存のデータベースで重複チェック
  const database = await getSongDatabase();
  const existingDbSong = database.find(song => song.id === normalizedId);
  if (existingDbSong) {
    logger.info('Song already exists in database:', existingDbSong);
    return existingDbSong;
  }

  // Supabaseのsong_masterテーブルに保存
  if (!supabase) {
    const error = new Error('Supabase client is not initialized');
    logger.error('Cannot add manual song: Supabase client is null');
    throw error;
  }

  try {
    const { data, error } = await supabase
      .from('song_master')
      .insert({
        title: songData.title,
        artist: effectiveArtist,
        niconico_link: songData.niconicoLink || null,
        youtube_link: songData.youtubeLink || null,
        spotify_link: songData.spotifyLink || null,
        applemusic_link: songData.applemusicLink || null,
        normalized_id: normalizedId
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save manual song to database:', error);
      throw error;
    }

    logger.info('Manual song saved to database:', data);
    const songId = (data as any).id as string;

    // アーティスト/作曲者/編曲者をartistsテーブルに挿入し、song_artist_relationsに関連付け
    const relations: Array<{ song_id: string; artist_id: string; role: 'artist' | 'composer' | 'arranger'; order_index: number }> = [];

    // アーティストを挿入（role='artist'、複数対応）
    if (artistNames && artistNames.length > 0) {
      for (let i = 0; i < artistNames.length; i++) {
        const artistName = artistNames[i].trim();
        if (artistName && artistName !== DEFAULT_ARTIST) {
          try {
            const artistId = await upsertArtist(artistName);
            relations.push({ song_id: songId, artist_id: artistId, role: 'artist', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert artist '${artistName}', skipping:`, err);
          }
        }
      }
    }

    // 作曲者を挿入（role='composer'）
    if (songData.composers && songData.composers.length > 0) {
      for (let i = 0; i < songData.composers.length; i++) {
        const composerName = songData.composers[i].trim();
        if (composerName) {
          try {
            const composerId = await upsertArtist(composerName);
            relations.push({ song_id: songId, artist_id: composerId, role: 'composer', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert composer '${composerName}', skipping:`, err);
          }
        }
      }
    }

    // 編曲者を挿入（role='arranger'）
    if (songData.arrangers && songData.arrangers.length > 0) {
      for (let i = 0; i < songData.arrangers.length; i++) {
        const arrangerName = songData.arrangers[i].trim();
        if (arrangerName) {
          try {
            const arrangerId = await upsertArtist(arrangerName);
            relations.push({ song_id: songId, artist_id: arrangerId, role: 'arranger', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert arranger '${arrangerName}', skipping:`, err);
          }
        }
      }
    }

    // song_artist_relationsに挿入
    if (relations.length > 0) {
      const { error: relError } = await supabase
        .from('song_artist_relations')
        .insert(relations);

      if (relError) {
        logger.error('Failed to insert song_artist_relations:', relError);
        // 致命的エラーではないので処理は継続
      } else {
        logger.info('Song artist relations inserted successfully');
      }
    }

    // キャッシュをクリアして次回のgetSongDatabaseで最新データを取得
    clearSongDatabaseCache();

    const newSong: SongDatabaseEntry = {
      id: normalizedId,
      title: songData.title,
      artist: artistNames.map(a => ({ id: '', name: a })), // 配列に変換
      composers: songData.composers ? songData.composers.map(c => ({ id: '', name: c })) : [],
      arrangers: songData.arrangers ? songData.arrangers.map(a => ({ id: '', name: a })) : [],
      niconicoLink: songData.niconicoLink,
      youtubeLink: songData.youtubeLink,
      spotifyLink: songData.spotifyLink,
      applemusicLink: songData.applemusicLink,
      usageCount: 0,
      medleys: []
    };

    return newSong;
  } catch (error) {
    logger.error('Error adding manual song:', error);
    throw error;
  }
}

// 手動で追加した楽曲を更新
export async function updateManualSong(songData: {
  id: string;
  title: string;
  artist: string[]; // アーティスト名の配列
  composers?: string[]; // 作曲者名の配列
  arrangers?: string[]; // 編曲者名の配列
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}): Promise<SongDatabaseEntry> {
  if (!supabase) {
    const error = new Error('Supabase client is not initialized');
    logger.error('Cannot update manual song: Supabase client is null');
    throw error;
  }

  // アーティスト名が空の場合はデフォルト値を使用
  const artistNames = songData.artist && songData.artist.length > 0 ? songData.artist : [DEFAULT_ARTIST];
  const effectiveArtist = artistNames[0]; // 下位互換性のため最初のアーティストをsong_master.artistに保存

  try {
    const { data, error } = await supabase
      .from('song_master')
      .update({
        title: songData.title,
        artist: effectiveArtist,
        niconico_link: songData.niconicoLink || null,
        youtube_link: songData.youtubeLink || null,
        spotify_link: songData.spotifyLink || null,
        applemusic_link: songData.applemusicLink || null
      })
      .eq('normalized_id', songData.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update manual song in database:', error);
      throw error;
    }

    logger.info('Manual song updated in database:', data);

    type SongMasterRow = Database['public']['Tables']['song_master']['Row'];
    const updatedRow = data as SongMasterRow | null;
    const masterRecordId = (data as any).id as string; // song_masterのUUID

    // 既存のsong_artist_relationsを削除
    const { error: deleteError } = await supabase
      .from('song_artist_relations')
      .delete()
      .eq('song_id', masterRecordId);

    if (deleteError) {
      logger.warn('Failed to delete existing song_artist_relations:', deleteError);
    }

    // 新しいアーティスト/作曲者/編曲者を挿入
    const relations: Array<{ song_id: string; artist_id: string; role: 'artist' | 'composer' | 'arranger'; order_index: number }> = [];

    // アーティストを挿入（role='artist'、複数対応）
    if (artistNames && artistNames.length > 0) {
      for (let i = 0; i < artistNames.length; i++) {
        const artistName = artistNames[i].trim();
        if (artistName && artistName !== DEFAULT_ARTIST) {
          try {
            const artistId = await upsertArtist(artistName);
            relations.push({ song_id: masterRecordId, artist_id: artistId, role: 'artist', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert artist '${artistName}', skipping:`, err);
          }
        }
      }
    }

    // 作曲者を挿入（role='composer'）
    if (songData.composers && songData.composers.length > 0) {
      for (let i = 0; i < songData.composers.length; i++) {
        const composerName = songData.composers[i].trim();
        if (composerName) {
          try {
            const composerId = await upsertArtist(composerName);
            relations.push({ song_id: masterRecordId, artist_id: composerId, role: 'composer', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert composer '${composerName}', skipping:`, err);
          }
        }
      }
    }

    // 編曲者を挿入（role='arranger'）
    if (songData.arrangers && songData.arrangers.length > 0) {
      for (let i = 0; i < songData.arrangers.length; i++) {
        const arrangerName = songData.arrangers[i].trim();
        if (arrangerName) {
          try {
            const arrangerId = await upsertArtist(arrangerName);
            relations.push({ song_id: masterRecordId, artist_id: arrangerId, role: 'arranger', order_index: i });
          } catch (err) {
            logger.warn(`Failed to upsert arranger '${arrangerName}', skipping:`, err);
          }
        }
      }
    }

    // song_artist_relationsに挿入
    if (relations.length > 0) {
      const { error: relError } = await supabase
        .from('song_artist_relations')
        .insert(relations);

      if (relError) {
        logger.error('Failed to insert song_artist_relations:', relError);
      } else {
        logger.info('Song artist relations updated successfully');
      }
    }

    // medley_songsのキャッシュを同期（song_idで紐づく全レコードを更新）
    if (masterRecordId) {
      const { error: cacheError } = await supabase
        .from('medley_songs')
        .update({
          title: songData.title,
          artist: effectiveArtist,
          niconico_link: songData.niconicoLink || null,
          youtube_link: songData.youtubeLink || null,
          spotify_link: songData.spotifyLink || null,
          applemusic_link: songData.applemusicLink || null,
          updated_at: new Date().toISOString()
        })
        .eq('song_id', masterRecordId);

      if (cacheError) {
        logger.warn('Failed to sync medley_songs cache, but song_master was updated:', cacheError);
      } else {
        logger.info('medley_songs cache synced successfully for song_id:', masterRecordId);
      }
    }

    // キャッシュをクリアして次回のgetSongDatabaseで最新データを取得
    clearSongDatabaseCache();

    const updatedSong: SongDatabaseEntry = {
      id: songData.id,
      title: updatedRow?.title ?? songData.title,
      artist: artistNames.map(a => ({ id: '', name: a })), // 配列に変換
      composers: songData.composers ? songData.composers.map(c => ({ id: '', name: c })) : [],
      arrangers: songData.arrangers ? songData.arrangers.map(a => ({ id: '', name: a })) : [],
      niconicoLink: updatedRow?.niconico_link ?? songData.niconicoLink ?? undefined,
      youtubeLink: updatedRow?.youtube_link ?? songData.youtubeLink ?? undefined,
      spotifyLink: updatedRow?.spotify_link ?? songData.spotifyLink ?? undefined,
      applemusicLink: updatedRow?.applemusic_link ?? songData.applemusicLink ?? undefined,
      usageCount: 0,
      medleys: []
    };

    return updatedSong;
  } catch (error) {
    logger.error('Error updating manual song:', error);
    throw error;
  }
}

// 手動で追加した楽曲を削除
export async function deleteManualSong(songId: string): Promise<void> {
  if (!supabase) {
    const error = new Error('Supabase client is not initialized');
    logger.error('Cannot delete manual song: Supabase client is null');
    throw error;
  }

  try {
    // Check if song is used in any medleys
    const { data: usageData, error: usageError } = await supabase
      .from('medley_songs')
      .select('id, medley_id')
      .eq('song_id', songId);

    if (usageError) {
      logger.error('Error checking song usage:', usageError);
      throw new Error('楽曲の使用状況を確認できませんでした。');
    }

    // If song is used in medleys, set song_id to NULL but keep cached data
    if (usageData && usageData.length > 0) {
      logger.info(`Song is used in ${usageData.length} medleys, unlinking instead of deleting`, {
        songId,
        usageCount: usageData.length
      });

      // Unlink from medleys (set song_id to NULL, keep cached title/artist/links)
      const { error: unlinkError } = await supabase
        .from('medley_songs')
        .update({ song_id: null })
        .eq('song_id', songId);

      if (unlinkError) {
        logger.error('Error unlinking song from medleys:', unlinkError);
        throw new Error('楽曲の紐付け解除に失敗しました。');
      }

      logger.info('Song unlinked from medleys successfully', { songId });
    }

    // Delete from song_master (artist relations will cascade delete)
    const { error: deleteError } = await supabase
      .from('song_master')
      .delete()
      .eq('id', songId);

    if (deleteError) {
      logger.error('Error deleting song from song_master:', deleteError);
      throw new Error('楽曲の削除に失敗しました。');
    }

    logger.info('Song deleted successfully', { songId });

    // Clear cache to refresh data
    clearSongDatabaseCache();
  } catch (error) {
    logger.error('Error deleting manual song:', error);
    throw error;
  }
}

// キャッシュをクリア（開発用）
export function clearSongDatabaseCache(): void {
  cachedSongDatabase = null;
}
