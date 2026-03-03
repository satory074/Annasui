"use client";

import { useState, useMemo, useCallback } from "react";
import { searchSongs, type SearchResult } from "../utils/search";

interface Searchable {
  title: string;
  artist?: string | string[] | null;
}

interface UseSongSearchOptions {
  pageSize?: number;
}

export function useSongSearch<T extends Searchable>(
  items: T[],
  options: UseSongSearchOptions = {}
) {
  const { pageSize = 20 } = options;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<"title" | "artist" | "updatedAt">(
    "title"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const results: SearchResult<T>[] = useMemo(() => {
    return searchSongs(items, query);
  }, [items, query]);

  const sorted = useMemo(() => {
    if (query) return results; // When searching, use search score ordering

    return [...results].sort((a, b) => {
      const aVal = String(
        (a.item as Record<string, unknown>)[sortKey] ?? ""
      ).toLowerCase();
      const bVal = String(
        (b.item as Record<string, unknown>)[sortKey] ?? ""
      ).toLowerCase();
      const cmp = aVal.localeCompare(bVal, "ja");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, sortKey, sortDir, query]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(() => {
    const start = clampedPage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, clampedPage, pageSize]);

  const toggleSort = useCallback(
    (key: "title" | "artist" | "updatedAt") => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortKey]
  );

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setPage(0);
  }, []);

  return {
    query,
    setQuery: handleSearch,
    results: pageItems,
    totalResults: sorted.length,
    page: clampedPage,
    totalPages,
    setPage,
    sortKey,
    sortDir,
    toggleSort,
  };
}
