"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";
import { checkForDuplicateBeforeAdd } from "@/lib/utils/duplicateSongs";
import { SongSection } from "@/types";

interface ManualSongAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songData: { title: string; artist: string; originalLink?: string }) => void;
  existingSongs?: SongSection[]; // 重複チェック用
}

export default function ManualSongAddModal({
  isOpen,
  onClose,
  onSave,
  existingSongs = []
}: ManualSongAddModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    originalLink: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDuplicate: boolean; existingInstances: SongSection[] }>({ isDuplicate: false, existingInstances: [] });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: "",
        artist: "",
        originalLink: ""
      });
      setErrors({});
      setDuplicateWarning({ isDuplicate: false, existingInstances: [] });
    }
  }, [isOpen]);

  // 重複チェック
  useEffect(() => {
    if (formData.title.trim() && formData.artist.trim()) {
      const result = checkForDuplicateBeforeAdd(
        { title: formData.title.trim(), artist: formData.artist.trim() },
        existingSongs
      );
      setDuplicateWarning(result);
    } else {
      setDuplicateWarning({ isDuplicate: false, existingInstances: [] });
    }
  }, [formData.title, formData.artist, existingSongs]);

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
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          新しい楽曲を追加
        </h2>
        
        <p className="text-sm text-gray-600 mb-6">
          楽曲の基本情報を入力してください。この楽曲は楽曲データベースに追加され、後で検索して選択できるようになります。
        </p>

        <div className="space-y-4">
          {/* 楽曲名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              楽曲名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アーティスト名
            </label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="アーティスト名を入力（省略可 - 空欄の場合は「Unknown Artist」として保存）"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 空欄の場合、自動的に「Unknown Artist」として登録されます
            </p>
          </div>

          {/* 元動画リンク */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              元動画リンク
            </label>
            <input
              type="url"
              value={formData.originalLink}
              onChange={(e) => setFormData({ ...formData, originalLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="https://... (省略可)"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 元動画のURLがわかる場合は入力してください（任意）
            </p>
          </div>
        </div>

        {/* 重複警告 */}
        {duplicateWarning.isDuplicate && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 mb-2">
                  既存の楽曲と重複しています
                </p>
                <p className="text-xs text-amber-600 mb-2">
                  この楽曲は既に {duplicateWarning.existingInstances.length} 回登場しています：
                </p>
                <ul className="text-xs text-amber-600 list-disc list-inside space-y-1">
                  {duplicateWarning.existingInstances.map((song) => (
                    <li key={song.id}>
                      {Math.floor(song.startTime / 60)}:{String(song.startTime % 60).padStart(2, '0')} - {Math.floor(song.endTime / 60)}:{String(song.endTime % 60).padStart(2, '0')}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  重複して追加しても問題ありません。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ヘルプテキスト */}
        <div className="mt-4 p-3 bg-orange-50 rounded-md">
          <p className="text-sm text-orange-800">
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
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600"
          >
            楽曲を追加
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          Ctrl + Enter で保存
        </div>
      </div>
    </BaseModal>
  );
}