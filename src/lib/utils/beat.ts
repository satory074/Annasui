/**
 * Beat <-> Seconds conversion utilities for BPM-based time input.
 *
 * Beats are 1-indexed: beat 1 starts at `offset` seconds.
 * Seconds = (beat - 1) * (60 / bpm) + offset
 */

/** Convert 1-indexed beat number to seconds */
export function beatToSeconds(beat: number, bpm: number, offset: number): number {
  return (beat - 1) * (60 / bpm) + offset;
}

/** Convert seconds to 1-indexed beat number (rounded to nearest integer) */
export function secondsToBeat(seconds: number, bpm: number, offset: number): number {
  return Math.round((seconds - offset) / (60 / bpm)) + 1;
}

/** Check if a BPM value is set and valid */
export function hasBpm(bpm?: number | null): bpm is number {
  return typeof bpm === "number" && bpm > 0;
}

/**
 * Snap seconds to the nearest 16th note boundary (1/4 beat).
 * Returns a value >= 0.
 */
export function snapToSixteenth(seconds: number, bpm: number, offset: number): number {
  const sixteenthDuration = (60 / bpm) / 4;
  const nearestSixteenth =
    Math.round((seconds - offset) / sixteenthDuration) * sixteenthDuration;
  return Math.max(0, nearestSixteenth + offset);
}
