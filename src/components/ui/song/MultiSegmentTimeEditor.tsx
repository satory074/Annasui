"use client";

import { useState, useEffect, useCallback } from "react";
import { SongSection } from "@/types";
import { parseTimeInput, formatTimeSimple } from "@/lib/utils/time";
import { logger } from '@/lib/utils/logger';

// セグメント編集状態
interface SegmentEditState {
  segmentId: number | null;
  field: 'startTime' | 'endTime' | null;
}

// セグメントリストコンポーネント
interface SegmentListProps {
  segments: TimeSegment[];
  errors: Record<number, { startTime?: string; endTime?: string }>;
  previewingSegmentId: number | null;
  onUpdateSegment: (segmentId: number, field: 'startTime' | 'endTime', value: number) => void;
  onTogglePreview: (segmentId: number) => void;
  onRemoveSegment: (segmentId: number) => void;
  onSeek?: (time: number) => void;
  onTogglePlayPause?: () => void;
}

function SegmentList({
  segments,
  errors,
  previewingSegmentId,
  onUpdateSegment,
  onTogglePreview,
  onRemoveSegment,
  onSeek,
  onTogglePlayPause
}: SegmentListProps) {
  const [editingSegment, setEditingSegment] = useState<SegmentEditState>({ segmentId: null, field: null });
  const [tempTimeValue, setTempTimeValue] = useState('');

  // セグメント編集の開始
  const startEditing = (segmentId: number, field: 'startTime' | 'endTime', currentValue: number) => {
    setEditingSegment({ segmentId, field });
    setTempTimeValue(formatTimeSimple(currentValue));
  };

  // セグメント編集の終了
  const finishEditing = () => {
    if (editingSegment.segmentId && editingSegment.field) {
      const timeValue = parseTimeInput(tempTimeValue);
      onUpdateSegment(editingSegment.segmentId, editingSegment.field, timeValue);
    }
    setEditingSegment({ segmentId: null, field: null });
    setTempTimeValue('');
  };

  // キーボード処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingSegment({ segmentId: null, field: null });
      setTempTimeValue('');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      <div className="flex flex-wrap gap-2">
        {segments.map((segment) => {
          const segmentErrors = errors[segment.id] || {};
          const duration = Math.round((segment.endTime - segment.startTime) * 10) / 10;
          const isEditing = editingSegment.segmentId === segment.id;
          const isPreviewPlaying = previewingSegmentId === segment.id;
          
          return (
            <div
              key={segment.id}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                isPreviewPlaying 
                  ? 'bg-orange-100 border-orange-300'
                  : 'bg-gray-50 border-gray-200'
              } hover:bg-gray-100 transition-colors`}
            >
              {/* 区間番号 */}
              <span className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                区間{segment.segmentNumber}
              </span>

              {/* 開始時間 */}
              <div className="flex items-center gap-1">
                {isEditing && editingSegment.field === 'startTime' ? (
                  <input
                    type="text"
                    value={tempTimeValue}
                    onChange={(e) => setTempTimeValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    className={`w-16 px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-600 ${
                      segmentErrors.startTime ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEditing(segment.id, 'startTime', segment.startTime)}
                    className={`text-xs px-1 py-0.5 rounded hover:bg-white ${
                      segmentErrors.startTime ? 'text-red-500 bg-red-50' : 'text-gray-700'
                    }`}
                    title="クリックして編集"
                  >
                    {formatTimeSimple(segment.startTime)}
                  </button>
                )}
                
                <span className="text-xs text-gray-400">-</span>
                
                {/* 終了時間 */}
                {isEditing && editingSegment.field === 'endTime' ? (
                  <input
                    type="text"
                    value={tempTimeValue}
                    onChange={(e) => setTempTimeValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    className={`w-16 px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-600 ${
                      segmentErrors.endTime ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEditing(segment.id, 'endTime', segment.endTime)}
                    className={`text-xs px-1 py-0.5 rounded hover:bg-white ${
                      segmentErrors.endTime ? 'text-red-500 bg-red-50' : 'text-gray-700'
                    }`}
                    title="クリックして編集"
                  >
                    {formatTimeSimple(segment.endTime)}
                  </button>
                )}
              </div>

              {/* 長さ表示 */}
              <span className="text-xs text-gray-500">({duration}s)</span>

              {/* 再生中インジケーター */}
              {isPreviewPlaying && (
                <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
                  再生中
                </span>
              )}

              {/* 操作ボタン */}
              <div className="flex items-center gap-1 ml-1">
                {/* プレビューボタン */}
                {onSeek && onTogglePlayPause && (
                  <button
                    onClick={() => onTogglePreview(segment.id)}
                    className="p-1 text-xs bg-mint-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-1 focus:ring-mint-600"
                    title={isPreviewPlaying ? "プレビュー停止" : "プレビュー再生"}
                  >
                    {isPreviewPlaying ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                )}
                
                {/* 削除ボタン（2個以上の場合のみ） */}
                {segments.length > 1 && (
                  <button
                    onClick={() => onRemoveSegment(segment.id)}
                    className="p-1 text-xs bg-brick-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-brick-600"
                    title="区間を削除"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* エラーメッセージ表示エリア */}
      {Object.entries(errors).map(([segmentIdStr, segmentErrors]) => {
        const segmentId = parseInt(segmentIdStr);
        const segment = segments.find(s => s.id === segmentId);
        if (!segment || !segmentErrors) return null;
        
        return (
          <div key={segmentId} className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <span className="text-xs font-medium text-red-700">区間{segment.segmentNumber}:</span>
            {segmentErrors.startTime && (
              <p className="text-xs text-red-600">• {segmentErrors.startTime}</p>
            )}
            {segmentErrors.endTime && (
              <p className="text-xs text-red-600">• {segmentErrors.endTime}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface TimeSegment {
  id: number;
  startTime: number;
  endTime: number;
  segmentNumber: number;
  color?: string;
}

interface MultiSegmentTimeEditorProps {
  segments: TimeSegment[];
  onChange: (segments: TimeSegment[]) => void;
  currentTime: number;
  maxDuration: number;
  // プレビュー再生用
  onSeek?: (time: number) => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  allSongs?: SongSection[]; // 重複検証用
  currentSongTitle?: string;
  currentSongArtist?: string;
}

export default function MultiSegmentTimeEditor({
  segments,
  onChange,
  currentTime,
  maxDuration,
  onSeek,
  isPlaying,
  onTogglePlayPause,
  allSongs = [],
  currentSongTitle = "",
  currentSongArtist = ""
}: MultiSegmentTimeEditorProps) {
  const [errors, setErrors] = useState<Record<number, { startTime?: string; endTime?: string }>>({});
  const [previewingSegmentId, setPreviewingSegmentId] = useState<number | null>(null);
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);

  // セグメントの検証
  const validateSegments = useCallback((newSegments: TimeSegment[]) => {
    const newErrors: Record<number, { startTime?: string; endTime?: string }> = {};
    const sortedSegments = [...newSegments].sort((a, b) => a.startTime - b.startTime);

    sortedSegments.forEach((segment) => {
      const errors: { startTime?: string; endTime?: string } = {};

      // 基本検証
      if (segment.startTime < 0) {
        errors.startTime = "開始時間は0秒以上である必要があります";
      }
      if (segment.endTime <= segment.startTime) {
        errors.endTime = "終了時間は開始時間より後である必要があります";
      }
      if (segment.endTime > maxDuration && maxDuration > 0) {
        errors.endTime = `終了時間は${Math.floor(maxDuration / 60)}:${String(maxDuration % 60).padStart(2, '0')}以下である必要があります`;
      }

      // セグメント重複検証と他の楽曲との重複検証を削除
      // マッシュアップやクロスフェードなどの演出を可能にするため

      if (Object.keys(errors).length > 0) {
        newErrors[segment.id] = errors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [maxDuration]);

  // セグメント更新
  const updateSegment = (segmentId: number, field: 'startTime' | 'endTime', value: number) => {
    const newSegments = segments.map(seg =>
      seg.id === segmentId ? { ...seg, [field]: value } : seg
    );
    onChange(newSegments);
  };

  // セグメント追加
  const addSegment = () => {
    logger.debug('🔄 addSegment called', { 
      segmentsLength: segments.length,
      segments: segments.map(s => ({ id: s.id, segmentNumber: s.segmentNumber }))
    });
    
    const maxId = Math.max(...segments.map(s => s.id), 0);
    const maxSegmentNumber = Math.max(...segments.map(s => s.segmentNumber), 0);
    
    // 最後のセグメントの終了時間を新しいセグメントの開始時間とする
    const lastSegment = [...segments].sort((a, b) => a.startTime - b.startTime).pop();
    const defaultStart = lastSegment ? lastSegment.endTime : currentTime;
    const defaultEnd = Math.min(defaultStart + 30, maxDuration || defaultStart + 30);
    
    const newSegment: TimeSegment = {
      id: maxId + 1,
      startTime: defaultStart,
      endTime: defaultEnd,
      segmentNumber: maxSegmentNumber + 1,
      color: `bg-blue-${400 + (maxSegmentNumber % 3) * 100}` // 色のバリエーション
    };

    logger.debug('✅ New segment created', newSegment);
    const updatedSegments = [...segments, newSegment];
    logger.debug('📤 Calling onChange with segments', updatedSegments.length);
    logger.debug('📤 Updated segments:', updatedSegments.map(s => ({ 
      id: s.id, 
      segmentNumber: s.segmentNumber,
      startTime: s.startTime,
      endTime: s.endTime 
    })));
    onChange(updatedSegments);
  };

  // セグメント削除
  const removeSegment = (segmentId: number) => {
    if (segments.length <= 1) return; // 最低1つは残す
    
    const newSegments = segments
      .filter(seg => seg.id !== segmentId)
      .map((seg, segIndex) => ({ ...seg, segmentNumber: segIndex + 1 })); // セグメント番号を再割り当て
    
    onChange(newSegments);
  };

  // セグメントプレビュー再生
  const toggleSegmentPreview = (segmentId: number) => {
    if (previewingSegmentId === segmentId) {
      // プレビュー停止
      setPreviewingSegmentId(null);
      if (previewInterval) {
        clearInterval(previewInterval);
        setPreviewInterval(null);
      }
      return;
    }

    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !onSeek || !onTogglePlayPause) return;

    // 既存のプレビューを停止
    if (previewInterval) {
      clearInterval(previewInterval);
    }

    setPreviewingSegmentId(segmentId);
    onSeek(segment.startTime);
    
    if (!isPlaying) {
      onTogglePlayPause();
    }

    // ループ再生の設定
    const interval = setInterval(() => {
      onSeek(segment.startTime);
    }, (segment.endTime - segment.startTime + 1) * 1000);
    
    setPreviewInterval(interval);
  };

  // プレビュー停止（コンポーネントアンマウント時など）
  useEffect(() => {
    return () => {
      if (previewInterval) {
        clearInterval(previewInterval);
      }
    };
  }, [previewInterval]);

  // セグメント検証（segments変更時）
  useEffect(() => {
    if (segments.length > 0) {
      validateSegments(segments);
    }
  }, [segments, allSongs, currentSongTitle, currentSongArtist, maxDuration, validateSegments]);


  return (
    <div className="space-y-4">
      {/* タイムラインプレビューを上部に移動 */}
      {maxDuration > 0 && (
        <div className="p-3 bg-white border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-3">タイムラインプレビュー</h4>
          <div className="relative w-full h-12 bg-gray-100 rounded-sm overflow-hidden">
            {/* 既存の他の楽曲（薄いグレー） */}
            {allSongs
              .filter(song => song.title !== currentSongTitle || song.artist !== currentSongArtist)
              .map(song => (
              <div
                key={`other-${song.id}`}
                className="absolute h-full bg-gray-300 opacity-50"
                style={{
                  left: `${(song.startTime / maxDuration) * 100}%`,
                  width: `${((song.endTime - song.startTime) / maxDuration) * 100}%`
                }}
                title={`${song.title} - ${song.artist}`}
              />
            ))}
            
            {/* 現在編集中の楽曲のセグメント（時系列順で表示） */}
            {[...segments].sort((a, b) => a.startTime - b.startTime).map(segment => (
              <div
                key={segment.id}
                className={`absolute h-full bg-orange-500 border border-orange-600 ${
                  previewingSegmentId === segment.id ? 'ring-2 ring-blue-400' : ''
                }`}
                style={{
                  left: `${(segment.startTime / maxDuration) * 100}%`,
                  width: `${((segment.endTime - segment.startTime) / maxDuration) * 100}%`
                }}
                title={`区間${segment.segmentNumber}: ${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${String(Math.floor(segment.endTime % 60)).padStart(2, '0')}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow-md">
                    {segment.segmentNumber}
                  </span>
                </div>
              </div>
            ))}
            
            {/* 現在時刻インジケーター */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${(currentTime / maxDuration) * 100}%` }}
              title={`現在時刻: ${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0:00</span>
            <span>{Math.floor(maxDuration / 60)}:{String(Math.floor(maxDuration % 60)).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* セグメント一覧ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          登場区間 ({segments.length}個)
        </h3>
        <button
          onClick={addSegment}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          区間を追加
        </button>
      </div>

      {/* 統合セグメント表示 - 1行レイアウト */}
      <SegmentList 
        segments={segments} 
        errors={errors}
        previewingSegmentId={previewingSegmentId}
        onUpdateSegment={updateSegment}
        onTogglePreview={toggleSegmentPreview}
        onRemoveSegment={removeSegment}
        onSeek={onSeek}
        onTogglePlayPause={onTogglePlayPause}
      />

    </div>
  );
}