"use client";

import { SongSection } from "@/types";
import { useEffect, useState } from "react";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
  onUpdateSong?: (song: SongSection) => void;
  onShowSongDetail?: (song: SongSection) => void;
  onHoverSong?: (song: SongSection | null, position: { x: number; y: number }) => void;
  // 統合されたコントロール用の props
  shareUrl?: string;
  shareTitle?: string;
  originalVideoUrl?: string;
  onToggleEditMode?: () => void;
  onAddSong?: () => void;
  onSaveChanges?: () => void;
  onResetChanges?: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  currentSong?: SongSection;
  // メドレー情報
  medleyTitle?: string;
  medleyCreator?: string;
}

export default function SongList({ 
  songs, 
  currentTime, 
  duration,
  isEditMode = false, 
  onEditSong, 
  onDeleteSong,
  onUpdateSong,
  onShowSongDetail,
  onHoverSong,
  shareUrl,
  shareTitle,
  originalVideoUrl,
  onToggleEditMode,
  onAddSong,
  onSaveChanges,
  onResetChanges,
  hasChanges = false,
  isSaving = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  currentSong, // eslint-disable-line @typescript-eslint/no-unused-vars
  medleyTitle,
  medleyCreator
}: SongListProps) {
  // 編集機能の状態管理
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; originalStartTime: number; originalEndTime: number }>({ x: 0, originalStartTime: 0, originalEndTime: 0 });
  const [selectedSong, setSelectedSong] = useState<SongSection | null>(null);

  // タイムラインズーム機能の状態管理
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0); // ズーム倍率 (0.5-5.0)
  const [timelineOffset, setTimelineOffset] = useState<number>(0); // 表示開始時刻

  // タイムラインズーム関連の計算
  const visibleDuration = duration / timelineZoom; // 表示される時間範囲
  const visibleStartTime = timelineOffset; // 表示開始時刻
  const visibleEndTime = Math.min(timelineOffset + visibleDuration, duration); // 表示終了時刻

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

  // ドラッグ&ドロップ関連の関数
  const handleMouseDown = (e: React.MouseEvent, song: SongSection, timelineElement: HTMLElement) => {
    if (!isEditMode || !onUpdateSong) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = timelineElement.getBoundingClientRect();
    if (!rect) return;
    
    const relativeX = e.clientX - rect.left;
    const clickPositionInSong = relativeX - ((song.startTime - visibleStartTime) / visibleDuration) * rect.width;
    const songWidth = ((song.endTime - song.startTime) / visibleDuration) * rect.width;
    
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
    const deltaTime = (deltaX / rect.width) * visibleDuration;
    
    let newStartTime = dragStart.originalStartTime;
    let newEndTime = dragStart.originalEndTime;
    
    if (dragMode === 'move') {
      const rawStartTime = Math.max(0, dragStart.originalStartTime + deltaTime);
      
      // 移動時は楽曲の長さを保持
      const songDuration = dragStart.originalEndTime - dragStart.originalStartTime;
      
      newStartTime = rawStartTime;
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
      newStartTime = Math.max(0, Math.min(dragStart.originalEndTime - 1, dragStart.originalStartTime + deltaTime));
    } else if (dragMode === 'resize-end') {
      newEndTime = Math.min(duration, Math.max(dragStart.originalStartTime + 1, dragStart.originalEndTime + deltaTime));
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
      // ビューモードでは楽曲詳細モーダルを開く
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

  // マウスホバーイベント処理
  const handleSongHover = (e: React.MouseEvent, song: SongSection) => {
    if (!isEditMode && onHoverSong) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.right + 8, // タイムラインバーの右側に表示
        y: rect.top
      };
      onHoverSong(song, position);
    }
  };

  const handleSongLeave = () => {
    if (!isEditMode && onHoverSong) {
      onHoverSong(null, { x: 0, y: 0 });
    }
  };

  // マウスホイールズーム処理
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(5.0, timelineZoom * zoomFactor));
      
      // マウス位置を基準にズーム
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseTimePosition = (mouseX / rect.width) * visibleDuration + visibleStartTime;
      
      setTimelineZoom(newZoom);
      
      // ズーム後にマウス位置が同じ時刻を指すように調整
      const newVisibleDuration = duration / newZoom;
      const newOffset = Math.max(0, Math.min(
        duration - newVisibleDuration,
        mouseTimePosition - (mouseX / rect.width) * newVisibleDuration
      ));
      setTimelineOffset(newOffset);
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



  // 表示範囲内にある楽曲をフィルタリング
  const getVisibleSongs = (): SongSection[] => {
    return songs.filter((song) => {
      // 楽曲が表示範囲と重なっているかチェック
      return !(song.endTime <= visibleStartTime || song.startTime >= visibleEndTime);
    });
  };

  const currentSongs = getCurrentSongs();
  const visibleSongs = getVisibleSongs();

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* 統一スティッキーコントロールヘッダー */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        {/* セクション1: 再生ステータス + 共有エリア */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* メドレータイトルと制作者 */}
          {(medleyTitle || medleyCreator) && (
            <div className="mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              {medleyTitle && (
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {medleyTitle}
                </h2>
              )}
              {medleyCreator && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  制作: {medleyCreator}
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            {/* 左側: 再生ステータス */}
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                現在: {formatTime(currentTime)}
                {isEditMode && selectedSong && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">「{selectedSong.title}」選択中</span>
                )}
                {currentSongs.length > 1 && (
                  <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                    マッシュアップ: {currentSongs.length}曲
                  </span>
                )}
              </h3>
              {currentSongs.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  再生中: {currentSongs.map(s => s.title).join(', ')}
                </div>
              )}
            </div>
            {/* 右側: 共有ボタン */}
            {shareUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: shareTitle, url: shareUrl });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      alert('URLをクリップボードにコピーしました');
                    }
                  }}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="この動画を共有"
                >
                  共有
                </button>
                {originalVideoUrl && (
                  <a
                    href={originalVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                    title="元動画を見る"
                  >
                    元動画
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v7a2 2 0 002 2h4m-6-9v2m0 4h.01m4.09-.5L10 14l4-4.5" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* セクション2: 編集コントロール */}
        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleEditMode}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  isEditMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isEditMode ? '編集終了' : '編集モード'}
              </button>
              {isEditMode && (
                <>
                  <button
                    onClick={onAddSong}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    楽曲追加
                  </button>
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
                  {hasChanges && (
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      未保存の変更があります
                    </span>
                  )}
                </>
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
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '変更を保存'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* セクション3: ズームコントロール */}
        <div className="px-3 py-1 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                ズーム:
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={timelineZoom}
                onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-300 dark:bg-gray-600 rounded appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[2rem]">
                {timelineZoom.toFixed(1)}x
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setTimelineZoom(1)}
                className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                1x
              </button>
              <button
                onClick={() => setTimelineZoom(2)}
                className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                2x
              </button>
              <button
                onClick={() => setTimelineZoom(5)}
                className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                5x
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="p-2">

      <div>
        <div className="space-y-0.5">
            {visibleSongs.map((song) => {
              const { hasOverlap, overlappingSongs } = detectOverlaps(song);
              const isCurrentlyPlaying = currentSongs.some(s => s.id === song.id);
              
              return (
                <div
                  key={song.id}
                  className={`relative p-1 rounded-lg border transition-all ${
                    isCurrentlyPlaying
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  }`}
                >

                  {/* タイムライン */}
                  <div 
                    className="timeline-container relative w-full h-8 bg-blue-50 dark:bg-blue-900/10"
                    onWheel={handleWheel}
                  >
                    {/* 時間グリッド（背景） - ズームレベルに応じて調整 */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: Math.min(21, Math.max(6, Math.ceil(timelineZoom * 10))) }).map((_, i) => {
                        const gridCount = Math.min(20, Math.max(5, Math.ceil(timelineZoom * 10)));
                        return (
                          <div 
                            key={i} 
                            className="border-l border-gray-200 dark:border-gray-700 opacity-50" 
                            style={{ left: `${(i / gridCount) * 100}%` }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* 時間ラベル（ズーム時に表示） */}
                    {timelineZoom > 1.5 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: Math.min(11, Math.ceil(timelineZoom * 5)) }).map((_, i) => {
                          const labelCount = Math.min(10, Math.ceil(timelineZoom * 5));
                          const timeAtPosition = visibleStartTime + (i / labelCount) * visibleDuration;
                          if (timeAtPosition > duration) return null;
                          return (
                            <div
                              key={i}
                              className="absolute top-0 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-1 rounded"
                              style={{ 
                                left: `${(i / labelCount) * 100}%`,
                                transform: 'translateX(-50%)',
                                fontSize: '10px'
                              }}
                            >
                              {formatTime(timeAtPosition)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* 楽曲タイムラインバー */}
                    <div
                      className={`absolute h-6 top-1 transition-all hover:h-7 hover:top-0 bg-blue-500 dark:bg-blue-600 ${
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
                      style={visibleDuration > 0 ? {
                        left: `${Math.max(0, ((song.startTime - visibleStartTime) / visibleDuration) * 100)}%`,
                        width: `${Math.min(100, ((song.endTime - song.startTime) / visibleDuration) * 100)}%`,
                      } : {}}
                      onClick={(e) => handleSongClick(e, song)}
                      onDoubleClick={(e) => handleSongDoubleClick(e, song)}
                      onMouseDown={(e) => isEditMode ? handleMouseDown(e, song, e.currentTarget.closest('.timeline-container') as HTMLElement) : undefined}
                      onMouseEnter={(e) => handleSongHover(e, song)}
                      onMouseLeave={handleSongLeave}
                      title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''}${isEditMode ? ' | ドラッグ移動, 矢印キーで微調整' : ' | クリックで再生'}`}
                    >
                      <div className="text-xs text-gray-900 dark:text-white font-medium px-2 leading-6 pointer-events-none relative z-30">
                        <div 
                          className="whitespace-nowrap bg-white/90 dark:bg-slate-900/50 rounded px-1 shadow-sm"
                          style={{
                            // タイトルをバーの幅を超えても表示（オーバーフロー許可）
                            overflow: 'visible',
                            position: 'relative'
                          }}
                        >
                          {song.title}
                        </div>
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
                    
                    {/* 編集ボタン（編集モード時のみ、タイムライン右端に配置） */}
                    {isEditMode && (
                      <div className="absolute right-2 top-1 flex gap-1 z-40">
                        <button
                          onClick={() => onEditSong?.(song)}
                          className="p-0.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                          title="編集"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`「${song.title}」を削除しますか？`)) {
                              onDeleteSong?.(song.id);
                            }
                          }}
                          className="p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                          title="削除"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* 現在再生位置インジケーター */}
                    <div
                      className="absolute w-0.5 h-full bg-red-500 z-10"
                      style={{
                        left: `${((currentTime - visibleStartTime) / visibleDuration) * 100}%`,
                        display: currentTime >= visibleStartTime && currentTime <= visibleEndTime ? 'block' : 'none'
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      </div>
    </div>
  );
}
