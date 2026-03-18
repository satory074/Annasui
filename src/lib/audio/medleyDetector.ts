/**
 * CSIDE 統合ロジック: メドレー自動検出
 * Stage1（境界検出）→ Stage2（楽曲マッチング）を連結し、
 * ImportSetlistModal で使える ParsedSetlistEntry[] を返す。
 */

import { detectBoundaries, BoundaryDetectorOptions } from "./boundaryDetector";
import { matchSegment, SongEmbedding, SongMatcherOptions } from "./songMatcher";
import type { ParsedSetlistEntry } from "@/features/medley/import/types";

export interface DetectedSegment {
  startTime: number;
  endTime: number;
  /** song_master.id (空文字列 = 不明) */
  songId: string;
  score: number;
  isUnknown: boolean;
  isMashup: boolean;
  mashupSongs: string[];
}

export interface MedleyDetectorOptions {
  boundary?: BoundaryDetectorOptions;
  matcher?: SongMatcherOptions;
}

/**
 * メドレー検出メイン関数
 *
 * @param embeddings - MuQ フレーム埋め込み列 (T × 1024)
 * @param hopSec - 1フレームの時間長（秒）
 * @param totalDurationSec - 動画総時間（秒）。省略時は T×hopSec
 * @param candidates - song_master 埋め込み一覧（空の場合はマッチングをスキップ）
 * @param options - ハイパーパラメータ
 */
export function detectSegments(
  embeddings: Float32Array[],
  hopSec: number,
  totalDurationSec: number | null,
  candidates: SongEmbedding[],
  options: MedleyDetectorOptions = {}
): DetectedSegment[] {
  const T = embeddings.length;
  if (T === 0) return [];

  const duration = totalDurationSec ?? T * hopSec;

  // Stage 1: 境界検出
  const boundaryTimes = detectBoundaries(embeddings, hopSec, options.boundary);

  // 区間リスト構築（boundaryTimes の前後を区間とする）
  const segmentBoundaries = [0, ...boundaryTimes, duration];

  const segments: DetectedSegment[] = [];

  for (let i = 0; i < segmentBoundaries.length - 1; i++) {
    const startTime = segmentBoundaries[i];
    const endTime = segmentBoundaries[i + 1];

    // フレームインデックスに変換
    const startFrame = Math.round(startTime / hopSec);
    const endFrame = Math.min(Math.round(endTime / hopSec), T);

    if (startFrame >= endFrame) continue;

    if (candidates.length === 0) {
      // マッチングデータなし → 時間情報のみ
      segments.push({
        startTime,
        endTime,
        songId: "",
        score: 0,
        isUnknown: true,
        isMashup: false,
        mashupSongs: [],
      });
    } else {
      // Stage 2: 楽曲マッチング
      const result = matchSegment(
        embeddings,
        startFrame,
        endFrame,
        candidates,
        options.matcher
      );
      segments.push({ startTime, endTime, ...result });
    }
  }

  return segments;
}

/**
 * DetectedSegment[] を ParsedSetlistEntry[] に変換
 * ImportSetlistModal へそのまま渡せる形式
 */
export function segmentsToParsedEntries(
  segments: DetectedSegment[],
  /** song_master IDから楽曲タイトル/アーティスト名を解決するマップ（任意） */
  songInfoMap: Map<string, { title: string; artist: string }> = new Map()
): ParsedSetlistEntry[] {
  return segments.map((seg) => {
    const info = songInfoMap.get(seg.songId);
    const startMin = Math.floor(seg.startTime / 60);
    const startSec = Math.floor(seg.startTime % 60);
    const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}`;

    return {
      time: timeStr,
      title: info?.title ?? (seg.isUnknown ? "（不明）" : seg.songId),
      artist: info?.artist ?? "",
      startTime: seg.startTime,
      endTime: seg.endTime,
      songId: seg.songId || undefined,
    };
  });
}
