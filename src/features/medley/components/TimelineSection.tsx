"use client";

import { useMemo, useCallback, useRef } from "react";
import { formatTimeSimple } from "@/lib/utils/time";
import type { SongSection } from "../types";

interface TimelineSectionProps {
  songs: SongSection[];
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}

export function TimelineSection({
  songs,
  duration,
  currentTime,
  onSeek,
}: TimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const timeToPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !onSeek || duration <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      onSeek(Math.max(0, Math.min(pct * duration, duration)));
    },
    [duration, onSeek]
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
        className="relative bg-gray-100 rounded-lg cursor-pointer overflow-hidden"
        style={{ height: `${rows.rowCount * 28 + 8}px` }}
      >
        {/* Song segments */}
        {rows.sorted.map((song, i) => {
          const left = timeToPercent(song.startTime);
          const width = timeToPercent(song.endTime) - left;
          const row = rows.assignments[i];

          return (
            <div
              key={song.id}
              className="absolute h-6 rounded-md opacity-80 hover:opacity-100 transition-opacity flex items-center px-1.5 overflow-hidden"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`,
                top: `${row * 28 + 4}px`,
                backgroundColor: song.color,
              }}
              title={`${song.title} (${formatTimeSimple(song.startTime)} - ${formatTimeSimple(song.endTime)})`}
            >
              <span className="text-xs text-white font-medium truncate drop-shadow-sm">
                {song.title}
              </span>
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
    </div>
  );
}
