"use client";

import { useState } from "react";
import { SongSection } from "@/types";

interface ShareButtonsProps {
  url: string;
  title: string;
  currentTime: number;
  currentSong?: SongSection;
  originalVideoUrl?: string;
}

export default function ShareButtons({
  url,
  title,
  currentTime,
  currentSong,
  originalVideoUrl
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy URL');
      // フォールバック: 旧式のコピー方法
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const shareText = currentSong 
    ? `${title} - ${currentSong.title} (${formatTime(currentTime)}~)`
    : title;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`,
    discord: `https://discord.com/api/oauth2/authorize?client_id=0&scope=webhook.incoming&redirect_uri=${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          url: url,
        });
      } catch {
        console.log('Native share cancelled or failed');
      }
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            この動画を共有
            {currentSong && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                ({currentSong.title} から)
              </span>
            )}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>URL: {url}</span>
            <button
              onClick={handleCopyUrl}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {copied ? 'コピー済み!' : 'URLコピー'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 元動画リンク */}
          {originalVideoUrl && (
            <a
              href={originalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm flex items-center gap-2"
              title="元動画を新しいタブで開く"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              元動画を見る
            </a>
          )}

          {/* ネイティブ共有（モバイル対応） */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              共有
            </button>
          )}

          {/* SNS共有ボタン */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleShare('twitter')}
              className="p-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
              title="Twitterで共有"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Facebookで共有"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>

            <button
              onClick={() => handleShare('line')}
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              title="LINEで共有"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 4.285.029 9.567c0 4.675 4.176 8.594 9.75 8.594.934 0 1.837-.113 2.693-.318.753.414 4.176 2.66 5.027 3.208.85.546 1.376.278 1.376-.48 0-.757-.204-3.138-.204-3.138C22.013 16.068 24.005 13.055 24.005 9.567 24.005 4.285 18.639.001 12.017.001zM8.845 13.028H6.394c-.2 0-.357-.158-.357-.357V8.225c0-.2.158-.357.357-.357.2 0 .357.158.357.357v4.089h2.094c.2 0 .357.158.357.357s-.158.357-.357.357zm1.927-3.606c0-.2.158-.357.357-.357s.357.158.357.357v3.249c0 .2-.158.357-.357.357s-.357-.158-.357-.357V9.422zm4.548 0c0-.2.158-.357.357-.357s.357.158.357.357v2.535l2.314-2.831c.07-.086.178-.131.285-.131.2 0 .357.158.357.357v3.249c0 .2-.158.357-.357.357s-.357-.158-.357-.357v-2.535l-2.314 2.831c-.07.086-.178.131-.285.131-.2 0-.357-.158-.357-.357V9.422zm7.259.714H19.67c-.2 0-.357-.158-.357-.357s.158-.357.357-.357h2.908c.2 0 .357.158.357.357s-.158.357-.357.357h-1.081v2.892c0 .2-.158.357-.357.357s-.357-.158-.357-.357v-2.892z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}