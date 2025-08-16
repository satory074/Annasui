"use client";

import { SongSection } from "@/types";
import { useEffect, useState } from "react";

interface SongDetailTooltipProps {
  song: SongSection | null;
  isVisible: boolean;
  position: { x: number; y: number };
  onSeek?: (time: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function SongDetailTooltip({
  song,
  isVisible,
  position,
  onSeek,
  onMouseEnter,
  onMouseLeave
}: SongDetailTooltipProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (startTime: number, endTime: number): string => {
    const duration = endTime - startTime;
    return formatTime(duration);
  };

  const handlePlayFromHere = () => {
    if (song && onSeek) {
      onSeek(song.startTime);
    }
  };

  // ツールチップの位置調整（画面端での表示切れ防止）
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      const tooltipWidth = 320; // 推定幅
      const tooltipHeight = 280; // 推定高さ
      const padding = 16;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // 右端を超える場合は左に調整
      if (adjustedX + tooltipWidth + padding > window.innerWidth) {
        adjustedX = position.x - tooltipWidth - padding;
      }

      // 下端を超える場合は上に調整
      if (adjustedY + tooltipHeight + padding > window.innerHeight) {
        adjustedY = position.y - tooltipHeight - padding;
      }

      // 左端を超える場合は右に調整
      if (adjustedX < padding) {
        adjustedX = padding;
      }

      // 上端を超える場合は下に調整
      if (adjustedY < padding) {
        adjustedY = padding;
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [position, isVisible]);

  if (!isVisible || !song) return null;

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 max-w-sm transition-all duration-200 opacity-100 scale-100"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        pointerEvents: 'auto'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">楽曲詳細</div>
      </div>

      {/* 楽曲情報 */}
      <div className="space-y-3">
        {/* 楽曲名 */}
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">楽曲名</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white break-words">
            {song.title}
          </div>
        </div>

        {/* アーティスト名 */}
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">アーティスト</div>
          <div className="text-sm text-gray-900 dark:text-white break-words">
            {song.artist || "未設定"}
          </div>
        </div>

        {/* 再生時間 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500 dark:text-gray-400 mb-1">開始</div>
            <div className="font-mono text-gray-900 dark:text-white">
              {formatTime(song.startTime)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400 mb-1">終了</div>
            <div className="font-mono text-gray-900 dark:text-white">
              {formatTime(song.endTime)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400 mb-1">時間</div>
            <div className="font-mono text-gray-900 dark:text-white">
              {formatDuration(song.startTime, song.endTime)}
            </div>
          </div>
        </div>


        {/* 元動画リンク */}
        {song.originalLink && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">元動画</div>
            <a
              href={song.originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
            >
              {song.originalLink.length > 30 ? `${song.originalLink.slice(0, 30)}...` : song.originalLink}
            </a>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      {onSeek && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handlePlayFromHere}
            className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V6z" />
            </svg>
            この曲から再生
          </button>
        </div>
      )}
    </div>
  );
}