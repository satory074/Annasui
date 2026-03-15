"use client";

import { useMemo } from "react";
import { SongSection } from "@/types";
import { formatTime } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utils/logger";

interface SongListProps {
  songs: SongSection[];
  duration: number;
  actualPlayerDuration?: number;
  currentTime: number;
  currentSongs?: SongSection[];
  onTimelineClick?: (time: number) => void;
  onSeek?: (time: number) => void;
  onDeleteSong?: (songId: number) => void;
  onTogglePlayPause?: () => void;
  isPlaying?: boolean;
  selectedSong?: SongSection | null;
  onSelectSong?: (song: SongSection | null) => void;
  onSongHover?: (song: SongSection, element: HTMLElement) => void;
  onSongHoverEnd?: () => void;
  medleyTitle?: string;
  medleyCreator?: string;
  originalVideoUrl?: string;
  onAddSong?: () => void;
  onEditSong?: (song: SongSection) => void;
}

const SONG_COLORS = [
  "#ff8c42", // orange  (brand color)
  "#5b6dee", // indigo
  "#00d9a3", // mint
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ef4444", // red
  "#6366f1", // purple-indigo
];

export default function SongListGrouped({
  songs,
  duration,
  actualPlayerDuration,
  currentTime,
  onTimelineClick,
  onSelectSong,
  onSongHover,
  onSongHoverEnd,
  onAddSong,
  onEditSong,
  selectedSong,
}: SongListProps) {
  const effectiveDuration = actualPlayerDuration || duration;

  // Sort songs by startTime for consistent color assignment and display
  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => a.startTime - b.startTime),
    [songs]
  );

  // Build color map: songId → color (position-based)
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedSongs.forEach((song, i) => {
      map.set(String(song.id), SONG_COLORS[i % SONG_COLORS.length]);
    });
    logger.debug("🎨 SongListGrouped: colorMap recalculated", {
      totalSongs: sortedSongs.length,
    });
    return map;
  }, [sortedSongs]);

  // Detect overlaps for a given song
  const detectOverlaps = (song: SongSection) => {
    const overlappingSongs = songs.filter(
      (other) =>
        other.id !== song.id &&
        song.startTime < other.endTime &&
        song.endTime > other.startTime
    );
    return { hasOverlap: overlappingSongs.length > 0, overlappingSongs };
  };

  return (
    <div className="bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-700">
              楽曲一覧 ({sortedSongs.length}曲)
            </h3>
            {onAddSong && (
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onAddSong}
                title="楽曲を追加"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                追加
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {/* Song list */}
        <div className="space-y-0.5">
          {sortedSongs.map((song, index) => {
            const color = colorMap.get(String(song.id)) ?? SONG_COLORS[0];
            const isActive =
              currentTime >= song.startTime && currentTime <= song.endTime;
            const isSelected = selectedSong?.id === song.id;
            const isBeyond =
              !!actualPlayerDuration &&
              song.startTime >= actualPlayerDuration;
            const isEmpty = song.title?.startsWith("空の楽曲");
            const { hasOverlap } = detectOverlaps(song);
            const length = song.endTime - song.startTime;

            const segmentLeft =
              effectiveDuration > 0
                ? (song.startTime / effectiveDuration) * 100
                : 0;
            const segmentWidthPct =
              effectiveDuration > 0
                ? ((song.endTime - song.startTime) / effectiveDuration) * 100
                : 0;
            const playheadLeft =
              effectiveDuration > 0
                ? (currentTime / effectiveDuration) * 100
                : 0;

            return (
              <div
                key={song.id}
                className={`group relative flex flex-col rounded cursor-pointer transition-colors overflow-hidden ${
                  isBeyond
                    ? "bg-red-50 border border-red-200 opacity-60"
                    : isActive
                    ? "bg-blue-50 border border-blue-200"
                    : isSelected
                    ? "bg-orange-50 border border-orange-200"
                    : "bg-white border border-gray-100 hover:bg-gray-50"
                }`}
                onClick={() => {
                  onSelectSong?.(song);
                  onTimelineClick?.(song.startTime);
                }}
                onMouseEnter={(e) =>
                  onSongHover?.(song, e.currentTarget as HTMLElement)
                }
                onMouseLeave={() => onSongHoverEnd?.()}
              >
                {/* Meta info row */}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {/* Color stripe */}
                  <div
                    className="flex-shrink-0 w-1 self-stretch rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  {/* Index */}
                  <span className="flex-shrink-0 text-[10px] text-gray-400 w-5 text-right font-mono">
                    #{index + 1}
                  </span>

                  {/* Playing indicator */}
                  <span
                    className={`flex-shrink-0 text-blue-500 text-xs transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    ▶
                  </span>

                  {/* Title + artist */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        isEmpty ? "text-orange-600" : "text-gray-900"
                      }`}
                    >
                      {isEmpty && (
                        <span className="mr-1 text-orange-500">⚠</span>
                      )}
                      {song.title}
                    </div>
                    {song.artist.length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        {song.artist.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {hasOverlap && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1 rounded">
                        ⚠
                      </span>
                    )}
                    {isBeyond && (
                      <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded">
                        超過
                      </span>
                    )}
                  </div>

                  {/* Time range */}
                  <div className="flex-shrink-0 text-[10px] text-gray-400 font-mono text-right leading-tight">
                    <div>
                      {formatTime(song.startTime)} → {formatTime(song.endTime)}
                    </div>
                    <div className="text-gray-300">{formatTime(length)}</div>
                  </div>

                  {/* Edit button */}
                  {onEditSong && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSong(song);
                      }}
                      title="編集"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </Button>
                  )}
                </div>

                {/* Mini timeline */}
                {effectiveDuration > 0 && (
                  <div
                    className="relative w-full h-2 bg-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onTimelineClick) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const time = (x / rect.width) * effectiveDuration;
                      onTimelineClick(time);
                    }}
                  >
                    {/* Segment bar */}
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        left: `${segmentLeft}%`,
                        width: `max(${segmentWidthPct}%, 3px)`,
                        backgroundColor: isBeyond ? "#ef4444" : color,
                        opacity: isBeyond ? 0.5 : 1,
                      }}
                    />
                    {/* Playhead */}
                    <div
                      className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none"
                      style={{ left: `${playheadLeft}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {songs.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            楽曲が登録されていません
          </div>
        )}
      </div>
    </div>
  );
}
