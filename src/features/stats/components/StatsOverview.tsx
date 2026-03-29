"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useStatsOverview,
  useSongCoOccurrence,
  useArtistCoOccurrence,
  useSongPositionData,
  useMedleyDiversity,
} from "../hooks/useStatsData";
import PlatformPieChart from "./charts/PlatformPieChart";
import GrowthLineChart from "./charts/GrowthLineChart";
import TopSongsBarChart from "./charts/TopSongsBarChart";
import CoOccurrenceChart from "./charts/CoOccurrenceChart";
import PositionHeatmap from "./charts/PositionHeatmap";
import Link from "next/link";

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  );
}

export default function StatsOverview() {
  const { data: overview, isLoading } = useStatsOverview();
  const { data: coOccurrence } = useSongCoOccurrence();
  const { data: artistPairs } = useArtistCoOccurrence();
  const { data: positionData } = useSongPositionData();
  const { data: diversity } = useMedleyDiversity();

  if (isLoading || !overview) return <LoadingSkeleton />;

  const heroCards = [
    { label: "メドレー", value: overview.totalMedleys, icon: "🎵" },
    { label: "楽曲", value: overview.totalSongs, icon: "🎶" },
    { label: "アーティスト", value: overview.totalArtists, icon: "🎤" },
    { label: "コントリビューター", value: overview.totalContributors, icon: "👥" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {heroCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-1">{card.label}</div>
              <div className="text-3xl font-bold text-gray-900">
                {card.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform + Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">プラットフォーム分布</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformPieChart data={overview.platformCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">登録数の推移（累計）</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthLineChart data={overview.growthData} />
          </CardContent>
        </Card>
      </div>

      {/* Top Songs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">使用頻度トップ10</CardTitle>
        </CardHeader>
        <CardContent>
          <TopSongsBarChart data={overview.topSongs} />
        </CardContent>
      </Card>

      {/* Insights Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">分析インサイト</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Song Co-occurrence */}
          {coOccurrence && coOccurrence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">よく一緒に使われる曲ペア</CardTitle>
              </CardHeader>
              <CardContent>
                <CoOccurrenceChart data={coOccurrence} />
              </CardContent>
            </Card>
          )}

          {/* Song Position Tendency */}
          {positionData && positionData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">曲の配置傾向</CardTitle>
                <p className="text-sm text-gray-500">
                  人気曲がメドレーの序盤・中盤・終盤のどこに配置されやすいか
                </p>
              </CardHeader>
              <CardContent>
                <PositionHeatmap data={positionData} />
              </CardContent>
            </Card>
          )}

          {/* Artist Co-occurrence */}
          {artistPairs && artistPairs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">アーティスト共演マップ</CardTitle>
                <p className="text-sm text-gray-500">
                  同じメドレーに楽曲が使われているアーティストのペア
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {artistPairs.slice(0, 10).map((pair, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{pair.artistA}</span>
                        <span className="mx-2 text-gray-400">×</span>
                        <span className="font-medium">{pair.artistB}</span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {pair.sharedMedleys}メドレー
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medley Diversity */}
          {diversity && diversity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">メドレー多様性ランキング</CardTitle>
                <p className="text-sm text-gray-500">
                  アーティストの多様性が高い／低いメドレー
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      最も多様（多くのアーティスト）
                    </h4>
                    {diversity.slice(0, 5).map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <Link
                          href={`/${d.platform}/${d.videoId}/`}
                          className="text-indigo-600 hover:underline truncate max-w-[60%]"
                        >
                          {d.medleyTitle}
                        </Link>
                        <span className="text-gray-500">
                          {d.uniqueArtists}組 / {d.totalSongs}曲
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      最も集中（少数のアーティスト）
                    </h4>
                    {[...diversity]
                      .reverse()
                      .slice(0, 5)
                      .map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1.5 text-sm"
                        >
                          <Link
                            href={`/${d.platform}/${d.videoId}/`}
                            className="text-indigo-600 hover:underline truncate max-w-[60%]"
                          >
                            {d.medleyTitle}
                          </Link>
                          <span className="text-gray-500">
                            {d.uniqueArtists}組 / {d.totalSongs}曲
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
