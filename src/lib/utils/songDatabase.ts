import { SongSection, MedleyData } from "../../types";
import { sampleMedley1, sampleMedley2, nicoMedley1, medleyMap } from "../../data/medleys";
import { getAllYouTubeMedleys } from "../../data/youtubeMedleys";

// 楽曲DBエントリの型定義
export interface SongDatabaseEntry {
  id: string; // 楽曲名_アーティスト名をベースにした一意ID
  title: string;
  artist: string;
  originalLink?: string;
  genre?: string;
  usageCount: number; // この楽曲が使用されている回数
  medleys: Array<{ // 使用されているメドレー情報
    medleyTitle: string;
    videoId: string;
    platform: string;
  }>;
}

// 楽曲名とアーティスト名を正規化（検索用）
function normalizeSongInfo(title: string, artist: string): string {
  const normalizeText = (text: string) => 
    text.toLowerCase()
         .replace(/\s+/g, '')
         .replace(/[・･]/g, '')
         .replace(/[（）()]/g, '');
  
  return `${normalizeText(title)}_${normalizeText(artist)}`;
}

// 全メドレーデータから楽曲DBを構築
export function buildSongDatabase(): SongDatabaseEntry[] {
  const nicoMedleys = [sampleMedley1, sampleMedley2, nicoMedley1, ...Object.values(medleyMap)];
  const youtubeMedleys = getAllYouTubeMedleys();
  const allMedleys: MedleyData[] = [...nicoMedleys, ...youtubeMedleys];

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
        
        // より詳細な情報があれば更新（originalLinkやgenreなど）
        if (song.originalLink && !existingEntry.originalLink) {
          existingEntry.originalLink = song.originalLink;
        }
        if (song.genre && !existingEntry.genre) {
          existingEntry.genre = song.genre;
        }
      } else {
        // 新しい楽曲エントリを作成
        songMap.set(normalizedId, {
          id: normalizedId,
          title: song.title,
          artist: song.artist,
          originalLink: song.originalLink,
          genre: song.genre,
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

  // 使用回数順でソートして配列として返す
  return Array.from(songMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

// 楽曲を検索（楽曲名・アーティスト名の部分一致）
export function searchSongs(
  songs: SongDatabaseEntry[], 
  searchTerm: string
): SongDatabaseEntry[] {
  if (!searchTerm.trim()) {
    return songs;
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().replace(/\s+/g, '');
  
  return songs.filter(song => 
    song.title.toLowerCase().includes(normalizedSearchTerm) ||
    song.artist.toLowerCase().includes(normalizedSearchTerm) ||
    normalizeSongInfo(song.title, song.artist).includes(normalizedSearchTerm)
  );
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
    genre: dbEntry.genre || "",
    originalLink: dbEntry.originalLink || ""
  };
}

// 楽曲DBを取得（キャッシュ付き）
let cachedSongDatabase: SongDatabaseEntry[] | null = null;
let manuallyAddedSongs: SongDatabaseEntry[] = [];

export function getSongDatabase(): SongDatabaseEntry[] {
  if (!cachedSongDatabase) {
    cachedSongDatabase = buildSongDatabase();
  }
  
  // 手動で追加された楽曲と統合
  const combinedDatabase = [...cachedSongDatabase, ...manuallyAddedSongs];
  
  // 重複排除（同じIDの楽曲がある場合は使用回数を合算）
  const songMap = new Map<string, SongDatabaseEntry>();
  combinedDatabase.forEach(song => {
    if (songMap.has(song.id)) {
      const existing = songMap.get(song.id)!;
      existing.usageCount += song.usageCount;
      existing.medleys = [...existing.medleys, ...song.medleys];
    } else {
      songMap.set(song.id, { ...song });
    }
  });
  
  return Array.from(songMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

// 手動で楽曲を追加
export function addManualSong(songData: { title: string; artist: string; originalLink?: string }): SongDatabaseEntry {
  const normalizedId = normalizeSongInfo(songData.title, songData.artist);
  
  // 既に存在するかチェック
  const existingManualSong = manuallyAddedSongs.find(song => song.id === normalizedId);
  if (existingManualSong) {
    return existingManualSong;
  }
  
  // 既存のデータベースでも重複チェック
  const existingDbSong = getSongDatabase().find(song => song.id === normalizedId);
  if (existingDbSong) {
    return existingDbSong;
  }
  
  const newSong: SongDatabaseEntry = {
    id: normalizedId,
    title: songData.title,
    artist: songData.artist,
    originalLink: songData.originalLink,
    genre: "",
    usageCount: 0,
    medleys: []
  };
  
  manuallyAddedSongs.push(newSong);
  return newSong;
}

// キャッシュをクリア（開発用）
export function clearSongDatabaseCache(): void {
  cachedSongDatabase = null;
  manuallyAddedSongs = [];
}