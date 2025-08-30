"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";
import { MedleyData } from "@/types";
import { getVideoMetadata } from "@/lib/utils/videoMetadata";

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
    thumbnailUrl: "",
    platform: "niconico" as "niconico" | "youtube"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [autoFetched, setAutoFetched] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        videoUrl: "",
        title: "",
        creator: "",
        duration: "",
        thumbnailUrl: "",
        platform: "niconico"
      });
      setErrors({});
      setIsLoading(false);
      setLoadingMessage("");
      setAutoFetched(false);
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
    
    // リセット状態を設定
    setAutoFetched(false);
    setFormData(prev => ({ ...prev, thumbnailUrl: "" }));
    setErrors({});
  };

  const handleFetchMetadata = async () => {
    if (!formData.videoUrl.trim()) {
      setErrors({ videoUrl: "動画URLを入力してください" });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setLoadingMessage("動画情報を取得中...");

    try {
      const metadata = await getVideoMetadata(formData.videoUrl);
      
      if (metadata.success) {
        setFormData(prev => ({
          ...prev,
          title: metadata.title,
          creator: metadata.creator,
          duration: metadata.duration ? metadata.duration.toString() : prev.duration,
          thumbnailUrl: metadata.thumbnail || ""
        }));
        setAutoFetched(true);
        
        if (!metadata.duration) {
          setLoadingMessage("動画長は手動で入力してください");
        } else {
          setLoadingMessage("");
        }
      } else {
        setErrors({ videoUrl: metadata.error || "動画情報の取得に失敗しました" });
      }
    } catch {
      setErrors({ videoUrl: "動画情報の取得中にエラーが発生しました" });
    } finally {
      setIsLoading(false);
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
      newErrors.title = "メドレータイトルは必須です（「取得」ボタンで自動入力できます）";
    }

    if (!formData.creator.trim()) {
      newErrors.creator = "制作者名は必須です（「取得」ボタンで自動入力できます）";
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
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          新規メドレーを登録
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 動画URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              動画URL *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.nicovideo.jp/watch/sm12345678"
                className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600 ${
                  errors.videoUrl ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={isLoading || !formData.videoUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    取得中
                  </div>
                ) : (
                  "取得"
                )}
              </button>
            </div>
            {errors.videoUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.videoUrl}</p>
            )}
            {loadingMessage && (
              <p className="mt-1 text-sm text-blue-600">{loadingMessage}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              URLを入力後、「取得」ボタンで動画情報を自動入力できます
            </p>
          </div>

          {/* サムネイルプレビュー */}
          {formData.thumbnailUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サムネイルプレビュー
                {autoFetched && (
                  <span className="ml-2 text-xs text-green-600">✓ 自動取得済み</span>
                )}
              </label>
              <div className="flex justify-center">
                <img
                  src={formData.thumbnailUrl}
                  alt="動画サムネイル"
                  className="w-80 h-45 object-cover bg-gray-100 border border-gray-200 rounded"
                  onError={(e) => {
                    // サムネイル読み込みエラー時は非表示にする
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* プラットフォーム */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プラットフォーム
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="niconico"
                  checked={formData.platform === "niconico"}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as "niconico" }))}
                  className="mr-2 text-orange-600 focus:ring-orange-600"
                />
                ニコニコ動画
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="youtube"
                  checked={formData.platform === "youtube"}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as "youtube" }))}
                  className="mr-2 text-orange-600 focus:ring-orange-600"
                />
                YouTube
              </label>
            </div>
          </div>

          {/* メドレータイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メドレータイトル *
              {autoFetched && formData.title && (
                <span className="ml-2 text-xs text-green-600">✓ 自動入力済み</span>
              )}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="ボカロメドレー2025"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600 ${
                errors.title ? 'border-red-500' : 
                autoFetched && formData.title ? 'border-green-300 bg-green-50' : 
                'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* 制作者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              制作者名 *
              {autoFetched && formData.creator && (
                <span className="ml-2 text-xs text-green-600">✓ 自動入力済み</span>
              )}
            </label>
            <input
              type="text"
              value={formData.creator}
              onChange={(e) => setFormData(prev => ({ ...prev, creator: e.target.value }))}
              placeholder="メドレー製作者"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600 ${
                errors.creator ? 'border-red-500' : 
                autoFetched && formData.creator ? 'border-green-300 bg-green-50' : 
                'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.creator && (
              <p className="mt-1 text-sm text-red-600">{errors.creator}</p>
            )}
          </div>

          {/* 動画の長さ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              動画の長さ（秒） *
              {autoFetched && formData.duration && (
                <span className="ml-2 text-xs text-green-600">✓ 自動入力済み</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="600"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600 ${
                errors.duration ? 'border-red-500' : 
                autoFetched && formData.duration ? 'border-green-300 bg-green-50' : 
                'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              動画の総再生時間を秒数で入力してください（例: 10分 = 600秒）
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "取得中..." : "メドレーを作成"}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}