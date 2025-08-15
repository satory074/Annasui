"use client";

import { SongSection } from "@/types";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  onSeek: (time: number) => void;
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
}

export default function SongList({ 
  songs, 
  currentTime, 
  onSeek, 
  isEditMode = false, 
  onEditSong, 
  onDeleteSong 
}: SongListProps) {
  // 現在再生中の曲を特定
  const getCurrentSong = (): SongSection | undefined => {
    return songs.find((song) => currentTime >= song.startTime && currentTime < song.endTime);
  };

  // 時間フォーマット関数
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentSong = getCurrentSong();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">楽曲リスト</h3>

      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2">曲名</th>
              <th className="px-3 py-2">アーティスト</th>
              <th className="px-3 py-2">時間</th>
              {isEditMode && <th className="px-3 py-2 w-24">操作</th>}
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr
                key={song.id}
                className={`border-b dark:border-gray-700 ${
                  currentSong?.id === song.id
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 mr-2 rounded-full"
                      style={{ backgroundColor: song.color.replace("bg-", "") }}
                    ></div>
                    {song.title}
                    {currentSong?.id === song.id && (
                      <span className="ml-2 text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded">再生中</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{song.artist}</td>
                <td className="px-3 py-2">
                  <button 
                    onClick={() => onSeek(song.startTime)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="この曲から再生"
                  >
                    {formatTime(song.startTime)} - {formatTime(song.endTime)}
                  </button>
                </td>
                {isEditMode && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditSong?.(song)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="編集"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${song.title}」を削除しますか？`)) {
                            onDeleteSong?.(song.id);
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="削除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
