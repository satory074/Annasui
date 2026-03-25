"use client";

import { useCallback, useRef, useState } from "react";
import { formatTimeSimple } from "@/lib/utils/time";
import { useTimelineStore } from "../store";
import type { SongSection } from "../types";
import type { BlockLayout } from "../utils/timelineLayout";

interface TimelineBlockProps {
  layout: BlockLayout;
  isActive: boolean;
  isSelected: boolean;
  isEditMode: boolean;
  pixelsPerSecond: number;
  onSeek?: (time: number) => void;
  onEdit?: (song: SongSection) => void;
}

export function TimelineBlock({
  layout,
  isActive,
  isSelected,
  isEditMode,
  pixelsPerSecond,
  onSeek,
  onEdit,
}: TimelineBlockProps) {
  const { song, leftPx, widthPx } = layout;
  const [dragEdge, setDragEdge] = useState<"start" | "end" | null>(null);
  const dragStartRef = useRef<{ x: number; originalTime: number } | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useTimelineStore.getState().selectSong(song.id);
      onSeek?.(song.startTime);
    },
    [song.id, song.startTime, onSeek]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditMode && onEdit) {
        onEdit(song);
      }
    },
    [isEditMode, onEdit, song]
  );

  // Edge drag for start/end time adjustment (edit mode only)
  const handleEdgeMouseDown = useCallback(
    (e: React.MouseEvent, edge: "start" | "end") => {
      if (!isEditMode) return;
      e.stopPropagation();
      e.preventDefault();
      setDragEdge(edge);
      dragStartRef.current = {
        x: e.clientX,
        originalTime: edge === "start" ? song.startTime : song.endTime,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStartRef.current) return;
        const deltaX = moveEvent.clientX - dragStartRef.current.x;
        const deltaTime = deltaX / pixelsPerSecond;
        const newTime = Math.max(0, dragStartRef.current.originalTime + deltaTime);

        if (edge === "start") {
          if (newTime < song.endTime) {
            useTimelineStore.getState().updateSong(song.id, { startTime: newTime });
          }
        } else {
          if (newTime > song.startTime) {
            useTimelineStore.getState().updateSong(song.id, { endTime: newTime });
          }
        }
      };

      const handleMouseUp = () => {
        setDragEdge(null);
        dragStartRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [isEditMode, song.id, song.startTime, song.endTime, pixelsPerSecond]
  );

  // Show title if block is wide enough
  const showTitle = widthPx > 40;
  const showTime = widthPx > 80;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-shadow group
        ${isActive ? "ring-2 ring-orange-400 shadow-lg z-10" : ""}
        ${isSelected && !isActive ? "ring-2 ring-blue-400 z-10" : ""}
        ${!isActive && !isSelected ? "hover:brightness-110 hover:shadow-md" : ""}
      `}
      style={{
        left: leftPx,
        width: widthPx,
        backgroundColor: song.color || "#94a3b8",
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={`${song.title} / ${song.artist.join(", ")}\n${formatTimeSimple(song.startTime)} → ${formatTimeSimple(song.endTime)}`}
    >
      {/* Content */}
      <div className="h-full flex items-center px-1 overflow-hidden">
        {showTitle && (
          <span className="text-[11px] font-medium text-white truncate drop-shadow-sm leading-tight">
            {song.title}
          </span>
        )}
      </div>

      {/* Time label on hover */}
      {showTime && (
        <div className="absolute -bottom-5 left-0 text-[9px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {formatTimeSimple(song.startTime)}→{formatTimeSimple(song.endTime)}
        </div>
      )}

      {/* Drag handles (edit mode only) */}
      {isEditMode && (
        <>
          <div
            className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/40 rounded-l ${
              dragEdge === "start" ? "bg-white/50" : ""
            }`}
            onMouseDown={(e) => handleEdgeMouseDown(e, "start")}
          />
          <div
            className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/40 rounded-r ${
              dragEdge === "end" ? "bg-white/50" : ""
            }`}
            onMouseDown={(e) => handleEdgeMouseDown(e, "end")}
          />
        </>
      )}
    </div>
  );
}
