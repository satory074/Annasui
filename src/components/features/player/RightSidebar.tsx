'use client';

import React, { useMemo } from 'react';
import { SongSection } from '@/types';
import SongThumbnail from '@/components/ui/song/SongThumbnail';
import { formatTime } from '@/lib/utils/time';

interface RightSidebarProps {
  currentTime: number;
  songs: SongSection[];
  isVisible: boolean;
  onEditSong?: (song: SongSection) => void;
  isAuthenticated?: boolean;
}

interface CurrentSongWithIndex extends SongSection {
  displayIndex: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentTime,
  songs,
  isVisible,
  onEditSong,
  isAuthenticated
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
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
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

                {/* 時間範囲 */}
                <p className="text-xs text-gray-500 font-mono">
                  {formatTime(song.startTime)} - {formatTime(song.endTime)}
                </p>

                {/* 編集ボタン */}
                {isAuthenticated && onEditSong && (
                  <button
                    onClick={() => onEditSong(song)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                    title="この楽曲を編集"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    編集
                  </button>
                )}

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
      `}</style>
    </div>
  );
};

RightSidebar.displayName = 'RightSidebar';
