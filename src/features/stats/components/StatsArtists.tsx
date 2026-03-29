"use client";

import { useState, useMemo } from "react";
import { useArtistStats } from "../hooks/useStatsData";

type SortField = "name" | "songCount" | "medleyAppearances";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <span className="ml-1 inline-block">
      {active ? (order === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function StatsArtists() {
  const { data: artists, isLoading } = useArtistStats();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("medleyAppearances");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!artists) return [];
    let result = artists.filter((a) => a.songCount > 0);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [artists, search, sortField, sortOrder]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    artist: "アーティスト",
    composer: "作曲",
    arranger: "編曲",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="アーティスト名で検索..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500 ml-4 whitespace-nowrap">
          {filtered.length}件
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {(
                [
                  ["name", "名前"],
                  ["songCount", "楽曲数"],
                  ["medleyAppearances", "メドレー出現"],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort(field)}
                >
                  {label}
                  <SortIcon active={sortField === field} order={sortOrder} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                ロール
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((artist) => (
              <tr
                key={artist.artistId}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {artist.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {artist.songCount}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {artist.medleyAppearances}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {artist.roles.map((r) => (
                      <span
                        key={r.role}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                      >
                        {roleLabel[r.role] ?? r.role}: {r.count}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {paged.map((artist) => (
          <div
            key={artist.artistId}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="font-medium text-gray-900 mb-2">{artist.name}</div>
            <div className="flex items-center space-x-3 text-sm mb-2">
              <span className="text-gray-500">{artist.songCount}曲</span>
              <span className="text-gray-500">
                {artist.medleyAppearances}メドレー
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {artist.roles.map((r) => (
                <span
                  key={r.role}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                >
                  {roleLabel[r.role] ?? r.role}: {r.count}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            前へ
          </button>
          <span className="text-sm text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
