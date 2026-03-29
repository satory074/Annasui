"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  DataSource,
  ChartType,
  DimensionOption,
  QueryFilter,
  RawStatsData,
} from "../../types";
import { DIMENSION_OPTIONS } from "../../types";

const CHART_COLORS = [
  "#f97316", "#6366f1", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6", "#a855f7",
];

interface Props {
  rawData: RawStatsData;
}

export default function CrossTabBuilder({ rawData }: Props) {
  const [dataSource, setDataSource] = useState<DataSource>("songs");
  const [xAxis, setXAxis] = useState("artist");
  const [yAxis, setYAxis] = useState("usageCount");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [filters, setFilters] = useState<QueryFilter[]>([]);

  const dimensions = DIMENSION_OPTIONS[dataSource];

  // Get processed data based on dataSource
  const processedData = useMemo(() => {
    return processDataSource(rawData, dataSource);
  }, [rawData, dataSource]);

  // Apply filters
  const filteredData = useMemo(() => {
    let data = processedData;
    for (const filter of filters) {
      data = data.filter((row) => {
        const val = String(row[filter.field] ?? "");
        switch (filter.operator) {
          case "equals":
            return val === filter.value;
          case "not_equals":
            return val !== filter.value;
          case "contains":
            return val.toLowerCase().includes(filter.value.toLowerCase());
          case "gte":
            return Number(val) >= Number(filter.value);
          case "lte":
            return Number(val) <= Number(filter.value);
          default:
            return true;
        }
      });
    }
    return data;
  }, [processedData, filters]);

  // Aggregate data for chart
  const chartData = useMemo(() => {
    return aggregateForChart(filteredData, xAxis, yAxis, dimensions);
  }, [filteredData, xAxis, yAxis, dimensions]);

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { field: dimensions[0]?.value ?? "", operator: "contains", value: "" },
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

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              データソース
            </label>
            <select
              value={dataSource}
              onChange={(e) => {
                const ds = e.target.value as DataSource;
                setDataSource(ds);
                const opts = DIMENSION_OPTIONS[ds];
                setXAxis(opts[0]?.value ?? "");
                setYAxis(opts[1]?.value ?? opts[0]?.value ?? "");
                setFilters([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="songs">楽曲</option>
              <option value="artists">アーティスト</option>
              <option value="medleys">メドレー</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X軸
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {dimensions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y軸
            </label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {dimensions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              チャート種類
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="bar">棒グラフ</option>
              <option value="line">折れ線</option>
              <option value="scatter">散布図</option>
              <option value="pie">円グラフ</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">フィルタ</span>
            <button
              onClick={addFilter}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            >
              + 追加
            </button>
          </div>
          {filters.map((filter, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(i, { field: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
              >
                {dimensions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.operator}
                onChange={(e) =>
                  updateFilter(i, {
                    operator: e.target.value as QueryFilter["operator"],
                  })
                }
                className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
              >
                <option value="contains">含む</option>
                <option value="equals">等しい</option>
                <option value="not_equals">等しくない</option>
                <option value="gte">以上</option>
                <option value="lte">以下</option>
              </select>
              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 w-32"
                placeholder="値"
              />
              <button
                onClick={() => removeFilter(i)}
                className="px-2 py-1 text-red-500 hover:text-red-700 text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-sm text-gray-500 mb-2">
          {filteredData.length}件のデータ
        </div>
        {chartData.length > 0 ? (
          <DynamicChart
            data={chartData}
            chartType={chartType}
            xKey="name"
            yKey="value"
          />
        ) : (
          <div className="text-center py-12 text-gray-400">
            データがありません
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">元データ</h3>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-gray-500">名前</th>
                <th className="px-3 py-2 text-left text-gray-500">値</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-900">{row.name}</td>
                  <td className="px-3 py-1.5 text-gray-700">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Dynamic Chart Renderer
// =============================================================================

function DynamicChart({
  data,
  chartType,
  xKey,
  yKey,
}: {
  data: { name: string; value: number }[];
  chartType: ChartType;
  xKey: string;
  yKey: string;
}) {
  const displayData = data.slice(0, 30); // Limit for readability

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={Math.max(300, displayData.length * 28)}>
          <BarChart data={displayData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey={xKey}
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Bar dataKey={yKey} fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="#f97316"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} name="x" tick={{ fontSize: 11 }} />
            <YAxis dataKey={yKey} name="y" tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={displayData} fill="#f97316" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey={yKey}
              nameKey={xKey}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {displayData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
  }
}

// =============================================================================
// Data Processing
// =============================================================================

function processDataSource(
  raw: RawStatsData,
  source: DataSource
): Record<string, string | number>[] {
  switch (source) {
    case "songs": {
      // Group medley_songs by song_id or title
      const groups = new Map<
        string,
        { title: string; artist: string; usageCount: number; durations: number[]; platform: string; createdMonth: string }
      >();
      for (const ms of raw.medleySongs) {
        const key = ms.song_id ?? ms.title;
        const existing = groups.get(key);
        if (existing) {
          existing.usageCount++;
          existing.durations.push(ms.end_time - ms.start_time);
        } else {
          const medley = raw.medleys.find((m) => m.id === ms.medley_id);
          groups.set(key, {
            title: ms.title,
            artist: ms.artist,
            usageCount: 1,
            durations: [ms.end_time - ms.start_time],
            platform: medley?.platform ?? "",
            createdMonth: ms.created_at?.slice(0, 7) ?? "",
          });
        }
      }
      return Array.from(groups.values()).map((g) => ({
        title: g.title,
        artist: g.artist,
        usageCount: g.usageCount,
        avgDuration: Math.round(
          g.durations.reduce((a, b) => a + b, 0) / g.durations.length
        ),
        platform: g.platform,
        createdMonth: g.createdMonth,
      }));
    }
    case "artists": {
      const artistMap = new Map<string, string>();
      for (const a of raw.artists) artistMap.set(a.id, a.name);

      const artistData = new Map<
        string,
        { name: string; songCount: number; medleyAppearances: Set<string>; role: string; createdMonth: string }
      >();
      for (const rel of raw.songArtistRelations) {
        const name = artistMap.get(rel.artist_id) ?? "";
        const existing = artistData.get(rel.artist_id);
        if (existing) {
          existing.songCount++;
        } else {
          const artist = raw.artists.find((a) => a.id === rel.artist_id);
          artistData.set(rel.artist_id, {
            name,
            songCount: 1,
            medleyAppearances: new Set(),
            role: rel.role,
            createdMonth: artist?.created_at?.slice(0, 7) ?? "",
          });
        }
      }
      // Count medley appearances
      for (const ms of raw.medleySongs) {
        if (!ms.song_id) continue;
        for (const rel of raw.songArtistRelations) {
          if (rel.song_id === ms.song_id) {
            artistData.get(rel.artist_id)?.medleyAppearances.add(ms.medley_id);
          }
        }
      }
      return Array.from(artistData.values()).map((a) => ({
        name: a.name,
        songCount: a.songCount,
        medleyAppearances: a.medleyAppearances.size,
        role: a.role,
        createdMonth: a.createdMonth,
      }));
    }
    case "medleys": {
      const songCounts = new Map<string, number>();
      for (const ms of raw.medleySongs) {
        songCounts.set(ms.medley_id, (songCounts.get(ms.medley_id) ?? 0) + 1);
      }
      const editCounts = new Map<string, number>();
      for (const e of raw.medleyEdits) {
        if (e.medley_id)
          editCounts.set(e.medley_id, (editCounts.get(e.medley_id) ?? 0) + 1);
      }
      return raw.medleys.map((m) => ({
        title: m.title,
        platform: m.platform,
        songCount: songCounts.get(m.id) ?? 0,
        duration: m.duration,
        creator: m.creator ?? "",
        editCount: editCounts.get(m.id) ?? 0,
        createdMonth: m.created_at.slice(0, 7),
      }));
    }
  }
}

function aggregateForChart(
  data: Record<string, string | number>[],
  xAxis: string,
  yAxis: string,
  dimensions: DimensionOption[]
): { name: string; value: number }[] {
  const xDim = dimensions.find((d) => d.value === xAxis);
  const yDim = dimensions.find((d) => d.value === yAxis);

  if (!xDim || !yDim) return [];

  if (xDim.type === "categorical") {
    // Group by x, aggregate y
    const groups = new Map<string, number[]>();
    for (const row of data) {
      const key = String(row[xAxis] ?? "不明");
      const val = Number(row[yAxis] ?? 0);
      const arr = groups.get(key) ?? [];
      arr.push(val);
      groups.set(key, arr);
    }

    if (yDim.type === "categorical") {
      // Count unique values
      return Array.from(groups.entries())
        .map(([name, vals]) => ({ name, value: vals.length }))
        .sort((a, b) => b.value - a.value);
    }

    // Average numeric y
    return Array.from(groups.entries())
      .map(([name, vals]) => ({
        name,
        value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10,
      }))
      .sort((a, b) => b.value - a.value);
  }

  if (xDim.type === "temporal") {
    // Group by month
    const groups = new Map<string, number[]>();
    for (const row of data) {
      const key = String(row[xAxis] ?? "");
      const val = Number(row[yAxis] ?? 0);
      const arr = groups.get(key) ?? [];
      arr.push(val);
      groups.set(key, arr);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, vals]) => ({
        name,
        value: yDim.type === "categorical"
          ? vals.length
          : Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10,
      }));
  }

  // Both numeric → scatter-like (use raw values, limited)
  return data.slice(0, 100).map((row) => ({
    name: String(row[xAxis] ?? 0),
    value: Number(row[yAxis] ?? 0),
  }));
}
