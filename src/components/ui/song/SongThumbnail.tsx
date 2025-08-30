"use client";

import Image from 'next/image';
import { getThumbnailUrl, getBestThumbnailFromLinks } from "@/lib/utils/thumbnail";
import { useState, useEffect } from "react";
import { SkeletonThumbnail } from "@/components/ui/LoadingSkeleton";

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 2;

  useEffect(() => {
    const loadThumbnail = async () => {
      // 楽曲が変更された際にサムネイルをリセット
      setIsLoading(true);
      setHasError(false);
      setThumbnailUrl(null);
      setPrimaryLink(null);
      
      // 新しい楽曲の場合はリトライカウントをリセット
      if (retryCount > 0) {
        setRetryCount(0);
      }

      try {
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
      } catch (error) {
        console.error('Thumbnail loading error:', error);
        // リトライ可能な場合はリトライ
        if (retryCount < maxRetries) {
          console.warn(`サムネイル読み込み失敗。リトライします... (${retryCount + 1}/${maxRetries})`);
          setRetryCount(prev => prev + 1);
          setIsLoading(false);
          
          // 1.5秒後にリトライ
          setTimeout(() => {
            setIsLoading(true);
            loadThumbnail();
          }, 1500);
          return;
        } else {
          console.error('最大リトライ回数に達しました。サムネイル読み込みに失敗。');
          setHasError(true);
        }
      } finally {
        if (retryCount >= maxRetries || thumbnailUrl) {
          setIsLoading(false);
        }
      }
    };

    loadThumbnail();
  }, [links, originalLink, title, retryCount]);

  const sizeClasses = {
    sm: "w-32 h-18",
    md: "w-40 h-22", 
    lg: "w-full aspect-video"
  };


  if (isLoading) {
    return <SkeletonThumbnail className={`${sizeClasses[size]} ${className}`} />;
  }

  if (hasError || !thumbnailUrl) {
    // デフォルトサムネイルを表示
    const defaultImageElement = (
      <div className={`relative ${sizeClasses[size]} bg-gray-50 border border-gray-200 ${className}`}>
        <Image
          src="/default-thumbnail.svg"
          alt={`${title} デフォルトサムネイル`}
          fill
          className="object-cover"
          sizes={size === 'lg' ? '100vw' : size === 'md' ? '160px' : '128px'}
        />
      </div>
    );

    if (!isClickable || !primaryLink) {
      return (
        <div className="flex-shrink-0 rounded overflow-hidden">
          {defaultImageElement}
        </div>
      );
    }

    return (
      <a
        href={primaryLink || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 rounded overflow-hidden hover:opacity-80 transition-opacity"
        title={hasError ? 'サムネイル読み込みエラー（クリックで動画を表示）' : '動画を表示'}
      >
        {defaultImageElement}
      </a>
    );
  }

  const imageElement = (
    <div className={`relative ${sizeClasses[size]} bg-gray-100 border border-gray-200 ${className}`}>
      <Image
        src={thumbnailUrl}
        alt={`${title} サムネイル`}
        fill
        className="object-cover"
        sizes={size === 'lg' ? '100vw' : size === 'md' ? '160px' : '128px'}
        priority={size === 'lg'}
        onError={() => {
          console.warn(`Image load failed for: ${title}`, { url: thumbnailUrl, primaryLink });
          if (retryCount < maxRetries) {
            console.log(`Image error - retrying thumbnail load (${retryCount + 1}/${maxRetries})`);
            setRetryCount(prev => prev + 1);
            setThumbnailUrl(null);
          } else {
            setHasError(true);
          }
        }}
        onLoad={() => {
          if (retryCount > 0) {
            console.log(`✅ Thumbnail loaded successfully after ${retryCount} retry(s): ${title}`);
          }
        }}
      />
    </div>
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
      href={primaryLink || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 rounded overflow-hidden hover:opacity-80 transition-opacity"
    >
      {imageElement}
    </a>
  );
}