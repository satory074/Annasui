"use client";

import { useCallback, useRef, useMemo } from "react";
import { useTimelineScroll } from "../hooks/useTimelineScroll";
import {
  calculateBlockLayouts,
  getTimelineWidth,
  pxToSeconds,
  secondsToPx,
} from "../utils/timelineLayout";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineBlock } from "./TimelineBlock";
import { NowPlayingStrip } from "./NowPlayingStrip";
import { TimelineZoomControls } from "./TimelineZoomControls";
import { useTimelineStore } from "../store";
import type { SongSection } from "../types";
import { useResizeObserver } from "../hooks/useResizeObserver";

interface TimelineViewProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  isEditMode: boolean;
  onSeek?: (time: number) => void;
  onEdit?: (song: SongSection) => void;
}

export function TimelineView({
  songs,
  currentTime,
  duration,
  isEditMode,
  onSeek,
  onEdit,
}: TimelineViewProps) {
  const selectedSongId = useTimelineStore((s) => s.selectedSongId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useResizeObserver(containerRef);

  const {
    pixelsPerSecond,
    scrollContainerRef,
    zoomIn,
    zoomOut,
    zoomToFit,
    handleWheel,
  } = useTimelineScroll({ duration, containerWidth });

  const totalWidth = getTimelineWidth(duration, pixelsPerSecond);

  const blockLayouts = useMemo(
    () => calculateBlockLayouts(songs, duration, pixelsPerSecond),
    [songs, duration, pixelsPerSecond]
  );

  // Click on empty space to seek
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = e.currentTarget.parentElement?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = pxToSeconds(x, pixelsPerSecond);
      if (time >= 0 && time <= duration) {
        onSeek?.(time);
      }
    },
    [pixelsPerSecond, duration, onSeek]
  );

  const playheadPx = secondsToPx(currentTime, pixelsPerSecond);

  if (!songs.length) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        楽曲が登録されていません
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 border border-gray-200 rounded-lg overflow-hidden bg-white" ref={containerRef}>
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-gray-200">
        <span className="text-[10px] text-gray-400 font-mono">
          {songs.length}曲
        </span>
        <TimelineZoomControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomToFit={zoomToFit}
        />
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden flex-1 min-h-0"
        onWheel={handleWheel}
      >
        {/* Ruler */}
        <TimelineRuler
          duration={duration}
          pixelsPerSecond={pixelsPerSecond}
          totalWidth={totalWidth}
        />

        {/* Track area */}
        <div
          className="relative bg-gray-100 cursor-crosshair min-h-[48px] h-full"
          style={{ width: totalWidth }}
          onClick={handleTrackClick}
        >
          {/* Song blocks */}
          {blockLayouts.map((layout) => (
            <TimelineBlock
              key={layout.song.id}
              layout={layout}
              isActive={
                currentTime >= layout.song.startTime &&
                currentTime < layout.song.endTime
              }
              isSelected={selectedSongId === layout.song.id}
              isEditMode={isEditMode}
              pixelsPerSecond={pixelsPerSecond}
              onSeek={onSeek}
              onEdit={onEdit}
            />
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20 pointer-events-none"
            style={{ left: playheadPx }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Now playing strip */}
      <NowPlayingStrip songs={songs} currentTime={currentTime} />
    </div>
  );
}
