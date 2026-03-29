"use client";

import { useState } from "react";
import { useAllRawData } from "../hooks/useStatsData";
import CrossTabBuilder from "./explorer/CrossTabBuilder";
import QueryBuilder from "./explorer/QueryBuilder";

type ExplorerMode = "crosstab" | "query";

export default function StatsExplorer() {
  const { data: rawData, isLoading } = useAllRawData();
  const [mode, setMode] = useState<ExplorerMode>("crosstab");

  if (isLoading || !rawData) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Switch */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("crosstab")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === "crosstab"
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
              : "text-gray-600 hover:bg-gray-100 border border-transparent"
          }`}
        >
          クロス集計ビルダー
        </button>
        <button
          onClick={() => setMode("query")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === "query"
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
              : "text-gray-600 hover:bg-gray-100 border border-transparent"
          }`}
        >
          クエリビルダー
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {mode === "crosstab"
          ? "X軸・Y軸・フィルタを自由に組み合わせてチャートを生成できます。"
          : "テーブルと条件を指定してデータを自由に検索・絞り込みできます。"}
      </p>

      {/* Content */}
      {mode === "crosstab" ? (
        <CrossTabBuilder rawData={rawData} />
      ) : (
        <QueryBuilder rawData={rawData} />
      )}
    </div>
  );
}
