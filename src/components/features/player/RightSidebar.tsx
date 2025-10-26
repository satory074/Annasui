'use client';

import React, { useMemo } from 'react';
import { SongSection } from '@/types';
import SongThumbnail from '@/components/ui/song/SongThumbnail';

interface RightSidebarProps {
  currentTime: number;
  songs: SongSection[];
  isVisible: boolean;
}

interface CurrentSongWithIndex extends SongSection {
  displayIndex: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentTime,
  songs,
  isVisible
}) => {
  // 現在再生中の楽曲を取得（重複を除去）
  const currentSongs = useMemo(() => {
    const activeSongs = songs.filter(song =>
      currentTime >= song.startTime && currentTime < song.endTime + 0.1
    );

    // 重複を除去（同じ楽曲が複数セグメントで同時に再生される場合）
    const uniqueSongs: CurrentSongWithIndex[] = [];
    const seen = new Set<string>();

    activeSongs.forEach((song, index) => {
      const key = `${song.title}-${song.artist}-${song.niconicoLink}-${song.youtubeLink}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSongs.push({
          ...song,
          displayIndex: index
        });
      }
    });

    return uniqueSongs;
  }, [currentTime, songs]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* 現在再生中セクション */}
      <div className="border-b border-gray-200 flex flex-col">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              🎵 現在再生中
            </h3>
            <span className="text-xs font-semibold bg-orange-600 text-white px-2 py-0.5 rounded-full">
              {currentSongs.length}
            </span>
          </div>
        </div>

        {/* 楽曲リスト */}
        <div className="px-4 pb-4 space-y-3">
          {currentSongs.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
              再生中の楽曲はありません
            </div>
          ) : (
            currentSongs.map((song, index) => (
              <div
                key={`${song.id}-${song.displayIndex}`}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 flex flex-col items-center gap-3 animate-fade-in shadow-sm hover:shadow-md transition-shadow"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* サムネイル */}
                <div className="flex-shrink-0">
                  <SongThumbnail
                    title={song.title}
                    niconicoLink={song.niconicoLink}
                    youtubeLink={song.youtubeLink}
                    spotifyLink={song.spotifyLink}
                    applemusicLink={song.applemusicLink}
                    size="md"
                    className="w-20 h-20 rounded-lg shadow-lg"
                    isClickable={true}
                  />
                </div>

                {/* タイトル */}
                <h3 className="text-sm font-bold text-gray-900 text-center w-full">
                  {song.title}
                </h3>

                {/* アーティスト */}
                <p className="text-xs text-gray-600 text-center w-full">
                  {song.artist}
                </p>

                {/* プラットフォームリンク */}
                <div className="flex justify-center gap-2 flex-wrap">
                  {song.niconicoLink && (
                    <a
                      href={song.niconicoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition-colors"
                      title="ニコニコ動画"
                    >
                      🎬
                    </a>
                  )}
                  {song.youtubeLink && (
                    <a
                      href={song.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition-colors"
                      title="YouTube"
                    >
                      ▶️
                    </a>
                  )}
                  {song.spotifyLink && (
                    <a
                      href={song.spotifyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition-colors"
                      title="Spotify"
                    >
                      🎵
                    </a>
                  )}
                  {song.applemusicLink && (
                    <a
                      href={song.applemusicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition-colors"
                      title="Apple Music"
                    >
                      🍎
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 関連メドレーセクション（将来実装） */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
          📋 関連メドレー
        </h3>
        <div className="space-y-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="text-sm font-semibold mb-1 text-gray-900">アニソンメドレー 2024</div>
            <div className="text-xs text-gray-600">15曲 • 45分</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="text-sm font-semibold mb-1 text-gray-900">VOCALOID名曲選</div>
            <div className="text-xs text-gray-600">20曲 • 60分</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="text-sm font-semibold mb-1 text-gray-900">東方アレンジメドレー</div>
            <div className="text-xs text-gray-600">12曲 • 38分</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        /* カスタムスクロールバー */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
};

RightSidebar.displayName = 'RightSidebar';
