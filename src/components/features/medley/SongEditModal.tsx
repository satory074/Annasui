"use client";

import { useState, useEffect } from "react";
import { SongSection } from "@/types";

interface SongEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  onSave: (song: SongSection) => void;
  onDelete?: (songId: number) => void;
  isNew?: boolean;
  maxDuration?: number;
}

export default function SongEditModal({
  isOpen,
  onClose,
  song,
  onSave,
  onDelete,
  isNew = false,
  maxDuration = 0
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

  const colorOptions = [
    { value: "bg-red-400", label: "赤", color: "#f87171" },
    { value: "bg-blue-400", label: "青", color: "#60a5fa" },
    { value: "bg-green-400", label: "緑", color: "#4ade80" },
    { value: "bg-yellow-400", label: "黄", color: "#facc15" },
    { value: "bg-purple-400", label: "紫", color: "#c084fc" },
    { value: "bg-pink-400", label: "ピンク", color: "#f472b6" },
    { value: "bg-orange-400", label: "オレンジ", color: "#fb923c" },
    { value: "bg-cyan-400", label: "シアン", color: "#22d3ee" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {isNew ? "楽曲を追加" : "楽曲を編集"}
        </h2>

        <div className="space-y-4">
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

          {/* 開始時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              開始時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formatTime(formData.startTime)}
              onChange={(e) => setFormData({ ...formData, startTime: parseTimeInput(e.target.value) })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.startTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="mm:ss または秒数"
            />
            {errors.startTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
            )}
          </div>

          {/* 終了時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              終了時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formatTime(formData.endTime)}
              onChange={(e) => setFormData({ ...formData, endTime: parseTimeInput(e.target.value) })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.endTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="mm:ss または秒数"
            />
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>

          {/* カラー選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カラー
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: option.value })}
                  className={`p-2 rounded-md border-2 flex items-center justify-center ${
                    formData.color === option.value
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: option.color }}
                >
                  <span className="text-white text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ジャンル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ジャンル
            </label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="ジャンルを入力"
            />
          </div>

          {/* 元動画リンク */}
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