"use client";

import { useMemo } from "react";
import { useCurrentTime } from "../store";
import type { SongSection } from "@/features/medley/types";

/**
 * Determines which song(s) are currently playing based on the player's currentTime.
 * Returns an array because medleys can have overlapping segments.
 */
export function useCurrentTrack(songs: SongSection[]): SongSection[] {
  const currentTime = useCurrentTime();

  return useMemo(() => {
    if (!songs.length || currentTime <= 0) return [];

    return songs.filter(
      (song) => currentTime >= song.startTime && currentTime < song.endTime
    );
  }, [songs, currentTime]);
}
