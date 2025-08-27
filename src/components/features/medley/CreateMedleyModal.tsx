"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";
import { MedleyData } from "@/types";

interface CreateMedleyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMedley: (medleyData: Omit<MedleyData, 'songs'>) => void;
}

export default function CreateMedleyModal({
  isOpen,
  onClose,
  onCreateMedley
}: CreateMedleyModalProps) {
  const [formData, setFormData] = useState({
    videoUrl: "",
    title: "",
    creator: "",
    duration: "",
    platform: "niconico" as "niconico" | "youtube"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        videoUrl: "",
        title: "",
        creator: "",
        duration: "",
        platform: "niconico"
      });
      setErrors({});
    }
  }, [isOpen]);

  const extractVideoIdFromUrl = (url: string, platform: "niconico" | "youtube"): string | null => {
    if (platform === "niconico") {
      // ニコニコ動画のURL形式: https://www.nicovideo.jp/watch/sm12345678
      const match = url.match(/(?:nicovideo\.jp\/watch\/|nico\.ms\/)([a-z]{2}\d+)/i);
      return match ? match[1] : null;
    } else if (platform === "youtube") {
      // YouTube URL形式: https://www.youtube.com/watch?v=dQw4w9WgXcQ
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const detectPlatformFromUrl = (url: string): "niconico" | "youtube" | null => {
    if (url.includes("nicovideo.jp") || url.includes("nico.ms")) {
      return "niconico";
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    return null;
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, videoUrl: url }));
    
    // Auto-detect platform from URL
    const detectedPlatform = detectPlatformFromUrl(url);
    if (detectedPlatform) {
      setFormData(prev => ({ ...prev, platform: detectedPlatform }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.videoUrl.trim()) {
      newErrors.videoUrl = "動画URLは必須です";
    } else {
      const videoId = extractVideoIdFromUrl(formData.videoUrl, formData.platform);
      if (!videoId) {
        newErrors.videoUrl = "有効な動画URLを入力してください";
      }
    }

    if (!formData.title.trim()) {
      newErrors.title = "メドレータイトルは必須です";
    }

    if (!formData.creator.trim()) {
      newErrors.creator = "制作者名は必須です";
    }

    if (!formData.duration.trim()) {
      newErrors.duration = "動画の長さは必須です";
    } else {
      const duration = parseInt(formData.duration);
      if (isNaN(duration) || duration <= 0) {
        newErrors.duration = "有効な秒数を入力してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const videoId = extractVideoIdFromUrl(formData.videoUrl, formData.platform);
    if (!videoId) {
      setErrors({ videoUrl: "動画IDを取得できませんでした" });
      return;
    }

    const medleyData: Omit<MedleyData, 'songs'> = {
      videoId,
      title: formData.title.trim(),
      creator: formData.creator.trim(),
      duration: parseInt(formData.duration),
      platform: formData.platform,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0
    };

    onCreateMedley(medleyData);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          新規メドレーを登録
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 動画URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              動画URL *
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.nicovideo.jp/watch/sm12345678"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-caramel-600 focus:border-caramel-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.videoUrl ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.videoUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.videoUrl}</p>
            )}
          </div>

          {/* プラットフォーム */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              プラットフォーム
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="niconico"
                  checked={formData.platform === "niconico"}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as "niconico" }))}
                  className="mr-2 text-caramel-600 focus:ring-caramel-600"
                />
                ニコニコ動画
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="youtube"
                  checked={formData.platform === "youtube"}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as "youtube" }))}
                  className="mr-2 text-caramel-600 focus:ring-caramel-600"
                />
                YouTube
              </label>
            </div>
          </div>

          {/* メドレータイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              メドレータイトル *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="ボカロメドレー2025"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-caramel-600 focus:border-caramel-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* 制作者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              制作者名 *
            </label>
            <input
              type="text"
              value={formData.creator}
              onChange={(e) => setFormData(prev => ({ ...prev, creator: e.target.value }))}
              placeholder="メドレー製作者"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-caramel-600 focus:border-caramel-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.creator ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.creator && (
              <p className="mt-1 text-sm text-red-600">{errors.creator}</p>
            )}
          </div>

          {/* 動画の長さ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              動画の長さ（秒） *
            </label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="600"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-caramel-600 focus:border-caramel-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.duration ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              動画の総再生時間を秒数で入力してください（例: 10分 = 600秒）
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-caramel-600 dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-caramel-600 border border-transparent rounded-md shadow-sm hover:bg-caramel-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-caramel-600"
            >
              メドレーを作成
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}