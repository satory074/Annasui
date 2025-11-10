import LibraryPageClient from "@/components/pages/LibraryPageClient";
import { logger } from "@/lib/utils/logger";
import { Metadata } from "next";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "楽曲ライブラリ | Medlean",
  description: "登録されている楽曲の一覧を表示・編集できます。",
};

export default function LibraryPage() {
  logger.info('📚 Library page: Rendering library page');

  return <LibraryPageClient />;
}
