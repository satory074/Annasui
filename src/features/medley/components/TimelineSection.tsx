"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { formatTimeSimple } from "@/lib/utils/time";
import type { SongSection } from "../types";

interface TimelineSectionProps {
  songs: SongSection[];
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  onSongTimeChange?: (songId: string, startTime: number, endTime: number) => void;
}

export function TimelineSection({
  songs,
  duration,
  currentTime,
  onSeek,
  onSongTimeChange,
}: TimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    songId: string;
    edge: "start" | "end";
    initialTime: number;
    initialMouseX: number;
  } | null>(null);
  const [dragTooltip, setDragTooltip] = useState<{ time: number; x: number; y: number } | null>(null);

  const timeToPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  const percentToTime = useCallback(
    (pct: number) => {
      return Math.max(0, Math.min(pct * duration, duration));
    },
    [duration]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragState) return; // Don't seek while dragging
      if (!containerRef.current || !onSeek || duration <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      onSeek(Math.max(0, Math.min(pct * duration, duration)));
    },
    [duration, onSeek, dragState]
  );

  // Drag handlers for resize
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, songId: string, edge: "start" | "end") => {
      e.stopPropagation();
      e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      const initialTime = edge === "start" ? song.startTime : song.endTime;
      setDragState({ songId, edge, initialTime, initialMouseX: clientX });

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const moveX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        const pct = (moveX - rect.left) / rect.width;
        const newTime = Math.round(percentToTime(pct) * 10) / 10; // 0.1s precision

        setDragTooltip({
          time: newTime,
          x: moveX,
          y: rect.top - 30,
        });
      };

      const handleEnd = (ev: MouseEvent | TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const endX = "changedTouches" in ev ? ev.changedTouches[0].clientX : ev.clientX;
        const pct = (endX - rect.left) / rect.width;
        let newTime = Math.round(percentToTime(pct) * 10) / 10;

        const currentSong = songs.find((s) => s.id === songId);
        if (currentSong && onSongTimeChange) {
          if (edge === "start") {
            newTime = Math.min(newTime, currentSong.endTime - 0.5);
            newTime = Math.max(0, newTime);
            onSongTimeChange(songId, newTime, currentSong.endTime);
          } else {
            newTime = Math.max(newTime, currentSong.startTime + 0.5);
            newTime = Math.min(duration, newTime);
            onSongTimeChange(songId, currentSong.startTime, newTime);
          }
        }

        setDragState(null);
        setDragTooltip(null);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [songs, percentToTime, duration, onSongTimeChange]
  );

  // Group overlapping songs into rows
  const rows = useMemo(() => {
    const sorted = [...songs].sort((a, b) => a.startTime - b.startTime);
    const rowEnds: number[] = [];
    const assignments: number[] = [];

    for (const song of sorted) {
      let placed = false;
      for (let r = 0; r < rowEnds.length; r++) {
        if (song.startTime >= rowEnds[r]) {
          rowEnds[r] = song.endTime;
          assignments.push(r);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rowEnds.push(song.endTime);
        assignments.push(rowEnds.length - 1);
      }
    }

    return { sorted, assignments, rowCount: rowEnds.length || 1 };
  }, [songs]);

  const playheadPct = timeToPercent(currentTime);

  return (
    <div className="space-y-2">
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 font-mono px-1">
        <span>0:00</span>
        <span>{formatTimeSimple(duration / 4)}</span>
        <span>{formatTimeSimple(duration / 2)}</span>
        <span>{formatTimeSimple((duration * 3) / 4)}</span>
        <span>{formatTimeSimple(duration)}</span>
      </div>

      {/* Timeline track */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative bg-gray-100 rounded-lg cursor-pointer overflow-visible"
        style={{ height: `${rows.rowCount * 28 + 8}px` }}
      >
        {/* Song segments */}
        {rows.sorted.map((song, i) => {
          const left = timeToPercent(song.startTime);
          const width = timeToPercent(song.endTime) - left;
          const row = rows.assignments[i];
          const isDragging = dragState?.songId === song.id;

          return (
            <div
              key={song.id}
              className={`absolute h-6 rounded-md opacity-80 hover:opacity-100 transition-opacity flex items-center overflow-hidden group ${
                isDragging ? "opacity-100 ring-2 ring-white shadow-lg" : ""
              }`}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`,
                top: `${row * 28 + 4}px`,
                backgroundColor: song.color,
              }}
              title={song.title}
            >
              {/* Left drag handle */}
              {onSongTimeChange && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/30 hover:bg-white/60 rounded-l-md"
                  onMouseDown={(e) => handleDragStart(e, song.id, "start")}
                  onTouchStart={(e) => handleDragStart(e, song.id, "start")}
                />
              )}

              <span className="text-xs text-white font-medium truncate drop-shadow-sm px-1.5">
                {song.title}
              </span>

              {/* Right drag handle */}
              {onSongTimeChange && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/30 hover:bg-white/60 rounded-r-md"
                  onMouseDown={(e) => handleDragStart(e, song.id, "end")}
                  onTouchStart={(e) => handleDragStart(e, song.id, "end")}
                />
              )}
            </div>
          );
        })}

        {/* Playhead */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
        )}
      </div>

      {/* Drag tooltip */}
      {dragTooltip && (
        <div
          className="fixed z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none font-mono"
          style={{ left: dragTooltip.x, top: dragTooltip.y, transform: "translateX(-50%)" }}
        >
          {formatTimeSimple(dragTooltip.time)}
        </div>
      )}
    </div>
  );
}
