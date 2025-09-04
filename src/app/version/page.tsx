import { Metadata } from "next";
import VersionPage from "@/components/pages/VersionPage";

export const metadata: Metadata = {
  title: "バージョン情報 - Medlean",
  description: "Medleanのバージョン情報と変更履歴を確認できます。現在のバージョン、新機能、修正内容などの詳細情報をご覧いただけます。",
  keywords: ["バージョン", "更新情報", "変更履歴", "リリースノート", "Medlean"],
};

export default function Page() {
  return <VersionPage />;
}