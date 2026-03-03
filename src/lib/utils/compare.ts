/**
 * Efficient deep equality comparison utilities
 * These functions are optimized for early bail-out when differences are found,
 * unlike JSON.stringify which must serialize the entire structure
 */

import { SongSection } from '@/types';

/**
 * Shallow comparison of two SongSection objects
 * Checks all relevant fields for equality
 */
function areSongsEqual(a: SongSection, b: SongSection): boolean {
  // Quick reference check
  if (a === b) return true;
  if (!a || !b) return false;

  // Compare primitive fields first (fast)
  if (
    a.id !== b.id ||
    a.title !== b.title ||
    a.startTime !== b.startTime ||
    a.endTime !== b.endTime ||
    a.color !== b.color ||
    a.niconicoLink !== b.niconicoLink ||
    a.youtubeLink !== b.youtubeLink ||
    a.spotifyLink !== b.spotifyLink ||
    a.applemusicLink !== b.applemusicLink ||
    a.songId !== b.songId
  ) {
    return false;
  }

  // Compare artist arrays
  if (a.artist.length !== b.artist.length) return false;
  for (let i = 0; i < a.artist.length; i++) {
    if (a.artist[i] !== b.artist[i]) return false;
  }

  // Compare optional composer arrays
  if (a.composers?.length !== b.composers?.length) return false;
  if (a.composers && b.composers) {
    for (let i = 0; i < a.composers.length; i++) {
      if (a.composers[i] !== b.composers[i]) return false;
    }
  }

  // Compare optional arranger arrays
  if (a.arrangers?.length !== b.arrangers?.length) return false;
  if (a.arrangers && b.arrangers) {
    for (let i = 0; i < a.arrangers.length; i++) {
      if (a.arrangers[i] !== b.arrangers[i]) return false;
    }
  }

  return true;
}

/**
 * Efficient comparison of two SongSection arrays
 * Returns true if arrays are equal, false otherwise
 *
 * Optimizations:
 * - Early bail-out on length mismatch
 * - Early bail-out on first difference found
 * - No string serialization overhead
 */
export function areSongArraysEqual(
  a: SongSection[],
  b: SongSection[]
): boolean {
  // Reference equality check
  if (a === b) return true;

  // Length check (fast bail-out)
  if (a.length !== b.length) return false;

  // Empty array check
  if (a.length === 0) return true;

  // Compare each song - bail out on first difference
  for (let i = 0; i < a.length; i++) {
    if (!areSongsEqual(a[i], b[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a songs array has changed compared to a reference
 * Returns true if there are changes, false if identical
 */
export function hasSongsChanged(
  current: SongSection[],
  original: SongSection[]
): boolean {
  return !areSongArraysEqual(current, original);
}
