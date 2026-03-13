"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getSongDatabase, type SongDatabaseEntry } from "@/lib/utils/songDatabase";
import { searchSongs } from "../utils/search";
import type { ParsedSetlistEntry } from "@/features/medley/import/types";

export interface AutoMatchResult {
  entry: ParsedSetlistEntry;
  bestMatch: SongDatabaseEntry | null;
  score: number;
}

/**
 * Loads the song database lazily and computes best-match for each parsed entry.
 * Score thresholds:
 *   >= 80 → green (auto-confirm candidate)
 *   40-79 → yellow (needs review)
 *   < 40  → gray (no match)
 */
export function useAutoMatcher(entries: ParsedSetlistEntry[]) {
  const [database, setDatabase] = useState<SongDatabaseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dbLoadedRef = useRef(false);

  useEffect(() => {
    if (entries.length === 0 || dbLoadedRef.current) return;
    dbLoadedRef.current = true;
    setIsLoading(true);
    getSongDatabase()
      .then(setDatabase)
      .catch(() => {
        // Silently fail — matching will be unavailable
      })
      .finally(() => setIsLoading(false));
  }, [entries.length]);

  const results = useMemo<AutoMatchResult[]>(() => {
    if (database.length === 0) {
      return entries.map((entry) => ({
        entry,
        bestMatch: null,
        score: 0,
      }));
    }

    // Adapt SongDatabaseEntry for searchSongs (artist: {id,name}[] → string[])
    const adapted = database.map((e) => ({
      ...e,
      artist: e.artist.map((a) => a.name),
    }));

    return entries.map((entry) => {
      const searchResults = searchSongs(adapted, entry.title);
      const best = searchResults[0];
      const bestMatch = best
        ? (database.find((e) => e.id === best.item.id) ?? null)
        : null;
      return {
        entry,
        bestMatch,
        score: best?.score ?? 0,
      };
    });
  }, [entries, database]);

  return { results, isLoading };
}
