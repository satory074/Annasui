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

  // 各プラットフォームのリンクを収集
  if (song.niconicoLink) {
    links.push({ platform: 'niconico', url: song.niconicoLink });
  }
  if (song.youtubeLink) {
    links.push({ platform: 'youtube', url: song.youtubeLink });
  }
  if (song.spotifyLink) {
    links.push({ platform: 'spotify', url: song.spotifyLink });
  }
  if (song.applemusicLink) {
    links.push({ platform: 'appleMusic', url: song.applemusicLink });
  }

  if (links.length === 0) return null;

  if (variant === "compact") {
    return (
      <div>
        <div className="text-xs text-gray-500 mb-1">配信</div>
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className={`inline-flex items-center gap-1 px-2 py-1 text-sm ${config.color} bg-gray-100 rounded-md hover:bg-gray-200 transition-colors`}
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
  onEdit?: (song: SongSection) => void;
}

export default function SongInfoDisplay({
  song,
  variant = "detailed",
  showThumbnail = true,
  showTimeCodes = true,
  showOriginalLink = true,
  onSeek,
  onEdit
}: SongInfoDisplayProps) {
  const handlePlayFromHere = () => {
    if (onSeek) {
      onSeek(song.startTime);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(song);
    }
  };

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-3">
          {showThumbnail && (
            <SongThumbnail
              key={`${song.title}-${song.niconicoLink || song.youtubeLink || song.spotifyLink || song.applemusicLink}`}
              title={song.title}
              size="md"
              niconicoLink={song.niconicoLink}
              youtubeLink={song.youtubeLink}
              spotifyLink={song.spotifyLink}
              applemusicLink={song.applemusicLink}
            />
          )}
          <div className="text-sm text-gray-600 font-medium">楽曲詳細</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">楽曲名</div>
            <div className="text-sm font-semibold text-gray-900 break-words">
              {song.title}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">アーティスト</div>
            <div className="text-sm text-gray-900 break-words">
              {song.artist || "未設定"}
            </div>
          </div>

          {showTimeCodes && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-gray-500 mb-1">開始</div>
                <div className="font-mono text-gray-900">
                  {formatTime(song.startTime)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">終了</div>
                <div className="font-mono text-gray-900">
                  {formatTime(song.endTime)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">時間</div>
                <div className="font-mono text-gray-900">
                  {formatDuration(song.startTime, song.endTime)}
                </div>
              </div>
            </div>
          )}

          {showOriginalLink && (
            <PlatformLinks song={song} variant="compact" />
          )}
        </div>

        {(onSeek || onEdit) && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              {onSeek && (
                <button
                  onClick={handlePlayFromHere}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V6z" />
                  </svg>
                  この曲から再生
                </button>
              )}
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm rounded-md hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  編集
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex gap-4">
        {showThumbnail && (
          <SongThumbnail
            title={song.title}
            size="sm"
            niconicoLink={song.niconicoLink}
            youtubeLink={song.youtubeLink}
            spotifyLink={song.spotifyLink}
            applemusicLink={song.applemusicLink}
          />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
            {song.title}
          </h3>
          <p className="text-gray-600 text-sm mb-3 truncate">
            {song.artist}
          </p>

          <div className="flex items-center gap-4 text-xs">
            {(song.niconicoLink || song.youtubeLink || song.spotifyLink || song.applemusicLink) && (
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
          title={song.title}
          size="lg"
          niconicoLink={song.niconicoLink}
          youtubeLink={song.youtubeLink}
          spotifyLink={song.spotifyLink}
          applemusicLink={song.applemusicLink}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          楽曲名
        </label>
        <p className="text-lg font-semibold text-gray-900">
          {song.title}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          アーティスト
        </label>
        <p className="text-gray-900">
          {song.artist || "未設定"}
        </p>
      </div>

      {showTimeCodes && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始時間
            </label>
            <p className="text-gray-900 font-mono">
              {formatTime(song.startTime)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了時間
            </label>
            <p className="text-gray-900 font-mono">
              {formatTime(song.endTime)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              演奏時間
            </label>
            <p className="text-gray-900 font-mono">
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