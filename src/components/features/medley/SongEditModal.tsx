"use client";

import { useState, useEffect, useCallback } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import MultiSegmentTimeEditor, { TimeSegment } from "@/components/ui/song/MultiSegmentTimeEditor";
import SongThumbnail from "@/components/ui/song/SongThumbnail";
import { getDuplicateInfo } from "@/lib/utils/duplicateSongs";
import { sanitizeSongSection } from "@/lib/utils/sanitize";
import { logger } from "@/lib/utils/logger";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SongEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  onSave: (song: SongSection) => void;
  onDelete?: (songId: number) => void;
  isNew?: boolean;
  maxDuration?: number;
  currentTime?: number;
  isFromDatabase?: boolean;
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

  const [artistInputValue, setArtistInputValue] = useState<string>("");
  const [segments, setSegments] = useState<TimeSegment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);
  const [applyToAllInstances, setApplyToAllInstances] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState<boolean>(false);
  const [initialFormData, setInitialFormData] = useState<SongSection | null>(null);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number>(0);
  const [helpOpen, setHelpOpen] = useState<boolean>(isNew);

  // 自動保存機能
  const performAutoSave = useCallback(async () => {
    if (!autoSave || !onAutoSave || isAutoSaving || !videoId) {
      return;
    }

    if (!formData.title.trim() || formData.title.startsWith('空の楽曲') ||
        formData.artist.length === 0 || formData.artist.join(", ").trim() === '' || formData.artist.join(", ") === 'アーティスト未設定') {
      logger.debug('🔄 Skipping auto-save: incomplete song data');
      return;
    }

    const now = Date.now();
    if (now - lastAutoSaveTime < 2000) {
      return;
    }

    try {
      setIsAutoSaving(true);

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

      if (applyToAllInstances && onBatchUpdate && song) {
        onBatchUpdate(songsToSave);
      } else if ((segments.length === 1 && !isNew && song) || isChangingSong) {
        onSave(songsToSave[0]);
      } else if ((segments.length > 1 || isNew) && onBatchUpdate) {
        onBatchUpdate(songsToSave);
      } else if (segments.length === 1) {
        onSave(songsToSave[0]);
      }

      const success = await onAutoSave(videoId, medleyTitle, medleyCreator, medleyDuration);
      if (success) {
        setLastAutoSaveTime(now);
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
    if (isSaving) return;
    if (!isOpen) return;

    if (song) {
      setFormData(song);
      setArtistInputValue(song.artist.join(", "));
      setInitialFormData(song);
      if (allSongs.length > 0) {
        const sameTitle = song.title.trim();
        const sameArtist = song.artist.join(", ").trim();
        const duplicates = [...allSongs.filter(s =>
          s.title.trim() === sameTitle && s.artist.join(", ").trim() === sameArtist
        )].sort((a, b) => a.startTime - b.startTime);

        if (duplicates.length > 1) {
          const segmentData: TimeSegment[] = duplicates.map((s, index) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            segmentNumber: index + 1,
            color: s.color
          }));
          setSegments(segmentData);
        } else {
          setSegments([{
            id: song.id,
            startTime: song.startTime,
            endTime: song.endTime,
            segmentNumber: 1,
            color: song.color || "bg-orange-400"
          }]);
        }
      } else {
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
        id: Date.now(),
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
      setArtistInputValue("");
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

  const handleArtistInputBlur = () => {
    const parsed = artistInputValue.split(",").map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, artist: parsed }));
  };

  const handleSave = () => {
    // アーティスト入力をフォームに反映
    const parsedArtist = artistInputValue.split(",").map(s => s.trim()).filter(Boolean);
    const currentFormData = { ...formData, artist: parsedArtist.length > 0 ? parsedArtist : formData.artist };

    const newErrors: Record<string, string> = {};
    if (!currentFormData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }
    if (segments.length === 0) {
      newErrors.segments = "最低1つの区間が必要です";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);

    const songsToSave: SongSection[] = segments.map((segment, index) => {
      const songData = {
        title: currentFormData.title,
        artist: currentFormData.artist,
        startTime: segment.startTime,
        endTime: segment.endTime,
        niconicoLink: currentFormData.niconicoLink,
        youtubeLink: currentFormData.youtubeLink,
        spotifyLink: currentFormData.spotifyLink,
        applemusicLink: currentFormData.applemusicLink,
        color: segment.color || currentFormData.color
      };

      const sanitized = sanitizeSongSection(songData);
      const songId = !isNew && song?.id ? song.id : (Date.now() + index);

      return {
        id: songId,
        ...sanitized,
        color: sanitized.color || "bg-blue-400"
      };
    });

    logger.info('🔄 handleSave: Save path determination', {
      applyToAllInstances,
      segmentsLength: segments.length,
      isNew,
      hasSong: !!song,
      isChangingSong
    });

    if (applyToAllInstances && onBatchUpdate && song) {
      onBatchUpdate(songsToSave);
    } else if ((segments.length === 1 && !isNew && song) || isChangingSong) {
      onSave(songsToSave[0]);
    } else if ((segments.length > 1 || isNew) && onBatchUpdate) {
      onBatchUpdate(songsToSave);
    } else if (segments.length === 1) {
      onSave(songsToSave[0]);
    }

    setIsSaving(false);

    if (!continuousMode) {
      onClose();
    }
  };

  const handleSaveAndNext = () => {
    const parsedArtist = artistInputValue.split(",").map(s => s.trim()).filter(Boolean);
    const currentFormData = { ...formData, artist: parsedArtist.length > 0 ? parsedArtist : formData.artist };

    const newErrors: Record<string, string> = {};
    if (!currentFormData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const songData = {
      title: currentFormData.title,
      artist: currentFormData.artist,
      startTime: segments[0]?.startTime || 0,
      endTime: segments[0]?.endTime || 30,
      niconicoLink: currentFormData.niconicoLink,
      youtubeLink: currentFormData.youtubeLink,
      spotifyLink: currentFormData.spotifyLink,
      applemusicLink: currentFormData.applemusicLink,
      color: currentFormData.color
    };

    const sanitized = sanitizeSongSection(songData);
    const representativeSong: SongSection = {
      ...currentFormData,
      ...sanitized,
      color: sanitized.color || currentFormData.color || "bg-blue-400"
    };

    if (onSaveAndNext) {
      onSaveAndNext(representativeSong);
    } else {
      onSave(representativeSong);
    }
  };

  const handleSegmentsChange = (newSegments: TimeSegment[]) => {
    setSegments(newSegments);
  };

  useEffect(() => {
    return () => {
      if (previewInterval) {
        clearInterval(previewInterval);
      }
    };
  }, [previewInterval]);

  useEffect(() => {
    if (!isOpen) {
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleDelete = () => {
    if (onDelete && song && !isNew) {
      setDeleteDialogOpen(true);
    }
  };

  const isDirty = initialFormData && (
    formData.title !== initialFormData.title ||
    formData.artist.join(",") !== initialFormData.artist.join(",") ||
    JSON.stringify(segments.map(s => ({ s: s.startTime, e: s.endTime }))) !==
      JSON.stringify([{ s: initialFormData.startTime, e: initialFormData.endTime }])
  );

  const handleCloseWithGuard = () => {
    if (isDirty && !autoSave) {
      setDiscardDialogOpen(true);
    } else {
      onClose();
    }
  };

  const confirmDelete = () => {
    if (onDelete && song) {
      onDelete(song.id);
      toast.success(`「${song.title}」を削除しました`);
      setDeleteDialogOpen(false);
      onClose();
    }
  };

  const hasLinks = !!(formData.niconicoLink || formData.youtubeLink || formData.spotifyLink || formData.applemusicLink);

  return (
    <BaseModal isOpen={isOpen} onClose={handleCloseWithGuard} maxWidth="lg" ariaLabel={isNew ? "楽曲を追加" : "楽曲を編集"}>
      <div className="flex items-center justify-between mb-4">
        <h2 id="modal-title" className="text-xl font-bold text-gray-900">
          {isNew ? "楽曲を追加" : "楽曲を編集"}
        </h2>
        <button
          onClick={() => setHelpOpen(prev => !prev)}
          className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold border transition-colors ${
            helpOpen
              ? "bg-orange-50 text-orange-700 border-orange-300"
              : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200"
          }`}
          title="使い方を表示"
          aria-expanded={helpOpen}
        >
          ?
        </button>
      </div>

      {/* ヘルプパネル */}
      {helpOpen && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">📌 楽曲編集の使い方</p>
          <dl className="space-y-1">
            <div className="flex gap-2">
              <dt className="font-medium whitespace-nowrap">楽曲名</dt>
              <dd className="text-blue-800">この動画の中で流れる曲名を入力してください（必須）</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium whitespace-nowrap">アーティスト</dt>
              <dd className="text-blue-800">曲のアーティスト名。複数いる場合はカンマ「,」で区切ります</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium whitespace-nowrap">登場区間</dt>
              <dd className="text-blue-800">
                この曲が動画の何秒〜何秒の間に流れるかを指定します。
                時刻は「分:秒」形式で入力（例: 1:23 = 1分23秒）。
                同じ曲が複数回登場する場合は「区間を追加」で増やせます。
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium whitespace-nowrap">▶ ボタン</dt>
              <dd className="text-blue-800">区間の最初から再生してタイミングを確認できます</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium whitespace-nowrap">-5s ボタン</dt>
              <dd className="text-blue-800">区間終了の5秒前から再生して終了タイミングを確認できます</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Validation error summary */}
      {Object.keys(errors).length > 0 && (
        <div role="alert" aria-live="polite" className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            ⚠️ {errors.title || errors.segments}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* 統合フォーム — 楽曲情報 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          {/* ヘッダー行 */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">楽曲情報</h3>
            {/* 楽曲設定済みの場合のみ「DBから変更」を小さく表示 */}
            {formData.title && onChangeSong && (
              <button
                onClick={async () => {
                  if (autoSave) await performAutoSave();
                  onChangeSong();
                }}
                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
                disabled={isAutoSaving}
              >
                🎵 DBから変更
              </button>
            )}
          </div>

          {/* 楽曲未設定時: 大きなDBボタン + 区切り線 */}
          {!formData.title && onChangeSong && (
            <>
              <button
                onClick={async () => {
                  if (autoSave) await performAutoSave();
                  onChangeSong();
                }}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 font-medium text-base transition-colors mb-4"
                disabled={isAutoSaving}
              >
                🎵 楽曲データベースから選択
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500">または手動で入力</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>
            </>
          )}

          <div className="flex items-start gap-4">
            {/* サムネイル（リンクがある場合のみ） */}
            {hasLinks && (
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
            )}

            <div className="flex-1 space-y-3">
              {/* 楽曲名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  楽曲名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="楽曲名を入力"
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 bg-white text-gray-900 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* アーティスト */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">アーティスト</label>
                <input
                  type="text"
                  value={artistInputValue}
                  onChange={(e) => setArtistInputValue(e.target.value)}
                  onBlur={handleArtistInputBlur}
                  placeholder="アーティスト名（複数はカンマ区切り）"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 bg-white text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

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

      {/* 重複楽曲の一括更新オプション（コンパクト） */}
      {song && !isNew && (() => {
        const duplicateInfo = getDuplicateInfo(song, allSongs);
        return duplicateInfo && duplicateInfo.totalInstances > 1 ? (
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm text-amber-700">
              <input
                type="checkbox"
                checked={applyToAllInstances}
                onChange={(e) => setApplyToAllInstances(e.target.checked)}
                className="rounded border-amber-300 text-orange-600 focus:ring-orange-600"
              />
              全 {duplicateInfo.totalInstances} インスタンスに適用（この楽曲は{duplicateInfo.totalInstances}回登場）
            </label>
          </div>
        ) : null;
      })()}

      {/* ボタン */}
      <div className="flex justify-between mt-6">
        <div className="flex items-center gap-3">
          {!isNew && onDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={isAutoSaving}
            >
              削除
            </button>
          )}
          {autoSave && isAutoSaving && (
            <span className="text-xs text-blue-600">💾 保存中...</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCloseWithGuard}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isAutoSaving}
          >
            {autoSave && !isAutoSaving ? '完了' : 'キャンセル'}
          </button>
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

      {/* Discard Changes Confirmation */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>編集内容を破棄</AlertDialogTitle>
            <AlertDialogDescription>
              保存されていない変更があります。破棄してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>編集を続ける</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDiscardDialogOpen(false); onClose(); }}>
              破棄して閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>楽曲を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{song?.title}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseModal>
  );
}
