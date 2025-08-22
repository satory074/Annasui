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
          />



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
    </BaseModal>
  );
}