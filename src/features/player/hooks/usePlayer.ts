"use client";

import { useEffect, useRef } from "react";
import type { PlayerAdapter, PlatformType } from "../adapters/types";
import { NicoPlayerAdapter } from "../adapters/NicoPlayerAdapter";
import { YouTubePlayerAdapter } from "../adapters/YouTubePlayerAdapter";
import { usePlayerStore } from "../store";

function createAdapter(
  platform: PlatformType,
  videoId: string,
  iframe?: HTMLIFrameElement
): PlayerAdapter | null {
  switch (platform) {
    case "niconico":
      if (!iframe) return null;
      return new NicoPlayerAdapter(iframe, videoId);
    case "youtube":
      return new YouTubePlayerAdapter(videoId);
    default:
      return null;
  }
}

export function usePlayer(
  platform: PlatformType,
  videoId: string,
  iframeRef: React.RefObject<HTMLIFrameElement | null>
) {
  const adapterRef = useRef<PlayerAdapter | null>(null);
  const { setCurrentTime, setIsPlaying, setDuration } =
    usePlayerStore.getState();

  useEffect(() => {
    const iframe = iframeRef.current;
    const adapter = createAdapter(platform, videoId, iframe ?? undefined);
    if (!adapter) return;

    adapterRef.current = adapter;

    const unsubTime = adapter.onTimeUpdate((time) => {
      usePlayerStore.getState().setCurrentTime(time);
    });
    const unsubDuration = adapter.onDurationChange((dur) => {
      usePlayerStore.getState().setDuration(dur);
    });
    const unsubPlaying = adapter.onPlayingChange((playing) => {
      usePlayerStore.getState().setIsPlaying(playing);
    });

    return () => {
      unsubTime();
      unsubDuration();
      unsubPlaying();
      adapter.destroy();
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, videoId]);

  return {
    play: () => adapterRef.current?.play(),
    pause: () => adapterRef.current?.pause(),
    seek: (time: number) => adapterRef.current?.seek(time),
    setVolume: (vol: number) => adapterRef.current?.setVolume(vol),
    toggleFullscreen: () => adapterRef.current?.toggleFullscreen(),
    getEmbedUrl: () => adapterRef.current?.getEmbedUrl() ?? "",
  };
}
