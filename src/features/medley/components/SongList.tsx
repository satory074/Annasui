"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeSimple } from "@/lib/utils/time";
import { useTimelineStore } from "../store";
import type { SongSection } from "../types";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  isEditMode: boolean;
  onSeek?: (time: number) => void;
  onEdit?: (song: SongSection) => void;
  onDelete?: (id: string) => void;
  onReorder?: (songs: SongSection[]) => void;
}

export function SongList({
  songs,
  currentTime,
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
      const reordered = [...sorted];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);

      // Re-assign orderIndex based on new positions
      const updated = reordered.map((song, i) => ({
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

  return (
    <div className="space-y-1">
      {sorted.map((song, index) => {
        const isActive =
          currentTime >= song.startTime && currentTime < song.endTime;
        const isSelected = selectedSongId === song.id;
        const isDropTarget = dropIndex === index && dragIndex !== index;

        return (
          <div
            key={song.id}
            draggable={isEditMode && !!onReorder}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isActive
                ? "bg-orange-50 border border-orange-200"
                : isSelected
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-50 border border-transparent"
            } ${isDropTarget ? "border-t-2 border-t-blue-400" : ""}`}
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

            {/* Color indicator */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: song.color }}
            />

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {song.title}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {Array.isArray(song.artist)
                  ? song.artist.join(", ")
                  : song.artist}
              </p>
            </div>

            {/* Time badge */}
            <Badge variant="secondary" className="text-xs shrink-0 font-mono">
              {formatTimeSimple(song.startTime)} -{" "}
              {formatTimeSimple(song.endTime)}
            </Badge>

            {/* Edit controls */}
            {isEditMode && (
              <div className="flex gap-1 shrink-0">
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
                    <svg
                      className="w-3.5 h-3.5"
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
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(song.id);
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
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
