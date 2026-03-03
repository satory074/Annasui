"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SongSection } from "@/features/medley/types";

interface RightSidebarProps {
  songs: SongSection[];
  currentTime: number;
}

export function RightSidebar({ songs, currentTime }: RightSidebarProps) {
  const activeSongs = useMemo(() => {
    if (!songs.length || currentTime <= 0) return [];

    // Find active songs and deduplicate by title
    const active = songs.filter(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );

    const seen = new Set<string>();
    return active.filter((s) => {
      const key = s.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [songs, currentTime]);

  return (
    <div className="w-80 bg-gray-50 sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-700">現在再生中</h2>
        {activeSongs.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeSongs.length}
          </Badge>
        )}
      </div>

      {activeSongs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          再生中の楽曲はありません
        </p>
      ) : (
        <div className="space-y-2">
          {activeSongs.map((song, i) => (
            <Card
              key={song.id}
              className="border-gray-200 animate-in fade-in slide-in-from-right-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: song.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {song.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {Array.isArray(song.artist)
                        ? song.artist.join(", ")
                        : song.artist}
                    </p>

                    {/* Platform links */}
                    <div className="flex gap-1 mt-1">
                      {song.niconicoLink && (
                        <a
                          href={song.niconicoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          nico
                        </a>
                      )}
                      {song.youtubeLink && (
                        <a
                          href={song.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          YT
                        </a>
                      )}
                      {song.spotifyLink && (
                        <a
                          href={song.spotifyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          Spotify
                        </a>
                      )}
                      {song.applemusicLink && (
                        <a
                          href={song.applemusicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          Apple
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
