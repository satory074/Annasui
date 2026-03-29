"use client";

import { useState, useMemo } from "react";
import type {
  QueryTable,
  QueryFilter,
  QueryOperator,
  RawStatsData,
} from "../../types";
import { OPERATOR_LABELS, TABLE_COLUMNS } from "../../types";

interface Props {
  rawData: RawStatsData;
}

const TABLE_LABELS: Record<QueryTable, string> = {
  medley_songs: "メドレー楽曲",
  song_master: "楽曲マスター",
  medleys: "メドレー",
  artists: "アーティスト",
};

export default function QueryBuilder({ rawData }: Props) {
  const [table, setTable] = useState<QueryTable>("medley_songs");
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(TABLE_COLUMNS.medley_songs.map((c) => c.value))
  );
  const [executed, setExecuted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;
  const columns = TABLE_COLUMNS[table];

  // Get raw rows for selected table
  const tableData = useMemo((): Record<string, unknown>[] => {
    switch (table) {
      case "medley_songs":
        return rawData.medleySongs;
      case "song_master":
        return rawData.songMaster;
      case "medleys":
        return rawData.medleys;
      case "artists":
        return rawData.artists;
    }
  }, [rawData, table]);

  // Apply filters
  const results = useMemo(() => {
    if (!executed) return [];
    let data = tableData;
    for (const filter of filters) {
      data = data.filter((row) => {
        const val = row[filter.field];
        const strVal = val == null ? "" : String(val);
        switch (filter.operator) {
          case "equals":
            return strVal === filter.value;
          case "not_equals":
            return strVal !== filter.value;
          case "contains":
            return strVal.toLowerCase().includes(filter.value.toLowerCase());
          case "gte":
            return Number(strVal) >= Number(filter.value);
          case "lte":
            return Number(strVal) <= Number(filter.value);
          case "is_null":
            return val == null || strVal === "";
          case "is_not_null":
            return val != null && strVal !== "";
          default:
            return true;
        }
      });
    }
    return data;
  }, [tableData, filters, executed]);

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const paged = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { field: columns[0]?.value ?? "", operator: "contains", value: "" },
    ]);
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFilter(index: number, partial: Partial<QueryFilter>) {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...partial } : f))
    );
  }

  function toggleColumn(col: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  }

  function handleTableChange(t: QueryTable) {
    setTable(t);
    setFilters([]);
    setVisibleColumns(new Set(TABLE_COLUMNS[t].map((c) => c.value)));
    setExecuted(false);
    setCurrentPage(1);
  }

  const visibleCols = columns.filter((c) => visibleColumns.has(c.value));

  return (
    <div className="space-y-6">
      {/* Query Config */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Table selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            テーブル選択
          </label>
          <select
            value={table}
            onChange={(e) => handleTableChange(e.target.value as QueryTable)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {(Object.keys(TABLE_LABELS) as QueryTable[]).map((t) => (
              <option key={t} value={t}>
                {TABLE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">条件</span>
            <button
              onClick={addFilter}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            >
              + 条件を追加
            </button>
          </div>
          {filters.length === 0 && (
            <p className="text-sm text-gray-400">条件なし（全件表示）</p>
          )}
          {filters.map((filter, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(i, { field: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
              >
                {columns.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.operator}
                onChange={(e) =>
                  updateFilter(i, {
                    operator: e.target.value as QueryOperator,
                  })
                }
                className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
              >
                {(Object.keys(OPERATOR_LABELS) as QueryOperator[]).map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
              {filter.operator !== "is_null" &&
                filter.operator !== "is_not_null" && (
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 w-40"
                    placeholder="値"
                  />
                )}
              <button
                onClick={() => removeFilter(i)}
                className="px-2 py-1 text-red-500 hover:text-red-700 text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Column selection */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            表示する列
          </span>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <label
                key={col.value}
                className="flex items-center gap-1 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col.value)}
                  onChange={() => toggleColumn(col.value)}
                  className="rounded border-gray-300"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        {/* Execute */}
        <button
          onClick={() => {
            setExecuted(true);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          検索実行
        </button>
      </div>

      {/* Results */}
      {executed && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-3">
            結果: {results.length}件
          </div>

          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              該当するデータがありません
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {visibleCols.map((col) => (
                        <th
                          key={col.value}
                          className="px-3 py-2 text-left text-gray-500 font-medium"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        {visibleCols.map((col) => (
                          <td
                            key={col.value}
                            className="px-3 py-1.5 text-gray-900 max-w-[200px] truncate"
                          >
                            {formatCellValue(row[col.value])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <button
                    onClick={() =>
                      setCurrentPage(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-500">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatCellValue(val: unknown): string {
  if (val == null) return "—";
  if (typeof val === "number") {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toFixed(1);
  }
  return String(val);
}
