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

interface SongGroup {
  key: string;
  color: string;
  groupIndex: number;
  segments: SongSection[]; // sorted by startTime
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

function getGroupKey(song: SongSection): string {
  if (song.songId) return song.songId;
  return `${song.title}|${song.artist.join(",")}`;
}

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

  // Sort songs by startTime
  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => a.startTime - b.startTime),
    [songs]
  );

  // Build groups: keyed by songId or title+artist, ordered by first appearance
  const groups = useMemo(() => {
    const map = new Map<string, SongGroup>();
    const order: string[] = [];

    sortedSongs.forEach((song) => {
      const key = getGroupKey(song);
      if (!map.has(key)) {
        const groupIndex = order.length;
        map.set(key, {
          key,
          color: SONG_COLORS[groupIndex % SONG_COLORS.length],
          groupIndex,
          segments: [],
        });
        order.push(key);
      }
      map.get(key)!.segments.push(song);
    });

    logger.debug("🎨 SongListGrouped: groups recalculated", {
      totalGroups: order.length,
      totalSegments: sortedSongs.length,
    });

    return order.map((key) => map.get(key)!);
  }, [sortedSongs]);

  // Detect overlaps for a given song
  const detectOverlaps = (song: SongSection) => {
    const overlappingSongs = songs.filter(
      (other) =>
        other.id !== song.id &&
        song.startTime < other.endTime &&
        song.endTime > other.startTime
    );
    return { hasOverlap: overlappingSongs.length > 0 };
  };

  const totalSegments = sortedSongs.length;
  const totalGroups = groups.length;
  const headerLabel =
    totalGroups === totalSegments
      ? `${totalGroups}曲`
      : `${totalGroups}楽曲 (${totalSegments}区間)`;

  const playheadLeft =
    effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-700">
              楽曲一覧 ({headerLabel})
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
        <div className="space-y-0.5">
          {groups.map((group) => {
            const firstSeg = group.segments[0];
            const { color } = group;
            const isMulti = group.segments.length > 1;

            const isActive = group.segments.some(
              (s) => currentTime >= s.startTime && currentTime <= s.endTime
            );
            const isSelected = group.segments.some(
              (s) => selectedSong?.id === s.id
            );
            const isBeyond =
              !!actualPlayerDuration &&
              group.segments.every((s) => s.startTime >= actualPlayerDuration);
            const isEmpty = firstSeg.title?.startsWith("空の楽曲");
            const hasOverlap = group.segments.some(
              (s) => detectOverlaps(s).hasOverlap
            );

            // Active segment for click-to-seek
            const activeSeg =
              group.segments.find(
                (s) => currentTime >= s.startTime && currentTime <= s.endTime
              ) ?? firstSeg;

            return (
              <div
                key={group.key}
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
                  onSelectSong?.(activeSeg);
                  onTimelineClick?.(firstSeg.startTime);
                }}
                onMouseEnter={(e) =>
                  onSongHover?.(firstSeg, e.currentTarget as HTMLElement)
                }
                onMouseLeave={() => onSongHoverEnd?.()}
              >
                {/* Meta info row */}
                <div className="flex items-start gap-2 px-2 py-1.5">
                  {/* Color stripe */}
                  <div
                    className="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5"
                    style={{ backgroundColor: color }}
                  />

                  {/* Index */}
                  <span className="flex-shrink-0 text-[10px] text-gray-400 w-5 text-right font-mono mt-0.5">
                    #{group.groupIndex + 1}
                  </span>

                  {/* Playing indicator */}
                  <span
                    className={`flex-shrink-0 text-blue-500 text-xs transition-opacity mt-0.5 ${
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
                      {firstSeg.title}
                    </div>
                    {firstSeg.artist.length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        {firstSeg.artist.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
                    {isMulti && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1 rounded font-mono">
                        ×{group.segments.length}
                      </span>
                    )}
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

                  {/* Time range(s) + edit button(s) */}
                  {isMulti ? (
                    <div className="flex-shrink-0 flex flex-col gap-0.5">
                      {group.segments.map((seg) => {
                        const segLength = seg.endTime - seg.startTime;
                        return (
                          <div
                            key={seg.id}
                            className="flex items-center gap-1"
                          >
                            <div className="text-[10px] text-gray-400 font-mono text-right leading-tight">
                              <span>
                                {formatTime(seg.startTime)} →{" "}
                                {formatTime(seg.endTime)}
                              </span>
                              <span className="ml-1 text-gray-300">
                                ({formatTime(segLength)})
                              </span>
                            </div>
                            {onEditSong && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSong(seg);
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
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="flex-shrink-0 text-[10px] text-gray-400 font-mono text-right leading-tight">
                        <div>
                          {formatTime(firstSeg.startTime)} →{" "}
                          {formatTime(firstSeg.endTime)}
                        </div>
                        <div className="text-gray-300">
                          {formatTime(firstSeg.endTime - firstSeg.startTime)}
                        </div>
                      </div>
                      {onEditSong && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSong(firstSeg);
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
                    </>
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
                    {/* Segment bars (one per segment in group) */}
                    {group.segments.map((seg) => {
                      const left =
                        (seg.startTime / effectiveDuration) * 100;
                      const widthPct =
                        ((seg.endTime - seg.startTime) / effectiveDuration) *
                        100;
                      return (
                        <div
                          key={seg.id}
                          className="absolute top-0 h-full"
                          style={{
                            left: `${left}%`,
                            width: `max(${widthPct}%, 3px)`,
                            backgroundColor: isBeyond ? "#ef4444" : color,
                            opacity: isBeyond ? 0.5 : 1,
                          }}
                        />
                      );
                    })}
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
