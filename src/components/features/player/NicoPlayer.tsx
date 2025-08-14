"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils/time";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface NicoPlayerProps {
  playerRef: React.RefObject<HTMLIFrameElement | null>;
  embedUrl: string;
  onIframeLoad: () => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playerError: string | null;
  onTogglePlayPause: () => void;
  onErrorDismiss?: () => void;
}

export default function NicoPlayer({
  playerRef,
  embedUrl,
  onIframeLoad,
  isPlaying,
  currentTime,
  duration,
  playerError,
  onTogglePlayPause,
  onErrorDismiss,
}: NicoPlayerProps) {
  const [browserReady] = useState(true);

  return (
    <div className="relative">
      {/* niconicoの埋め込みプレイヤー (2024年8月5日以降のAPI対応) */}
      <div className="aspect-video bg-black relative">
        {browserReady && (
          <>
            <div className="absolute top-2 left-2 bg-blue-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs z-10">
              URL: {embedUrl}
            </div>
            <iframe
              ref={playerRef}
              src={embedUrl}
              width="100%"
              height="100%"
              allowFullScreen
              allow="autoplay; fullscreen"
              className="w-full h-full border-0"
              onLoad={() => {
                console.log("Iframe onLoad fired, URL:", embedUrl);
                onIframeLoad();
              }}
              onError={(e) => {
                console.error("Iframe loading error:", e);
              }}
            ></iframe>
          </>
        )}

        {/* オーバーレイ表示（再生状態デバッグ用） */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {isPlaying ? "再生中" : "停止中"} - {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        
        {/* デバッグ情報 */}
        <div className="absolute top-2 left-2 bg-blue-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          Player: {playerRef.current ? "✓" : "✗"} | Ready: {playerRef.current?.contentWindow ? "✓" : "✗"}
        </div>

        {/* 代替コントロールオーバーレイ - iframe操作の代替 */}
        <div 
          className="absolute inset-0 bg-transparent cursor-pointer" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePlayPause();
          }}
        >
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black bg-opacity-50 rounded-full p-4 cursor-pointer hover:bg-opacity-70 transition-all pointer-events-auto"
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     onTogglePlayPause();
                   }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-white pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* エラーメッセージ */}
        {playerError && (
          <ErrorMessage
            message={playerError}
            onDismiss={onErrorDismiss}
          />
        )}
      </div>
    </div>
  );
}