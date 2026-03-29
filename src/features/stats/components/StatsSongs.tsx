"use client";

import { useState, useMemo } from "react";
import { useSongStats } from "../hooks/useStatsData";
import type { SongStatsRow } from "../types";

type SortField = "title" | "artist" | "usageCount" | "avgDuration";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <span className="ml-1 inline-block">
      {active ? (order === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function StatsSongs() {
  const { data: songs, isLoading } = useSongStats();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("usageCount");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!songs) return [];
    let result = songs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
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
  }, [songs, search, sortField, sortOrder]);

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

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="楽曲名・アーティスト名で検索..."
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
                  ["title", "タイトル"],
                  ["artist", "アーティスト"],
                  ["usageCount", "使用回数"],
                  ["avgDuration", "平均尺"],
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
                プラットフォーム
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((song) => (
              <SongRow key={song.songId} song={song} formatDuration={formatDuration} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {paged.map((song) => (
          <div
            key={song.songId}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="font-medium text-gray-900 mb-1">{song.title}</div>
            <div className="text-sm text-gray-500 mb-2">{song.artist}</div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {song.usageCount}回使用
              </span>
              <span className="text-gray-500">
                平均 {formatDuration(song.avgDuration)}
              </span>
            </div>
            {song.platforms.length > 0 && (
              <div className="flex gap-1 mt-2">
                {song.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

function SongRow({
  song,
  formatDuration,
}: {
  song: SongStatsRow;
  formatDuration: (s: number) => string;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
        {song.title}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">
        {song.artist}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
        {song.usageCount}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDuration(song.avgDuration)}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {song.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    niconico: "ニコ",
    youtube: "YT",
    spotify: "Sp",
    applemusic: "AM",
  };
  const colors: Record<string, string> = {
    niconico: "bg-gray-100 text-gray-700",
    youtube: "bg-red-50 text-red-700",
    spotify: "bg-green-50 text-green-700",
    applemusic: "bg-pink-50 text-pink-700",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[platform] ?? "bg-gray-100 text-gray-700"}`}
    >
      {labels[platform] ?? platform}
    </span>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
      >
        前へ
      </button>
      <span className="text-sm text-gray-500">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
      >
        次へ
      </button>
    </div>
  );
}
