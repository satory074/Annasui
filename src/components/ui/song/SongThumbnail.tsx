"use client";

import { getThumbnailUrl, handleThumbnailError, getBestThumbnailFromLinks } from "@/lib/utils/thumbnail";
import { useState, useEffect } from "react";

interface SongThumbnailProps {
  originalLink?: string;
  title: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  isClickable?: boolean;
  links?: {
    niconico?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
}

export default function SongThumbnail({
  originalLink,
  title,
  size = "md",
  className = "",
  isClickable = true,
  links
}: SongThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [primaryLink, setPrimaryLink] = useState<string | null>(null);

  useEffect(() => {
    const loadThumbnail = async () => {
      // 楽曲が変更された際にサムネイルをリセット
      setThumbnailUrl(null);
      setPrimaryLink(null);

      if (links) {
        // 新しいlinksフィールドを使用
        const thumbnail = await getBestThumbnailFromLinks(links, originalLink);
        setThumbnailUrl(thumbnail);
        
        // クリック時のリンクを優先度に基づいて設定
        const bestLink = links.niconico || links.youtube || links.spotify || links.appleMusic || originalLink;
        setPrimaryLink(bestLink || null);
      } else if (originalLink) {
        // 後方互換性のためのoriginalLink対応
        const thumbnail = getThumbnailUrl(originalLink);
        setThumbnailUrl(thumbnail);
        setPrimaryLink(originalLink);
      }
    };

    loadThumbnail();
  }, [links, originalLink, title]);

  if (!thumbnailUrl || !primaryLink) return null;

  const sizeClasses = {
    sm: "w-32 h-18",
    md: "w-40 h-22", 
    lg: "w-full aspect-video"
  };

  const imageElement = (
    <img
      src={thumbnailUrl}
      alt={`${title} サムネイル`}
      className={`${sizeClasses[size]} object-cover bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 ${className}`}
      onError={(e) => {
        if (primaryLink) {
          handleThumbnailError(e.currentTarget, primaryLink);
        }
      }}
    />
  );

  if (!isClickable) {
    return (
      <div className="flex-shrink-0 rounded overflow-hidden">
        {imageElement}
      </div>
    );
  }

  return (
    <a
      href={primaryLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 rounded overflow-hidden hover:opacity-80 transition-opacity"
    >
      {imageElement}
    </a>
  );
}