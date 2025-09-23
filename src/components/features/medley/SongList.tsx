"use client";

import { SongSection } from "@/types";
import { useEffect, useState } from "react";
import PlayPauseButton from "@/components/ui/PlayPauseButton";
import { getDuplicateInfo } from "@/lib/utils/duplicateSongs";
import BulkEditModal from "./BulkEditModal";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  actualPlayerDuration?: number; // 実際のプレイヤーの動画の長さ
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onUpdateSong?: (song: SongSection) => void;
  onHoverSong?: (song: SongSection | null, position: { x: number; y: number }) => void;
  onSeek?: (time: number) => void;
  // ホットキー機能用
  tempStartTime?: number | null;
  // プレイヤーコントロール用の props
  isPlaying?: boolean;
  onPlay?: () => void;
  onTogglePlayPause?: () => void;
  // 統合されたコントロール用の props
  shareUrl?: string;
  shareTitle?: string;
  originalVideoUrl?: string;
  currentSong?: SongSection;
  // メドレー情報
  medleyTitle?: string;
  medleyCreator?: string;
  // 一括操作機能
  onBulkUpdate?: (songs: SongSection[]) => void;
  onBulkDelete?: (songIds: number[]) => void;
}

export default function SongList({ 
  songs, 
  currentTime, 
  duration,
  actualPlayerDuration,
 
  onEditSong, 
  onUpdateSong,
  onHoverSong,
  onSeek,
  tempStartTime,
  isPlaying = false,
  onPlay,
  onTogglePlayPause,
  shareUrl,
  shareTitle,
  originalVideoUrl,
  currentSong, // eslint-disable-line @typescript-eslint/no-unused-vars
  medleyTitle,
  medleyCreator,
  onBulkUpdate,
  onBulkDelete
}: SongListProps) {
  // 編集機能の状態管理
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; originalStartTime: number; originalEndTime: number }>({ x: 0, originalStartTime: 0, originalEndTime: 0 });
  
  
  
  
  // 一括編集機能の状態管理
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState<boolean>(false);
  const [bulkEditCandidates] = useState<SongSection[]>([]);
  
  // インライン編集機能の状態管理
  const [inlineEditingSong, setInlineEditingSong] = useState<number | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");

  // タイムライン関連の計算（実際のプレイヤーの長さを使用）
  const effectiveTimelineDuration = actualPlayerDuration || duration;


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


  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingSong || !dragMode || !onUpdateSong) return;
    
    const timelineElement = document.querySelector('.timeline-container') as HTMLElement;
    if (!timelineElement) return;
    
    const rect = timelineElement.getBoundingClientRect();
    if (!rect) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaTime = (deltaX / rect.width) * effectiveTimelineDuration;
    
    let newStartTime = dragStart.originalStartTime;
    let newEndTime = dragStart.originalEndTime;
    
    if (dragMode === 'move') {
      const rawStartTime = Math.max(0, dragStart.originalStartTime + deltaTime);
      
      // 移動時は楽曲の長さを保持
      const songDuration = dragStart.originalEndTime - dragStart.originalStartTime;
      
      newStartTime = rawStartTime;
      newEndTime = newStartTime + songDuration;
      
      // 境界チェック
      if (newEndTime > effectiveTimelineDuration) {
        newEndTime = effectiveTimelineDuration;
        newStartTime = effectiveTimelineDuration - songDuration;
      }
      if (newStartTime < 0) {
        newStartTime = 0;
        newEndTime = songDuration;
      }
    } else if (dragMode === 'resize-start') {
      newStartTime = Math.max(0, Math.min(dragStart.originalEndTime - 1, dragStart.originalStartTime + deltaTime));
    } else if (dragMode === 'resize-end') {
      newEndTime = Math.min(effectiveTimelineDuration, Math.max(dragStart.originalStartTime + 1, dragStart.originalEndTime + deltaTime));
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
  const handleSongClick = () => {
    // クリック機能は無効化
  };

  // 楽曲セクションのダブルクリック処理
  const handleSongDoubleClick = () => {
    // ダブルクリック機能は無効化
  };

  // タイムラインの空白部分クリック処理
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!onSeek) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPosition = clickX / rect.width;
    
    // 時間計算
    const seekTime = clickPosition * effectiveTimelineDuration;
    
    // 有効な時間範囲内かチェック（実際のプレイヤーの長さを優先）
    const maxSeekTime = actualPlayerDuration || duration;
    if (seekTime >= 0 && seekTime <= maxSeekTime) {
      onSeek(seekTime);
      // 再生されていない場合は再生を開始
      if (!isPlaying && onPlay) {
        onPlay();
      }
    }
  };

  // マウスホバーイベント処理
  const handleSongHover = (e: React.MouseEvent, song: SongSection) => {
    if (onHoverSong) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.right + 8, // タイムラインバーの右側に表示
        y: rect.top
      };
      onHoverSong(song, position);
    }
  };

  const handleSongLeave = () => {
    if (onHoverSong) {
      onHoverSong(null, { x: 0, y: 0 });
    }
  };





  const handleBulkUpdate = (updatedSongs: SongSection[]) => {
    if (onBulkUpdate) {
      onBulkUpdate(updatedSongs);
    }
  };

  const handleBulkDelete = (songIds: number[]) => {
    if (onBulkDelete) {
      onBulkDelete(songIds);
    }
  };

  // インライン編集機能ハンドラ
  const handleStartInlineEdit = () => {
    // インライン編集機能は無効化
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingSong(null);
    setInlineEditValue("");
  };

  const handleSaveInlineEdit = (song: SongSection) => {
    if (!onUpdateSong || !inlineEditValue.trim()) {
      handleCancelInlineEdit();
      return;
    }

    const updatedSong: SongSection = {
      ...song,
      title: inlineEditValue.trim()
    };

    onUpdateSong(updatedSong);
    handleCancelInlineEdit();
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent, song: SongSection) => {
    e.stopPropagation(); // キーボードイベントの伝播を停止
    
    if (e.key === 'Enter') {
      handleSaveInlineEdit(song);
    } else if (e.key === 'Escape') {
      handleCancelInlineEdit();
    }
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










  const currentSongs = getCurrentSongs();

  return (
    <div className="bg-gray-50">
      {/* 統一スティッキーコントロールヘッダー */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* セクション1: 再生ステータス + 共有エリア */}
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
            {/* 左側: 再生コントロール + ステータス */}
            <div className="flex items-center gap-4">
              {/* 再生/一時停止ボタン */}
              {onTogglePlayPause && (
                <PlayPauseButton 
                  isPlaying={isPlaying} 
                  onClick={onTogglePlayPause}
                  size="sm"
                />
              )}
              <h3 className="text-xs font-medium text-gray-700">
                {formatTime(currentTime)} / {formatTime(actualPlayerDuration || duration)}
                {actualPlayerDuration && actualPlayerDuration !== duration && (
                  <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded" title={`設定値: ${formatTime(duration)}`}>
                    ⚠️ 長さ不一致
                  </span>
                )}
                {currentSongs.length > 1 && (
                  <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                    マッシュアップ: {currentSongs.length}曲
                  </span>
                )}
              </h3>
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
                  className="px-2 py-1 text-xs text-white rounded transition-all hover:shadow-lg" style={{ background: 'var(--gradient-primary)' }}
                  title="この動画を共有"
                >
                  共有
                </button>
              </div>
            )}
          </div>
        </div>

        {/* セクション2: 編集コントロール */}
        <div className="px-3 py-2 bg-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
            </div>
          </div>
        </div>

      </div>


      {/* メインコンテンツエリア */}
      <div className="p-2">

      <div>
        <div className="space-y-0">
            {songs.map((song) => {
              const { hasOverlap, overlappingSongs } = detectOverlaps(song);
              const isCurrentlyPlaying = currentSongs.some(s => s.id === song.id);
              const isBeyondActualDuration = actualPlayerDuration && song.startTime >= actualPlayerDuration;
              
              return (
                <div
                  key={song.id}
                  className={`relative p-0.5 rounded-lg border transition-all ${
                    isBeyondActualDuration
                      ? "bg-red-50 border-red-200 opacity-60"
                      : isCurrentlyPlaying
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >

                  {/* タイムライン */}
                  <div 
                    className={`timeline-container relative w-full h-6 ml-0 transition-colors ${
                      false
                        ? 'bg-blue-100 shadow-inner'
                        : 'bg-blue-50'
                    }`}
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
                    
                    {/* 楽曲タイムラインバー */}
                    <div
                      className={`absolute h-4 top-1 transition-all hover:h-5 hover:top-0.5 ${
                        isBeyondActualDuration 
                          ? 'bg-red-400 opacity-50' 
                          : 'bg-gradient-to-r from-orange-600 to-indigo-600'
                      } ${
                        hasOverlap ? 'opacity-80' : ''
                      } ${
                        isCurrentlyPlaying ? 'ring-2 ring-blue-400 animate-pulse' : ''
                      } ${
                        'cursor-pointer'
                      } ${
                        draggingSong?.id === song.id ? 'opacity-70 z-30' : ''
                      } select-none`}
                      style={{
                        left: `${(song.startTime / effectiveTimelineDuration) * 100}%`,
                        width: `${((song.endTime - song.startTime) / effectiveTimelineDuration) * 100}%`,
                      }}
                      onClick={handleSongClick}
                      onDoubleClick={handleSongDoubleClick}
                      onMouseDown={undefined}
                      onMouseEnter={(e) => handleSongHover(e, song)}
                      onMouseLeave={handleSongLeave}
                      title={`${song.title} - ${song.artist}: ${formatTime(song.startTime)} - ${formatTime(song.endTime)}${isBeyondActualDuration ? ' | ℹ️ 実際の動画長を超過（自動調整済み）' : ''}${hasOverlap ? ` (${overlappingSongs.length}曲と重複)` : ''} | クリックで再生`}
                    >
                      <div className="text-[10px] text-gray-800 font-medium px-2 leading-4 relative z-30 whitespace-nowrap flex items-center gap-1"
                           style={{
                             // タイトルをバーの幅を超えても表示（オーバーフロー許可）
                             overflow: 'visible',
                             position: 'relative'
                           }}>
                        {inlineEditingSong === song.id ? (
                          <input
                            type="text"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => handleInlineEditKeyDown(e, song)}
                            onBlur={() => handleSaveInlineEdit(song)}
                            className="bg-white border border-orange-400 rounded px-1 py-0.5 text-[10px] font-medium text-gray-800 min-w-0 max-w-32"
                            style={{ pointerEvents: 'auto' }}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                          />
                        ) : (
                          <span
                            className={``}
                            onDoubleClick={handleStartInlineEdit}
                            style={{ pointerEvents: 'none' }}
                            title={undefined}
                          >
                            {song.title}
                          </span>
                        )}
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
                    
                    {/* 編集・削除ボタン（タイムライン右端に配置） */}
                    <div className="absolute right-2 top-1 flex gap-1 z-40">
                      {/* 編集ボタン（常時表示） */}
                      <button
                        onClick={() => onEditSong?.(song)}
                        className={`p-0 rounded transition-colors bg-white border border-gray-300 ${'text-gray-600 hover:bg-gray-100'}`}
                        title="楽曲を編集"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    
                    
                    {/* 現在再生位置インジケーター */}
                    <div
                      className="absolute w-0.5 h-full bg-red-500 z-10"
                      style={{
                        left: `${(currentTime / effectiveTimelineDuration) * 100}%`
                      }}
                    />


                    {/* リアルタイム楽曲バー（tempStartTime設定時） */}
                    {tempStartTime !== null && tempStartTime !== undefined && (
                      <div
                        className="absolute z-15 h-full bg-blue-400/50 border-2 border-blue-400 rounded-sm"
                        style={{
                          left: `${Math.max(0, (tempStartTime / effectiveTimelineDuration) * 100)}%`,
                          width: `${Math.max(0, ((currentTime - tempStartTime) / effectiveTimelineDuration) * 100)}%`
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-xs font-semibold text-blue-800 bg-white/80 px-1 rounded shadow-sm">
                            作成中... ({Math.round((currentTime - tempStartTime) * 10) / 10}s)
                          </div>
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

      {/* 一括編集モーダル */}
      <BulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        songs={bulkEditCandidates}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
