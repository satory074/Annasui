"use client";

import { useRef, useMemo } from "react";
import { usePlayer } from "../hooks/usePlayer";
import type { PlatformType } from "../adapters/types";

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

export function VideoPlayer({ platform, videoId }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  usePlayer(platform, videoId, iframeRef);

  const embedUrl = useMemo(
    () => getEmbedUrl(platform, videoId),
    [platform, videoId]
  );

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-gray-400">
        このプラットフォームの埋め込みプレイヤーは対応していません
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        title={`${platform} player`}
      />
    </div>
  );
}
