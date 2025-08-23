"use client";

import { useState, useEffect } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";
import SongTimeControls from "@/components/ui/song/SongTimeControls";

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
  // 隣接する楽曲との時刻合わせ用
  previousSong?: SongSection;
  nextSong?: SongSection;
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
  previousSong,
  nextSong
}: SongEditModalProps) {
  const [formData, setFormData] = useState<SongSection>({
    id: 0,
    title: "",
    artist: "",
    startTime: 0,
    endTime: 0,
    color: "bg-blue-400",
    genre: "",
    originalLink: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (song) {
      setFormData(song);
    } else if (isNew) {
      setFormData({
        id: Date.now(), // 一時的なID
        title: "",
        artist: "",
        startTime: 0,
        endTime: 0,
        color: "bg-blue-400",
        genre: "",
        originalLink: ""
      });
    }
    setErrors({});
  }, [song, isNew, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }

    if (formData.startTime < 0) {
      newErrors.startTime = "開始時間は0以上である必要があります";
    }

    if (formData.endTime <= formData.startTime) {
      newErrors.endTime = "終了時間は開始時間より後である必要があります";
    }

    if (maxDuration > 0 && formData.endTime > maxDuration) {
      newErrors.endTime = `終了時間は動画の長さ（${Math.floor(maxDuration / 60)}:${(maxDuration % 60).toString().padStart(2, '0')}）以下である必要があります`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      if (!continuousMode) {
        onClose();
      }
    }
  };

  const handleSaveAndNext = () => {
    if (validateForm()) {
      if (onSaveAndNext) {
        onSaveAndNext(formData);
      } else {
        onSave(formData);
      }
      // 連続モードではモーダルを閉じない
    }
  };

  // プレビュー再生機能
  const handlePreviewToggle = () => {
    if (!onSeek || !onTogglePlayPause) return;

    if (isPreviewMode) {
      // プレビュー停止
      setIsPreviewMode(false);
      if (previewInterval) {
        clearInterval(previewInterval);
        setPreviewInterval(null);
      }
      if (isPlaying) {
        onTogglePlayPause(); // 一時停止
      }
    } else {
      // プレビュー開始
      if (formData.startTime >= formData.endTime) {
        alert("終了時刻が開始時刻よりも後である必要があります。");
        return;
      }

      setIsPreviewMode(true);
      onSeek(formData.startTime); // 開始位置にシーク
      
      if (!isPlaying) {
        onTogglePlayPause(); // 再生開始
      }

      // ループ再生用のインターバルを設定
      const interval = setInterval(() => {
        onSeek(formData.startTime); // 開始位置に戻る
      }, (formData.endTime - formData.startTime) * 1000); // 再生範囲の長さでループ

      setPreviewInterval(interval);
    }
  };

  // コンポーネントがアンマウントされる時のクリーンアップ
  useEffect(() => {
    return () => {
      if (previewInterval) {
        clearInterval(previewInterval);
      }
    };
  }, [previewInterval]);

  // モーダルが閉じられる時にプレビューを停止
  useEffect(() => {
    if (!isOpen && isPreviewMode) {
      setIsPreviewMode(false);
      if (previewInterval) {
        clearInterval(previewInterval);
        setPreviewInterval(null);
      }
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
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {isNew ? (isFromDatabase ? "楽曲DBから追加" : "楽曲を追加") : "楽曲を編集"}
        </h2>
        
        {/* 楽曲情報をカード形式で表示（楽曲DBから選択 または 既存楽曲の編集）*/}
        {(isFromDatabase || !isNew) && (
          <div className="mb-6">
            <SongInfoDisplay
              song={formData}
              variant="card"
              showTimeCodes={false}
            />
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-2 text-center">
              {isFromDatabase && isNew 
                ? "楽曲データベースから選択されました。開始時間と終了時間を設定してください。"
                : "楽曲情報を確認し、開始時間と終了時間を編集してください。"
              }
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* 楽曲名・アーティスト名（新規楽曲の手動追加時のみ表示） */}
          {isNew && !isFromDatabase && (
            <>
              {/* 楽曲名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  楽曲名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="楽曲名を入力"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* アーティスト名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  アーティスト名
                </label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="アーティスト名を入力"
                />
              </div>
            </>
          )}

          {/* 開始時間 */}
          <SongTimeControls
            label="開始時間"
            value={formData.startTime}
            onChange={(value) => setFormData({ ...formData, startTime: value })}
            currentTime={currentTime}
            error={errors.startTime}
            minValue={0}
            adjacentTime={previousSong?.endTime}
            adjacentLabel={previousSong ? "前の楽曲の終了時刻に合わせる" : undefined}
          />

          {/* 終了時間 */}
          <SongTimeControls
            label="終了時間"
            value={formData.endTime}
            onChange={(value) => setFormData({ ...formData, endTime: value })}
            currentTime={currentTime}
            error={errors.endTime}
            minValue={formData.startTime + 0.1}
            maxValue={maxDuration}
            adjacentTime={nextSong?.startTime}
            adjacentLabel={nextSong ? "次の楽曲の開始時刻に合わせる" : undefined}
          />

          {/* プレビュー再生ボタン */}
          {onSeek && onTogglePlayPause && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    プレビュー再生
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    設定した範囲をループ再生で確認できます
                  </p>
                </div>
                <button
                  onClick={handlePreviewToggle}
                  disabled={formData.startTime >= formData.endTime}
                  className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                    isPreviewMode
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPreviewMode ? 'プレビュー停止' : 'プレビュー開始'}
                </button>
              </div>
              {isPreviewMode && (
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  🔄 {formData.startTime.toFixed(1)}s ~ {formData.endTime.toFixed(1)}s をループ再生中...
                </div>
              )}
            </div>
          )}



          {/* 元動画リンク（新規楽曲の手動追加時のみ表示） */}
          {isNew && !isFromDatabase && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                元動画リンク
              </label>
              <input
                type="url"
                value={formData.originalLink || ""}
                onChange={(e) => setFormData({ ...formData, originalLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
            </div>
          )}
        </div>

        {/* 連続入力モードトグル（新規追加時のみ） */}
        {isNew && onToggleContinuousMode && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={onToggleContinuousMode}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              連続入力モード（保存後に次の楽曲を追加）
            </label>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-between mt-6">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                保存して次へ
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isNew ? (continuousMode ? "保存して終了" : "追加") : "保存"}
            </button>
          </div>
        </div>
    </BaseModal>
  );
}