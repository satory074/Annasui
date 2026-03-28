"use client";

import { useState, useEffect, useCallback } from "react";
import { SongSection } from "@/types";
import { parseTimeInput, formatTimeSimple } from "@/lib/utils/time";
import { logger } from '@/lib/utils/logger';
import { Button } from "@/components/ui/button";

export interface TimeSegment {
  id: number;
  startTime: number;
  endTime: number;
  segmentNumber: number;
  color?: string;
}

// SegmentRow コンポーネント
interface SegmentRowProps {
  segment: TimeSegment;
  segmentErrors: { startTime?: string; endTime?: string };
  isPreviewPlaying: boolean;
  hasMultiple: boolean;
  onTogglePreview: (segmentId: number) => void;
  onToggleEndPreview: (segmentId: number) => void;
  onRemoveSegment: (segmentId: number) => void;
  onUpdateSegment: (id: number, field: 'startTime' | 'endTime', value: number) => void;
  onSeek?: (time: number) => void;
  onTogglePlayPause?: () => void;
  onDeleteSong?: () => void;
}

function SegmentRow({
  segment,
  segmentErrors,
  isPreviewPlaying,
  hasMultiple,
  onTogglePreview,
  onToggleEndPreview,
  onRemoveSegment,
  onUpdateSegment,
  onSeek,
  onTogglePlayPause,
  onDeleteSong,
}: SegmentRowProps) {
  const duration = Math.round((segment.endTime - segment.startTime) * 10) / 10;

  const formatValue = (time: number) => formatTimeSimple(time);

  const parseValue = (value: string): number => parseTimeInput(value);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    onUpdateSegment(segment.id, field, parseValue(e.currentTarget.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    if (e.key === 'Enter') {
      onUpdateSegment(segment.id, field, parseValue(e.currentTarget.value));
      e.currentTarget.blur();
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border ${
        isPreviewPlaying
          ? 'bg-orange-100 border-orange-300'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {/* 区間番号 */}
      <span className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-md whitespace-nowrap">
        区間{segment.segmentNumber}
      </span>

      {/* 開始時間 */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">開始</label>
        <input
          key={`${segment.id}-start-${segment.startTime}`}
          type="text"
          defaultValue={formatValue(segment.startTime)}
          onBlur={(e) => handleBlur(e, 'startTime')}
          onKeyDown={(e) => handleKeyDown(e, 'startTime')}
          className={`w-20 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 bg-white text-gray-900 ${
            segmentErrors.startTime ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>

      <span className="text-xs text-gray-400">→</span>

      {/* 終了時間 */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">終了</label>
        <input
          key={`${segment.id}-end-${segment.endTime}`}
          type="text"
          defaultValue={formatValue(segment.endTime)}
          onBlur={(e) => handleBlur(e, 'endTime')}
          onKeyDown={(e) => handleKeyDown(e, 'endTime')}
          className={`w-20 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 bg-white text-gray-900 ${
            segmentErrors.endTime ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>

      {/* 長さ表示 */}
      <span className="text-xs text-gray-500 whitespace-nowrap">({duration}s)</span>

      {/* 再生中インジケーター */}
      {isPreviewPlaying && (
        <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
          再生中
        </span>
      )}

      {/* 操作ボタン */}
      <div className="flex items-center gap-1 ml-auto">
        {/* プレビューボタン（開始から） */}
        {onSeek && onTogglePlayPause && (
          <button
            onClick={() => onTogglePreview(segment.id)}
            className="p-1 text-xs bg-mint-600 text-white rounded hover:bg-mint-700 focus:outline-none focus:ring-1 focus:ring-mint-600"
            title={isPreviewPlaying ? "プレビュー停止" : "区間の最初から再生"}
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

        {/* プレビューボタン（ラスト5秒前から） */}
        {onSeek && onTogglePlayPause && (
          <Button
            size="sm"
            onClick={() => onToggleEndPreview(segment.id)}
            className="p-1 relative"
            title={isPreviewPlaying ? "プレビュー停止" : "ラスト5秒前から再生"}
          >
            {isPreviewPlaying ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <div className="relative">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="absolute -bottom-0.5 -right-1 text-[6px] font-bold">-5s</span>
              </div>
            )}
          </Button>
        )}

        {/* 削除ボタン */}
        {hasMultiple ? (
          <button
            onClick={() => onRemoveSegment(segment.id)}
            className="p-1 text-xs bg-red-500 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
            title="区間を削除"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : onDeleteSong ? (
          <button
            onClick={() => {
              if (window.confirm('この楽曲をタイムラインから削除しますか？\n\nこの操作は取り消せません。')) {
                onDeleteSong();
              }
            }}
            className="p-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-600"
            title="楽曲を削除"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

// セグメントリストコンポーネント
interface SegmentListProps {
  segments: TimeSegment[];
  errors: Record<number, { startTime?: string; endTime?: string }>;
  previewingSegmentId: number | null;
  onTogglePreview: (segmentId: number) => void;
  onToggleEndPreview: (segmentId: number) => void;
  onRemoveSegment: (segmentId: number) => void;
  onUpdateSegment: (id: number, field: 'startTime' | 'endTime', value: number) => void;
  onSeek?: (time: number) => void;
  onTogglePlayPause?: () => void;
  onDeleteSong?: () => void;
}

function SegmentList({
  segments,
  errors,
  previewingSegmentId,
  onTogglePreview,
  onToggleEndPreview,
  onRemoveSegment,
  onUpdateSegment,
  onSeek,
  onTogglePlayPause,
  onDeleteSong,
}: SegmentListProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 space-y-2">
      {segments.map((segment) => (
        <SegmentRow
          key={segment.id}
          segment={segment}
          segmentErrors={errors[segment.id] || {}}
          isPreviewPlaying={previewingSegmentId === segment.id}
          hasMultiple={segments.length > 1}
          onTogglePreview={onTogglePreview}
          onToggleEndPreview={onToggleEndPreview}
          onRemoveSegment={onRemoveSegment}
          onUpdateSegment={onUpdateSegment}
          onSeek={onSeek}
          onTogglePlayPause={onTogglePlayPause}
          onDeleteSong={onDeleteSong}
        />
      ))}

      {/* エラーメッセージ表示エリア */}
      {Object.entries(errors).map(([segmentIdStr, segmentErrors]) => {
        const segmentId = parseInt(segmentIdStr);
        const segment = segments.find(s => s.id === segmentId);
        if (!segment || !segmentErrors) return null;

        return (
          <div key={segmentId} className="p-2 bg-red-50 border border-red-200 rounded">
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
  onDeleteSong?: () => void; // 楽曲全体を削除
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
  currentSongArtist = "",
  onDeleteSong,
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

      if (segment.startTime < 0) {
        errors.startTime = "開始時間は0秒以上である必要があります";
      }
      if (segment.endTime <= segment.startTime) {
        errors.endTime = "終了時間は開始時間より後である必要があります";
      }
      if (segment.endTime > maxDuration && maxDuration > 0) {
        errors.endTime = `終了時間は${Math.floor(maxDuration / 60)}:${String(maxDuration % 60).padStart(2, '0')}以下である必要があります`;
      }

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

    const lastSegment = [...segments].sort((a, b) => a.startTime - b.startTime).pop();
    const defaultStart = lastSegment ? lastSegment.endTime : currentTime;
    const defaultEnd = Math.min(defaultStart + 30, maxDuration || defaultStart + 30);

    const newSegment: TimeSegment = {
      id: maxId + 1,
      startTime: defaultStart,
      endTime: defaultEnd,
      segmentNumber: maxSegmentNumber + 1,
      color: `bg-indigo-${400 + (maxSegmentNumber % 3) * 100}`
    };

    logger.debug('✅ New segment created', newSegment);
    onChange([...segments, newSegment]);
  };

  // セグメント削除
  const removeSegment = (segmentId: number) => {
    if (segments.length <= 1) return;

    const newSegments = segments
      .filter(seg => seg.id !== segmentId)
      .map((seg, segIndex) => ({ ...seg, segmentNumber: segIndex + 1 }));

    onChange(newSegments);
  };

  // セグメントプレビュー再生
  const toggleSegmentPreview = (segmentId: number) => {
    if (previewingSegmentId === segmentId) {
      setPreviewingSegmentId(null);
      if (previewInterval) {
        clearInterval(previewInterval);
        setPreviewInterval(null);
      }
      return;
    }

    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !onSeek || !onTogglePlayPause) return;

    if (previewInterval) {
      clearInterval(previewInterval);
    }

    setPreviewingSegmentId(segmentId);
    onSeek(segment.startTime);

    if (!isPlaying) {
      onTogglePlayPause();
    }

    const interval = setInterval(() => {
      onSeek(segment.startTime);
    }, (segment.endTime - segment.startTime + 1) * 1000);

    setPreviewInterval(interval);
  };

  // セグメント終了5秒前からのプレビュー再生
  const toggleSegmentEndPreview = (segmentId: number) => {
    if (previewingSegmentId === segmentId) {
      setPreviewingSegmentId(null);
      if (previewInterval) {
        clearInterval(previewInterval);
        setPreviewInterval(null);
      }
      return;
    }

    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !onSeek || !onTogglePlayPause) return;

    if (previewInterval) {
      clearInterval(previewInterval);
    }

    const startFrom = Math.max(segment.startTime, segment.endTime - 5);

    setPreviewingSegmentId(segmentId);
    onSeek(startFrom);

    if (!isPlaying) {
      onTogglePlayPause();
    }

    const interval = setInterval(() => {
      onSeek(startFrom);
    }, (segment.endTime - startFrom + 1) * 1000);

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
  }, [segments, validateSegments]);


  return (
    <div className="space-y-4">
      {/* タイムラインプレビュー */}
      {maxDuration > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-medium text-gray-700">タイムラインプレビュー</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">📍 現在:</span>
              <span className="text-lg font-bold text-indigo-600 tabular-nums">
                {formatTimeSimple(currentTime)}
              </span>
            </div>
          </div>
          <div className="relative w-full h-12 bg-gray-100 rounded-md overflow-hidden shadow-inner">
            {/* 既存の他の楽曲（薄いグレー） */}
            {allSongs
              .filter(song => song.title !== currentSongTitle || song.artist.join(", ") !== currentSongArtist)
              .map(song => (
              <div
                key={`other-${song.id}`}
                className="absolute h-full bg-gray-300 opacity-50"
                style={{
                  left: `${(song.startTime / maxDuration) * 100}%`,
                  width: `${((song.endTime - song.startTime) / maxDuration) * 100}%`
                }}
                title={`${song.title} - ${song.artist.join(", ")}`}
              />
            ))}

            {/* 現在編集中の楽曲のセグメント */}
            {[...segments].sort((a, b) => a.startTime - b.startTime).map(segment => (
              <div
                key={segment.id}
                className={`absolute h-full bg-orange-500 border-2 border-orange-600 rounded-sm ${
                  previewingSegmentId === segment.id ? 'ring-2 ring-indigo-400 z-10' : ''
                } hover:bg-orange-600 transition-colors cursor-pointer`}
                style={{
                  left: `${(segment.startTime / maxDuration) * 100}%`,
                  width: `${((segment.endTime - segment.startTime) / maxDuration) * 100}%`
                }}
                title={`区間${segment.segmentNumber}: ${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${String(Math.floor(segment.endTime % 60)).padStart(2, '0')}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-white drop-shadow-lg">
                    {segment.segmentNumber}
                  </span>
                </div>
              </div>
            ))}

            {/* 現在時刻インジケーター */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-red-500 z-20 rounded-full shadow-lg"
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
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          登場区間 ({segments.length}個)
        </h3>
        <button
          onClick={addSegment}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all hover:shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          区間を追加
        </button>
      </div>

      {/* 時刻入力ヒント */}
      <p className="text-xs text-gray-500 -mt-2">時刻は「分:秒」形式で入力（例: 1:23）またはプレイヤーを再生中に▶ボタンで確認できます</p>

      {/* セグメント一覧 */}
      <SegmentList
        segments={segments}
        errors={errors}
        previewingSegmentId={previewingSegmentId}
        onTogglePreview={toggleSegmentPreview}
        onToggleEndPreview={toggleSegmentEndPreview}
        onRemoveSegment={removeSegment}
        onUpdateSegment={updateSegment}
        onSeek={onSeek}
        onTogglePlayPause={onTogglePlayPause}
        onDeleteSong={onDeleteSong}
      />
    </div>
  );
}
