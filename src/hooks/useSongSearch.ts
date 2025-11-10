import { useMemo } from "react";
import { searchSongs, SongDatabaseEntry, SearchResult } from "@/lib/utils/songDatabase";

interface UseSongSearchOptions {
  songDatabase: SongDatabaseEntry[];
  searchTerm: string;
  currentPage: number;
  itemsPerPage?: number;
}

interface UseSongSearchResult {
  searchResults: SearchResult[];
  totalPages: number;
  paginatedResults: SearchResult[];
  resultsByMatchType: {
    exact: SearchResult[];
    startsWith: SearchResult[];
    wordMatch: SearchResult[];
    partialMatch: SearchResult[];
    fuzzyMatch: SearchResult[];
  };
}

/**
 * Song database search hook with pagination and match type classification
 *
 * @param options - Search configuration
 * @param options.songDatabase - Array of song database entries to search
 * @param options.searchTerm - Search query string
 * @param options.currentPage - Current page number (1-indexed)
 * @param options.itemsPerPage - Number of items per page (default: 10)
 *
 * @returns Search results with pagination and match type classification
 */
export function useSongSearch({
  songDatabase,
  searchTerm,
  currentPage,
  itemsPerPage = 10
}: UseSongSearchOptions): UseSongSearchResult {
  return useMemo(() => {
    const results = searchSongs(songDatabase, searchTerm);
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResults = results.slice(startIndex, startIndex + itemsPerPage);

    // Classify results by match type
    const resultsByMatchType = {
      exact: results.filter(r => r.matchType === 'exact'),
      startsWith: results.filter(r => r.matchType === 'startsWith'),
      wordMatch: results.filter(r => r.matchType === 'wordMatch'),
      partialMatch: results.filter(r => r.matchType === 'partialMatch'),
      fuzzyMatch: results.filter(r => r.matchType === 'fuzzyMatch')
    };

    return {
      searchResults: results,
      totalPages,
      paginatedResults,
      resultsByMatchType
    };
  }, [songDatabase, searchTerm, currentPage, itemsPerPage]);
}
