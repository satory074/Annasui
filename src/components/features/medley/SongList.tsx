"use client";

import { SongSection } from "@/types";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function SongList({ songs, currentTime, onSeek }: SongListProps) {
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
              <th className="px-3 py-2">ジャンル</th>
              <th className="px-3 py-2">操作</th>
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
                  {formatTime(song.startTime)} - {formatTime(song.endTime)}
                </td>
                <td className="px-3 py-2">{song.genre || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        console.log(`リストから曲を再生:「${song.title}」 - ${song.startTime}秒`);
                        onSeek(Number(song.startTime)); // 厳密に数値として渡す
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      再生
                    </button>
                    {song.originalLink && (
                      <a
                        href={song.originalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        原曲
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
