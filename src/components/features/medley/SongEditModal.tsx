"use client";

import { useState, useEffect } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import MultiSegmentTimeEditor, { TimeSegment } from "@/components/ui/song/MultiSegmentTimeEditor";
import { getDuplicateInfo } from "@/lib/utils/duplicateSongs";
import { sanitizeSongSection } from "@/lib/utils/sanitize";
import { logger } from "@/lib/utils/logger";

interface SongEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  onSave: (song: SongSection) => void;
  onDelete?: (songId: number) => void;
  isNew?: boolean;
  maxDuration?: number;
  currentTime?: number;
  isFromDatabase?: boolean; // 楽曲DBから選択されたかどうか
  // 連続入力モード用
  continuousMode?: boolean;
  onSaveAndNext?: (song: SongSection) => void;
  onToggleContinuousMode?: () => void;
  // プレビュー再生用
  onSeek?: (time: number) => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  // 重複処理用
  allSongs?: SongSection[];
  onBatchUpdate?: (songs: SongSection[]) => void;
}

export default function SongEditModal({
  isOpen,
  onClose,
  song,
  onSave,
  onDelete,
  isNew = false,
  maxDuration = 0,
  currentTime = 0,
  isFromDatabase = false,
  continuousMode = false,
  onSaveAndNext,
  onToggleContinuousMode,
  onSeek,
  isPlaying = false,
  onTogglePlayPause,
  allSongs = [],
  onBatchUpdate
}: SongEditModalProps) {
  const [formData, setFormData] = useState<SongSection>({
    id: 0,
    title: "",
    artist: "",
    startTime: 0,
    endTime: 0,
    color: "bg-blue-400",
    originalLink: "",
    links: {
      niconico: "",
      youtube: "",
      spotify: "",
      appleMusic: ""
    }
  });

  const [segments, setSegments] = useState<TimeSegment[]>([]);

  // segments状態変更をログ
  useEffect(() => {
    logger.debug('🔄 SongEditModal: segments state changed', {
      segmentsLength: segments.length,
      segments: segments.map(s => ({ 
        id: s.id, 
        segmentNumber: s.segmentNumber,
        startTime: s.startTime,
        endTime: s.endTime 
      }))
    });
  }, [segments]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);
  const [applyToAllInstances, setApplyToAllInstances] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    console.log('📋 useEffect triggered:', {
      isSaving,
      song: song ? `${song.title} (${song.id})` : null,
      isNew,
      isOpen,
      currentTime,
      maxDuration,
      allSongsLength: allSongs.length
    });
    
    // セーブ中はセグメント状態をリセットしない
    if (isSaving) {
      console.log('🚫 Skipping useEffect due to isSaving=true');
      return;
    }
    
    // モーダルが閉じているときは処理をスキップ
    if (!isOpen) {
      console.log('🚫 Skipping useEffect due to isOpen=false');
      return;
    }
    
    if (song) {
      setFormData(song);
      // 楽曲データから直接セグメント情報を設定
      // マルチセグメント対応：同じ楽曲の複数インスタンスがある場合はそれらを統合
      if (allSongs.length > 0) {
        const sameTitle = song.title.trim();
        const sameArtist = song.artist.trim();
        const duplicates = [...allSongs.filter(s => 
          s.title.trim() === sameTitle && s.artist.trim() === sameArtist
        )].sort((a, b) => a.startTime - b.startTime);
        
        if (duplicates.length > 1) {
          // 複数のセグメントが見つかった場合
          const segmentData: TimeSegment[] = duplicates.map((s, index) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            segmentNumber: index + 1,
            color: s.color
          }));
          console.log('🔄 Setting segments from duplicates:', segmentData.length, 'segments');
          setSegments(segmentData);
        } else {
          // 単一セグメント
          console.log('🔄 Setting single segment for song:', song.title);
          setSegments([{
            id: song.id,
            startTime: song.startTime,
            endTime: song.endTime,
            segmentNumber: 1,
            color: song.color || "bg-orange-400"
          }]);
        }
      } else {
        // allSongsがない場合は単一セグメント
        console.log('🔄 Setting single segment (no allSongs):', song.title);
        setSegments([{
          id: song.id,
          startTime: song.startTime,
          endTime: song.endTime,
          segmentNumber: 1,
          color: song.color || "bg-orange-400"
        }]);
      }
    } else if (isNew) {
      setFormData({
        id: Date.now(), // 一時的なID
        title: "",
        artist: "",
        startTime: 0,
        endTime: 0,
        color: "bg-blue-400",
        originalLink: "",
        links: {
          niconico: "",
          youtube: "",
          spotify: "",
          appleMusic: ""
        }
      });
      // 新規作成の場合はデフォルトセグメント
      setSegments([{
        id: 1,
        startTime: currentTime || 0,
        endTime: Math.min((currentTime || 0) + 30, maxDuration || 300),
        segmentNumber: 1,
        color: "bg-orange-400"
      }]);
    }
    setErrors({});
  }, [song, isNew, isOpen, maxDuration]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }

    // セグメント検証は MultiSegmentTimeEditor 内で行われるため、ここでは基本検証のみ
    if (segments.length === 0) {
      newErrors.segments = "最低1つの区間が必要です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      setIsSaving(true);
      // セグメントから複数のSongSectionを作成（サニタイゼーション適用）
      const songsToSave: SongSection[] = segments.map(segment => {
        const songData = {
          title: formData.title,
          artist: formData.artist,
          startTime: segment.startTime,
          endTime: segment.endTime,
          originalLink: formData.originalLink,
          color: segment.color || formData.color
        };
        
        // サニタイゼーションを適用
        const sanitized = sanitizeSongSection(songData);
        logger.debug('Sanitized song data:', sanitized);
        
        return {
          id: segment.id === formData.id ? formData.id : (Date.now() + Math.random()), // 新しいセグメントには新しいID
          ...sanitized,
          color: sanitized.color || "bg-blue-400", // デフォルトカラーを設定
          links: formData.links
        };
      });

      if (applyToAllInstances && onBatchUpdate && song) {
        // 全てのインスタンスに適用（時刻情報は各セグメント固有）
        onBatchUpdate(songsToSave);
      } else if (onBatchUpdate) {
        // 複数セグメントの場合はバッチ更新を使用
        onBatchUpdate(songsToSave);
      } else {
        // 単一セグメントの場合は従来の保存方法
        if (segments.length === 1) {
          const singleSong = songsToSave[0];
          onSave(singleSong);
        }
      }
      
      // Save operation completed
      setIsSaving(false);
      
      if (!continuousMode) {
        onClose();
      }
    }
  };

  const handleSaveAndNext = () => {
    if (validateForm()) {
      // 複数セグメントの場合、最初のセグメントを代表として使用（サニタイゼーション適用）
      const songData = {
        title: formData.title,
        artist: formData.artist,
        startTime: segments[0]?.startTime || 0,
        endTime: segments[0]?.endTime || 30,
        originalLink: formData.originalLink,
        color: formData.color
      };
      
      // サニタイゼーションを適用
      const sanitized = sanitizeSongSection(songData);
      logger.debug('Sanitized song data (save and next):', sanitized);
      
      const representativeSong: SongSection = {
        ...formData,
        ...sanitized,
        color: sanitized.color || formData.color || "bg-blue-400", // デフォルトカラーを設定
        links: formData.links
      };
      
      if (onSaveAndNext) {
        onSaveAndNext(representativeSong);
      } else {
        onSave(representativeSong);
      }
      // 連続モードではモーダルを閉じない
    }
  };

  // セグメント変更ハンドラー
  const handleSegmentsChange = (newSegments: TimeSegment[]) => {
    logger.debug('🔄 SongEditModal: handleSegmentsChange called', {
      currentSegments: segments.length,
      newSegments: newSegments.length
    });
    setSegments(newSegments);
  };

  // プレビュー再生機能（MultiSegmentTimeEditor内で処理されるため削除）

  // コンポーネントがアンマウントされる時のクリーンアップ
  useEffect(() => {
    return () => {
      if (previewInterval) {
        clearInterval(previewInterval);
      }
    };
  }, [previewInterval]);

  // モーダルが閉じられる時にプレビューを停止とフラグをリセット
  useEffect(() => {
    if (!isOpen) {
      if (isPreviewMode) {
        setIsPreviewMode(false);
        if (previewInterval) {
          clearInterval(previewInterval);
          setPreviewInterval(null);
        }
      }
      // モーダルが閉じられた時にセーブフラグをリセット
      setIsSaving(false);
    }
  }, [isOpen, isPreviewMode, previewInterval]);

  const handleDelete = () => {
    if (onDelete && song && !isNew) {
      if (confirm("この楽曲を削除しますか？")) {
        onDelete(song.id);
        onClose();
      }
    }
  };



  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          {isNew ? (isFromDatabase ? "楽曲DBから追加" : "楽曲を追加") : "楽曲を編集"}
        </h2>
        
        {/* 楽曲情報表示を削除 - 冗長な情報のため */}

        <div className="space-y-4">
          {/* 楽曲名・アーティスト名（新規楽曲の手動追加時のみ表示） */}
          {isNew && !isFromDatabase && (
            <>
              {/* 楽曲名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  楽曲名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="楽曲名を入力"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* アーティスト名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  アーティスト名
                </label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="アーティスト名を入力"
                />
              </div>
            </>
          )}

          {/* 登場区間エディター */}
          <div>
            <MultiSegmentTimeEditor
              segments={segments}
              onChange={handleSegmentsChange}
              currentTime={currentTime}
              maxDuration={maxDuration || 0}
              onSeek={onSeek}
              isPlaying={isPlaying}
              onTogglePlayPause={onTogglePlayPause}
              allSongs={allSongs}
              currentSongTitle={formData.title}
              currentSongArtist={formData.artist}
            />
            {errors.segments && (
              <p className="text-red-500 text-sm mt-1">{errors.segments}</p>
            )}
          </div>



          {/* 元動画リンク（新規楽曲の手動追加時のみ表示） */}
          {isNew && !isFromDatabase && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配信プラットフォーム
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      🎬 ニコニコ動画
                    </label>
                    <input
                      type="url"
                      value={formData.links?.niconico || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        links: { ...formData.links, niconico: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="https://www.nicovideo.jp/watch/sm..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      📺 YouTube
                    </label>
                    <input
                      type="url"
                      value={formData.links?.youtube || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        links: { ...formData.links, youtube: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      🎵 Spotify
                    </label>
                    <input
                      type="url"
                      value={formData.links?.spotify || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        links: { ...formData.links, spotify: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="https://open.spotify.com/track/..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      🍎 Apple Music
                    </label>
                    <input
                      type="url"
                      value={formData.links?.appleMusic || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        links: { ...formData.links, appleMusic: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="https://music.apple.com/..."
                    />
                  </div>
                </div>
              </div>
              
              {/* 後方互換性のための元動画リンク（非表示にしても内部で使用） */}
              {formData.originalLink && !formData.links?.niconico && !formData.links?.youtube && !formData.links?.spotify && !formData.links?.appleMusic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    元動画リンク（従来）
                  </label>
                  <input
                    type="url"
                    value={formData.originalLink || ""}
                    onChange={(e) => setFormData({ ...formData, originalLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 連続入力モードトグル（新規追加時のみ） */}
        {isNew && onToggleContinuousMode && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={onToggleContinuousMode}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-600"
              />
              連続入力モード（保存後に次の楽曲を追加）
            </label>
          </div>
        )}

        {/* 重複楽曲の一括更新オプション */}
        {song && !isNew && (() => {
          const duplicateInfo = getDuplicateInfo(song, allSongs);
          return duplicateInfo && duplicateInfo.totalInstances > 1 ? (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    重複楽曲が検出されました
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    この楽曲は {duplicateInfo.totalInstances} 回登場します。楽曲情報を全てのインスタンスに適用できます。
                  </p>
                  <label className="flex items-center gap-2 text-sm text-amber-700">
                    <input
                      type="checkbox"
                      checked={applyToAllInstances}
                      onChange={(e) => setApplyToAllInstances(e.target.checked)}
                      className="rounded border-amber-300 text-orange-600 focus:ring-orange-600"
                    />
                    全 {duplicateInfo.totalInstances} インスタンスに適用（時刻は各インスタンス固有のまま）
                  </label>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* ボタン */}
        <div className="flex justify-between mt-6">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                削除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              キャンセル
            </button>
            {isNew && continuousMode && onSaveAndNext && (
              <button
                onClick={handleSaveAndNext}
                className="px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-mint-600 transition-all hover:shadow-lg" style={{ background: 'var(--gradient-accent)' }}
              >
                保存して次へ
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all hover:shadow-lg" style={{ background: 'var(--gradient-primary)' }}
            >
              {isNew ? (continuousMode ? "保存して終了" : "追加") : "保存"}
            </button>
          </div>
        </div>
    </BaseModal>
  );
}