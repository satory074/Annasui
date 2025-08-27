"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SongSection } from "@/types";
import { formatTime } from "@/lib/utils/time";
import PlayPauseButton from "@/components/ui/PlayPauseButton";

interface SongListProps {
  songs: SongSection[];
  duration: number;
  actualPlayerDuration?: number;
  currentTime: number;
  currentSongs?: SongSection[];
  onTimelineClick?: (time: number) => void;
  onSeek?: (time: number) => void;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
  onTogglePlayPause?: () => void;
  isPlaying?: boolean;
  isEditMode?: boolean;
  selectedSong?: SongSection | null;
  onSelectSong?: (song: SongSection | null) => void;
  onSongHover?: (song: SongSection, element: HTMLElement) => void;
  onSongHoverEnd?: () => void;
  onSaveChanges?: () => void;
  onResetChanges?: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
  onQuickSetStartTime?: (time: number) => void;
  onQuickSetEndTime?: (time: number) => void;
  onQuickAddMarker?: (time: number) => void;
  tempStartTime?: number | null;
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
  currentSongs: _currentSongs = [],
  onTimelineClick,
  onSeek: _onSeek,
  onEditSong,
  onDeleteSong,
  onTogglePlayPause,
  isPlaying,
  isEditMode = false,
  selectedSong,
  onSelectSong,
  onSongHover,
  onSongHoverEnd,
  onSaveChanges,
  onResetChanges,
  hasChanges = false,
  isSaving = false,
  onQuickSetStartTime,
  onQuickSetEndTime,
  onQuickAddMarker,
  tempStartTime = null,
  medleyTitle,
  medleyCreator,
  originalVideoUrl
}: SongListProps) {
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; initialTime: number; timelineWidth: number } | null>(null);
  const [isPressingS, setIsPressingS] = useState(false);
  const [isPressingE, setIsPressingE] = useState(false);  
  const [isPressingM, setIsPressingM] = useState(false);

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
    
    console.log('🔄 SongListGrouped: groupedSongs recalculated', {
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
    const clickTime = (x / rect.width) * effectiveTimelineDuration;
    
    onTimelineClick(clickTime);
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
  const handleMouseDown = (e: React.MouseEvent, song: SongSection, timelineElement: HTMLElement) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = timelineElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * effectiveTimelineDuration;

    setDraggingSong(song);
    setDragMode('move');
    setDragStart({
      x: e.clientX,
      initialTime: song.startTime,
      timelineWidth: rect.width
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingSong || !dragStart || !dragMode) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaTime = (deltaX / dragStart.timelineWidth) * effectiveTimelineDuration;
    
    if (dragMode === 'move') {
      const _newStartTime = Math.max(0, Math.min(
        effectiveTimelineDuration - (draggingSong.endTime - draggingSong.startTime),
        dragStart.initialTime + deltaTime
      ));
      const _songDuration = draggingSong.endTime - draggingSong.startTime;
      
      // 更新処理は省略（実際の実装では onUpdateSong などを呼び出し）
    }
  }, [draggingSong, dragStart, dragMode, effectiveTimelineDuration]);

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

  // キーボードイベントリスナー（安定した登録のため、useEffect内で関数を定義）
  useEffect(() => {
    if (!isEditMode) return;

    console.log('🔧 Setting up keyboard event listeners for edit mode');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      console.log('⌨️ Key pressed:', e.key, 'edit mode:', isEditMode);

      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingS(true);
            console.log('🟦 S key pressed, calling onQuickSetStartTime');
            onQuickSetStartTime?.(currentTime);
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingE(true);
            console.log('🟢 E key pressed, calling onQuickSetEndTime');
            onQuickSetEndTime?.(currentTime);
          }
          break;
        case 'm':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingM(true);
            console.log('🎵 M key pressed, currentTime:', currentTime, 'onQuickAddMarker:', !!onQuickAddMarker);
            onQuickAddMarker?.(currentTime);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingS(false);
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingE(false);
          }
          break;
        case 'm':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingM(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      console.log('🔧 Cleaning up keyboard event listeners');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEditMode, currentTime, onQuickSetStartTime, onQuickSetEndTime, onQuickAddMarker]);

  const currentSongs_computed = getCurrentSongs();

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー部分 */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* メドレータイトルと制作者 */}
          {(medleyTitle || medleyCreator) && (
            <div className="mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              {medleyTitle && (
                originalVideoUrl ? (
                  <a
                    href={originalVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-gray-900 dark:text-white hover:text-caramel-600 dark:hover:text-caramel-600 hover:underline cursor-pointer transition-colors"
                    title="元動画を見る"
                  >
                    {medleyTitle}
                  </a>
                ) : (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {medleyTitle}
                  </h2>
                )
              )}
              {medleyCreator && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
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
              {onTogglePlayPause && (
                <PlayPauseButton 
                  isPlaying={isPlaying || false} 
                  onClick={onTogglePlayPause}
                  size="sm"
                />
              )}
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                楽曲一覧 ({Object.keys(groupedSongs).length}楽曲, {songs.length}区間)
              </h3>
              {hasChanges && (
                <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                  未保存の変更があります
                </span>
              )}
              {isEditMode && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  キーボード: <kbd className={`px-1 rounded transition-all ${isPressingS ? 'bg-caramel-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600'}`}>S</kbd>開始時刻 
                  <kbd className={`px-1 rounded transition-all ${isPressingE ? 'bg-olive-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600'}`}>E</kbd>終了時刻 
                  <kbd className={`px-1 rounded transition-all ${isPressingM ? 'bg-sienna-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600'}`}>M</kbd>マーカー追加
                </div>
              )}
            </div>
            {isEditMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onResetChanges}
                  disabled={!hasChanges}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  リセット
                </button>
                <button
                  onClick={onSaveChanges}
                  disabled={!hasChanges || isSaving}
                  className="px-3 py-1 text-xs bg-caramel-600 text-white rounded hover:bg-caramel-700 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '変更を保存'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="p-2">
        <div className="space-y-0.5">
          {Object.entries(groupedSongs).map(([groupKey, group]) => {
            // グループ全体の状態を計算
            const _hasAnyOverlap = group.segments.some(song => {
              const { hasOverlap } = detectOverlaps(song);
              return hasOverlap;
            });
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
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60"
                    : isAnyCurrentlyPlaying
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                }`}
              >
                {/* 楽曲情報ヘッダー */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {group.title}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">-</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.artist}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {group.segments.length}区間
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {/* 編集ボタン */}
                    <button
                      onClick={() => onEditSong?.(group.segments[0])}
                      className={`p-1.5 rounded transition-colors ${
                        isEditMode 
                          ? 'text-caramel-600 hover:bg-caramel-50 dark:hover:bg-amber-900/30' 
                          : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={`${group.title}を編集 (${group.segments.length}区間)`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* 削除ボタン（編集モード時のみ表示） */}
                    {isEditMode && (
                      <button
                        onClick={() => {
                          if (confirm(`「${group.title}」の全${group.segments.length}区間を削除しますか？`)) {
                            group.segments.forEach(song => {
                              onDeleteSong?.(song.id);
                            });
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="全区間削除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* タイムライン */}
                <div 
                  className="timeline-container relative w-full h-8 ml-0 transition-colors bg-blue-50 dark:bg-blue-900/10 rounded"
                  onClick={handleTimelineClick}
                >
                  {/* 時間グリッド（背景）- 固定10本 */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="border-l border-gray-200 dark:border-gray-700 opacity-50" 
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
                          isBeyondActualDuration 
                            ? 'bg-red-400 dark:bg-red-500 opacity-50' 
                            : 'bg-caramel-600 dark:bg-caramel-600'
                        } ${
                          hasOverlap ? 'opacity-80' : ''
                        } ${
                          isCurrentlyPlaying ? 'ring-2 ring-blue-400 animate-pulse' : ''
                        } ${
                          selectedSong?.id === song.id ? 'ring-2 ring-blue-500' : ''
                        } ${
                          isEditMode ? 'cursor-move hover:opacity-80' : 'cursor-pointer'
                        } ${
                          draggingSong?.id === song.id ? 'opacity-70 z-30' : ''
                        } select-none`}
                        style={{
                          left: `${(song.startTime / effectiveTimelineDuration) * 100}%`,
                          width: `${((song.endTime - song.startTime) / effectiveTimelineDuration) * 100}%`,
                        }}
                        onClick={(e) => handleSongClick(e, song)}
                        onDoubleClick={(e) => handleSongDoubleClick(e, song)}
                        onMouseDown={(e) => isEditMode ? handleMouseDown(e, song, e.currentTarget.closest('.timeline-container') as HTMLElement) : undefined}
                        onMouseEnter={(e) => handleSongHover(e, song)}
                        onMouseLeave={handleSongLeave}
                        title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${isBeyondActualDuration ? ' | ⚠️ 動画の長さを超えています' : ''}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}${isEditMode ? ' | ドラッグ移動, 矢印キーで微調整' : ' | クリックで再生'}`}
                      >
                        <div className="text-xs text-gray-800 dark:text-gray-200 font-medium px-2 leading-6 pointer-events-none relative z-30 whitespace-nowrap flex items-center gap-1"
                             style={{
                               overflow: 'visible',
                               position: 'relative'
                             }}>
                          {/* 最初のセグメントのみタイトル表示、それ以外は番号のみ */}
                          {segmentIndex === 0 ? song.title : ''}
                          {(() => {
                            const duplicateInfo = getDuplicateInfo(song, songs);
                            if (duplicateInfo) {
                              const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
                              const number = duplicateInfo.instanceNumber <= 10 
                                ? circledNumbers[duplicateInfo.instanceNumber - 1] 
                                : `(${duplicateInfo.instanceNumber})`;
                              return (
                                <span 
                                  className="bg-caramel-600 text-white text-xs px-1 rounded-full font-bold shadow-sm"
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

                  {/* キー押下時のインジケーター */}
                  {(isPressingS || isPressingE || isPressingM) && (
                    <div
                      className="absolute z-20 flex flex-col items-center"
                      style={{
                        left: `${(currentTime / effectiveTimelineDuration) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className={`w-1 h-full ${
                        isPressingS ? 'bg-caramel-600' : 
                        isPressingE ? 'bg-olive-600' : 
                        isPressingM ? 'bg-sienna-600' : 'bg-gray-400'
                      } opacity-80`} />
                      <div className={`text-xs px-1 py-0.5 rounded text-white font-semibold ${
                        isPressingS ? 'bg-caramel-600' :
                        isPressingE ? 'bg-olive-600' :
                        isPressingM ? 'bg-sienna-600' : 'bg-gray-400'
                      }`}>
                        {isPressingS ? 'S' : isPressingE ? 'E' : isPressingM ? 'M' : ''}
                      </div>
                    </div>
                  )}

                  {/* 実時間作成バー（Sキー押下後の楽曲作成中） */}
                  {tempStartTime !== null && tempStartTime !== undefined && (
                    <div 
                      className="absolute z-15 h-full bg-blue-400/50 border-2 border-blue-400 rounded-sm"
                      style={{
                        left: `${Math.min((tempStartTime / effectiveTimelineDuration) * 100, (currentTime / effectiveTimelineDuration) * 100)}%`,
                        width: `${Math.abs(((currentTime - tempStartTime) / effectiveTimelineDuration) * 100)}%`
                      }}
                    >
                      <div className="absolute -top-6 left-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                        作成中... ({Math.round((currentTime - tempStartTime) * 10) / 10}s)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}