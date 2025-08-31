"use client";

import { SongSection } from "@/types";
import { useEffect, useState } from "react";
import PlayPauseButton from "@/components/ui/PlayPauseButton";
import { getDuplicateInfo } from "@/lib/utils/duplicateSongs";
import QuickAnnotationBar from "./QuickAnnotationBar";
import BulkEditModal from "./BulkEditModal";

interface SongListProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  actualPlayerDuration?: number; // 実際のプレイヤーの動画の長さ
  isEditMode?: boolean;
  onEditSong?: (song: SongSection) => void;
  onDeleteSong?: (songId: number) => void;
  onUpdateSong?: (song: SongSection) => void;
  onHoverSong?: (song: SongSection | null, position: { x: number; y: number }) => void;
  onSeek?: (time: number) => void;
  // ホットキー機能用
  onQuickSetStartTime?: (time: number) => void;
  onQuickSetEndTime?: (time: number) => void;
  onQuickAddMarker?: (time: number) => void;
  tempStartTime?: number | null;
  // プレイヤーコントロール用の props
  isPlaying?: boolean;
  onPlay?: () => void;
  onTogglePlayPause?: () => void;
  // 統合されたコントロール用の props
  shareUrl?: string;
  shareTitle?: string;
  originalVideoUrl?: string;
  onToggleEditMode?: () => void;
  onAddSong?: () => void;
  onImportSetlist?: () => void;
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
  // クイックアノテーション機能
  onQuickAddAnnotation?: (annotation: { title: string; artist: string; startTime: number }) => void;
  // 一括操作機能
  onBulkUpdate?: (songs: SongSection[]) => void;
  onBulkDelete?: (songIds: number[]) => void;
}

export default function SongList({ 
  songs, 
  currentTime, 
  duration,
  actualPlayerDuration,
  isEditMode = false, 
  onEditSong, 
  onDeleteSong,
  onUpdateSong,
  onHoverSong,
  onSeek,
  onQuickSetStartTime,
  onQuickSetEndTime,
  onQuickAddMarker,
  tempStartTime,
  isPlaying = false,
  onPlay,
  onTogglePlayPause,
  shareUrl,
  shareTitle,
  originalVideoUrl,
  onToggleEditMode,
  onAddSong,
  onImportSetlist,
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
  medleyCreator,
  onQuickAddAnnotation,
  onBulkUpdate,
  onBulkDelete
}: SongListProps) {
  // 編集機能の状態管理
  const [draggingSong, setDraggingSong] = useState<SongSection | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; originalStartTime: number; originalEndTime: number }>({ x: 0, originalStartTime: 0, originalEndTime: 0 });
  const [selectedSong, setSelectedSong] = useState<SongSection | null>(null);
  
  // キー押下状態の管理
  const [isPressingS, setIsPressingS] = useState<boolean>(false);
  const [isPressingE, setIsPressingE] = useState<boolean>(false);
  const [isPressingM, setIsPressingM] = useState<boolean>(false);
  
  // クイックアノテーション機能の状態管理
  const [quickAnnotationVisible, setQuickAnnotationVisible] = useState<boolean>(false);
  
  // 連続マーカー機能の状態管理
  const [continuousMarkerMode, setContinuousMarkerMode] = useState<boolean>(false);
  const [markerInterval, setMarkerInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastMarkerTime, setLastMarkerTime] = useState<number>(-1);
  
  // 一括編集機能の状態管理
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState<boolean>(false);
  const [bulkEditCandidates, setBulkEditCandidates] = useState<SongSection[]>([]);
  
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

  // ドラッグ&ドロップ関連の関数
  const handleMouseDown = (e: React.MouseEvent, song: SongSection, timelineElement: HTMLElement) => {
    if (!isEditMode || !onUpdateSong) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = timelineElement.getBoundingClientRect();
    if (!rect) return;
    
    const relativeX = e.clientX - rect.left;
    const clickPositionInSong = relativeX - ((song.startTime / effectiveTimelineDuration) * rect.width);
    const songWidth = ((song.endTime - song.startTime) / effectiveTimelineDuration) * rect.width;
    
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
  const handleSongClick = (e: React.MouseEvent, song: SongSection) => {
    if (isEditMode) {
      e.stopPropagation();
      setSelectedSong(selectedSong?.id === song.id ? null : song);
    }
    // ビューモードではクリック時に何もしない
  };

  // 楽曲セクションのダブルクリック処理
  const handleSongDoubleClick = (e: React.MouseEvent, song: SongSection) => {
    if (isEditMode && onEditSong) {
      e.preventDefault();
      e.stopPropagation();
      onEditSong(song);
    }
  };

  // タイムラインの空白部分クリック処理
  const handleTimelineClick = (e: React.MouseEvent) => {
    // 編集モード時はタイムラインクリックを無効化
    if (isEditMode || !onSeek) return;

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

  // クイックアノテーションハンドラ
  const handleQuickAddAnnotation = (annotation: { title: string; artist: string; startTime: number }) => {
    if (onQuickAddAnnotation) {
      onQuickAddAnnotation(annotation);
    }
  };

  const handleToggleQuickAnnotation = () => {
    setQuickAnnotationVisible(!quickAnnotationVisible);
  };

  // 連続マーカーモードハンドラ
  const startContinuousMarkerMode = () => {
    if (!onQuickAddMarker) return;
    
    setContinuousMarkerMode(true);
    
    // 最初のマーカーを即座に追加
    const currentRoundedTime = Math.round(currentTime * 10) / 10;
    if (Math.abs(currentRoundedTime - lastMarkerTime) >= 0.1) { // 0.1秒以上離れている場合のみ追加
      onQuickAddMarker(currentRoundedTime);
      setLastMarkerTime(currentRoundedTime);
    }
    
    // 連続マーカー追加のインターバルを設定（1秒間隔）
    const interval = setInterval(() => {
      const time = Math.round(currentTime * 10) / 10;
      if (Math.abs(time - lastMarkerTime) >= 1.0) { // 1秒以上離れている場合のみ追加
        onQuickAddMarker(time);
        setLastMarkerTime(time);
      }
    }, 1000);
    
    setMarkerInterval(interval);
  };

  const stopContinuousMarkerMode = () => {
    setContinuousMarkerMode(false);
    if (markerInterval) {
      clearInterval(markerInterval);
      setMarkerInterval(null);
    }
  };

  const toggleContinuousMarkerMode = () => {
    if (continuousMarkerMode) {
      stopContinuousMarkerMode();
    } else {
      startContinuousMarkerMode();
    }
  };

  // 一括編集機能ハンドラ
  const handleOpenBulkEdit = () => {
    // 未設定や仮のタイトルを持つ楽曲を一括編集候補として自動選択
    const temporaryAnnotations = songs.filter(song => 
      song.title.includes('未設定') || 
      song.title.includes('新しい楽曲') || 
      song.title.startsWith('楽曲') ||
      song.artist === '' ||
      song.artist.includes('未設定') ||
      song.artist.includes('アーティスト未設定')
    );
    
    // 候補が1つ以上あれば候補を、なければ全楽曲を対象とする
    const candidates = temporaryAnnotations.length > 0 ? temporaryAnnotations : songs;
    setBulkEditCandidates(candidates);
    setBulkEditModalOpen(true);
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
  const handleStartInlineEdit = (song: SongSection) => {
    if (!isEditMode) return;
    setInlineEditingSong(song.id);
    setInlineEditValue(song.title);
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




  // キーボードショートカット処理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEditMode) return;

    // キー押下状態を更新（リピートを避けるため e.repeat をチェック）
    if (!e.repeat) {
      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingS(true);
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingE(true);
          }
          break;
        case 'm':
          if (!e.ctrlKey && !e.metaKey) {
            setIsPressingM(true);
          }
          break;
      }
    }

    // ホットキー機能（S/E/M）- selectedSongがなくても動作
    switch (e.key.toLowerCase()) {
      case 's':
        if (!e.ctrlKey && !e.metaKey) { // Ctrl+S (保存) と区別
          e.preventDefault();
          if (onQuickSetStartTime) {
            onQuickSetStartTime(currentTime);
          }
          return;
        }
        break;
      case 'e':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (onQuickSetEndTime) {
            onQuickSetEndTime(currentTime);
          }
          return;
        }
        break;
      case 'm':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          // 連続マーカーモードが有効でない場合のみ、長押し検出を開始
          if (!continuousMarkerMode && onQuickAddMarker) {
            // 最初のマーカーを即座に追加
            onQuickAddMarker(currentTime);
            setLastMarkerTime(Math.round(currentTime * 10) / 10);
            
            // 長押しタイマーを設定（500ms後に連続マーカーモードを開始）
            const longPressTimer = setTimeout(() => {
              startContinuousMarkerMode();
            }, 500);
            
            // タイマーIDを保存（keyupでクリアするため）
            if (markerInterval) {
              clearTimeout(markerInterval);
            }
            setMarkerInterval(longPressTimer);
          }
          return;
        }
        break;
    }

    // 既存の楽曲編集機能（selectedSongが必要）
    if (!selectedSong || !onUpdateSong) return;

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

  // キー離すイベント処理
  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isEditMode) return;

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
          // 連続マーカーモードを停止
          if (continuousMarkerMode) {
            stopContinuousMarkerMode();
          } else if (markerInterval) {
            // 長押しタイマーをクリア（短いキー押しの場合）
            clearTimeout(markerInterval);
            setMarkerInterval(null);
          }
        }
        break;
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

  // キーボードイベントの登録/削除
  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, selectedSong, duration, currentTime, onQuickSetStartTime, onQuickSetEndTime, onQuickAddMarker]);

  // 連続マーカーモードのクリーンアップ
  useEffect(() => {
    return () => {
      if (markerInterval) {
        if (continuousMarkerMode) {
          clearInterval(markerInterval);
        } else {
          clearTimeout(markerInterval);
        }
      }
    };
  }, [markerInterval, continuousMarkerMode]);








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
                {isEditMode && selectedSong && (
                  <span className="ml-2 text-xs text-mint-600">「{selectedSong.title}」選択中</span>
                )}
                {isEditMode && (isPressingS || isPressingE || isPressingM || continuousMarkerMode) && (
                  <span className={`ml-2 text-xs font-medium animate-pulse ${
                    isPressingS ? 'text-orange-600' :
                    isPressingE ? 'text-mint-600' :
                    continuousMarkerMode ? 'text-purple-600' :
                    'text-indigo-600'
                  }`}>
                    {isPressingS ? '開始時刻設定中...' :
                     isPressingE ? '終了時刻設定中...' :
                     continuousMarkerMode ? '🔥 連続マーカー追加中... (Mキーを離すと停止)' :
                     'マーカー追加中...'}
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
              <button
                onClick={onToggleEditMode}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  isEditMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'text-white hover:shadow-lg'
                }`}
              >
                {isEditMode ? '編集終了' : '編集モード'}
              </button>
              {isEditMode && (
                <>
                  <button
                    onClick={onAddSong}
                    className="px-3 py-1 text-xs bg-mint-600 text-white rounded hover:bg-mint-600"
                  >
                    楽曲追加
                  </button>
                  {onImportSetlist && (
                    <button
                      onClick={onImportSetlist}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      title="セットリストから一括インポート"
                    >
                      インポート
                    </button>
                  )}
                  <button
                    onClick={handleToggleQuickAnnotation}
                    className={`px-3 py-1 text-xs rounded ${
                      quickAnnotationVisible
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                    }`}
                    title="クイックアノテーション"
                  >
                    ⚡ クイック
                  </button>
                  <button
                    onClick={toggleContinuousMarkerMode}
                    className={`px-3 py-1 text-xs rounded ${
                      continuousMarkerMode
                        ? 'bg-purple-500 text-white hover:bg-purple-600 animate-pulse'
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                    }`}
                    title={continuousMarkerMode ? '連続マーカーモードを停止' : '連続マーカーモードを開始 (Mキー長押しでも可能)'}
                  >
                    {continuousMarkerMode ? '🔥 連続中' : '🎯 連続'}
                  </button>
                  {songs.length > 1 && (
                    <button
                      onClick={handleOpenBulkEdit}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      title="一括編集（複数の楽曲を同時に編集）"
                    >
                      📝 一括編集
                    </button>
                  )}
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
                    <span className="text-xs text-orange-600">
                      未保存の変更があります
                    </span>
                  )}
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    <div>
                      キーボード: <kbd className={`px-1 rounded transition-all ${isPressingS ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-200'}`}>S</kbd>開始時刻 
                      <kbd className={`px-1 rounded transition-all ${isPressingE ? 'bg-mint-600 text-white animate-pulse' : 'bg-gray-200'}`}>E</kbd>終了時刻 
                      <kbd className={`px-1 rounded transition-all ${continuousMarkerMode ? 'bg-purple-600 text-white animate-pulse' : isPressingM ? 'bg-indigo-600 text-white animate-pulse' : 'bg-gray-200'}`}>M</kbd>{continuousMarkerMode ? '連続マーカー' : 'マーカー追加'}
                      {continuousMarkerMode && <span className="ml-1 text-purple-600 animate-pulse">🔥 連続モード</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      💡 楽曲名をダブルクリックで即座に編集
                    </div>
                  </div>
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
                  className="px-3 py-1 text-xs text-white rounded disabled:opacity-50 transition-all hover:shadow-lg" style={{ background: 'var(--gradient-primary)' }}
                >
                  {isSaving ? '保存中...' : '変更を保存'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* クイックアノテーションバー */}
      {isEditMode && quickAnnotationVisible && (
        <QuickAnnotationBar
          isVisible={quickAnnotationVisible}
          currentTime={currentTime}
          isPlaying={isPlaying || false}
          onAddAnnotation={handleQuickAddAnnotation}
          onClose={() => setQuickAnnotationVisible(false)}
        />
      )}

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
                            className={`${isEditMode ? 'cursor-pointer hover:bg-white/20 rounded px-1 py-0.5 transition-colors' : ''}`}
                            onDoubleClick={() => handleStartInlineEdit(song)}
                            style={{ pointerEvents: isEditMode ? 'auto' : 'none' }}
                            title={isEditMode ? 'ダブルクリックで編集' : undefined}
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
                        className={`p-0 rounded transition-colors bg-white border border-gray-300 ${
                          isEditMode 
                            ? 'text-orange-600 hover:bg-purple-50' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="楽曲を編集"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* 削除ボタン（編集モード時のみ表示） */}
                      {isEditMode && (
                        <button
                          onClick={() => {
                            if (confirm(`「${song.title}」を削除しますか？`)) {
                              onDeleteSong?.(song.id);
                            }
                          }}
                          className="p-0 text-red-600 hover:bg-red-100 rounded transition-colors bg-white border border-gray-300"
                          title="削除"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    
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
                          'bg-indigo-600'
                        } animate-pulse`} />
                        <div className={`text-xs font-bold px-1 py-0.5 rounded text-white shadow-lg -mt-1 ${
                          isPressingS ? 'bg-orange-600' : 
                          isPressingE ? 'bg-mint-600' : 
                          'bg-indigo-600'
                        }`}>
                          {isPressingS ? 'S' : isPressingE ? 'E' : 'M'}
                        </div>
                      </div>
                    )}

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
