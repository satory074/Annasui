"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Props {
  data: { title: string; usageCount: number }[];
}

export default function TopSongsBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.title.length > 20 ? d.title.slice(0, 20) + "…" : d.title,
    fullName: d.title,
    使用回数: d.usageCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) => [`${value}回`, "使用回数"]}
          labelFormatter={(label, payload) => {
            if (payload?.[0]?.payload?.fullName) {
              return payload[0].payload.fullName;
            }
            return label;
          }}
        />
        <Bar dataKey="使用回数" fill="#f97316" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
