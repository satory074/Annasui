"use client";

import { useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import StatsOverview from "@/features/stats/components/StatsOverview";
import StatsSongs from "@/features/stats/components/StatsSongs";
import StatsArtists from "@/features/stats/components/StatsArtists";
import StatsMedleys from "@/features/stats/components/StatsMedleys";
import StatsExplorer from "@/features/stats/components/StatsExplorer";

type TabType = "overview" | "songs" | "artists" | "medleys" | "explorer";

const TABS: { key: TabType; label: string }[] = [
  { key: "overview", label: "概要" },
  { key: "songs", label: "楽曲" },
  { key: "artists", label: "アーティスト" },
  { key: "medleys", label: "メドレー" },
  { key: "explorer", label: "探索" },
];

export default function StatsPageClient() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-[var(--background)] pt-[var(--header-height)]">
        <div className="max-w-[var(--content-max-w-wide)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              統計・分析
            </h1>
            <p className="text-gray-600">
              Medleanに登録されたメドレーと楽曲の統計情報
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && <StatsOverview />}
          {activeTab === "songs" && <StatsSongs />}
          {activeTab === "artists" && <StatsArtists />}
          {activeTab === "medleys" && <StatsMedleys />}
          {activeTab === "explorer" && <StatsExplorer />}
        </div>
      </div>
    </>
  );
}
