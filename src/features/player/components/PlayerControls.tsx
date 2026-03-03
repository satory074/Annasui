"use client";

import { usePlayerStore, useCurrentTime, useIsPlaying, useDuration } from "../store";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils/time";

export function PlayerControls() {
  const currentTime = useCurrentTime();
  const isPlaying = useIsPlaying();
  const duration = useDuration();

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Play / Pause placeholder — actual playback is controlled via adapter */}
      <div className="text-xs font-mono text-gray-600 whitespace-nowrap">
        {formatTime(currentTime)}
        <span className="text-gray-400"> / </span>
        {formatTime(duration)}
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-150"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <span className="text-xs text-green-600 font-medium">再生中</span>
      )}
    </div>
  );
}
