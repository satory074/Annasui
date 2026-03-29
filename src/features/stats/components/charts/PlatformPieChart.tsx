"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const PLATFORM_COLORS: Record<string, string> = {
  niconico: "#374151",  // gray-700
  youtube: "#dc2626",   // red-600
};

interface Props {
  data: { platform: string; count: number }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  niconico: "ニコニコ",
  youtube: "YouTube",
};

export default function PlatformPieChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: PLATFORM_LABELS[d.platform] ?? d.platform,
    value: d.count,
    platform: d.platform,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={PLATFORM_COLORS[entry.platform] ?? "#6366f1"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value}件`, ""]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
