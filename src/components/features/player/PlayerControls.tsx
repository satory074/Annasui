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
  // シークバーの位置と値を計算
  const getSeekBarPosition = (time: number): number => {
    if (duration <= 0) return 0;
    return (time / duration) * 100;
  };

  const getTimeFromPosition = (percentage: number): number => {
    return (percentage / 100) * duration;
  };

  return (
    <div className="bg-gray-800 px-3 py-2 flex items-center gap-3">
      <PlayPauseButton isPlaying={isPlaying} onClick={onTogglePlayPause} />

      <div className="text-white text-sm">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="flex-grow">
        {/* タイムライン風のシークバー */}
        <div 
          className="relative w-full h-8 bg-gray-600 rounded cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = (clickX / rect.width) * 100;
            const seekTime = getTimeFromPosition(percentage);
            onSeek(Math.max(0, Math.min(duration, seekTime)));
          }}
        >
          {/* 背景グリッド */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 11 }).map((_, i) => (
              <div 
                key={i} 
                className="border-l border-gray-500 opacity-30" 
                style={{ left: `${(i / 10) * 100}%` }}
              />
            ))}
          </div>
          
          {/* 進行状況バー */}
          <div 
            className="absolute top-0 bottom-0 bg-caramel-600 rounded-l"
            style={{ width: `${Math.max(0, getSeekBarPosition(currentTime))}%` }}
          />
          
          {/* 再生位置インジケーター（赤い線） */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${getSeekBarPosition(currentTime)}%` }}
          />
        </div>
      </div>

      <VolumeSlider volume={volume} onChange={onVolumeChange} />

      <button onClick={onToggleFullscreen} className="text-white hover:text-caramel-400">
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