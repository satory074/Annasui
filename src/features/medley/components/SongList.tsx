"use client";

import { useCallback, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeSimple } from "@/lib/utils/time";
import { useTimelineStore } from "../store";
import { usePlayerStore } from "@/features/player/store";
import type { SongSection } from "../types";
import { logger } from "@/lib/utils/logger";
import { groupSongSections, findNearestSection, flattenRowsToSections } from "../utils/groupSongs";
import type { SongListRow } from "../utils/groupSongs";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  isEditMode: boolean;
  onSeek?: (time: number) => void;
  onEdit?: (song: SongSection) => void;
  onDelete?: (id: string) => void;
  onReorder?: (songs: SongSection[]) => void;
}

export function SongList({
  songs,
  currentTime,
  duration,
  isEditMode,
  onSeek,
  onEdit,
  onDelete,
  onReorder,
}: SongListProps) {
  const selectSong = useTimelineStore((s) => s.selectSong);
  const selectedSongId = useTimelineStore((s) => s.selectedSongId);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleClick = useCallback(
    (song: SongSection) => {
      selectSong(song.id);
      onSeek?.(song.startTime);
    },
    [selectSong, onSeek]
  );

  const sorted = [...songs].sort((a, b) => a.startTime - b.startTime);

  // Group songs by songId in both modes
  const rows: SongListRow[] = useMemo(() => {
    return groupSongSections(sorted);
  }, [sorted]);

  // Flat list of all sections in display order (for "next section" references)
  const flatSections = useMemo(() => flattenRowsToSections(rows), [rows]);

  const handleGroupedClick = useCallback(
    (sections: SongSection[]) => {
      const nearest = findNearestSection(sections, currentTime);
      selectSong(nearest.id);
      onSeek?.(nearest.startTime);
    },
    [selectSong, onSeek, currentTime]
  );

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!isEditMode || !onReorder) return;
    setDragIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image semi-transparent
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = "1";
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex && onReorder) {
      const reorderedRows = [...rows];
      const [moved] = reorderedRows.splice(dragIndex, 1);
      reorderedRows.splice(dropIndex, 0, moved);

      // Flatten rows back to sections and re-assign orderIndex
      const updated = flattenRowsToSections(reorderedRows).map((song, i) => ({
        ...song,
        orderIndex: i,
      }));
      onReorder(updated);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  if (!songs.length) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        楽曲が登録されていません
      </div>
    );
  }

  // Helper to render time action buttons for a single section
  const renderSectionTimeButtons = (section: SongSection) => {
    const flatIndex = flatSections.indexOf(section);
    const nextSection = flatIndex < flatSections.length - 1 ? flatSections[flatIndex + 1] : null;

    return (
      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            useTimelineStore.getState().updateSong(section.id, { startTime: currentTime });
            logger.info('⏱️ 開始時刻を現在の再生位置に設定', { songId: section.id, currentTime });
          }}
          title="現在の再生位置を開始時刻に設定 ( [ )"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="6" y1="5" x2="6" y2="19" strokeWidth={2.5} strokeLinecap="round" />
            <polygon points="10,12 20,6 20,18" fill="currentColor" stroke="none" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            useTimelineStore.getState().updateSong(section.id, { endTime: currentTime });
            logger.info('⏱️ 終了時刻を現在の再生位置に設定', { songId: section.id, currentTime });
          }}
          title="現在の再生位置を終了時刻に設定 ( ] )"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polygon points="4,6 4,18 14,12" fill="currentColor" stroke="none" />
            <line x1="18" y1="5" x2="18" y2="19" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        </Button>
        {nextSection && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              useTimelineStore.getState().updateSong(section.id, { endTime: nextSection.startTime });
              logger.info('⏱️ 次の曲の開始時刻を終了時刻に設定', { songId: section.id, nextStartTime: nextSection.startTime });
            }}
            title="次の曲の開始時刻を終了時刻に設定"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 12h14" strokeWidth={2} strokeLinecap="round" />
              <path d="M13 6l6 6-6 6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <line x1="5" y1="5" x2="5" y2="19" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </Button>
        )}
        {nextSection && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              const ct = usePlayerStore.getState().currentTime;
              useTimelineStore.getState().updateSong(section.id, { endTime: ct });
              useTimelineStore.getState().updateSong(nextSection.id, { startTime: ct });
            }}
            title="現在の再生位置を終了時刻に＆次の曲の開始時刻に設定 ( Shift+] )"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polygon points="4,6 4,18 10,12" fill="currentColor" stroke="none" />
              <line x1="12" y1="5" x2="12" y2="19" strokeWidth={2.5} strokeLinecap="round" />
              <polygon points="20,6 20,18 14,12" fill="currentColor" stroke="none" />
            </svg>
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(section.id);
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        )}
      </div>
    );
  };

  // Track display index for numbering (accounts for grouped rows)
  let displayIndex = 0;

  return (
    <div className="space-y-1">
      {rows.map((row, rowIndex) => {
        if (row.type === "grouped") {
          const currentIndex = ++displayIndex;
          const { sections, displayTitle, displayArtist, displayColor, songId } = row;
          const isActive = sections.some(
            (s) => currentTime >= s.startTime && currentTime < s.endTime
          );
          const isSelected = sections.some((s) => s.id === selectedSongId);
          const isDropTarget = dropIndex === rowIndex && dragIndex !== rowIndex;

          return (
            <div
              key={`group-${songId}`}
              draggable={isEditMode && !!onReorder}
              onDragStart={(e) => handleDragStart(e, rowIndex)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, rowIndex)}
              onDragLeave={handleDragLeave}
              className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? "bg-orange-50 border border-orange-200"
                  : isSelected
                  ? "bg-indigo-50 border border-indigo-200"
                  : "hover:bg-gray-50 border border-transparent"
              } ${isDropTarget ? "border-t-2 border-t-indigo-400" : ""}`}
              onClick={() => handleGroupedClick(sections)}
            >
              <div className="flex items-center gap-2">
                {/* Drag handle (edit mode only) */}
                {isEditMode && onReorder && (
                  <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 touch-none">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="3" r="1.5" />
                      <circle cx="11" cy="3" r="1.5" />
                      <circle cx="5" cy="8" r="1.5" />
                      <circle cx="11" cy="8" r="1.5" />
                      <circle cx="5" cy="13" r="1.5" />
                      <circle cx="11" cy="13" r="1.5" />
                    </svg>
                  </div>
                )}

                {/* Index number */}
                <span className="font-mono text-xs text-gray-400 w-8 text-right shrink-0">
                  #{currentIndex}
                </span>

                {/* Color indicator */}
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: displayColor }}
                />

                {/* Song info + multi-segment position bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayTitle}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">/</span>
                    <p className="text-xs text-gray-500 truncate">
                      {Array.isArray(displayArtist)
                        ? displayArtist.join(", ")
                        : displayArtist}
                    </p>
                  </div>
                  {/* Multi-segment position bar */}
                  {duration > 0 && (
                    <div className="relative h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      {sections.map((s) => (
                        <div
                          key={s.id}
                          className="absolute top-0 h-full rounded-full opacity-70"
                          style={{
                            left: `${(s.startTime / duration) * 100}%`,
                            width: `${Math.max(((s.endTime - s.startTime) / duration) * 100, 0.5)}%`,
                            backgroundColor: displayColor,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit button for song metadata (edit mode only) */}
                {isEditMode && onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(sections[0]);
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                )}
              </div>

              {/* Section sub-rows (edit mode only) */}
              {isEditMode && (
                <div className="ml-14 mt-1 space-y-0.5">
                  {sections.map((section, sIdx) => {
                    const isSectionActive = currentTime >= section.startTime && currentTime < section.endTime;
                    const isSectionSelected = selectedSongId === section.id;

                    return (
                      <div
                        key={section.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                          isSectionActive
                            ? "bg-orange-100/60"
                            : isSectionSelected
                            ? "bg-indigo-100/60"
                            : "hover:bg-gray-100/60"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectSong(section.id);
                          onSeek?.(section.startTime);
                        }}
                      >
                        <span className="text-gray-400 shrink-0">区間{sIdx + 1}:</span>
                        <span className="font-mono text-gray-500 shrink-0">
                          {formatTimeSimple(section.startTime)}→{formatTimeSimple(section.endTime)}
                        </span>
                        <div className="flex-1" />
                        {renderSectionTimeButtons(section)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // SingleSongRow
        const song = row.section;
        const currentIndex = ++displayIndex;
        const isActive =
          currentTime >= song.startTime && currentTime < song.endTime;
        const isSelected = selectedSongId === song.id;
        const isDropTarget = dropIndex === rowIndex && dragIndex !== rowIndex;

        return (
          <div
            key={song.id}
            draggable={isEditMode && !!onReorder}
            onDragStart={(e) => handleDragStart(e, rowIndex)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, rowIndex)}
            onDragLeave={handleDragLeave}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isActive
                ? "bg-orange-50 border border-orange-200"
                : isSelected
                ? "bg-indigo-50 border border-indigo-200"
                : "hover:bg-gray-50 border border-transparent"
            } ${isDropTarget ? "border-t-2 border-t-indigo-400" : ""}`}
            onClick={() => handleClick(song)}
          >
            {/* Drag handle (edit mode only) */}
            {isEditMode && onReorder && (
              <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 touch-none">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="3" r="1.5" />
                  <circle cx="11" cy="3" r="1.5" />
                  <circle cx="5" cy="8" r="1.5" />
                  <circle cx="11" cy="8" r="1.5" />
                  <circle cx="5" cy="13" r="1.5" />
                  <circle cx="11" cy="13" r="1.5" />
                </svg>
              </div>
            )}

            {/* Index number */}
            <span className="font-mono text-xs text-gray-400 w-8 text-right shrink-0">
              #{currentIndex}
            </span>

            {/* Color indicator */}
            <div
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: song.color }}
            />

            {/* Song info + inline position bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {song.title}
                </p>
                <span className="text-xs text-gray-400 shrink-0">/</span>
                <p className="text-xs text-gray-500 truncate">
                  {Array.isArray(song.artist)
                    ? song.artist.join(", ")
                    : song.artist}
                </p>
              </div>
              {/* Inline position bar */}
              {duration > 0 && (
                <div className="relative h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-full opacity-70"
                    style={{
                      left: `${(song.startTime / duration) * 100}%`,
                      width: `${Math.max(((song.endTime - song.startTime) / duration) * 100, 0.5)}%`,
                      backgroundColor: song.color,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Time range — edit mode only */}
            {isEditMode && (
              <span className="font-mono text-xs text-gray-500 whitespace-nowrap shrink-0 hidden sm:inline">
                {formatTimeSimple(song.startTime)}→{formatTimeSimple(song.endTime)}
              </span>
            )}

            {/* Edit controls */}
            {isEditMode && (
              <div className="flex gap-1 shrink-0">
                {renderSectionTimeButtons(song)}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(song);
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
