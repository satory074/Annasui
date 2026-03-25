"use client";

import { useMemo } from "react";
import { formatTimeSimple } from "@/lib/utils/time";
import type { SongSection } from "../types";

interface NowPlayingStripProps {
  songs: SongSection[];
  currentTime: number;
}

export function NowPlayingStrip({ songs, currentTime }: NowPlayingStripProps) {
  const activeSong = useMemo(() => {
    return songs.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
  }, [songs, currentTime]);

  if (!activeSong) {
    return (
      <div className="h-8 flex items-center px-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        再生中の楽曲はありません
      </div>
    );
  }

  return (
    <div className="h-8 flex items-center gap-2 px-3 bg-gray-50 border-t border-gray-200 shrink-0">
      <div
        className="w-2 h-2 rounded-full shrink-0 animate-pulse"
        style={{ backgroundColor: activeSong.color }}
      />
      <span className="text-xs font-medium text-gray-900 truncate">
        {activeSong.title}
      </span>
      <span className="text-xs text-gray-400 shrink-0">/</span>
      <span className="text-xs text-gray-500 truncate">
        {activeSong.artist.join(", ")}
      </span>
      <span className="text-[10px] text-gray-400 font-mono ml-auto shrink-0">
        {formatTimeSimple(activeSong.startTime)}→{formatTimeSimple(activeSong.endTime)}
      </span>

      {/* Platform links */}
      <div className="flex gap-1 shrink-0">
        {activeSong.niconicoLink && (
          <a
            href={activeSong.niconicoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
          >
            nico
          </a>
        )}
        {activeSong.youtubeLink && (
          <a
            href={activeSong.youtubeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
          >
            YT
          </a>
        )}
        {activeSong.spotifyLink && (
          <a
            href={activeSong.spotifyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
          >
            Spotify
          </a>
        )}
      </div>
    </div>
  );
}
