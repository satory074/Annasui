"use client";

import { SongSection } from "@/types";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
}

export default function SongList({ 
  songs, 
  currentTime, 
  duration,
  onSeek, 
  isEditMode = false, 
  onEditSong, 
  onDeleteSong 
}: SongListProps) {
  // 現在の時刻に再生中の全ての楽曲を取得（マッシュアップ対応）
  const getCurrentSongs = (): SongSection[] => {
    return songs.filter((song) => currentTime >= song.startTime && currentTime < song.endTime);
  };

  // 楽曲の重なりを検出し、表示レイヤーを計算
  const detectOverlaps = (targetSong: SongSection): { hasOverlap: boolean; overlappingSongs: SongSection[] } => {
    const overlappingSongs = songs.filter(song => 
      song.id !== targetSong.id &&
      !(song.endTime <= targetSong.startTime || song.startTime >= targetSong.endTime)
    );
    return {
      hasOverlap: overlappingSongs.length > 0,
      overlappingSongs
    };
  };

  // 時間フォーマット関数
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentSongs = getCurrentSongs();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          楽曲リスト
          {currentSongs.length > 1 && (
            <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
              マッシュアップ: {currentSongs.length}曲同時再生中
            </span>
          )}
        </h3>
        {currentSongs.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            再生中: {currentSongs.map(s => s.title).join(', ')}
          </div>
        )}
      </div>

      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2">曲名</th>
              <th className="px-3 py-2">アーティスト</th>
              <th className="px-3 py-2 w-64">タイムライン</th>
              <th className="px-3 py-2">時間</th>
              {isEditMode && <th className="px-3 py-2 w-24">操作</th>}
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => {
              const { hasOverlap, overlappingSongs } = detectOverlaps(song);
              const isCurrentlyPlaying = currentSongs.some(s => s.id === song.id);
              
              return (
              <tr
                key={song.id}
                className={`border-b dark:border-gray-700 ${
                  isCurrentlyPlaying
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
                    {isCurrentlyPlaying && (
                      <span className="ml-2 text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded">再生中</span>
                    )}
                    {hasOverlap && (
                      <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded" title={`${overlappingSongs.length}曲と重複`}>
                        重複
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{song.artist}</td>
                <td className="px-3 py-2">
                  {/* ガントチャート形式のインラインタイムライン */}
                  <div className="relative w-full h-6 bg-gray-100 dark:bg-gray-800 rounded border">
                    {/* 時間グリッド（背景） */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="border-l border-gray-300 dark:border-gray-600" 
                          style={{ left: `${(i / 5) * 100}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* 楽曲タイムラインバー */}
                    <div
                      className={`absolute h-4 top-1 rounded-sm cursor-pointer transition-all hover:h-5 hover:top-0.5 ${song.color} border border-gray-400 dark:border-gray-300 ${
                        hasOverlap ? 'opacity-80 border-2 border-orange-400' : ''
                      } ${
                        isCurrentlyPlaying ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                      }`}
                      style={{
                        left: `${(song.startTime / duration) * 100}%`,
                        width: `${((song.endTime - song.startTime) / duration) * 100}%`,
                      }}
                      onClick={() => onSeek(song.startTime)}
                      title={`${song.title}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}`}
                    >
                      <div className="text-xs text-white font-bold truncate px-1 leading-4">
                        {song.title.length > 8 ? song.title.substring(0, 8) + '...' : song.title}
                      </div>
                      {/* 重なり表示用の斜線パターン */}
                      {hasOverlap && (
                        <div className="absolute inset-0 opacity-30 bg-orange-500 rounded-sm">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <pattern id={`overlap-${song.id}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                                <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                              </pattern>
                            </defs>
                            <rect width="100" height="100" fill={`url(#overlap-${song.id})`}/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* 現在再生位置インジケーター */}
                    <div
                      className="absolute w-0.5 h-full bg-red-500 z-10"
                      style={{
                        left: `${(currentTime / duration) * 100}%`,
                      }}
                    />
                  </div>
                </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
