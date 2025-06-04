"use client";

import PlayPauseButton from "@/components/ui/PlayPauseButton";
import VolumeSlider from "./VolumeSlider";
import { formatTime } from "@/lib/utils/time";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlayPause: () => void;
  onSeek: (seekTime: number) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
}

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlayPause,
  onSeek,
  onVolumeChange,
  onToggleFullscreen,
}: PlayerControlsProps) {

  return (
    <div className="bg-gray-800 p-3 flex items-center gap-3">
      <PlayPauseButton isPlaying={isPlaying} onClick={onTogglePlayPause} />

      <div className="text-white text-sm">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="flex-grow">
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
      </div>

      <VolumeSlider volume={volume} onChange={onVolumeChange} />

      <button onClick={onToggleFullscreen} className="text-white hover:text-pink-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </button>
    </div>
  );
}