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
import type { CoOccurrencePair } from "@/features/stats/types";

interface Props {
  data: CoOccurrencePair[];
}

export default function CoOccurrenceChart({ data }: Props) {
  const chartData = data.slice(0, 10).map((d) => {
    const labelA = d.songA.length > 12 ? d.songA.slice(0, 12) + "…" : d.songA;
    const labelB = d.songB.length > 12 ? d.songB.slice(0, 12) + "…" : d.songB;
    return {
      name: `${labelA} × ${labelB}`,
      fullName: `${d.songA} × ${d.songB}`,
      共起回数: d.count,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={240}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          formatter={(value) => [`${value}回`, "共起回数"]}
          labelFormatter={(label, payload) => {
            if (payload?.[0]?.payload?.fullName) {
              return payload[0].payload.fullName;
            }
            return label;
          }}
        />
        <Bar dataKey="共起回数" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
