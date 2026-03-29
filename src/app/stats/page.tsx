import StatsPageClient from "@/components/pages/StatsPageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "統計・分析 | Medlean",
  description: "Medleanに登録されたメドレーと楽曲の統計情報",
};

export default function StatsPage() {
  return <StatsPageClient />;
}
