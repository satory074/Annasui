"use client";

import { useState, useEffect, useCallback } from "react";
import { SongSection } from "@/types";
import { parseTimeInput, formatTimeSimple } from "@/lib/utils/time";

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

    sortedSegments.forEach((segment, index) => {
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

      // セグメント重複検証
      for (let i = 0; i < sortedSegments.length; i++) {
        if (i === index) continue;
        const otherSegment = sortedSegments[i];
        
        // 重複チェック
        if (
          (segment.startTime >= otherSegment.startTime && segment.startTime < otherSegment.endTime) ||
          (segment.endTime > otherSegment.startTime && segment.endTime <= otherSegment.endTime) ||
          (segment.startTime <= otherSegment.startTime && segment.endTime >= otherSegment.endTime)
        ) {
          errors.startTime = `区間${otherSegment.segmentNumber}と重複しています`;
          errors.endTime = `区間${otherSegment.segmentNumber}と重複しています`;
        }
      }

      // 他の楽曲との重複検証
      if (currentSongTitle && currentSongArtist) {
        const otherSongs = allSongs.filter(song => 
          song.title !== currentSongTitle || song.artist !== currentSongArtist
        );
        
        for (const otherSong of otherSongs) {
          if (
            (segment.startTime >= otherSong.startTime && segment.startTime < otherSong.endTime) ||
            (segment.endTime > otherSong.startTime && segment.endTime <= otherSong.endTime) ||
            (segment.startTime <= otherSong.startTime && segment.endTime >= otherSong.endTime)
          ) {
            if (!errors.startTime) {
              errors.startTime = `「${otherSong.title}」と重複しています`;
            }
            if (!errors.endTime) {
              errors.endTime = `「${otherSong.title}」と重複しています`;
            }
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        newErrors[segment.id] = errors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [allSongs, currentSongTitle, currentSongArtist, maxDuration]);

  // セグメント更新
  const updateSegment = (segmentId: number, field: 'startTime' | 'endTime', value: number) => {
    const newSegments = segments.map(seg =>
      seg.id === segmentId ? { ...seg, [field]: value } : seg
    );
    onChange(newSegments);
  };

  // セグメント追加
  const addSegment = () => {
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

    onChange([...segments, newSegment]);
  };

  // セグメント削除
  const removeSegment = (segmentId: number) => {
    if (segments.length <= 1) return; // 最低1つは残す
    
    const newSegments = segments
      .filter(seg => seg.id !== segmentId)
      .map((seg, index) => ({ ...seg, segmentNumber: index + 1 })); // セグメント番号を再割り当て
    
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
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">タイムラインプレビュー</h4>
          <div className="relative w-full h-8 bg-gray-100 dark:bg-gray-700 rounded-sm overflow-hidden">
            {/* 既存の他の楽曲（薄いグレー） */}
            {allSongs
              .filter(song => song.title !== currentSongTitle || song.artist !== currentSongArtist)
              .map(song => (
              <div
                key={`other-${song.id}`}
                className="absolute h-full bg-gray-300 dark:bg-gray-600 opacity-50"
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
                className={`absolute h-full bg-caramel-500 border border-caramel-600 ${
                  previewingSegmentId === segment.id ? 'ring-2 ring-blue-400' : ''
                }`}
                style={{
                  left: `${(segment.startTime / maxDuration) * 100}%`,
                  width: `${((segment.endTime - segment.startTime) / maxDuration) * 100}%`
                }}
                title={`区間${segment.segmentNumber}: ${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${String(Math.floor(segment.endTime % 60)).padStart(2, '0')}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
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
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0:00</span>
            <span>{Math.floor(maxDuration / 60)}:{String(Math.floor(maxDuration % 60)).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* セグメント一覧ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          登場区間 ({segments.length}個)
        </h3>
        <button
          onClick={addSegment}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-caramel-600 text-white rounded-md hover:bg-caramel-700 focus:outline-none focus:ring-2 focus:ring-caramel-600"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          区間を追加
        </button>
      </div>

      {/* コンパクトなセグメント管理テーブル */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">区間</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">開始時間</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">終了時間</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">長さ</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {segments.map((segment) => {
              const segmentErrors = errors[segment.id] || {};
              const duration = Math.round((segment.endTime - segment.startTime) * 10) / 10;
              
              return (
                <tr 
                  key={segment.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    previewingSegmentId === segment.id ? 'bg-caramel-50 dark:bg-caramel-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        区間{segment.segmentNumber}
                      </span>
                      {previewingSegmentId === segment.id && (
                        <span className="text-xs bg-caramel-600 text-white px-1.5 py-0.5 rounded-full">
                          再生中
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formatTimeSimple(segment.startTime)}
                        onChange={(e) => {
                          const timeValue = parseTimeInput(e.target.value);
                          updateSegment(segment.id, 'startTime', timeValue);
                        }}
                        className={`w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-caramel-600 ${
                          segmentErrors.startTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                      />
                      {segmentErrors.startTime && (
                        <p className="text-xs text-red-500">{segmentErrors.startTime}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formatTimeSimple(segment.endTime)}
                        onChange={(e) => {
                          const timeValue = parseTimeInput(e.target.value);
                          updateSegment(segment.id, 'endTime', timeValue);
                        }}
                        className={`w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-caramel-600 ${
                          segmentErrors.endTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                      />
                      {segmentErrors.endTime && (
                        <p className="text-xs text-red-500">{segmentErrors.endTime}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {duration}秒
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* プレビューボタン */}
                      {onSeek && onTogglePlayPause && (
                        <button
                          onClick={() => toggleSegmentPreview(segment.id)}
                          className="p-1 text-xs bg-olive-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-1 focus:ring-olive-600"
                          title={previewingSegmentId === segment.id ? "プレビュー停止" : "プレビュー再生"}
                        >
                          {previewingSegmentId === segment.id ? (
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
                          onClick={() => removeSegment(segment.id)}
                          className="p-1 text-xs bg-brick-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-brick-600"
                          title="区間を削除"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}