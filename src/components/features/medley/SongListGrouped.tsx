"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SongSection } from "@/types";
import { formatTime } from "@/lib/utils/time";
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
  onAddSong?: () => void; // 楽曲追加用
  onEditSong?: (song: SongSection) => void; // 楽曲編集用
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
  onDeleteSong,
  onTogglePlayPause,
  isPlaying,
  selectedSong,
  onSelectSong,
  onSongHover,
  onSongHoverEnd,
  medleyTitle,
  medleyCreator,
  onAddSong,
  onEditSong,
  originalVideoUrl,
}: SongListProps) {
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; initialTime: number; timelineWidth: number } | null>(null);

  const effectiveTimelineDuration = actualPlayerDuration || duration;

  // 楽曲をタイトル・アーティストでグループ化
  const groupedSongs = useMemo(() => {
    const grouped = songs.reduce((groups, song) => {
      const key = `${song.title}-${song.artist.join(", ")}`;
      if (!groups[key]) {
        groups[key] = {
          title: song.title,
          artist: song.artist.join(", "),
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
      (song) => song.title === targetSong.title && song.artist.join(", ") === targetSong.artist.join(", ")
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

  // 楽曲ダブルクリック処理
  const handleSongDoubleClick = (e: React.MouseEvent, song: SongSection) => {
    e.stopPropagation();
    onEditSong?.(song);
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
      {/* ヘッダー部分 - 簡素化版 */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-700">
              楽曲一覧 ({Object.keys(groupedSongs).length}楽曲, {songs.length}区間)
            </h3>

            {/* 楽曲追加ボタン */}
            {onAddSong && (
              <button
                onClick={onAddSong}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 transition-colors"
                title="楽曲を追加"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            )}
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
                  className="timeline-container relative w-full ml-0 transition-colors bg-blue-50 rounded"
                  style={{ height: `${group.segments.length * 32}px` }}
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
                        className={`group/bar absolute h-7 transition-all duration-150 ${
                          // 空の楽曲のビジュアル強調
                          (song.title?.startsWith('空の楽曲') || song.artist.join(", ") === 'アーティスト未設定')
                            ? 'bg-yellow-400 border-2 border-orange-500 shadow-lg ring-1 ring-orange-300'
                            : isBeyondActualDuration
                              ? 'bg-red-400 opacity-50'
                              : 'bg-orange-600'
                        } ${
                          hasOverlap ? 'opacity-80' : ''
                        } ${
                          isCurrentlyPlaying ? 'ring-2 ring-blue-400 animate-pulse' : ''
                        } ${
                          selectedSong?.id === song.id ? 'ring-2 ring-orange-400' : ''
                        } ${
                          'cursor-pointer hover:brightness-110 hover:shadow-sm'
                        } ${
                          draggingSong?.id === song.id ? 'opacity-70 z-30' : ''
                        } select-none`}
                        style={{
                          left: `${(song.startTime / effectiveTimelineDuration) * 100}%`,
                          width: `${((song.endTime - song.startTime) / effectiveTimelineDuration) * 100}%`,
                          top: `${segmentIndex * 32 + 2}px`,
                        }}
                        onClick={(e) => handleSongClick(e, song)}
                        onDoubleClick={(e) => handleSongDoubleClick(e, song)}
                        onMouseDown={undefined}
                        onMouseEnter={(e) => handleSongHover(e, song)}
                        onMouseLeave={handleSongLeave}
                        title={`${song.title} - ${song.artist.join(", ")}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${onEditSong ? ' | ダブルクリックで編集' : ''}${isBeyondActualDuration ? ' | ℹ️ 実際の動画長を超過' : ''}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}`}
                      >
                        <div className={`text-xs font-medium px-2 leading-6 pointer-events-none relative z-30 whitespace-nowrap flex items-center gap-1 ${
                          // 空の楽曲のテキストカラー調整
                          (song.title?.startsWith('空の楽曲') || song.artist.join(", ") === 'アーティスト未設定')
                            ? 'text-orange-900'
                            : 'text-gray-800'
                        }`}
                             style={{
                               overflow: 'visible',
                               position: 'relative'
                             }}>
                          {/* すべてのセグメントでタイトル表示 */}
                          <span className="flex items-center gap-1">
                            {song.title}
                            {/* 空の楽曲の警告アイコン */}
                            {(song.title?.startsWith('空の楽曲') || song.artist.join(", ") === 'アーティスト未設定') && (
                              <span
                                className="text-orange-600 text-sm font-bold"
                                title="未入力項目があります"
                              >
                                ⚠️
                              </span>
                            )}
                          </span>
                        </div>
                        {/* 編集ボタン（ホバー時に表示） */}
                        {onEditSong && (
                          <button
                            className="absolute right-0.5 top-0.5 h-6 w-6 flex items-center justify-center rounded bg-white/80 text-gray-700 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-auto hover:bg-white shadow-sm z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSong(song);
                            }}
                            title="編集"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
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