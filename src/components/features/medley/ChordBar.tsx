"use client";

import { ChordSection } from "@/types";

interface ChordBarProps {
  chords: ChordSection[];
  currentTime: number;
  duration: number;
  currentChord: ChordSection | null;
  onSeek: (time: number) => void;
}

export default function ChordBar({
  chords,
  currentTime,
  duration,
  currentChord,
  onSeek,
}: ChordBarProps) {
  if (chords.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">コード進行</h3>
      <div 
        className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex cursor-pointer"
        onClick={(e) => {
          if (duration <= 0) {
            console.log("動画の長さが取得されていないため、シークできません");
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPositionRatio = (e.clientX - rect.left) / rect.width;
          const seekTime = Number((duration * clickPositionRatio).toFixed(3));
          console.log(`コード進行バーでクリック: ${seekTime}秒へシーク (duration: ${duration}, ratio: ${clickPositionRatio.toFixed(3)})`);
          onSeek(seekTime);
        }}
      >
        {chords.map((chord) => {
          const chordWidth = ((chord.endTime - chord.startTime) / duration) * 100;
          const chordLeft = (chord.startTime / duration) * 100;

          return (
            <div
              key={chord.id}
              className={`absolute h-full ${chord.color} flex items-center justify-center pointer-events-none
              ${currentChord?.id === chord.id ? "border-2 border-white" : ""}`}
              style={{
                left: `${chordLeft}%`,
                width: `${chordWidth}%`,
              }}
              title={chord.chord}
            >
              <span className="text-xs text-gray-800 font-bold truncate px-1">{chord.chord}</span>
            </div>
          );
        })}

        {/* 現在位置インジケーター */}
        <div
          className="absolute h-full w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}