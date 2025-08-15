"use client";

import { SongSection } from "@/types";
import { useEffect, useState } from "react";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
  onUpdateSong?: (song: SongSection) => void;
  onShowSongDetail?: (song: SongSection) => void;
}

export default function SongList({ 
  songs, 
  currentTime, 
  duration,
  onSeek, // eslint-disable-line @typescript-eslint/no-unused-vars
  isEditMode = false, 
  onEditSong, 
  onDeleteSong,
  onUpdateSong,
  onShowSongDetail
}: SongListProps) {
  // 編集機能の状態管理
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; originalStartTime: number; originalEndTime: number }>({ x: 0, originalStartTime: 0, originalEndTime: 0 });
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [selectedSong, setSelectedSong] = useState<SongSection | null>(null);
  const SNAP_THRESHOLD = 1.0; // スナップする閾値（秒）

  // 現在の時刻に再生中の全ての楽曲を取得（マッシュアップ対応）
  const getCurrentSongs = (): SongSection[] => {
    return songs.filter((song) => currentTime >= song.startTime && currentTime < song.endTime);
  };

  // スナップ機能のヘルパー関数
  const getSnapPoints = (excludeSongId: number): number[] => {
    const snapPoints: number[] = [0, duration]; // 開始と終了
    songs.forEach(song => {
      if (song.id !== excludeSongId) {
        snapPoints.push(song.startTime, song.endTime);
      }
    });
    return snapPoints.sort((a, b) => a - b);
  };

  const snapToNearestPoint = (time: number, snapPoints: number[]): number => {
    if (!isSnapEnabled) return time;
    
    const nearestPoint = snapPoints.reduce((nearest, point) => {
      const currentDistance = Math.abs(time - point);
      const nearestDistance = Math.abs(time - nearest);
      return currentDistance < nearestDistance ? point : nearest;
    });
    
    return Math.abs(time - nearestPoint) <= SNAP_THRESHOLD ? nearestPoint : time;
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

  // ドラッグ&ドロップ関連の関数
  const handleMouseDown = (e: React.MouseEvent, song: SongSection, timelineElement: HTMLElement) => {
    if (!isEditMode || !onUpdateSong) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = timelineElement.getBoundingClientRect();
    if (!rect) return;
    
    const relativeX = e.clientX - rect.left;
    const clickPositionInSong = relativeX - (song.startTime / duration) * rect.width;
    const songWidth = ((song.endTime - song.startTime) / duration) * rect.width;
    
    // どの部分をクリックしたかを判定
    let mode: 'move' | 'resize-start' | 'resize-end' = 'move';
    if (clickPositionInSong < 8) {
      mode = 'resize-start';
    } else if (clickPositionInSong > songWidth - 8) {
      mode = 'resize-end';
    }
    
    setDraggingSong(song);
    setDragMode(mode);
    setDragStart({
      x: e.clientX,
      originalStartTime: song.startTime,
      originalEndTime: song.endTime
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingSong || !dragMode || !onUpdateSong) return;
    
    const timelineElement = document.querySelector('.timeline-container') as HTMLElement;
    if (!timelineElement) return;
    
    const rect = timelineElement.getBoundingClientRect();
    if (!rect) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaTime = (deltaX / rect.width) * duration;
    const snapPoints = getSnapPoints(draggingSong.id);
    
    let newStartTime = dragStart.originalStartTime;
    let newEndTime = dragStart.originalEndTime;
    
    if (dragMode === 'move') {
      const rawStartTime = Math.max(0, dragStart.originalStartTime + deltaTime);
      
      // 移動時は楽曲の長さを保持
      const songDuration = dragStart.originalEndTime - dragStart.originalStartTime;
      
      // スナップポイントに合わせて調整
      newStartTime = snapToNearestPoint(rawStartTime, snapPoints);
      newEndTime = newStartTime + songDuration;
      
      // 境界チェック
      if (newEndTime > duration) {
        newEndTime = duration;
        newStartTime = duration - songDuration;
      }
      if (newStartTime < 0) {
        newStartTime = 0;
        newEndTime = songDuration;
      }
    } else if (dragMode === 'resize-start') {
      const rawStartTime = Math.max(0, Math.min(dragStart.originalEndTime - 1, dragStart.originalStartTime + deltaTime));
      newStartTime = snapToNearestPoint(rawStartTime, snapPoints);
      newStartTime = Math.max(0, Math.min(dragStart.originalEndTime - 1, newStartTime));
    } else if (dragMode === 'resize-end') {
      const rawEndTime = Math.min(duration, Math.max(dragStart.originalStartTime + 1, dragStart.originalEndTime + deltaTime));
      newEndTime = snapToNearestPoint(rawEndTime, snapPoints);
      newEndTime = Math.min(duration, Math.max(dragStart.originalStartTime + 1, newEndTime));
    }
    
    // 更新されたsongを作成
    const updatedSong: SongSection = {
      ...draggingSong,
      startTime: Math.round(newStartTime * 10) / 10, // 0.1秒単位に丸める
      endTime: Math.round(newEndTime * 10) / 10
    };
    
    onUpdateSong(updatedSong);
  };

  const handleMouseUp = () => {
    setDraggingSong(null);
    setDragMode(null);
    setDragStart({ x: 0, originalStartTime: 0, originalEndTime: 0 });
  };

  // 楽曲セクションのクリック処理
  const handleSongClick = (e: React.MouseEvent, song: SongSection) => {
    if (isEditMode) {
      e.stopPropagation();
      setSelectedSong(selectedSong?.id === song.id ? null : song);
    } else {
      e.stopPropagation();
      onShowSongDetail?.(song);
    }
  };

  // 楽曲セクションのダブルクリック処理
  const handleSongDoubleClick = (e: React.MouseEvent, song: SongSection) => {
    if (isEditMode && onEditSong) {
      e.preventDefault();
      e.stopPropagation();
      onEditSong(song);
    }
  };

  // キーボードショートカット処理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEditMode || !selectedSong || !onUpdateSong) return;

    const step = e.shiftKey ? 0.1 : e.ctrlKey || e.metaKey ? 1.0 : 0.5; // Shift: 0.1秒, Ctrl/Cmd: 1秒, デフォルト: 0.5秒

    let newStartTime = selectedSong.startTime;
    let newEndTime = selectedSong.endTime;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (e.altKey) {
          // Alt+矢印: 開始時間のみ調整
          newStartTime = Math.max(0, selectedSong.startTime - step);
        } else {
          // 楽曲全体を左に移動
          const songDuration = selectedSong.endTime - selectedSong.startTime;
          newStartTime = Math.max(0, selectedSong.startTime - step);
          newEndTime = newStartTime + songDuration;
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.altKey) {
          // Alt+矢印: 開始時間のみ調整
          newStartTime = Math.min(selectedSong.endTime - 0.1, selectedSong.startTime + step);
        } else {
          // 楽曲全体を右に移動
          const songDuration = selectedSong.endTime - selectedSong.startTime;
          newEndTime = Math.min(duration, selectedSong.endTime + step);
          newStartTime = newEndTime - songDuration;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 終了時間を延長
        newEndTime = Math.min(duration, selectedSong.endTime + step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // 終了時間を短縮
        newEndTime = Math.max(selectedSong.startTime + 0.1, selectedSong.endTime - step);
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedSong(null);
        return;
      default:
        return;
    }

    const updatedSong: SongSection = {
      ...selectedSong,
      startTime: Math.round(newStartTime * 10) / 10,
      endTime: Math.round(newEndTime * 10) / 10
    };

    onUpdateSong(updatedSong);
    setSelectedSong(updatedSong);
  };

  // ドラッグイベントの登録/削除
  useEffect(() => {
    if (draggingSong && dragMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingSong, dragMode, dragStart, duration]);

  // キーボードイベントの登録/削除
  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, selectedSong, duration]);

  const currentSongs = getCurrentSongs();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            楽曲リスト - 現在: {formatTime(currentTime)}
            {isEditMode && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                (編集モード: クリックで選択, ドラッグで移動, 矢印キーで微調整)
                {selectedSong && <span className="ml-1 text-green-600 dark:text-green-400">「{selectedSong.title}」選択中</span>}
              </span>
            )}
            {currentSongs.length > 1 && (
              <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                マッシュアップ: {currentSongs.length}曲同時再生中
              </span>
            )}
          </h3>
          {isEditMode && (
            <button
              onClick={() => setIsSnapEnabled(!isSnapEnabled)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isSnapEnabled 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
              title="隣接する楽曲の境界にスナップ"
            >
              スナップ: {isSnapEnabled ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
        {currentSongs.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            再生中: {currentSongs.map(s => s.title).join(', ')}
          </div>
        )}
      </div>

      <div className="overflow-auto max-h-80">
        <div className="space-y-2">
            {songs.map((song) => {
              const { hasOverlap, overlappingSongs } = detectOverlaps(song);
              const isCurrentlyPlaying = currentSongs.some(s => s.id === song.id);
              
              return (
                <div
                  key={song.id}
                  className={`relative p-3 rounded-lg border transition-all ${
                    isCurrentlyPlaying
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  {/* ヘッダー情報 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: song.color.replace("bg-", "") }}
                      ></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(song.startTime)} - {formatTime(song.endTime)}
                      </span>
                      {isCurrentlyPlaying && (
                        <span className="text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded">再生中</span>
                      )}
                      {hasOverlap && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded" title={`${overlappingSongs.length}曲と重複`}>
                          重複
                        </span>
                      )}
                    </div>
                    {isEditMode && (
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
                    )}
                  </div>

                  {/* タイムライン */}
                  <div className="timeline-container relative w-full h-8 bg-gray-100 dark:bg-gray-800 rounded border">
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
                      className={`absolute h-6 top-1 rounded-sm transition-all hover:h-7 hover:top-0.5 ${song.color} border border-gray-400 dark:border-gray-300 ${
                        hasOverlap ? 'opacity-80 border-2 border-orange-400' : ''
                      } ${
                        isCurrentlyPlaying ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                      } ${
                        selectedSong?.id === song.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                      } ${
                        isEditMode ? 'cursor-move hover:opacity-80' : 'cursor-pointer'
                      } ${
                        draggingSong?.id === song.id ? 'opacity-70 z-30' : ''
                      } select-none`}
                      style={{
                        left: `${(song.startTime / duration) * 100}%`,
                        width: `${((song.endTime - song.startTime) / duration) * 100}%`,
                      }}
                      onClick={(e) => handleSongClick(e, song)}
                      onDoubleClick={(e) => handleSongDoubleClick(e, song)}
                      onMouseDown={(e) => isEditMode ? handleMouseDown(e, song, e.currentTarget.closest('.timeline-container') as HTMLElement) : undefined}
                      title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}${isEditMode ? ' | ドラッグ移動, 矢印キーで微調整' : ' | クリックで詳細表示'}`}
                    >
                      <div className="text-xs text-white font-bold truncate px-2 leading-6 pointer-events-none">
                        {song.title}
                      </div>
                      {/* 重なり表示用の斜線パターン */}
                      {hasOverlap && (
                        <div className="absolute inset-0 opacity-30 bg-orange-500 rounded-sm pointer-events-none">
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

                      {/* 編集モード時のリサイズハンドル */}
                      {isEditMode && (
                        <>
                          <div className="absolute left-0 top-0 w-2 h-full bg-white bg-opacity-30 cursor-ew-resize"></div>
                          <div className="absolute right-0 top-0 w-2 h-full bg-white bg-opacity-30 cursor-ew-resize"></div>
                        </>
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
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
