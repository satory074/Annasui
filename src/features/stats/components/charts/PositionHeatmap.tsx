"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PositionData } from "@/features/stats/types";

const ZONE_COLORS = {
  序盤: "#f97316", // orange
  中盤: "#6366f1", // indigo
  終盤: "#10b981", // mint/emerald
};

interface Props {
  data: PositionData[];
}

export default function PositionHeatmap({ data }: Props) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.title.length > 18 ? d.title.slice(0, 18) + "…" : d.title,
    fullName: d.title,
    序盤: d.positions.find((p) => p.zone === "序盤")?.count ?? 0,
    中盤: d.positions.find((p) => p.zone === "中盤")?.count ?? 0,
    終盤: d.positions.find((p) => p.zone === "終盤")?.count ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
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
          labelFormatter={(label, payload) => {
            if (payload?.[0]?.payload?.fullName) {
              return payload[0].payload.fullName;
            }
            return label;
          }}
        />
        <Legend />
        <Bar dataKey="序盤" stackId="a" fill={ZONE_COLORS["序盤"]} />
        <Bar dataKey="中盤" stackId="a" fill={ZONE_COLORS["中盤"]} />
        <Bar dataKey="終盤" stackId="a" fill={ZONE_COLORS["終盤"]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
