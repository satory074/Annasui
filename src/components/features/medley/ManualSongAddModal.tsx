"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";

interface ManualSongAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songData: { title: string; artist: string; originalLink?: string }) => void;
}

export default function ManualSongAddModal({
  isOpen,
  onClose,
  onSave
}: ManualSongAddModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    originalLink: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: "",
        artist: "",
        originalLink: ""
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        title: formData.title.trim(),
        artist: formData.artist.trim(),
        originalLink: formData.originalLink.trim() || undefined
      });
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div onKeyDown={handleKeyPress}>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          新しい楽曲を追加
        </h2>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          楽曲の基本情報を入力してください。この楽曲は楽曲データベースに追加され、後で検索して選択できるようになります。
        </p>

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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 dark:bg-gray-700 dark:text-white ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="楽曲名を入力"
              autoFocus
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 dark:bg-gray-700 dark:text-white"
              placeholder="アーティスト名を入力（省略可）"
            />
          </div>

          {/* 元動画リンク */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              元動画リンク
            </label>
            <input
              type="url"
              value={formData.originalLink}
              onChange={(e) => setFormData({ ...formData, originalLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 dark:bg-gray-700 dark:text-white"
              placeholder="https://... (省略可)"
            />
          </div>
        </div>

        {/* ヘルプテキスト */}
        <div className="mt-4 p-3 bg-caramel-50 dark:bg-caramel-900/20 rounded-md">
          <p className="text-sm text-caramel-800 dark:text-caramel-200">
            💡 楽曲を追加後は、楽曲検索から選択してタイムラインに配置できます
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-caramel-600 text-white rounded-md hover:bg-caramel-700 focus:outline-none focus:ring-2 focus:ring-caramel-600"
          >
            楽曲を追加
          </button>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Ctrl + Enter で保存
        </div>
      </div>
    </BaseModal>
  );
}