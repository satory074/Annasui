"use client";

import { useEffect, useRef } from "react";
import PlayerControls from "./PlayerControls";

interface YouTubePlayerProps {
    videoId: string;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onReady?: () => void;
    autoplay?: boolean;
    seekTo?: number;
    className?: string;
    // プレイヤーコントロール用のプロパティ
    isPlaying?: boolean;
    currentTime?: number;
    duration?: number;
    volume?: number;
    onTogglePlayPause?: () => void;
    onSeek?: (seekTime: number) => void;
    onVolumeChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleFullscreen?: () => void;
    // ズーム対応プロパティ
    visibleStartTime?: number;
    visibleDuration?: number;
}

export default function YouTubePlayer({
    videoId,
    onReady,
    autoplay = false,
    seekTo,
    className = "w-full aspect-video",
    isPlaying = false,
    currentTime = 0,
    duration = 0,
    volume = 50,
    onTogglePlayPause,
    onSeek,
    onVolumeChange,
    onToggleFullscreen,
    visibleStartTime,
    visibleDuration,
}: YouTubePlayerProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!videoId) return;

        // YouTube iframe URL with enablejsapi for API access
        const src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}${autoplay ? '&autoplay=1' : ''}${seekTo ? `&start=${Math.floor(seekTo)}` : ''}`;
        
        if (iframeRef.current) {
            iframeRef.current.src = src;
        }

        // Call onReady when iframe loads
        const handleLoad = () => {
            onReady?.();
        };

        const iframe = iframeRef.current;
        if (iframe) {
            iframe.addEventListener('load', handleLoad);
            return () => {
                iframe.removeEventListener('load', handleLoad);
            };
        }
    }, [videoId, autoplay, seekTo, onReady]);

    return (
        <div className="relative">
            <div className="aspect-video bg-black relative">
                <iframe
                    ref={iframeRef}
                    className={className}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`YouTube video ${videoId}`}
                />
                <div className="absolute top-2 left-2 bg-red-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    YouTube Player
                </div>
            </div>
            
            {/* プレイヤーコントロール */}
            {(onTogglePlayPause || onSeek) && (
                <PlayerControls
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    onTogglePlayPause={onTogglePlayPause || (() => {})}
                    onSeek={onSeek || (() => {})}
                    onVolumeChange={onVolumeChange || (() => {})}
                    onToggleFullscreen={onToggleFullscreen || (() => {})}
                    visibleStartTime={visibleStartTime}
                    visibleDuration={visibleDuration}
                />
            )}
        </div>
    );
}