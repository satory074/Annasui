"use client";

import { getThumbnailUrl, handleThumbnailError } from "@/lib/utils/thumbnail";

interface SongThumbnailProps {
  originalLink?: string;
  title: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  isClickable?: boolean;
}

export default function SongThumbnail({
  originalLink,
  title,
  size = "md",
  className = "",
  isClickable = true
}: SongThumbnailProps) {
  if (!originalLink) return null;

  const thumbnailUrl = getThumbnailUrl(originalLink);
  if (!thumbnailUrl) return null;

  const sizeClasses = {
    sm: "w-16 h-9",
    md: "w-20 h-11", 
    lg: "w-full aspect-video"
  };

  const imageElement = (
    <img
      src={thumbnailUrl}
      alt={`${title} サムネイル`}
      className={`${sizeClasses[size]} object-cover bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 ${className}`}
      onError={(e) => handleThumbnailError(e.currentTarget, originalLink)}
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
      href={originalLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 rounded overflow-hidden hover:opacity-80 transition-opacity"
    >
      {imageElement}
    </a>
  );
}