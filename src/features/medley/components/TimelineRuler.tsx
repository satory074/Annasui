"use client";

import { useMemo } from "react";
import { formatTimeSimple } from "@/lib/utils/time";
import { generateRulerTicks } from "../utils/timelineLayout";

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
  totalWidth: number;
}

export function TimelineRuler({
  duration,
  pixelsPerSecond,
  totalWidth,
}: TimelineRulerProps) {
  const ticks = useMemo(
    () => generateRulerTicks(duration, pixelsPerSecond),
    [duration, pixelsPerSecond]
  );

  return (
    <div
      className="relative h-6 border-b border-gray-300 bg-gray-50 select-none shrink-0"
      style={{ width: totalWidth }}
    >
      {ticks.map((tick) => (
        <div
          key={tick.time}
          className="absolute top-0 h-full"
          style={{ left: tick.px }}
        >
          <div
            className={`absolute bottom-0 w-px ${
              tick.major ? "h-3 bg-gray-400" : "h-2 bg-gray-300"
            }`}
          />
          {tick.major && (
            <span className="absolute top-0 -translate-x-1/2 text-[10px] text-gray-500 font-mono whitespace-nowrap">
              {formatTimeSimple(tick.time)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
