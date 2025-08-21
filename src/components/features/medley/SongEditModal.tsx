"use client";

import { useState, useEffect } from "react";
import { SongSection } from "@/types";
import { getThumbnailUrl, handleThumbnailError } from "@/lib/utils/thumbnail";

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
  isFromDatabase = false
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
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && song && !isNew) {
      if (confirm("この楽曲を削除しますか？")) {
        onDelete(song.id);
        onClose();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (timeString: string): number => {
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseInt(timeString) || 0;
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {isNew ? (isFromDatabase ? "楽曲DBから追加" : "楽曲を追加") : "楽曲を編集"}
        </h2>
        
        {/* 楽曲情報をカード形式で表示（楽曲DBから選択 または 既存楽曲の編集）*/}
        {(isFromDatabase || !isNew) && (
          <div className="mb-6">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 flex gap-4">
              {/* サムネイル画像 */}
              {formData.originalLink && (
                (() => {
                  const thumbnailUrl = getThumbnailUrl(formData.originalLink);
                  return thumbnailUrl ? (
                    <a
                      href={formData.originalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={thumbnailUrl}
                        alt={`${formData.title} サムネイル`}
                        className="w-16 h-9 object-cover bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        onError={(e) => handleThumbnailError(e.currentTarget, formData.originalLink!)}
                      />
                    </a>
                  ) : null;
                })()
              )}
              
              {/* 楽曲情報 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 truncate">
                  {formData.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 truncate">
                  {formData.artist}
                </p>
                
                {/* ジャンルとリンク情報 */}
                <div className="flex items-center gap-4 text-xs">
                  {formData.genre && (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      {formData.genre}
                    </span>
                  )}
                  {formData.originalLink && (
                    <a
                      href={formData.originalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      元動画
                    </a>
                  )}
                </div>
              </div>
            </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              開始時間 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatTime(formData.startTime)}
                onChange={(e) => setFormData({ ...formData, startTime: parseTimeInput(e.target.value) })}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.startTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="mm:ss または秒数"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, startTime: Math.max(0, formData.startTime - 0.1) })}
                  className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  title="0.1秒戻る"
                >
                  -0.1s
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, startTime: Math.floor(currentTime) })}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm whitespace-nowrap"
                  title="現在の再生位置を設定"
                >
                  現在時刻
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, startTime: formData.startTime + 0.1 })}
                  className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  title="0.1秒進む"
                >
                  +0.1s
                </button>
              </div>
            </div>
            {errors.startTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
            )}
          </div>

          {/* 終了時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              終了時間 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatTime(formData.endTime)}
                onChange={(e) => setFormData({ ...formData, endTime: parseTimeInput(e.target.value) })}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.endTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="mm:ss または秒数"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, endTime: Math.max(formData.startTime + 0.1, formData.endTime - 0.1) })}
                  className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  title="0.1秒戻る"
                >
                  -0.1s
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, endTime: Math.floor(currentTime) })}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm whitespace-nowrap"
                  title="現在の再生位置を設定"
                >
                  現在時刻
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, endTime: formData.endTime + 0.1 })}
                  className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  title="0.1秒進む"
                >
                  +0.1s
                </button>
              </div>
            </div>
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>



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
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isNew ? "追加" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}