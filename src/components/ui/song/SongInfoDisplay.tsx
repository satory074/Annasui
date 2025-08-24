"use client";

import { SongSection } from "@/types";
import { formatTime, formatDuration } from "@/lib/utils/time";
import SongThumbnail from "./SongThumbnail";

interface SongInfoDisplayProps {
  song: SongSection;
  variant?: "compact" | "detailed" | "card";
  showThumbnail?: boolean;
  showTimeCodes?: boolean;
  showOriginalLink?: boolean;
  onSeek?: (time: number) => void;
}

export default function SongInfoDisplay({
  song,
  variant = "detailed",
  showThumbnail = true,
  showTimeCodes = true,
  showOriginalLink = true,
  onSeek
}: SongInfoDisplayProps) {
  const handlePlayFromHere = () => {
    if (onSeek) {
      onSeek(song.startTime);
    }
  };

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-3">
          {showThumbnail && (
            <SongThumbnail
              originalLink={song.originalLink}
              title={song.title}
              size="md"
            />
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">楽曲詳細</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">楽曲名</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white break-words">
              {song.title}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">アーティスト</div>
            <div className="text-sm text-gray-900 dark:text-white break-words">
              {song.artist || "未設定"}
            </div>
          </div>

          {showTimeCodes && (
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
          )}

          {showOriginalLink && song.originalLink && (
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

        {onSeek && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
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

  if (variant === "card") {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 flex gap-4">
        {showThumbnail && (
          <SongThumbnail
            originalLink={song.originalLink}
            title={song.title}
            size="sm"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 truncate">
            {song.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 truncate">
            {song.artist}
          </p>
          
          <div className="flex items-center gap-4 text-xs">
            {song.genre && (
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                {song.genre}
              </span>
            )}
            {song.originalLink && (
              <a
                href={song.originalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                元動画
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showThumbnail && (
        <SongThumbnail
          originalLink={song.originalLink}
          title={song.title}
          size="lg"
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          楽曲名
        </label>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {song.title}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          アーティスト
        </label>
        <p className="text-gray-900 dark:text-white">
          {song.artist || "未設定"}
        </p>
      </div>

      {showTimeCodes && (
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
      )}

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

      {showOriginalLink && song.originalLink && (
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
  );
}