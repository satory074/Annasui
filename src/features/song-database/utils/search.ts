/**
 * Multi-tier song search with scoring.
 * Tiers: exact → startsWith → wordMatch → partialMatch → fuzzyMatch
 */

import { normalizeSongInfo, similarity } from "./normalize";

export type MatchType =
  | "exact"
  | "startsWith"
  | "wordMatch"
  | "partialMatch"
  | "fuzzyMatch";

export interface SearchResult<T> {
  item: T;
  score: number;
  matchType: MatchType;
}

interface Searchable {
  title: string;
  artist?: string | string[] | null;
}

function toArtistString(artist: string | string[] | null | undefined): string {
  if (!artist) return "";
  return Array.isArray(artist) ? artist.join(", ") : artist;
}

/**
 * Search a list of items by title/artist.
 * Returns results sorted by score (highest first).
 */
export function searchSongs<T extends Searchable>(
  items: T[],
  query: string
): SearchResult<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.map((item) => ({ item, score: 0, matchType: "exact" as MatchType }));

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();
    const artist = toArtistString(item.artist).toLowerCase();
    const combined = `${title} ${artist}`;
    const normalizedItem = normalizeSongInfo(item.title, toArtistString(item.artist));
    const normalizedQuery = normalizeSongInfo(q, "");

    let score = 0;
    let matchType: MatchType | null = null;

    // Tier 1: Exact match on title or artist
    if (title === q || artist === q) {
      score = 100;
      matchType = "exact";
    }
    // Tier 2: Starts with query
    else if (title.startsWith(q) || artist.startsWith(q)) {
      score = 80;
      matchType = "startsWith";
    }
    // Tier 3: Word-level match (query appears as a whole word)
    else if (
      combined.split(/\s+/).some((word) => word === q) ||
      new RegExp(`\\b${escapeRegex(q)}\\b`).test(combined)
    ) {
      score = 60;
      matchType = "wordMatch";
    }
    // Tier 4: Partial match (substring)
    else if (combined.includes(q)) {
      score = 40;
      matchType = "partialMatch";
    }
    // Tier 5: Fuzzy match on normalized key
    else {
      const queryKey = normalizedQuery.split("_")[0]; // title part only
      const itemKey = normalizedItem.split("_")[0];
      const sim = similarity(queryKey, itemKey);

      if (sim > 0.6) {
        score = Math.round(sim * 30);
        matchType = "fuzzyMatch";
      }
    }

    if (matchType) {
      results.push({ item, score, matchType });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
