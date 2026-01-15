import { SongSection, MedleyData } from "../../types";
import { getAllMedleys } from "../api/medleys";
import { supabase, type Database } from "../supabase";
import { logger } from "./logger";

// 楽曲DBエントリの型定義
export interface SongDatabaseEntry {
  id: string;        // song_master.id (UUID) - プライマリキー
  dedupKey: string;  // 重複検出用キー（旧normalized_id）- タイトル_アーティスト名から生成
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

// Type definitions for Supabase responses (to avoid `any`)
// Note: Supabase returns nested relations as arrays or single objects depending on the relationship type
interface SongArtistRelationResponse {
  song_id: string;
  role: 'artist' | 'composer' | 'arranger';
  order_index: number;
  artists: {
    id: string;
    name: string;
  } | { id: string; name: string }[] | null;  // Can be single object, array, or null
}

interface ArtistResponse {
  id: string;
  name: string;
}

interface SongMasterResponse {
  id: string;
  normalized_id: string;
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

  // dedupKeyをキーとしたMap（重複検出用）
  const songMap = new Map<string, SongDatabaseEntry>();

  // 全メドレーから楽曲を収集（この時点ではidは仮のもの）
  allMedleys.forEach(medley => {
    medley.songs.forEach(song => {
      const dedupKey = normalizeSongInfo(song.title, song.artist.join(", "));

      if (songMap.has(dedupKey)) {
        // 既存の楽曲エントリを更新
        const existingEntry = songMap.get(dedupKey)!;
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
        // 新しい楽曲エントリを作成（メドレーのみの楽曲はid=dedupKeyを仮設定）
        songMap.set(dedupKey, {
          id: dedupKey,  // 仮ID（後でsong_masterのUUIDで上書きされる可能性あり）
          dedupKey,      // 重複検出用キー
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
          (relations as unknown as SongArtistRelationResponse[]).forEach((rel) => {
            // Handle both single object and array cases from Supabase
            let artistData: { id: string; name: string } | null = null;
            if (rel.artists) {
              if (Array.isArray(rel.artists) && rel.artists.length > 0) {
                artistData = { id: rel.artists[0].id, name: rel.artists[0].name };
              } else if (!Array.isArray(rel.artists)) {
                artistData = { id: rel.artists.id, name: rel.artists.name };
              }
            }
            const typedRel: RelationRow = {
              song_id: rel.song_id as string,
              role: rel.role as 'artist' | 'composer' | 'arranger',
              order_index: rel.order_index as number,
              artists: artistData
            };
            if (!relationsBySongId.has(typedRel.song_id)) {
              relationsBySongId.set(typedRel.song_id, []);
            }
            relationsBySongId.get(typedRel.song_id)!.push(typedRel);
          });
        }

        (manualSongs as SongDataRow[]).forEach((song) => {
          const songUuid = song.id;  // song_master.id (UUID)
          const dedupKey = song.normalized_id;  // 重複検出用キー
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

          if (songMap.has(dedupKey)) {
            const existingEntry = songMap.get(dedupKey)!;

            // song_masterのUUIDでidを上書き（メドレーのみの楽曲を正式なIDに更新）
            existingEntry.id = songUuid;
            // 手動登録のメタデータを優先して反映
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

          // song_masterのみに存在する楽曲（メドレーで未使用）
          songMap.set(dedupKey, {
            id: songUuid,  // song_master.id (UUID)
            dedupKey,      // 重複検出用キー
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
  // UUIDかどうかを判定（仮IDの場合はsongIdを設定しない）
  const isUuid = dbEntry.id.includes('-') && dbEntry.id.length === 36;

  return {
    songId: isUuid ? dbEntry.id : undefined, // song_master.id (UUID) への参照
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
    return (artists as ArtistResponse[]).map(a => ({
      id: a.id,
      name: a.name
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

  // PGRST116 = not found (expected when artist doesn't exist)
  const errorCode = selectError && typeof selectError === 'object' && 'code' in selectError ? (selectError as { code: string }).code : null;
  if (selectError && errorCode !== 'PGRST116') {
    logger.error('Failed to check existing artist:', selectError);
    throw selectError;
  }

  if (existing) {
    return (existing as { id: string }).id; // 既存のアーティストIDを返す
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

  return (newArtist as { id: string }).id;
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
  const dedupKey = normalizeSongInfo(songData.title, effectiveArtist);

  // 既存のデータベースで重複チェック（dedupKeyで比較）
  const database = await getSongDatabase();
  const existingDbSong = database.find(song => song.dedupKey === dedupKey);
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
        normalized_id: dedupKey
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save manual song to database:', error);
      throw error;
    }

    logger.info('Manual song saved to database:', data);
    const songId = (data as { id: string }).id;

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
      id: songId,    // song_master.id (UUID)
      dedupKey,      // 重複検出用キー
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
  id: string;  // song_master.id (UUID) または dedupKey（後方互換性）
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

  // dedupKeyを生成
  const dedupKey = normalizeSongInfo(songData.title, effectiveArtist);

  // songData.idがUUIDかdedupKeyかを判定（UUIDはハイフンを含む）
  const isUuid = songData.id.includes('-') && songData.id.length === 36;

  try {
    // 既存レコードを検索（UUIDならidで、そうでなければnormalized_idで検索）
    const { data: existingRecord, error: selectError } = isUuid
      ? await supabase
          .from('song_master')
          .select('id, normalized_id')
          .eq('id', songData.id)
          .maybeSingle()
      : await supabase
          .from('song_master')
          .select('id, normalized_id')
          .eq('normalized_id', songData.id)
          .maybeSingle();

    if (selectError) {
      logger.error('Failed to check existing song_master record:', selectError);
      throw selectError;
    }

    let data;
    let error;

    // 型アサーション: existingRecordの型を明示
    const existingId = existingRecord ? (existingRecord as { id: string; normalized_id: string }).id : null;

    if (existingId) {
      // レコードが存在する場合は更新
      logger.info('Updating existing song_master record:', { dedupKey, existingId });
      const result = await supabase
        .from('song_master')
        .update({
          title: songData.title,
          artist: effectiveArtist,
          niconico_link: songData.niconicoLink || null,
          youtube_link: songData.youtubeLink || null,
          spotify_link: songData.spotifyLink || null,
          applemusic_link: songData.applemusicLink || null
        })
        .eq('id', existingId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // レコードが存在しない場合は新規作成
      logger.info('Creating new song_master record:', { dedupKey, title: songData.title });
      const result = await supabase
        .from('song_master')
        .insert({
          title: songData.title,
          artist: effectiveArtist,
          normalized_id: dedupKey,
          niconico_link: songData.niconicoLink || null,
          youtube_link: songData.youtubeLink || null,
          spotify_link: songData.spotifyLink || null,
          applemusic_link: songData.applemusicLink || null
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      logger.error('Failed to upsert song in database:', error);
      throw error;
    }

    logger.info('Song upserted in database:', data);

    type SongMasterRow = Database['public']['Tables']['song_master']['Row'];
    const updatedRow = data as SongMasterRow | null;
    const masterRecordId = (data as { id: string }).id; // song_masterのUUID

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
      id: masterRecordId,  // song_master.id (UUID)
      dedupKey,            // 重複検出用キー
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

// =============================================================================
// 類似楽曲検索・重複検出機能
// =============================================================================

// 類似楽曲検索結果の型
export interface SimilarSongResult {
  song: SongDatabaseEntry;
  similarity: number; // 0-100
  matchReason: 'exact_normalized_id' | 'title_match' | 'fuzzy_match';
}

// 文字の一致率に基づく類似度計算（簡易版）
function calculateFuzzyScore(str1: string, str2: string): number {
  const chars1 = str1.split('');
  const chars2Set = new Set(str2.split(''));
  const matchCount = chars1.filter(c => chars2Set.has(c)).length;
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return Math.round((matchCount / maxLength) * 100);
}

/**
 * song_masterテーブルから類似楽曲を検索
 * @param title 検索する楽曲タイトル
 * @param artist 検索するアーティスト名
 * @returns 類似楽曲の配列（類似度スコア付き）
 */
export async function findSimilarSongsInDatabase(
  title: string,
  artist: string
): Promise<SimilarSongResult[]> {
  const searchDedupKey = normalizeSongInfo(title, artist);
  const database = await getSongDatabase();

  const results: SimilarSongResult[] = [];

  for (const song of database) {
    // 1. dedupKey 完全一致
    if (song.dedupKey === searchDedupKey) {
      results.push({
        song,
        similarity: 100,
        matchReason: 'exact_normalized_id'
      });
      continue;
    }

    // 2. タイトルのみ一致（アーティスト違い）
    const searchTitleNorm = searchDedupKey.split('_')[0];
    const songTitleNorm = song.dedupKey.split('_')[0];
    if (searchTitleNorm === songTitleNorm && searchTitleNorm.length > 0) {
      results.push({
        song,
        similarity: 80,
        matchReason: 'title_match'
      });
      continue;
    }

    // 3. あいまい一致（文字の一致率）- タイトル部分のみで比較
    if (searchTitleNorm.length >= 2) {
      const fuzzyScore = calculateFuzzyScore(searchTitleNorm, songTitleNorm);
      if (fuzzyScore >= 70) {
        results.push({
          song,
          similarity: fuzzyScore,
          matchReason: 'fuzzy_match'
        });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

// 重複グループの型（ライブラリページ用）
export interface DatabaseDuplicateGroup {
  primarySong: SongDatabaseEntry;
  duplicates: SongDatabaseEntry[];
  similarity: number;
  reason: string;
}

// レーベンシュタイン距離による文字列類似度計算
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * データベース内の重複楽曲グループを検出
 * dedupKeyを使用して類似度を判定し、idはUUIDとして処理済みセットに使用
 */
export async function findDuplicateGroups(): Promise<DatabaseDuplicateGroup[]> {
  const database = await getSongDatabase();
  const groups: DatabaseDuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (const song of database) {
    if (processedIds.has(song.id)) continue;

    const similarSongs = database.filter(other => {
      if (other.id === song.id) return false;
      if (processedIds.has(other.id)) return false;

      // dedupKeyを使ってタイトル部分を抽出して比較
      const songTitleNorm = song.dedupKey.split('_')[0];
      const otherTitleNorm = other.dedupKey.split('_')[0];

      // レーベンシュタイン距離で類似度判定
      const similarity = calculateStringSimilarity(songTitleNorm, otherTitleNorm);
      return similarity > 0.8;
    });

    if (similarSongs.length > 0) {
      const allSongs = [song, ...similarSongs].sort((a, b) => b.usageCount - a.usageCount);

      groups.push({
        primarySong: allSongs[0],
        duplicates: allSongs.slice(1),
        similarity: 85,
        reason: 'タイトルの表記揺れ'
      });

      // UUIDを処理済みセットに追加
      allSongs.forEach(s => processedIds.add(s.id));
    }
  }

  return groups;
}

/**
 * 重複楽曲をマージ
 * UUIDまたはdedupKeyの両方に対応
 * メドレーからのみ抽出された楽曲（song_masterに未登録）も処理可能
 *
 * @param targetId マージ先のID（UUIDまたはdedupKey）
 * @param sourceIds マージ元のID配列（UUIDまたはdedupKey）
 */
export async function mergeDuplicateSongs(
  targetId: string,
  sourceIds: string[]
): Promise<{ success: boolean; updatedCount: number; deletedCount: number }> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  let updatedCount = 0;
  let deletedCount = 0;

  // UUIDかどうかを判定するヘルパー
  const isUuid = (id: string) => id.includes('-') && id.length === 36;

  // SongDatabaseを取得（song_master未登録楽曲の情報取得用）
  const database = await getSongDatabase();

  // target の UUID と楽曲情報を取得（存在しない場合は作成）
  let targetUuid: string;
  let targetTitle: string;
  let targetArtist: string;

  if (isUuid(targetId)) {
    // UUIDの場合、song_masterから情報を取得
    targetUuid = targetId;
    const { data: targetInfo, error: targetInfoError } = await supabase
      .from('song_master')
      .select('title, artist')
      .eq('id', targetId)
      .single();

    if (targetInfoError || !targetInfo) {
      // song_masterにない場合はdatabaseから取得
      const targetEntry = database.find(s => s.id === targetId);
      if (!targetEntry) {
        throw new Error(`Target song not found: ${targetId}`);
      }
      targetTitle = targetEntry.title;
      targetArtist = targetEntry.artist[0]?.name || 'Unknown Artist';
    } else {
      targetTitle = (targetInfo as { title: string; artist: string }).title;
      targetArtist = (targetInfo as { title: string; artist: string }).artist;
    }
  } else {
    // dedupKeyの場合はnormalized_idで検索
    const { data: targetData, error: targetError } = await supabase
      .from('song_master')
      .select('id, title, artist')
      .eq('normalized_id', targetId)
      .maybeSingle();

    if (targetError) {
      logger.error('Error querying target song:', targetError);
      throw new Error(`Failed to query target song: ${targetId}`);
    }

    if (!targetData) {
      // song_masterに存在しない場合、SongDatabaseEntryから情報を取得して作成
      const targetEntry = database.find(s => s.dedupKey === targetId || s.id === targetId);
      if (!targetEntry) {
        throw new Error(`Target song not found in database: ${targetId}`);
      }

      targetTitle = targetEntry.title;
      targetArtist = targetEntry.artist[0]?.name || 'Unknown Artist';

      const { data: newTarget, error: insertError } = await supabase
        .from('song_master')
        .insert({
          title: targetTitle,
          artist: targetArtist,
          normalized_id: targetEntry.dedupKey,
          niconico_link: targetEntry.niconicoLink || null,
          youtube_link: targetEntry.youtubeLink || null,
          spotify_link: targetEntry.spotifyLink || null,
          applemusic_link: targetEntry.applemusicLink || null
        })
        .select('id')
        .single();

      if (insertError || !newTarget) {
        logger.error('Failed to create target song in song_master:', insertError);
        throw new Error(`Failed to create target song: ${targetId}`);
      }
      targetUuid = (newTarget as { id: string }).id;
      logger.info('Created target song in song_master:', { targetId, targetUuid });
    } else {
      targetUuid = (targetData as { id: string; title: string; artist: string }).id;
      targetTitle = (targetData as { id: string; title: string; artist: string }).title;
      targetArtist = (targetData as { id: string; title: string; artist: string }).artist;
    }
  }

  for (const sourceId of sourceIds) {
    let sourceUuid: string | null = null;

    if (isUuid(sourceId)) {
      // UUIDの場合はそのまま使用
      sourceUuid = sourceId;
    } else {
      // dedupKeyの場合はnormalized_idで検索
      const { data: sourceData, error: sourceError } = await supabase
        .from('song_master')
        .select('id')
        .eq('normalized_id', sourceId)
        .maybeSingle();

      if (sourceError) {
        logger.error('Error querying source song:', { sourceId, error: sourceError });
        continue;
      }

      if (!sourceData) {
        // song_masterに存在しない楽曲の場合、medley_songsのtitleで検索してsong_idを更新
        const sourceEntry = database.find(s => s.dedupKey === sourceId || s.id === sourceId);
        if (!sourceEntry) {
          logger.info('Source song not found in database, skipping:', { sourceId });
          continue;
        }

        // medley_songsでtitleが一致するレコードを検索し、song_idをtargetUuidに更新
        const { data: medleySongsToUpdate, error: searchError } = await supabase
          .from('medley_songs')
          .select('id')
          .eq('title', sourceEntry.title)
          .is('song_id', null);

        if (searchError) {
          logger.error('Error searching medley_songs:', searchError);
          continue;
        }

        if (medleySongsToUpdate && medleySongsToUpdate.length > 0) {
          // medley_songsのsong_id, title, artistをターゲットの情報で更新
          const { error: updateMedleySongsError } = await supabase
            .from('medley_songs')
            .update({
              song_id: targetUuid,
              title: targetTitle,
              artist: targetArtist
            })
            .eq('title', sourceEntry.title)
            .is('song_id', null);

          if (updateMedleySongsError) {
            logger.error('Failed to update medley_songs for medley-only song:', updateMedleySongsError);
            continue;
          }
          updatedCount += medleySongsToUpdate.length;
          logger.info('Updated medley_songs for medley-only song:', { sourceId, title: sourceEntry.title, targetTitle, count: medleySongsToUpdate.length });
        } else {
          logger.info('No medley_songs found for medley-only song:', { sourceId, title: sourceEntry.title });
        }
        continue;
      }
      sourceUuid = (sourceData as { id: string }).id;
    }

    if (!sourceUuid || sourceUuid === targetUuid) {
      // 同じUUIDの場合はスキップ
      continue;
    }

    // medley_songs の song_id, title, artist を更新
    const { error: updateError } = await supabase
      .from('medley_songs')
      .update({
        song_id: targetUuid,
        title: targetTitle,
        artist: targetArtist
      })
      .eq('song_id', sourceUuid);

    if (updateError) {
      logger.error('Failed to update medley_songs:', updateError);
      continue;
    }

    updatedCount++;

    // source の song_master を削除
    const { error: deleteError } = await supabase
      .from('song_master')
      .delete()
      .eq('id', sourceUuid);

    if (deleteError) {
      logger.error('Failed to delete source song:', deleteError);
      continue;
    }

    deletedCount++;
    logger.info('Merged song:', { sourceId, targetId });
  }

  // 同じsong_idを持つがartistが異なるmedley_songsレコードを統一
  // これは過去のマージでsong_idは更新されたがartistが更新されなかったケースに対応
  const { error: normalizeError } = await supabase
    .from('medley_songs')
    .update({
      title: targetTitle,
      artist: targetArtist
    })
    .eq('song_id', targetUuid)
    .neq('artist', targetArtist);

  if (normalizeError) {
    logger.error('Failed to normalize medley_songs artist:', normalizeError);
  } else {
    logger.info('Normalized medley_songs with same song_id to same artist:', { targetUuid, targetArtist });
  }

  clearSongDatabaseCache();
  return { success: true, updatedCount, deletedCount };
}
