"use client";

import { useEffect, useState } from 'react';

interface HLSPlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onError?: (error: string) => void;
}

export default function HLSPlayer({
  videoId,
}: HLSPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div>ニコニコ動画を読み込み中...</div>
          <div className="text-xs mt-1 opacity-75">iframe経由で埋め込み中</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black relative">
      <iframe
        src={`https://embed.nicovideo.jp/watch/${videoId}`}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen"
        title={`ニコニコ動画: ${videoId}`}
      />
      
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
        <div className="text-sm font-bold">ニコニコ動画プレイヤー</div>
        <div className="text-xs opacity-75">
          動画ID: {videoId}
        </div>
      </div>
    </div>
  );
}