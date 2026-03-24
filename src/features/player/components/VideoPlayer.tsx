"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { usePlayer } from "../hooks/usePlayer";
import type { PlatformType } from "../adapters/types";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  platform: PlatformType;
  videoId: string;
}

function getEmbedUrl(platform: PlatformType, videoId: string): string {
  switch (platform) {
    case "niconico":
      return `https://embed.nicovideo.jp/watch/${videoId}?jsapi=1&playerId=1&from=0&allowProgrammaticFullScreen=1&noRelatedVideo=1&autoplay=0&_frontendId=6&_frontendVersion=0`;
    case "youtube":
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    default:
      return "";
  }
}

function getWatchUrl(platform: PlatformType, videoId: string): string {
  switch (platform) {
    case "niconico":
      return `https://www.nicovideo.jp/watch/${videoId}`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${videoId}`;
    default:
      return "";
  }
}

function getPlatformLabel(platform: PlatformType): string {
  switch (platform) {
    case "niconico":
      return "ニコニコ動画";
    case "youtube":
      return "YouTube";
    default:
      return platform;
  }
}

export function VideoPlayer({ platform, videoId }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  usePlayer(platform, videoId, iframeRef);

  const embedUrl = useMemo(
    () => getEmbedUrl(platform, videoId),
    [platform, videoId]
  );

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-gray-400">
        このプラットフォームの埋め込みプレイヤーは対応していません
      </div>
    );
  }

  if (hasError) {
    const watchUrl = getWatchUrl(platform, videoId);
    const platformLabel = getPlatformLabel(platform);
    return (
      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white p-8 max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-yellow-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-xl font-semibold mb-2">プレイヤーエラー</h3>
          <p className="text-gray-300 text-sm mb-6">
            埋め込みプレイヤーの読み込みに失敗しました。
            <br />
            下記のオプションをお試しください。
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              プレイヤーを再読み込み
            </Button>
            {watchUrl && (
              <Button asChild variant="outline" className="w-full">
                <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                  {platformLabel}で視聴
                </a>
              </Button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
            >
              ページ全体を再読み込み
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-400 space-y-1">
            <p>
              <strong>動画ID:</strong> {videoId}
            </p>
            <p>この動画は埋め込み再生が制限されている可能性があります</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video max-h-[50vh] bg-black relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="text-center text-white p-8">
            <div className="mx-auto h-16 w-16 mb-4">
              <svg
                className="animate-spin h-16 w-16 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">
              プレイヤーを読み込み中...
            </h3>
            <div className="flex justify-center space-x-1">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" />
              <div
                className="h-2 w-2 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="h-2 w-2 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        </div>
      )}
      <iframe
        key={retryKey}
        ref={iframeRef}
        src={embedUrl}
        className="max-w-full max-h-full w-full aspect-video"
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        title={`${platform} player`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
