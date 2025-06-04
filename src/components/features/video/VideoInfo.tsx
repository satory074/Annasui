"use client";

import { formatTime } from "@/lib/utils/time";
import { formatNumber, formatDate, VideoInfo as VideoInfoType } from "@/lib/utils/videoInfo";

interface VideoInfoProps {
  videoInfo: VideoInfoType | null;
}

export default function VideoInfo({ videoInfo }: VideoInfoProps) {

  return (
    <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto">
        {/* メインタイトルとメタデータ */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {videoInfo?.title || `ニコニコ動画 - ${videoInfo?.videoId || 'Loading...'}`}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {videoInfo?.videoId || 'Loading...'}
            </span>
            
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                <path d="m15.5 11-4.5-2.5v5z"/>
              </svg>
              {videoInfo ? formatTime(videoInfo.duration) : '--:--'}
            </span>
            
            {videoInfo?.viewCount && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {formatNumber(videoInfo.viewCount)} 回再生
              </span>
            )}
            
            {videoInfo?.mylistCount && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                {formatNumber(videoInfo.mylistCount)} マイリスト
              </span>
            )}
            
            {videoInfo?.commentCount && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                {formatNumber(videoInfo.commentCount)} コメント
              </span>
            )}
            
            {videoInfo?.uploadDate && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-2V2h-2v2H9V2H7v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
                {formatDate(videoInfo.uploadDate)}
              </span>
            )}
          </div>
        </div>

        {/* 説明文 */}
        {videoInfo?.description && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="line-clamp-3 hover:line-clamp-none transition-all duration-200 cursor-pointer">
              {videoInfo.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}