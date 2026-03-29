"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMedleyStats } from "../hooks/useStatsData";

type SortField =
  | "title"
  | "songCount"
  | "duration"
  | "editCount"
  | "createdAt";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <span className="ml-1 inline-block">
      {active ? (order === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function StatsMedleys() {
  const { data: medleys, isLoading } = useMedleyStats();
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("songCount");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!medleys) return [];
    let result = medleys;
    if (platformFilter !== "all") {
      result = result.filter((m) => m.platform === platformFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.creator.toLowerCase().includes(q)
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
  }, [medleys, search, platformFilter, sortField, sortOrder]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          placeholder="タイトル・作成者で検索..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:max-w-md px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <select
          value={platformFilter}
          onChange={(e) => {
            setPlatformFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">全プラットフォーム</option>
          <option value="niconico">ニコニコ</option>
          <option value="youtube">YouTube</option>
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">
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
                  ["songCount", "曲数"],
                  ["duration", "尺"],
                  ["editCount", "編集数"],
                  ["createdAt", "作成日"],
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
                PF
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                作成者
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((medley) => (
              <tr
                key={medley.medleyId}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm max-w-[250px] truncate">
                  <Link
                    href={`/${medley.platform}/${medley.videoId}/`}
                    className="text-indigo-600 hover:underline"
                  >
                    {medley.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {medley.songCount}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDuration(medley.duration)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {medley.editCount}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(medley.createdAt).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      medley.platform === "youtube"
                        ? "bg-red-50 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {medley.platform === "youtube" ? "YT" : "ニコ"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">
                  {medley.creator}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {paged.map((medley) => (
          <div
            key={medley.medleyId}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <Link
              href={`/${medley.platform}/${medley.videoId}/`}
              className="text-indigo-600 hover:underline font-medium"
            >
              {medley.title}
            </Link>
            <div className="flex items-center space-x-3 text-sm mt-2">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  medley.platform === "youtube"
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {medley.platform === "youtube" ? "YouTube" : "ニコニコ"}
              </span>
              <span className="text-gray-500">{medley.songCount}曲</span>
              <span className="text-gray-500">
                {formatDuration(medley.duration)}
              </span>
              <span className="text-gray-500">{medley.editCount}編集</span>
            </div>
            {medley.creator && (
              <div className="text-sm text-gray-500 mt-1">
                {medley.creator}
              </div>
            )}
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
