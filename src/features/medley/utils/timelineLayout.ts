import type { SongSection } from "../types";

export interface BlockLayout {
  song: SongSection;
  left: number; // percentage
  width: number; // percentage
  leftPx: number; // pixels (for pixel-based rendering)
  widthPx: number; // pixels
}

const MIN_BLOCK_WIDTH_PX = 4;

/**
 * Calculate pixel-based layout for timeline blocks.
 * @param songs - Array of song sections
 * @param duration - Total duration in seconds
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @returns Array of block layouts with pixel positions
 */
export function calculateBlockLayouts(
  songs: SongSection[],
  duration: number,
  pixelsPerSecond: number
): BlockLayout[] {
  if (duration <= 0) return [];

  const totalWidth = duration * pixelsPerSecond;

  return [...songs]
    .sort((a, b) => a.startTime - b.startTime)
    .map((song) => {
      const leftPx = song.startTime * pixelsPerSecond;
      const widthPx = Math.max(
        (song.endTime - song.startTime) * pixelsPerSecond,
        MIN_BLOCK_WIDTH_PX
      );
      const left = (leftPx / totalWidth) * 100;
      const width = (widthPx / totalWidth) * 100;

      return { song, left, width, leftPx, widthPx };
    });
}

/**
 * Calculate total timeline width in pixels.
 */
export function getTimelineWidth(
  duration: number,
  pixelsPerSecond: number
): number {
  return duration * pixelsPerSecond;
}

/**
 * Convert a pixel x-position to seconds.
 */
export function pxToSeconds(
  px: number,
  pixelsPerSecond: number
): number {
  return px / pixelsPerSecond;
}

/**
 * Convert seconds to pixel x-position.
 */
export function secondsToPx(
  seconds: number,
  pixelsPerSecond: number
): number {
  return seconds * pixelsPerSecond;
}

/**
 * Generate ruler tick marks for the timeline.
 */
export function generateRulerTicks(
  duration: number,
  pixelsPerSecond: number
): { time: number; px: number; major: boolean }[] {
  if (duration <= 0) return [];

  // Determine tick interval based on zoom level
  let interval: number;
  if (pixelsPerSecond >= 20) {
    interval = 5; // every 5 seconds
  } else if (pixelsPerSecond >= 10) {
    interval = 10;
  } else if (pixelsPerSecond >= 4) {
    interval = 30;
  } else if (pixelsPerSecond >= 1) {
    interval = 60;
  } else {
    interval = 120;
  }

  const ticks: { time: number; px: number; major: boolean }[] = [];
  for (let t = 0; t <= duration; t += interval) {
    ticks.push({
      time: t,
      px: t * pixelsPerSecond,
      major: t % (interval * 2) === 0 || interval >= 60,
    });
  }

  return ticks;
}
