"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Props {
  data: { month: string; medleys: number; songs: number }[];
}

export default function GrowthLineChart({ data }: Props) {
  // Cumulative data
  let cumulativeMedleys = 0;
  let cumulativeSongs = 0;
  const cumulativeData = data.map((d) => {
    cumulativeMedleys += d.medleys;
    cumulativeSongs += d.songs;
    return {
      month: d.month,
      メドレー: cumulativeMedleys,
      楽曲: cumulativeSongs,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={cumulativeData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => {
            const parts = v.split("-");
            return `${parts[1]}月`;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="メドレー"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="楽曲"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
