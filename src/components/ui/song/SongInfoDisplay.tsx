"use client";

import { SongSection } from "@/types";
import { formatTime, formatDuration } from "@/lib/utils/time";
import SongThumbnail from "./SongThumbnail";

// プラットフォーム表示用の設定
const PLATFORM_CONFIG = {
  niconico: { name: "ニコニコ動画", icon: "🎬", color: "text-orange-600 dark:text-orange-400" },
  youtube: { name: "YouTube", icon: "📺", color: "text-red-600 dark:text-red-400" },
  spotify: { name: "Spotify", icon: "🎵", color: "text-green-600 dark:text-green-400" },
  appleMusic: { name: "Apple Music", icon: "🍎", color: "text-red-600 dark:text-red-400" }
};

// 複数リンクを表示するコンポーネント
function PlatformLinks({ song, variant = "detailed" }: { 
  song: SongSection; 
  variant?: "detailed" | "compact" | "card";
}) {
  const links = [];
  
  // links配列から利用可能なリンクを収集
  if (song.links) {
    if (song.links.niconico) {
      links.push({ platform: 'niconico', url: song.links.niconico });
    }
    if (song.links.youtube) {
      links.push({ platform: 'youtube', url: song.links.youtube });
    }
    if (song.links.spotify) {
      links.push({ platform: 'spotify', url: song.links.spotify });
    }
    if (song.links.appleMusic) {
      links.push({ platform: 'appleMusic', url: song.links.appleMusic });
    }
  }
  
  // 後方互換性のためoriginalLinkもチェック
  if (song.originalLink && links.length === 0) {
    links.push({ platform: 'niconico', url: song.originalLink });
  }
  
  if (links.length === 0) return null;

  if (variant === "compact") {
    return (
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">配信</div>
        <div className="flex flex-wrap gap-1">
          {links.map(({ platform, url }, index) => {
            const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${config.color} hover:underline flex items-center gap-1`}
                title={`${config.name}で開く`}
                onClick={(e) => {
                  e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                }}
              >
                <span>{config.icon}</span>
                <span>{config.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        配信プラットフォーム
      </label>
      <div className="flex flex-wrap gap-2">
        {links.map(({ platform, url }, index) => {
          const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2 py-1 text-sm ${config.color} bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
              onClick={(e) => {
                e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
              }}
            >
              <span>{config.icon}</span>
              <span>{config.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

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
              key={`${song.title}-${song.originalLink || JSON.stringify(song.links)}`}
              originalLink={song.originalLink}
              title={song.title}
              size="md"
              links={song.links}
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

          {showOriginalLink && (
            <PlatformLinks song={song} variant="compact" />
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
            links={song.links}
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
            {(song.links || song.originalLink) && (
              <div className="flex flex-wrap gap-1">
                <PlatformLinks song={song} variant="compact" />
              </div>
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
          links={song.links}
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


      {showOriginalLink && (
        <PlatformLinks song={song} variant="detailed" />
      )}
    </div>
  );
}