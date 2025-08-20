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
  // ズーム対応プロパティ
  visibleStartTime?: number;
  visibleDuration?: number;
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
  visibleStartTime = 0,
  visibleDuration,
}: PlayerControlsProps) {
  // ズーム対応の計算値
  const effectiveVisibleDuration = visibleDuration || duration;
  const effectiveVisibleStartTime = visibleStartTime;
  const visibleEndTime = effectiveVisibleStartTime + effectiveVisibleDuration;

  // シークバーの位置と値を計算（SongListと同じロジック）
  const getSeekBarPosition = (time: number): number => {
    if (effectiveVisibleDuration <= 0) return 0;
    // 可視範囲外は表示しない
    if (time < effectiveVisibleStartTime || time > effectiveVisibleStartTime + effectiveVisibleDuration) {
      return -1; // 範囲外
    }
    return ((time - effectiveVisibleStartTime) / effectiveVisibleDuration) * 100;
  };

  const getTimeFromPosition = (percentage: number): number => {
    return effectiveVisibleStartTime + (percentage / 100) * effectiveVisibleDuration;
  };

  return (
    <div className="bg-gray-800 px-3 py-2 flex items-center gap-3">
      <PlayPauseButton isPlaying={isPlaying} onClick={onTogglePlayPause} />

      <div className="text-white text-sm">
        {formatTime(currentTime)} / {formatTime(duration)}
        {visibleDuration && (
          <span className="text-gray-400 ml-2">
            [{formatTime(effectiveVisibleStartTime)} - {formatTime(Math.min(visibleEndTime, duration))}]
          </span>
        )}
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
          {getSeekBarPosition(currentTime) >= 0 && (
            <div 
              className="absolute top-0 bottom-0 bg-pink-500 rounded-l"
              style={{ width: `${Math.max(0, getSeekBarPosition(currentTime))}%` }}
            />
          )}
          
          {/* 再生位置インジケーター（赤い線） */}
          {getSeekBarPosition(currentTime) >= 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${getSeekBarPosition(currentTime)}%` }}
            />
          )}
        </div>
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