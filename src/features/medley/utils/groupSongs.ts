import type { SongSection } from "../types";

export interface GroupedSongRow {
  type: "grouped";
  songId: string;
  sections: SongSection[]; // startTime順
  displayTitle: string;
  displayArtist: string[];
  displayColor: string;
}

export interface SingleSongRow {
  type: "single";
  section: SongSection;
}

export type SongListRow = GroupedSongRow | SingleSongRow;

/**
 * 同一 songId を持つ区間を1行に集約する。
 * songId が null/undefined、または1区間しかない場合は SingleSongRow のまま。
 * グループは最初の区間が出現した位置に配置される。
 */
export function groupSongSections(songs: SongSection[]): SongListRow[] {
  if (!songs.length) return [];

  // songId ごとに区間を収集
  const groupMap = new Map<string, SongSection[]>();
  for (const song of songs) {
    if (!song.songId) continue;
    const existing = groupMap.get(song.songId);
    if (existing) {
      existing.push(song);
    } else {
      groupMap.set(song.songId, [song]);
    }
  }

  const emittedSongIds = new Set<string>();
  const rows: SongListRow[] = [];

  for (const song of songs) {
    if (!song.songId) {
      rows.push({ type: "single", section: song });
      continue;
    }

    if (emittedSongIds.has(song.songId)) continue;
    emittedSongIds.add(song.songId);

    const sections = groupMap.get(song.songId)!;
    if (sections.length === 1) {
      rows.push({ type: "single", section: song });
    } else {
      // startTime 順にソート
      const sorted = [...sections].sort((a, b) => a.startTime - b.startTime);
      rows.push({
        type: "grouped",
        songId: song.songId,
        sections: sorted,
        displayTitle: sorted[0].title,
        displayArtist: sorted[0].artist,
        displayColor: sorted[0].color,
      });
    }
  }

  return rows;
}

/**
 * rows を展開してフラットな SongSection[] を返す。
 * グループ内の区間は startTime 順で展開される。
 */
export function flattenRowsToSections(rows: SongListRow[]): SongSection[] {
  const result: SongSection[] = [];
  for (const row of rows) {
    if (row.type === "grouped") {
      result.push(...row.sections);
    } else {
      result.push(row.section);
    }
  }
  return result;
}

/**
 * currentTime に最も近い区間を返す。
 * - 区間内にいればその区間
 * - 区間の間にいれば次の区間
 * - 全区間の前なら最初の区間
 * - 全区間の後なら最後の区間
 */
export function findNearestSection(
  sections: SongSection[],
  currentTime: number
): SongSection {
  // sections は startTime 順であること前提
  for (const section of sections) {
    if (currentTime >= section.startTime && currentTime < section.endTime) {
      return section;
    }
  }

  // 区間の間 or 前後
  for (const section of sections) {
    if (currentTime < section.startTime) {
      return section;
    }
  }

  // 全区間の後
  return sections[sections.length - 1];
}
