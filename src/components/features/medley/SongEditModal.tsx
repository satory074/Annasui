"use client";

import { useState, useEffect, useCallback } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import MultiSegmentTimeEditor, { TimeSegment } from "@/components/ui/song/MultiSegmentTimeEditor";
import SongThumbnail from "@/components/ui/song/SongThumbnail";
import { getDuplicateInfo } from "@/lib/utils/duplicateSongs";
import { sanitizeSongSection } from "@/lib/utils/sanitize";
import { logger } from "@/lib/utils/logger";

// 空の楽曲かどうかを判定するヘルパー関数
const isEmptySong = (song: SongSection | null): boolean => {
  if (!song) return false;
  
  const hasEmptyTitle = !song.title || 
    song.title.trim() === '' || 
    song.title.startsWith('空の楽曲') ||
    song.title.startsWith('区間') ||
    /^区間\d+$/.test(song.title) ||  // 区間1, 区間2, ... パターン
    song.title === '未設定の楽曲' ||
    song.title.startsWith('未設定の楽曲');
  
  const hasEmptyArtist = !song.artist ||
    song.artist.length === 0 ||
    song.artist.join(", ").trim() === '' ||
    song.artist.join(", ") === 'アーティスト未設定';
  
  return hasEmptyTitle || hasEmptyArtist;
};

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
  // 楽曲変更用
  onChangeSong?: () => void;
  // 楽曲変更フラグ（置換判定用）
  isChangingSong?: boolean;
  // 自動保存機能用
  autoSave?: boolean;
  onAutoSave?: (videoId: string, title: string, creator: string, duration: number) => Promise<boolean>;
  videoId?: string;
  medleyTitle?: string;
  medleyCreator?: string;
  medleyDuration?: number;
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
  onBatchUpdate,
  onChangeSong,
  isChangingSong = false,
  autoSave = false,
  onAutoSave,
  videoId = '',
  medleyTitle = '',
  medleyCreator = '',
  medleyDuration = 0
}: SongEditModalProps) {
  const [formData, setFormData] = useState<SongSection>({
    id: 0,
    title: "",
    artist: [],
    composers: undefined,
    arrangers: undefined,
    startTime: 0,
    endTime: 0,
    color: "bg-blue-400",
    niconicoLink: "",
    youtubeLink: "",
    spotifyLink: "",
    applemusicLink: ""
  });

  const [segments, setSegments] = useState<TimeSegment[]>([]);

  // segments状態変更をログ（デバッグ用）と自動保存のトリガー
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('🔄 SongEditModal: segments state changed', {
        segmentsLength: segments.length,
        segments: segments.map(s => ({ 
          id: s.id, 
          segmentNumber: s.segmentNumber,
          startTime: s.startTime,
          endTime: s.endTime 
        }))
      });
    }
    
  }, [segments]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);
  const [applyToAllInstances, setApplyToAllInstances] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number>(0);

  // 自動保存機能（関数の定義を最初に移動）
  const performAutoSave = useCallback(async () => {
    if (!autoSave || !onAutoSave || isAutoSaving || !videoId) {
      return;
    }

    // 楽曲情報が不完全な場合は自動保存しない
    if (!formData.title.trim() || formData.title.startsWith('空の楽曲') ||
        formData.artist.length === 0 || formData.artist.join(", ").trim() === '' || formData.artist.join(", ") === 'アーティスト未設定') {
      logger.debug('🔄 Skipping auto-save: incomplete song data', {
        title: formData.title,
        artist: formData.artist.join(", ")
      });
      return;
    }

    // 最後の自動保存から十分な時間が経過していない場合はスキップ
    const now = Date.now();
    if (now - lastAutoSaveTime < 2000) { // 2秒のデバウンス
      return;
    }

    try {
      setIsAutoSaving(true);
      logger.info('🔄 Auto-saving song changes...', {
        songTitle: formData.title,
        songArtist: formData.artist,
        segmentsCount: segments.length
      });

      // 楽曲データを保存（内部的にupdateSongやaddSongを呼び出す）
      const songsToSave: SongSection[] = segments.map(segment => {
        const songData = {
          title: formData.title,
          artist: formData.artist,
          startTime: segment.startTime,
          endTime: segment.endTime,
          niconicoLink: formData.niconicoLink,
          youtubeLink: formData.youtubeLink,
          spotifyLink: formData.spotifyLink,
          applemusicLink: formData.applemusicLink,
          color: segment.color || formData.color
        };

        const sanitized = sanitizeSongSection(songData);

        return {
          id: segment.id === formData.id ? formData.id : (Date.now() + Math.random()),
          ...sanitized,
          color: sanitized.color || "bg-blue-400"
        };
      });

      // 楽曲データを更新
      if (applyToAllInstances && onBatchUpdate && song) {
        onBatchUpdate(songsToSave);
      } else if ((segments.length === 1 && !isNew && song) || isChangingSong) {
        const singleSong = songsToSave[0];
        onSave(singleSong);
      } else if ((segments.length > 1 || isNew) && onBatchUpdate) {
        onBatchUpdate(songsToSave);
      } else if (segments.length === 1) {
        const singleSong = songsToSave[0];
        onSave(singleSong);
      }

      // メドレー全体を自動保存
      const success = await onAutoSave(videoId, medleyTitle, medleyCreator, medleyDuration);
      
      if (success) {
        setLastAutoSaveTime(now);
        logger.info('✅ Auto-save completed successfully');
      } else {
        logger.warn('⚠️ Auto-save failed');
      }
    } catch (error) {
      logger.error('❌ Auto-save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [autoSave, onAutoSave, isAutoSaving, videoId, formData, segments, lastAutoSaveTime, 
      applyToAllInstances, onBatchUpdate, song, isNew, isChangingSong, onSave, 
      medleyTitle, medleyCreator, medleyDuration]);

  useEffect(() => {
    logger.debug('📋 useEffect triggered:', {
      isSaving,
      song: song ? `${song.title} (${song.id})` : null,
      isNew,
      isOpen
    });
    
    // セーブ中はセグメント状態をリセットしない
    if (isSaving) {
      logger.debug('🚫 Skipping useEffect due to isSaving=true');
      return;
    }
    
    // モーダルが閉じているときは処理をスキップ
    if (!isOpen) {
      logger.debug('🚫 Skipping useEffect due to isOpen=false');
      return;
    }
    
    if (song) {
      setFormData(song);
      // 楽曲データから直接セグメント情報を設定
      // マルチセグメント対応：同じ楽曲の複数インスタンスがある場合はそれらを統合
      if (allSongs.length > 0) {
        const sameTitle = song.title.trim();
        const sameArtist = song.artist.join(", ").trim();
        const duplicates = [...allSongs.filter(s =>
          s.title.trim() === sameTitle && s.artist.join(", ").trim() === sameArtist
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
          logger.debug('🔄 Setting segments from duplicates:', segmentData.length, 'segments');
          setSegments(segmentData);
        } else {
          // 単一セグメント
          logger.debug('🔄 Setting single segment for song:', song.title);
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
        logger.debug('🔄 Setting single segment (no allSongs):', song.title);
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
        artist: [],
        composers: undefined,
        arrangers: undefined,
        startTime: 0,
        endTime: 0,
        color: "bg-blue-400",
        niconicoLink: "",
        youtubeLink: "",
        spotifyLink: "",
        applemusicLink: ""
      });
      // 新規作成の場合はデフォルトセグメント
      setSegments([{
        id: 1,
        startTime: currentTime || 0,
        endTime: Math.min((currentTime || 0) + 30, (maxDuration || 300)),
        segmentNumber: 1,
        color: "bg-orange-400"
      }]);
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, isNew, isOpen, isSaving, maxDuration, allSongs]);
  // currentTimeは新規作成時のline 299で直接参照されるため、依存配列には含めない
  // （含めると再生中にuseEffectが繰り返し実行され、編集内容がリセットされる）

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
      const songsToSave: SongSection[] = segments.map((segment, index) => {
        const songData = {
          title: formData.title,
          artist: formData.artist,
          startTime: segment.startTime,
          endTime: segment.endTime,
          niconicoLink: formData.niconicoLink,
          youtubeLink: formData.youtubeLink,
          spotifyLink: formData.spotifyLink,
          applemusicLink: formData.applemusicLink,
          color: segment.color || formData.color
        };

        // サニタイゼーションを適用
        const sanitized = sanitizeSongSection(songData);
        logger.debug('Sanitized song data:', sanitized);

        // 既存楽曲の編集の場合は元のIDを保持、新規作成の場合は新しいIDを生成
        const songId = !isNew && song?.id ? song.id : (Date.now() + index);

        return {
          id: songId,
          ...sanitized,
          color: sanitized.color || "bg-blue-400" // デフォルトカラーを設定
        };
      });

      // 保存パス判定のデバッグログ
      logger.info('🔄 handleSave: Save path determination', {
        applyToAllInstances,
        segmentsLength: segments.length,
        isNew,
        hasSong: !!song,
        hasOnBatchUpdate: !!onBatchUpdate,
        isChangingSong,
        songId: song?.id,
        songTitle: song?.title,
        isEmpty: song?.title?.startsWith('空の楽曲')
      });

      if (applyToAllInstances && onBatchUpdate && song) {
        logger.info('📝 [PATH 1] Using batchUpdate - applying to all instances');
        // 全てのインスタンスに適用（時刻情報は各セグメント固有）
        onBatchUpdate(songsToSave);
      } else if ((segments.length === 1 && !isNew && song) || isChangingSong) {
        logger.info('📝 [PATH 2] Using updateSong - replacing existing song', {
          reason: isChangingSong ? 'Song changing mode' : 'Single segment existing song',
          preservedId: song?.id,
          newTitle: songsToSave[0]?.title
        });
        // 既存の楽曲を置換する場合（新規作成ではない）または楽曲変更の場合は updateSong を使用
        const singleSong = songsToSave[0];
        onSave(singleSong);
      } else if ((segments.length > 1 || isNew) && onBatchUpdate) {
        logger.info('📝 [PATH 3] Using batchUpdate - multiple segments or new song', {
          reason: segments.length > 1 ? 'Multiple segments' : 'New song',
          segmentsCount: segments.length
        });
        // 複数セグメントの場合や新規楽曲の場合のみバッチ更新を使用
        onBatchUpdate(songsToSave);
      } else {
        logger.info('📝 [PATH 4] Fallback - using onSave for single segment');
        // フォールバック：単一セグメントの場合
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
        niconicoLink: formData.niconicoLink,
        youtubeLink: formData.youtubeLink,
        spotifyLink: formData.spotifyLink,
        applemusicLink: formData.applemusicLink,
        color: formData.color
      };

      // サニタイゼーションを適用
      const sanitized = sanitizeSongSection(songData);
      logger.debug('Sanitized song data (save and next):', sanitized);

      const representativeSong: SongSection = {
        ...formData,
        ...sanitized,
        color: sanitized.color || formData.color || "bg-blue-400" // デフォルトカラーを設定
      };

      if (onSaveAndNext) {
        onSaveAndNext(representativeSong);
      } else {
        onSave(representativeSong);
      }
      // 連続モードではモーダルを閉じない
    }
  };

  // セグメント変更ハンドラー（自動保存対応）
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
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md" ariaLabel={isNew ? "楽曲を追加" : "楽曲を編集"}>
        <h2 id="modal-title" className="text-xl font-bold mb-4 text-gray-900">
          {isNew ? (isFromDatabase ? "楽曲DBから追加" : "楽曲を追加") : "楽曲を編集"}
        </h2>

        {/* Validation error summary */}
        {Object.keys(errors).length > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
          >
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">入力エラーがあります</p>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {errors.title && <li>{errors.title}</li>}
                  {errors.segments && <li>{errors.segments}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* 楽曲情報表示・編集（既存楽曲の編集時）*/}
          {!isNew && song && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  楽曲情報
                </h3>
              </div>
              
              {/* 楽曲データベースから選択ボタン（すべての既存楽曲で常に表示） */}
              {onChangeSong && (
                <div className="text-center mb-4">
                  <button
                    onClick={async () => {
                      // 楽曲変更前に自動保存を実行
                      if (autoSave) {
                        await performAutoSave();
                      }
                      onChangeSong();
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 transition-colors font-medium"
                    disabled={isAutoSaving}
                  >
                    {isAutoSaving ? '保存中...' : '🎵 楽曲データベースから選択'}
                  </button>
                </div>
              )}
              
              {/* 既存楽曲の場合は読み取り専用で表示（空の楽曲も含む） */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {/* サムネイル表示 */}
                  <div className="flex-shrink-0">
                    <SongThumbnail
                      key={`${formData.title}-${formData.niconicoLink || formData.youtubeLink || formData.spotifyLink || formData.applemusicLink}`}
                      title={formData.title}
                      size="md"
                      niconicoLink={formData.niconicoLink}
                      youtubeLink={formData.youtubeLink}
                      spotifyLink={formData.spotifyLink}
                      applemusicLink={formData.applemusicLink}
                    />
                  </div>
                  
                  {/* 楽曲情報 */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">楽曲名:</span>
                        <div className="font-medium text-gray-900">{formData.title || "未設定"}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">アーティスト:</span>
                        <div className="font-medium text-gray-900">{formData.artist.join(", ") || "未設定"}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">作曲:</span>
                        <div className="font-medium text-gray-900">{formData.composers?.join(", ") || "-"}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">編曲:</span>
                        <div className="font-medium text-gray-900">{formData.arrangers?.join(", ") || "-"}</div>
                      </div>
                    </div>
                    {isEmptySong(song) && (
                      <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-md border-l-4 border-orange-400">
                        ⚠️ この楽曲には情報が不足しています。楽曲データベースから選択して情報を更新してください。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 新規楽曲追加時は楽曲データベースから選択のみ */}
          {isNew && !isFromDatabase && (
            <div className="space-y-4">
              {/* 楽曲データベースから選択ボタン（新規追加時） */}
              {onChangeSong && (
                <div className="text-center">
                  <button
                    onClick={async () => {
                      // 楽曲選択前に自動保存を実行
                      if (autoSave) {
                        await performAutoSave();
                      }
                      onChangeSong();
                    }}
                    className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 transition-colors font-medium text-lg"
                    disabled={isAutoSaving}
                  >
                    {isAutoSaving ? '保存中...' : '🎵 楽曲データベースから選択'}
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    楽曲データベースから選択して楽曲を追加してください
                  </p>
                  {isAutoSaving && (
                    <p className="text-sm text-orange-600 mt-2 animate-pulse">
                      💾 自動保存中...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 新規楽曲でデータベースから選択済みの場合の情報表示 */}
          {isNew && isFromDatabase && formData.title && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-medium text-green-800 mb-4">
                選択された楽曲
              </h3>
              <div className="flex items-start gap-4">
                {/* サムネイル表示 */}
                <div className="flex-shrink-0">
                  <SongThumbnail
                    key={`${formData.title}-${formData.niconicoLink || formData.youtubeLink || formData.spotifyLink || formData.applemusicLink}`}
                    title={formData.title}
                    size="md"
                    niconicoLink={formData.niconicoLink}
                    youtubeLink={formData.youtubeLink}
                    spotifyLink={formData.spotifyLink}
                    applemusicLink={formData.applemusicLink}
                  />
                </div>

                {/* 楽曲情報 */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">楽曲名:</span>
                      <div className="font-medium text-green-900">{formData.title}</div>
                    </div>
                    <div>
                      <span className="text-green-700">アーティスト:</span>
                      <div className="font-medium text-green-900">{formData.artist.join(", ") || "未設定"}</div>
                    </div>
                    <div>
                      <span className="text-green-700">作曲:</span>
                      <div className="font-medium text-green-900">{formData.composers?.join(", ") || "-"}</div>
                    </div>
                    <div>
                      <span className="text-green-700">編曲:</span>
                      <div className="font-medium text-green-900">{formData.arrangers?.join(", ") || "-"}</div>
                    </div>
                  </div>
                  <div className="text-sm text-green-700">
                    ✅ データベースから選択されました
                  </div>
                </div>
              </div>
            </div>
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
              currentSongArtist={formData.artist.join(", ")}
              onDeleteSong={!isNew && onDelete && song ? () => {
                onDelete(song.id);
                onClose();
              } : undefined}
            />
            {errors.segments && (
              <p className="text-red-500 text-sm mt-1">{errors.segments}</p>
            )}
          </div>



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

        {/* 自動保存ステータス表示 */}
        {autoSave && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-blue-700">
                {isAutoSaving ? '💾 自動保存中...' : '✅ 自動保存が有効です'}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              楽曲情報を変更すると自動的にデータベースに保存されます
            </p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-between mt-6">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                disabled={isAutoSaving}
              >
                削除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isAutoSaving}
            >
              {autoSave && !isAutoSaving ? '完了' : 'キャンセル'}
            </button>
            {/* 自動保存が有効でない場合のみ保存ボタンを表示 */}
            {!autoSave && (
              <>
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
              </>
            )}
          </div>
        </div>
    </BaseModal>
  );
}