"use client";

import { SongSection } from "@/types";

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  onSeek?: (time: number) => void;
}

export default function SongDetailModal({
  isOpen,
  onClose,
  song,
  onSeek
}: SongDetailModalProps) {
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
      onClose();
    }
  };

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            楽曲詳細
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* カラー表示 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full ${song.color} border border-gray-300 dark:border-gray-600`}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">楽曲カラー</span>
          </div>

          {/* 楽曲名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              楽曲名
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {song.title}
            </p>
          </div>

          {/* アーティスト名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              アーティスト
            </label>
            <p className="text-gray-900 dark:text-white">
              {song.artist || "未設定"}
            </p>
          </div>

          {/* 再生時間 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                開始時間
              </label>
              <p className="text-gray-900 dark:text-white font-mono">
                {formatTime(song.startTime)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                終了時間
              </label>
              <p className="text-gray-900 dark:text-white font-mono">
                {formatTime(song.endTime)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                演奏時間
              </label>
              <p className="text-gray-900 dark:text-white font-mono">
                {formatDuration(song.startTime, song.endTime)}
              </p>
            </div>
          </div>

          {/* ジャンル */}
          {song.genre && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ジャンル
              </label>
              <p className="text-gray-900 dark:text-white">
                {song.genre}
              </p>
            </div>
          )}

          {/* 元動画リンク */}
          {song.originalLink && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                元動画リンク
              </label>
              <a
                href={song.originalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
              >
                {song.originalLink}
              </a>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            閉じる
          </button>
          
          {onSeek && (
            <button
              onClick={handlePlayFromHere}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V6z" />
              </svg>
              この曲から再生
            </button>
          )}
        </div>
      </div>
    </div>
  );
}