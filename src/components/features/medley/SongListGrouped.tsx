"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  // Edit mode toggle
  onToggleEditMode?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Temporary timeline bar - for adding songs from M key long press
  onAddSongFromTempBar?: (startTime: number, endTime: number) => void;
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
  onEditSong,
  onTogglePlayPause,
  isPlaying,
  isEditMode = false,
  selectedSong,
  onSelectSong,
  onSongHover,
  onSongHoverEnd,
  onQuickSetStartTime,
  onQuickSetEndTime,
  onQuickAddMarker,
  tempStartTime = null,
  medleyTitle,
  medleyCreator,
  originalVideoUrl,
  onToggleEditMode,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onAddSongFromTempBar,
}: SongListProps) {
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; initialTime: number; timelineWidth: number } | null>(null);
  const [isPressingS, setIsPressingS] = useState(false);
  const [isPressingE, setIsPressingE] = useState(false);  
  const [isPressingM, setIsPressingM] = useState(false);
  

  // 一時的なタイムラインバーの状態管理（Mキー長押し用）
  const [tempTimelineBar, setTempTimelineBar] = useState<{
    startTime: number;
    endTime: number;
    isActive: boolean;
  } | null>(null);
  const mKeyLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tempTimelineBarRef = useRef<{ startTime: number; endTime: number; isActive: boolean; } | null>(null);
  const [isLongPress, setIsLongPress] = useState<boolean>(false);
  
  // Ref を state と同期
  useEffect(() => {
    tempTimelineBarRef.current = tempTimelineBar;
  }, [tempTimelineBar]);

  const effectiveTimelineDuration = actualPlayerDuration || duration;

  // Update temporary timeline bar continuously while M key is held
  useEffect(() => {
    if (tempTimelineBar && tempTimelineBar.isActive) {
      logger.debug('🎵 Setting up interval for tempTimelineBar update');
      const interval = setInterval(() => {
        setTempTimelineBar(prev => {
          if (prev && prev.isActive) {
            const updated = {
              ...prev,
              endTime: currentTime
            };
            logger.debug('🎵 Updating tempTimelineBar endTime:', updated.endTime);
            return updated;
          }
          return prev;
        });
      }, 100); // Update every 100ms
      
      return () => {
        logger.debug('🎵 Clearing interval for tempTimelineBar update');
        clearInterval(interval);
      };
    }
  }, [tempTimelineBar?.isActive, currentTime]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (mKeyLongPressTimerRef.current) {
        clearTimeout(mKeyLongPressTimerRef.current);
      }
    };
  }, []);

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

    setDraggingSong(song);
    setDragMode('move');
    setDragStart({
      x: e.clientX,
      initialTime: song.startTime,
      timelineWidth: rect.width
    });
  };

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

  // キーボードイベントリスナー（安定した登録のため、useEffect内で関数を定義）
  useEffect(() => {
    if (!isEditMode) return;

    logger.debug('🔧 Setting up keyboard event listeners for edit mode');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      logger.debug('⌨️ Key pressed:', e.key, 'edit mode:', isEditMode);

      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingS(true);
            logger.debug('🟦 S key pressed, calling onQuickSetStartTime');
            onQuickSetStartTime?.(currentTime);
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingE(true);
            logger.debug('🟢 E key pressed, calling onQuickSetEndTime');
            onQuickSetEndTime?.(currentTime);
          }
          break;
        case 'm':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsPressingM(true);
            setIsLongPress(false); // リセット
            logger.debug('🎵 M key pressed, currentTime:', currentTime);
            
            // 編集モードの場合のみ長押し検出を開始
            if (isEditMode) {
              // Clear any existing timer
              if (mKeyLongPressTimerRef.current) {
                clearTimeout(mKeyLongPressTimerRef.current);
              }
              
              logger.debug('🎵 Setting up M key long press timer');
              const longPressTimer = setTimeout(() => {
                logger.debug('🎵 M key long press detected, entering long press mode at time:', currentTime);
                setIsLongPress(true);
                setTempTimelineBar({
                  startTime: currentTime,
                  endTime: currentTime,
                  isActive: true
                });
              }, 500); // 500ms delay for long press
              
              mKeyLongPressTimerRef.current = longPressTimer;
            }
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
            
            // Clear long press timer if still running
            if (mKeyLongPressTimerRef.current) {
              logger.debug('🎵 Clearing M key long press timer');
              clearTimeout(mKeyLongPressTimerRef.current);
              mKeyLongPressTimerRef.current = null;
            }
            
            // Check if this was a long press or short press
            if (isLongPress) {
              // Long press: Handle temporary timeline bar completion
              const currentTempBar = tempTimelineBarRef.current;
              if (currentTempBar && currentTempBar.isActive) {
                logger.debug('🎵 M key released (long press), completing temporary timeline bar', currentTempBar);
                
                // Only create song if the bar has meaningful duration (at least 1 second)
                const duration = currentTempBar.endTime - currentTempBar.startTime;
                if (duration >= 1.0 && onAddSongFromTempBar) {
                  logger.debug('🎵 Creating song from temp bar, duration:', duration);
                  onAddSongFromTempBar(currentTempBar.startTime, currentTempBar.endTime);
                } else {
                  logger.debug('🎵 Temp bar duration too short:', duration);
                }
                
                // Clear temporary bar
                setTempTimelineBar(null);
              }
            } else {
              // Short press: Create default 30-second song
              logger.debug('🎵 M key released (short press), creating default song');
              if (isEditMode && onQuickAddMarker) {
                onQuickAddMarker(currentTime);
              }
            }
            
            // Reset long press flag
            setIsLongPress(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      logger.debug('🔧 Cleaning up keyboard event listeners');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEditMode, currentTime, onQuickSetStartTime, onQuickSetEndTime, onQuickAddMarker, onAddSongFromTempBar, isLongPress]);

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
              {hasChanges && (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  未保存の変更があります
                </span>
              )}
              {isEditMode && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  キーボード: <kbd className={`px-1 rounded transition-all ${isPressingS ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-200'}`}>S</kbd>開始時刻 
                  <kbd className={`px-1 rounded transition-all ${isPressingE ? 'bg-mint-600 text-white animate-pulse' : 'bg-gray-200'}`}>E</kbd>終了時刻 
                  <kbd className={`px-1 rounded transition-all ${tempTimelineBar?.isActive ? 'bg-purple-600 text-white animate-pulse' : isPressingM ? 'bg-indigo-600 text-white animate-pulse' : 'bg-gray-200'}`}>M</kbd>{tempTimelineBar?.isActive ? '空楽曲作成中' : 'マーカー追加'}
                  {tempTimelineBar?.isActive && <span className="ml-1 text-purple-600 font-medium">（長押し中）</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* セクション2: 編集コントロール */}
        <div className="px-3 py-2 bg-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleEditMode}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  isEditMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'text-white hover:shadow-lg'
                }`}
                style={!isEditMode ? { background: 'var(--gradient-primary)' } : {}}
              >
                {isEditMode ? '編集終了' : '編集モード'}
              </button>
              {isEditMode && (
                <>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                      title="元に戻す (Ctrl+Z)"
                    >
                      ↶
                    </button>
                    <button
                      onClick={onRedo}
                      disabled={!canRedo}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                      title="やり直し (Ctrl+Y)"
                    >
                      ↷
                    </button>
                  </div>
                </>
              )}
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
                        title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${isBeyondActualDuration ? ' | ℹ️ 実際の動画長を超過（自動調整済み）' : ''}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}${isEditMode ? ' | ドラッグ移動, 矢印キーで微調整' : ' | クリックで再生'}`}
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
                        isPressingS ? 'bg-orange-600' : 
                        isPressingE ? 'bg-mint-600' : 
                        isPressingM ? 'bg-indigo-600' : 'bg-gray-400'
                      } opacity-80`} />
                      <div className={`text-xs px-1 py-0.5 rounded text-white font-semibold ${
                        isPressingS ? 'bg-orange-600' :
                        isPressingE ? 'bg-mint-600' :
                        isPressingM ? 'bg-indigo-600' : 'bg-gray-400'
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

                  {/* 一時的なタイムラインバー（Mキー長押し用） */}
                  {tempTimelineBar && tempTimelineBar.isActive && (
                    <div 
                      className="absolute z-20 h-full bg-purple-400/60 border-2 border-purple-500 border-dashed rounded-sm animate-pulse"
                      style={{
                        left: `${(tempTimelineBar.startTime / effectiveTimelineDuration) * 100}%`,
                        width: `${Math.max(0.5, ((tempTimelineBar.endTime - tempTimelineBar.startTime) / effectiveTimelineDuration) * 100)}%`
                      }}
                    >
                      <div className="absolute -top-6 left-1 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                        空の楽曲作成中... ({Math.round((tempTimelineBar.endTime - tempTimelineBar.startTime) * 10) / 10}s)
                      </div>
                      <div className="text-xs text-purple-900 font-medium px-2 leading-6 pointer-events-none relative z-30 whitespace-nowrap flex items-center justify-center">
                        空の楽曲
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