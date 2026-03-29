"use client";

import { useCallback, useRef, useState } from "react";
import {
  usePlayerStore,
  useCurrentTime,
  useIsPlaying,
  useDuration,
  useVolume,
} from "../store";
import { formatTime } from "@/lib/utils/time";

interface FixedPlayerBarProps {
  title?: string;
  creator?: string;
}

export function FixedPlayerBar({ title, creator }: FixedPlayerBarProps) {
  const currentTime = useCurrentTime();
  const isPlaying = useIsPlaying();
  const duration = useDuration();
  const volume = useVolume();

  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekHover, setSeekHover] = useState<number | null>(null);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getTimeFromMouseEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!seekBarRef.current || duration <= 0) return 0;
      const rect = seekBarRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return Math.round(pct * duration * 10) / 10;
    },
    [duration]
  );

  const handleSeekClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromMouseEvent(e);
      usePlayerStore.getState().seek(time);
    },
    [getTimeFromMouseEvent]
  );

  const handleSeekMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsSeeking(true);
      const time = getTimeFromMouseEvent(e);
      setSeekPreview(time);

      const handleMouseMove = (ev: MouseEvent) => {
        if (!seekBarRef.current || duration <= 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        setSeekPreview(Math.round(pct * duration * 10) / 10);
      };

      const handleMouseUp = (ev: MouseEvent) => {
        if (!seekBarRef.current || duration <= 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const finalTime = Math.round(pct * duration * 10) / 10;
        usePlayerStore.getState().seek(finalTime);
        setIsSeeking(false);
        setSeekPreview(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [duration, getTimeFromMouseEvent]
  );

  const handleSeekHover = useCallback(
    (e: React.MouseEvent) => {
      if (!seekBarRef.current || duration <= 0) return;
      const rect = seekBarRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setSeekHover(pct * duration);
    },
    [duration]
  );

  const handleTogglePlay = useCallback(() => {
    usePlayerStore.getState().togglePlayPause();
  }, []);

  const handleSkipBack = useCallback(() => {
    usePlayerStore.getState().seek(Math.max(0, currentTime - 5));
  }, [currentTime]);

  const handleSkipForward = useCallback(() => {
    usePlayerStore.getState().seek(Math.min(duration, currentTime + 5));
  }, [currentTime, duration]);

  const handleSkipToStart = useCallback(() => {
    usePlayerStore.getState().seek(0);
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      usePlayerStore.getState().setVolume(vol);
      usePlayerStore.getState()._adapter?.setVolume(vol);
    },
    []
  );

  const handleToggleMute = useCallback(() => {
    const currentVol = usePlayerStore.getState().volume;
    const newVol = currentVol > 0 ? 0 : 1;
    usePlayerStore.getState().setVolume(newVol);
    usePlayerStore.getState()._adapter?.setVolume(newVol);
  }, []);

  const handleFullscreen = useCallback(() => {
    usePlayerStore.getState().toggleFullscreen();
  }, []);

  const displayPct = isSeeking && seekPreview !== null
    ? (seekPreview / duration) * 100
    : progressPct;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 text-white">
      <div className="max-w-[var(--content-max-w-wide)] mx-auto">
      {/* Seek bar (full-width, on top of the bar) */}
      <div
        ref={seekBarRef}
        className="relative h-1.5 bg-gray-600 cursor-pointer group hover:h-2.5 transition-all"
        onClick={handleSeekClick}
        onMouseDown={handleSeekMouseDown}
        onMouseMove={handleSeekHover}
        onMouseLeave={() => setSeekHover(null)}
      >
        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full bg-orange-500 rounded-r-sm transition-[width] duration-100"
          style={{ width: `${displayPct}%` }}
        />
        {/* Seek hover indicator */}
        {seekHover !== null && !isSeeking && (
          <div
            className="absolute top-0 h-full bg-white/20"
            style={{
              left: `${Math.min(displayPct, (seekHover / duration) * 100)}%`,
              width: `${Math.abs((seekHover / duration) * 100 - displayPct)}%`,
            }}
          />
        )}
        {/* Hover tooltip */}
        {seekHover !== null && !isSeeking && (
          <div
            className="absolute -top-8 px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none font-mono transform -translate-x-1/2"
            style={{ left: `${(seekHover / duration) * 100}%` }}
          >
            {formatTime(seekHover)}
          </div>
        )}
        {/* Drag preview tooltip */}
        {isSeeking && seekPreview !== null && (
          <div
            className="absolute -top-8 px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded shadow-lg pointer-events-none font-mono transform -translate-x-1/2"
            style={{ left: `${(seekPreview / duration) * 100}%` }}
          >
            {formatTime(seekPreview)}
          </div>
        )}
        {/* Scrubber dot */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-orange-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${displayPct}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center px-4 py-2 gap-4">
        {/* Left: Title / Creator */}
        <div className="hidden sm:flex flex-col min-w-0 w-1/4 shrink-0">
          <p className="text-sm font-medium truncate">
            {title ?? ""}
          </p>
          {creator && (
            <p className="text-xs text-gray-400 truncate">{creator}</p>
          )}
        </div>

        {/* Center: Playback controls + time */}
        <div className="flex-1 flex items-center justify-center gap-3">
          {/* Skip to start */}
          <button
            onClick={handleSkipToStart}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="最初に戻る"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>

          {/* Rewind 5s */}
          <button
            onClick={handleSkipBack}
            className="p-1.5 text-gray-300 hover:text-white transition-colors"
            aria-label="5秒戻る"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              <text x="9.5" y="16" fontSize="7" fontWeight="bold" fill="currentColor">5</text>
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={handleTogglePlay}
            className="p-2 bg-white text-gray-900 rounded-full hover:scale-105 transition-transform"
            aria-label={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward 5s */}
          <button
            onClick={handleSkipForward}
            className="p-1.5 text-gray-300 hover:text-white transition-colors"
            aria-label="5秒進む"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
              <text x="9.5" y="16" fontSize="7" fontWeight="bold" fill="currentColor">5</text>
            </svg>
          </button>

          {/* Time display */}
          <div className="text-xs font-mono text-gray-400 whitespace-nowrap ml-2">
            {formatTime(currentTime)}
            <span className="text-gray-600"> / </span>
            {formatTime(duration)}
          </div>
        </div>

        {/* Right: Volume + Fullscreen */}
        <div className="hidden sm:flex items-center gap-2 w-1/4 justify-end shrink-0">
          {/* Mute toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label={volume > 0 ? "ミュート" : "ミュート解除"}
          >
            {volume > 0 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            )}
          </button>

          {/* Volume slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-orange-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            aria-label="音量"
          />

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="フルスクリーン"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
