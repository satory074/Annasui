import { SongSection } from "@/types";

export interface DuplicateInfo {
  song: SongSection;
  instances: SongSection[];
  instanceNumber: number;
  totalInstances: number;
}

export interface DuplicateGroup {
  key: string; // "title_artist" normalized
  instances: SongSection[];
  totalCount: number;
}

// 楽曲名とアーティスト名を正規化（重複検出用）
function normalizeSongKey(title: string, artist: string): string {
  const normalizeText = (text: string) => 
    text.toLowerCase()
         .replace(/\s+/g, '')
         .replace(/[・･]/g, '')
         .replace(/[（）()]/g, '')
         .trim();
  
  return `${normalizeText(title)}_${normalizeText(artist)}`;
}

// メドレー内の重複楽曲を検出
export function findDuplicateSongs(songs: SongSection[]): Map<string, DuplicateGroup> {
  const duplicateMap = new Map<string, DuplicateGroup>();
  
  // 楽曲をグループ化
  const songGroups = new Map<string, SongSection[]>();
  
  songs.forEach(song => {
    const key = normalizeSongKey(song.title, song.artist);
    if (!songGroups.has(key)) {
      songGroups.set(key, []);
    }
    songGroups.get(key)!.push(song);
  });
  
  // 2回以上登場する楽曲のみを重複として扱う
  songGroups.forEach((instances, key) => {
    if (instances.length > 1) {
      // startTimeでソート
      const sortedInstances = instances.sort((a, b) => a.startTime - b.startTime);
      
      duplicateMap.set(key, {
        key,
        instances: sortedInstances,
        totalCount: instances.length
      });
    }
  });
  
  return duplicateMap;
}

// 特定の楽曲の重複情報を取得
export function getDuplicateInfo(targetSong: SongSection, allSongs: SongSection[]): DuplicateInfo | null {
  const duplicates = findDuplicateSongs(allSongs);
  const key = normalizeSongKey(targetSong.title, targetSong.artist);
  
  const duplicateGroup = duplicates.get(key);
  if (!duplicateGroup) {
    return null; // 重複していない
  }
  
  // インスタンス番号を計算
  const instanceNumber = duplicateGroup.instances.findIndex(song => song.id === targetSong.id) + 1;
  
  return {
    song: targetSong,
    instances: duplicateGroup.instances,
    instanceNumber,
    totalInstances: duplicateGroup.totalCount
  };
}

// 楽曲が重複しているかチェック
export function isDuplicate(song: SongSection, allSongs: SongSection[]): boolean {
  return getDuplicateInfo(song, allSongs) !== null;
}

// 同じ楽曲の他のインスタンスを取得
export function getOtherInstances(targetSong: SongSection, allSongs: SongSection[]): SongSection[] {
  const duplicateInfo = getDuplicateInfo(targetSong, allSongs);
  if (!duplicateInfo) {
    return [];
  }
  
  return duplicateInfo.instances.filter(song => song.id !== targetSong.id);
}

// 重複楽曲の統計情報
export function getDuplicateStats(songs: SongSection[]) {
  const duplicates = findDuplicateSongs(songs);
  
  const totalDuplicateGroups = duplicates.size;
  const totalDuplicateInstances = Array.from(duplicates.values())
    .reduce((sum, group) => sum + group.totalCount, 0);
  const uniqueSongsWithDuplicates = Array.from(duplicates.values())
    .reduce((sum) => sum + 1, 0);
  
  return {
    totalDuplicateGroups,
    totalDuplicateInstances,
    uniqueSongsWithDuplicates,
    duplicateGroups: Array.from(duplicates.values())
  };
}

// 楽曲追加時の重複チェック
export function checkForDuplicateBeforeAdd(
  newSong: { title: string; artist: string }, 
  existingSongs: SongSection[]
): { isDuplicate: boolean; existingInstances: SongSection[] } {
  const key = normalizeSongKey(newSong.title, newSong.artist);
  const existingInstances = existingSongs.filter(song => 
    normalizeSongKey(song.title, song.artist) === key
  );
  
  return {
    isDuplicate: existingInstances.length > 0,
    existingInstances: existingInstances.sort((a, b) => a.startTime - b.startTime)
  };
}