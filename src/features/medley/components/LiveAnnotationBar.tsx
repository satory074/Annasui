"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/features/player/store";
import { useTimelineStore } from "../store";
import { Button } from "@/components/ui/button";

interface LiveAnnotationBarProps {
  onClose: () => void;
}

/**
 * Fixed bottom bar for continuous live annotation during playback.
 *
 * Keyboard shortcuts (when bar is mounted):
 *   Enter       — commit current song, start next (endTime of prev = currentTime)
 *   Ctrl+L      — exit live mode
 *   Tab         — cycle between title and artist fields
 *   Space (when focus is outside an input) — mark the current time
 */
export function LiveAnnotationBar({ onClose }: LiveAnnotationBarProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [markedTime, setMarkedTime] = useState<number | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const artistRef = useRef<HTMLInputElement>(null);

  const currentTime = usePlayerStore((s) => s.currentTime);
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const snapTime = useCallback((t: number): number => t, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCommit = useCallback(() => {
    if (!title.trim()) return;

    const startTime = snapTime(markedTime ?? currentTimeRef.current);
    const endTime = snapTime(currentTimeRef.current);

    const { songs } = useTimelineStore.getState();

    // Update previous song's endTime if needed
    if (songs.length > 0) {
      const last = songs[songs.length - 1];
      if (last.endTime <= last.startTime) {
        useTimelineStore.getState().updateSong(last.id, { endTime: startTime });
      }
    }

    // Add new song
    useTimelineStore.getState().addSong({
      id: crypto.randomUUID(),
      orderIndex: songs.length,
      title: title.trim(),
      artist: artist.trim() ? [artist.trim()] : [],
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round((endTime + 30) * 10) / 10,
      color: `bg-${["blue", "green", "purple", "yellow", "pink", "indigo"][songs.length % 6]}-400`,
      niconicoLink: "",
      youtubeLink: "",
      spotifyLink: "",
      applemusicLink: "",
    });

    setTitle("");
    setMarkedTime(null);
    // Keep artist for continuous input support
    titleRef.current?.focus();
  }, [title, artist, markedTime]);

  const handleClose = useCallback(() => {
    // Set endTime of last song to currentTime
    const { songs } = useTimelineStore.getState();
    if (songs.length > 0) {
      const last = songs[songs.length - 1];
      useTimelineStore
        .getState()
        .updateSong(last.id, { endTime: snapTime(currentTimeRef.current) });
    }
    usePlayerStore.getState().setLiveMode(false);
    onClose();
  }, [onClose, snapTime]);

  // Intercept Space (when focus outside input) and Ctrl+L globally
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === " " && !isInput) {
        e.preventDefault();
        e.stopPropagation();
        setMarkedTime(snapTime(currentTimeRef.current));
      }

      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [handleClose, snapTime]);

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (document.activeElement === titleRef.current) {
        artistRef.current?.focus();
      } else {
        titleRef.current?.focus();
      }
    }
  };

  const startTime = markedTime ?? currentTime;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white border-t-2 border-orange-500 shadow-2xl">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Current/marked time badge */}
          <div className="flex-shrink-0 text-center">
            <div className="text-xs text-gray-400">開始</div>
            <div className="text-sm font-mono font-bold text-orange-400">
              {formatTime(startTime)}
            </div>
          </div>

          {/* Title input */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="曲名 (Enter で追加)"
            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-400 text-gray-900"
          />

          {/* Artist input */}
          <input
            ref={artistRef}
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="アーティスト"
            className="w-40 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-400 text-gray-900"
          />

          {/* Actions */}
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={!title.trim()}
            className="flex-shrink-0"
          >
            追加
          </Button>

          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400"
            title="ライブ入力を終了 (Ctrl+L)"
          >
            終了
          </button>
        </div>

        {/* Help text */}
        <div className="flex gap-4 mt-1 text-xs text-gray-500">
          <span>
            <kbd className="px-1 bg-gray-700 rounded">Space</kbd> 現在時刻をマーク
          </span>
          <span>
            <kbd className="px-1 bg-gray-700 rounded">Enter</kbd> 曲を追加
          </span>
          <span>
            <kbd className="px-1 bg-gray-700 rounded">Ctrl+L</kbd> 終了
          </span>
          {markedTime !== null && (
            <span className="text-orange-400">
              ● {formatTime(markedTime)} にマーク済み
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
