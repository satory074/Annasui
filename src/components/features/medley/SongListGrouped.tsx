"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SongSection } from "@/types";
import { formatTime } from "@/lib/utils/time";
import PlayPauseButton from "@/components/ui/PlayPauseButton";
import { logger } from '@/lib/utils/logger';

interface SongListProps {
  songs: SongSection[];
  duration: number;
  actualPlayerDuration?: number;
  currentTime: number;
  currentSongs?: SongSection[];
  onTimelineClick?: (time: number) => void;
  onSeek?: (time: number) => void;
  onDeleteSong?: (songId: number) => void;
  onTogglePlayPause?: () => void;
  isPlaying?: boolean;
  selectedSong?: SongSection | null;
  onSelectSong?: (song: SongSection | null) => void;
  onSongHover?: (song: SongSection, element: HTMLElement) => void;
  onSongHoverEnd?: () => void;
  medleyTitle?: string;
  medleyCreator?: string;
  originalVideoUrl?: string;
}

// 楽曲グループの型定義
interface SongGroup {
  title: string;
  artist: string;
  segments: SongSection[];
}

export default function SongListGrouped({
  songs,
  duration,
  actualPlayerDuration,
  currentTime,
  onTimelineClick,
  onSeek,
  onTogglePlayPause,
  isPlaying,
  selectedSong,
  onSelectSong,
  onSongHover,
  onSongHoverEnd,
  medleyTitle,
  medleyCreator,
  originalVideoUrl,
}: SongListProps) {
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; initialTime: number; timelineWidth: number } | null>(null);

  const effectiveTimelineDuration = actualPlayerDuration || duration;

  // 楽曲をタイトル・アーティストでグループ化
  const groupedSongs = useMemo(() => {
    const grouped = songs.reduce((groups, song) => {
      const key = `${song.title}-${song.artist}`;
      if (!groups[key]) {
        groups[key] = {
          title: song.title,
          artist: song.artist,
          segments: []
        };
      }
      groups[key].segments.push(song);
      return groups;
    }, {} as Record<string, SongGroup>);
    
    logger.debug('🔄 SongListGrouped: groupedSongs recalculated', {
      totalSongs: songs.length,
      totalGroups: Object.keys(grouped).length,
      groupDetails: Object.entries(grouped).map(([key, group]) => ({
        key,
        title: group.title,
        segmentCount: group.segments.length
      }))
    });
    
    return grouped;
  }, [songs]);

  // 重複情報を取得する関数
  const getDuplicateInfo = (targetSong: SongSection, allSongs: SongSection[]) => {
    const sameTitleSongs = allSongs.filter(
      (song) => song.title === targetSong.title && song.artist === targetSong.artist
    );
    
    if (sameTitleSongs.length <= 1) return null;
    
    const sortedSongs = [...sameTitleSongs].sort((a, b) => a.startTime - b.startTime);
    const instanceNumber = sortedSongs.findIndex(song => song.id === targetSong.id) + 1;
    
    return {
      instanceNumber,
      totalInstances: sameTitleSongs.length
    };
  };

  // 重複検出
  const detectOverlaps = (song: SongSection) => {
    const overlappingSongs = songs.filter(otherSong => 
      otherSong.id !== song.id &&
      song.startTime < otherSong.endTime &&
      song.endTime > otherSong.startTime
    );
    return {
      hasOverlap: overlappingSongs.length > 0,
      overlappingSongs
    };
  };

  // 現在再生中の楽曲を取得
  const getCurrentSongs = () => {
    return songs.filter(song => 
      currentTime >= song.startTime && currentTime <= song.endTime
    );
  };

  // タイムラインクリックハンドラ
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimelineClick || effectiveTimelineDuration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * effectiveTimelineDuration;
    
    onTimelineClick(time);
  };

  // 楽曲クリック処理
  const handleSongClick = (e: React.MouseEvent, song: SongSection) => {
    e.stopPropagation();
    onSelectSong?.(song);
    onTimelineClick?.(song.startTime);
  };

  // 楽曲ダブルクリック処理（無効化）
  const handleSongDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 編集モーダルを開かないように無効化
  };

  // ホバー処理
  const handleSongHover = (e: React.MouseEvent, song: SongSection) => {
    if (!onSongHover) return;
    onSongHover(song, e.currentTarget as HTMLElement);
  };

  const handleSongLeave = () => {
    onSongHoverEnd?.();
  };


  // ドラッグ処理（簡略化）

  const handleMouseMove = useCallback(() => {
    if (!draggingSong || !dragStart || !dragMode) return;

    // Drag calculation logic would go here
    
    if (dragMode === 'move') {
      // 更新処理は省略（実際の実装では onUpdateSong などを呼び出し）
    }
  }, [draggingSong, dragStart, dragMode]);

  const handleMouseUp = useCallback(() => {
    setDraggingSong(null);
    setDragMode(null);
    setDragStart(null);
  }, []);

  // 旧キーボード処理は削除され、useEffect内で直接定義されます

  // イベントリスナー登録
  useEffect(() => {
    if (draggingSong && dragMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingSong, dragMode, handleMouseMove, handleMouseUp]);

  // Note: キーボードイベントハンドリングはMedleyPlayerで管理されるため、
  // SongListGrouped内では重複したイベントリスナーを削除

  const currentSongs_computed = getCurrentSongs();

  return (
    <div className="bg-gray-50">
      {/* ヘッダー部分 */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          {/* メドレータイトルと制作者 */}
          {(medleyTitle || medleyCreator) && (
            <div className="mb-2 border-b border-gray-200 pb-2">
              {medleyTitle && (
                originalVideoUrl ? (
                  <a
                    href={originalVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-gray-900 hover:text-orange-600 hover:underline cursor-pointer transition-colors"
                    title="元動画を見る"
                  >
                    {medleyTitle}
                  </a>
                ) : (
                  <h2 className="text-lg font-bold text-gray-900">
                    {medleyTitle}
                  </h2>
                )
              )}
              {medleyCreator && (
                <p className="text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {medleyCreator}
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            {/* 左側: 再生コントロール */}
            <div className="flex items-center gap-4">
              {onTogglePlayPause && onSeek && (
                <div className="flex items-center gap-1">
                  {/* 最初からボタン */}
                  <button
                    onClick={() => onSeek(0)}
                    className="text-gray-600 hover:text-orange-500 transition-all p-1 rounded-full hover:bg-gray-100"
                    aria-label="最初から再生"
                    title="最初から"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                  </button>

                  {/* 5秒戻るボタン */}
                  <button
                    onClick={() => onSeek(Math.max(0, currentTime - 5))}
                    className="text-gray-600 hover:text-orange-500 transition-all p-1 rounded-full hover:bg-gray-100 relative"
                    aria-label="5秒戻る"
                    title="5秒戻る"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="11 17 6 12 11 7" />
                      <polyline points="18 17 13 12 18 7" />
                    </svg>
                    <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs text-orange-500 font-bold">5</span>
                  </button>

                  {/* 再生/一時停止ボタン */}
                  <PlayPauseButton 
                    isPlaying={isPlaying || false} 
                    onClick={onTogglePlayPause}
                    size="sm"
                  />

                  {/* 5秒進むボタン */}
                  <button
                    onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                    className="text-gray-600 hover:text-orange-500 transition-all p-1 rounded-full hover:bg-gray-100 relative"
                    aria-label="5秒進む"
                    title="5秒進む"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="13 17 18 12 13 7" />
                      <polyline points="6 17 11 12 6 7" />
                    </svg>
                    <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs text-orange-500 font-bold">5</span>
                  </button>
                </div>
              )}
              {onTogglePlayPause && !onSeek && (
                <PlayPauseButton 
                  isPlaying={isPlaying || false} 
                  onClick={onTogglePlayPause}
                  size="sm"
                />
              )}
              <h3 className="text-xs font-medium text-gray-700">
                楽曲一覧 ({Object.keys(groupedSongs).length}楽曲, {songs.length}区間)
              </h3>
            </div>
          </div>
        </div>

      </div>

      {/* メインコンテンツエリア */}
      <div className="p-2">
        <div className="space-y-0.5">
          {Object.entries(groupedSongs).map(([groupKey, group]) => {
            // グループ全体の状態を計算
            const isAnyCurrentlyPlaying = group.segments.some(song => 
              currentSongs_computed.some(s => s.id === song.id)
            );
            const hasAnyBeyondDuration = group.segments.some(song => 
              actualPlayerDuration && song.startTime >= actualPlayerDuration
            );
            
            return (
              <div
                key={groupKey}
                className={`relative p-2 rounded-lg border transition-all ${
                  hasAnyBeyondDuration
                    ? "bg-red-50 border-red-200 opacity-60"
                    : isAnyCurrentlyPlaying
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                
                {/* タイムライン */}
                <div 
                  className="timeline-container relative w-full h-8 ml-0 transition-colors bg-blue-50 rounded"
                  onClick={handleTimelineClick}
                >
                  {/* 時間グリッド（背景）- 固定10本 */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="border-l border-gray-200 opacity-50" 
                        style={{ left: `${(i / 10) * 100}%` }}
                      />
                    ))}
                  </div>
                  
                  {/* 複数楽曲セグメントタイムラインバー */}
                  {group.segments.map((song, segmentIndex) => {
                    const { hasOverlap, overlappingSongs } = detectOverlaps(song);
                    const isCurrentlyPlaying = currentSongs_computed.some(s => s.id === song.id);
                    const isBeyondActualDuration = actualPlayerDuration && song.startTime >= actualPlayerDuration;
                    
                    return (
                      <div
                        key={song.id}
                        className={`absolute h-6 top-1 transition-all hover:h-7 hover:top-0 ${
                          // 空の楽曲のビジュアル強調
                          (song.title?.startsWith('空の楽曲') || song.artist === 'アーティスト未設定')
                            ? 'bg-yellow-400 border-2 border-orange-500 shadow-lg ring-1 ring-orange-300'
                            : isBeyondActualDuration 
                              ? 'bg-red-400 opacity-50' 
                              : 'bg-orange-600'
                        } ${
                          hasOverlap ? 'opacity-80' : ''
                        } ${
                          isCurrentlyPlaying ? 'ring-2 ring-blue-400 animate-pulse' : ''
                        } ${
                          selectedSong?.id === song.id ? 'ring-2 ring-blue-500' : ''
                        } ${
                          'cursor-pointer'
                        } ${
                          draggingSong?.id === song.id ? 'opacity-70 z-30' : ''
                        } select-none`}
                        style={{
                          left: `${(song.startTime / effectiveTimelineDuration) * 100}%`,
                          width: `${((song.endTime - song.startTime) / effectiveTimelineDuration) * 100}%`,
                        }}
                        onClick={(e) => handleSongClick(e, song)}
                        onDoubleClick={(e) => handleSongDoubleClick(e)}
                        onMouseDown={undefined}
                        onMouseEnter={(e) => handleSongHover(e, song)}
                        onMouseLeave={handleSongLeave}
                        title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${isBeyondActualDuration ? ' | ℹ️ 実際の動画長を超過（自動調整済み）' : ''}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''} | クリックで再生`}
                      >
                        <div className={`text-xs font-medium px-2 leading-6 pointer-events-none relative z-30 whitespace-nowrap flex items-center gap-1 ${
                          // 空の楽曲のテキストカラー調整
                          (song.title?.startsWith('空の楽曲') || song.artist === 'アーティスト未設定')
                            ? 'text-orange-900'
                            : 'text-gray-800'
                        }`}
                             style={{
                               overflow: 'visible',
                               position: 'relative'
                             }}>
                          {/* 最初のセグメントのみタイトル表示、それ以外は番号のみ */}
                          {segmentIndex === 0 ? (
                            <span className="flex items-center gap-1">
                              {song.title}
                              {/* 空の楽曲の警告アイコン */}
                              {(song.title?.startsWith('空の楽曲') || song.artist === 'アーティスト未設定') && (
                                <span 
                                  className="text-orange-600 text-sm font-bold"
                                  title="未入力項目があります"
                                >
                                  ⚠️
                                </span>
                              )}
                            </span>
                          ) : ''}
                          {(() => {
                            const duplicateInfo = getDuplicateInfo(song, songs);
                            if (duplicateInfo) {
                              const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
                              const number = duplicateInfo.instanceNumber <= 10 
                                ? circledNumbers[duplicateInfo.instanceNumber - 1] 
                                : `(${duplicateInfo.instanceNumber})`;
                              return (
                                <span 
                                  className="bg-orange-600 text-white text-xs px-1 rounded-full font-bold shadow-sm"
                                  title={`重複楽曲 ${duplicateInfo.instanceNumber}/${duplicateInfo.totalInstances}`}
                                >
                                  {number}
                                </span>
                              );
                            }
                            return null;
                          })()}
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
                      </div>
                    );
                  })}
                  
                  
                  {/* 現在再生位置インジケーター */}
                  <div
                    className="absolute w-0.5 h-full bg-red-500 z-10"
                    style={{
                      left: `${(currentTime / effectiveTimelineDuration) * 100}%`
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