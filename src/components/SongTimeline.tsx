"use client";

import { SongSection } from "@/types";
import { useEffect, useRef } from "react";

interface SongTimelineProps {
  songs: SongSection[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export default function SongTimeline({
  songs,
  currentTime,
  duration,
  onSeek,
}: SongTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  // 現在の再生時間に基づいてタイムラインを更新
  useEffect(() => {
    const updateTimeline = () => {
      if (timelineRef.current) {
        const progressBar = timelineRef.current.querySelector(".progress-bar") as HTMLDivElement | null;
        if (progressBar) {
          const progress = (currentTime / duration) * 100;
          progressBar.style.width = `${progress}%`;
        }
      }
    };

    updateTimeline();
    const interval = setInterval(updateTimeline, 100); // 0.1秒ごとに更新

    return () => {
      clearInterval(interval);
    };
  }, [currentTime, duration]);

  // 現在再生中の曲を特定
  const getCurrentSong = (): SongSection | undefined => {
    return songs.find((song) => currentTime >= song.startTime && currentTime < song.endTime);
  };

  // 時間フォーマット関数
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // 現在の曲
  const currentSong = getCurrentSong();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          楽曲タイムライン - 現在: {formatTime(currentTime)}
        </h3>
        {currentSong && (
          <div className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            <span className="font-medium">{currentSong.title}</span>
            <span className="text-gray-500 ml-2">- {currentSong.artist}</span>
          </div>
        )}
      </div>

      {/* タイムライン */}
      <div
        className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPositionRatio = (e.clientX - rect.left) / rect.width;
          // 絶対に数値として扱う
          const seekTime = Number((duration * clickPositionRatio).toFixed(3));
          console.log(`タイムライン上でクリック: ${seekTime}秒へシーク`);
          onSeek(seekTime);
        }}
      >
        {/* 楽曲セクションの表示 */}
        {songs.map((song) => {
          const songWidth = ((song.endTime - song.startTime) / duration) * 100;
          const songLeft = (song.startTime / duration) * 100;

          return (
            <div
              key={song.id}
              className={`absolute h-full ${song.color} flex items-center justify-center
              ${currentSong?.id === song.id ? "border-2 border-white" : ""}`}
              style={{
                left: `${songLeft}%`,
                width: `${songWidth}%`,
              }}
              title={`${song.title} - ${song.artist} (${formatTime(song.startTime)} - ${formatTime(song.endTime)})`}
              onClick={(e) => {
                e.stopPropagation(); // 親要素のクリックイベントを停止
                console.log(`曲をクリック「${song.title}」: ${song.startTime}秒へシーク`);
                // 厳密に数値として扱う
                onSeek(Number(song.startTime));
              }}
            >
              <span className="text-xs text-gray-900 dark:text-white font-bold truncate px-1">
                {song.title}
              </span>
            </div>
          );
        })}

        {/* 現在の再生位置インジケーター */}
        <div
          className="absolute h-full w-1 bg-red-500 z-20"
          style={{
            left: `${(currentTime / duration) * 100}%`,
            boxShadow: "0 0 5px rgba(255, 255, 255, 0.8)",
          }}
        ></div>

        {/* 現在時間の吹き出し表示 */}
        <div
          className="absolute top-0 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded z-20"
          style={{
            left: `${(currentTime / duration) * 100}%`,
          }}
        >
          {formatTime(currentTime)}
        </div>
      </div>

      {/* タイムスケール */}
      <div className="h-6 relative" ref={timelineRef}>
        <div className="absolute w-full h-1 bg-gray-300 dark:bg-gray-600 top-0">
          <div className="progress-bar absolute h-full bg-red-500" style={{ width: "0%" }}></div>
        </div>
        <div className="absolute w-full flex justify-between px-2 text-xs text-gray-500">
          {Array.from({ length: 5 }).map((_, index) => {
            const position = (index / 4) * 100;
            const timeValue = (index / 4) * duration;
            return (
              <div
                key={index}
                className="flex flex-col items-center"
                style={{
                  left: `${position}%`,
                  position: "absolute",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="h-1.5 w-0.5 bg-gray-400"></div>
                <span>{formatTime(timeValue)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
