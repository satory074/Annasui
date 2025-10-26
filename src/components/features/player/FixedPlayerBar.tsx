"use client";

import PlayPauseButton from "@/components/ui/PlayPauseButton";
import VolumeSlider from "./VolumeSlider";
import { formatTime } from "@/lib/utils/time";

interface FixedPlayerBarProps {
  // 左側セクション: タイトル情報
  title?: string;
  creator?: string;
  originalVideoUrl?: string;

  // 中央セクション: 再生コントロール
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayPause: () => void;
  onSeek: (seekTime: number) => void;

  // 右側セクション: ボリューム・フルスクリーン
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
}

export default function FixedPlayerBar({
  title,
  creator,
  originalVideoUrl,
  isPlaying,
  currentTime,
  duration,
  onTogglePlayPause,
  onSeek,
  volume,
  onVolumeChange,
  onToggleFullscreen,
}: FixedPlayerBarProps) {
  // シークバーの位置と値を計算
  const getSeekBarPosition = (time: number): number => {
    if (duration <= 0) return 0;
    return (time / duration) * 100;
  };

  const getTimeFromPosition = (percentage: number): number => {
    return (percentage / 100) * duration;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-2xl border-t border-gray-700">
      <div className="flex items-center px-4 py-3 gap-4">

        {/* 左側セクション: タイトル情報 (30%) */}
        <div className="w-1/4 min-w-[200px] flex items-center gap-3">
          {/* タイトル・制作者情報 */}
          <div className="flex-1 min-w-0">
            {title && (
              originalVideoUrl ? (
                <a
                  href={originalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white hover:text-orange-400 hover:underline transition-colors truncate block"
                  title={title}
                >
                  {title}
                </a>
              ) : (
                <h3 className="text-sm font-semibold text-white truncate" title={title}>
                  {title}
                </h3>
              )
            )}
            {creator && (
              <p className="text-xs text-gray-400 truncate" title={creator}>
                {creator}
              </p>
            )}
          </div>
        </div>

        {/* 中央セクション: 再生コントロール + シークバー (50%) */}
        <div className="flex-1 flex flex-col gap-2">
          {/* 再生コントロールボタン */}
          <div className="flex items-center justify-center gap-2">
            {/* 最初からボタン */}
            <button
              onClick={() => onSeek(0)}
              className="text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700"
              aria-label="最初から再生"
              title="最初から"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* 5秒戻るボタン */}
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              className="text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700 relative"
              aria-label="5秒戻る"
              title="5秒戻る"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
              <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 text-[10px] text-orange-400 font-bold">5</span>
            </button>

            {/* 再生/一時停止ボタン */}
            <PlayPauseButton
              isPlaying={isPlaying}
              onClick={onTogglePlayPause}
              size="md"
            />

            {/* 5秒進むボタン */}
            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              className="text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700 relative"
              aria-label="5秒進む"
              title="5秒進む"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
              <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 text-[10px] text-orange-400 font-bold">5</span>
            </button>
          </div>

          {/* シークバーと時間表示 */}
          <div className="flex items-center gap-3">
            {/* 現在時刻 */}
            <div className="text-xs text-gray-300 min-w-[45px] text-right">
              {formatTime(currentTime)}
            </div>

            {/* タイムライン風のシークバー */}
            <div
              className="flex-1 relative w-full h-2 bg-gray-600 rounded cursor-pointer hover:h-3 transition-all"
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
                className="absolute top-0 bottom-0 rounded-l bg-orange-500"
                style={{
                  width: `${Math.max(0, getSeekBarPosition(currentTime))}%`
                }}
              />

              {/* 再生位置インジケーター（赤い線） */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${getSeekBarPosition(currentTime)}%` }}
              />
            </div>

            {/* 総時間 */}
            <div className="text-xs text-gray-300 min-w-[45px]">
              {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* 右側セクション: ボリューム + フルスクリーン (20%) */}
        <div className="w-1/6 min-w-[150px] flex items-center justify-end gap-3">
          <VolumeSlider volume={volume} onChange={onVolumeChange} />

          <button
            onClick={onToggleFullscreen}
            className="text-gray-300 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="フルスクリーン"
            aria-label="フルスクリーン"
          >
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

      </div>
    </div>
  );
}

FixedPlayerBar.displayName = 'FixedPlayerBar';
