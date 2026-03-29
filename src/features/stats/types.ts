// =============================================================================
// Stats Feature Types
// =============================================================================

import type { Database } from "@/lib/supabase";

// Raw row types from Supabase
export type MedleyRow = Database["public"]["Tables"]["medleys"]["Row"];
export type MedleySongRow = Database["public"]["Tables"]["medley_songs"]["Row"];
export type SongMasterRow = Database["public"]["Tables"]["song_master"]["Row"];
export type ArtistRow = Database["public"]["Tables"]["artists"]["Row"];
export type SongArtistRelationRow = Database["public"]["Tables"]["song_artist_relations"]["Row"];
export type MedleyEditRow = Database["public"]["Tables"]["medley_edits"]["Row"];

// =============================================================================
// Overview Tab
// =============================================================================

export interface StatsOverviewData {
  totalMedleys: number;
  totalSongs: number;
  totalSongSections: number;
  totalArtists: number;
  totalContributors: number;
  platformCounts: { platform: string; count: number }[];
  growthData: { month: string; medleys: number; songs: number }[];
  topSongs: { title: string; artist: string; usageCount: number; songId: string }[];
}

// =============================================================================
// Song Stats Tab
// =============================================================================

export interface SongStatsRow {
  songId: string;
  title: string;
  artist: string;
  usageCount: number;
  avgDuration: number;
  platforms: string[];
}

// =============================================================================
// Artist Stats Tab
// =============================================================================

export interface ArtistStatsRow {
  artistId: string;
  name: string;
  songCount: number;
  medleyAppearances: number;
  roles: { role: string; count: number }[];
}

// =============================================================================
// Medley Stats Tab
// =============================================================================

export interface MedleyStatsRow {
  medleyId: string;
  videoId: string;
  title: string;
  platform: string;
  creator: string;
  songCount: number;
  duration: number;
  editCount: number;
  createdAt: string;
}

// =============================================================================
// Insights
// =============================================================================

export interface CoOccurrencePair {
  songA: string;
  songB: string;
  count: number;
}

export interface ArtistPair {
  artistA: string;
  artistB: string;
  sharedMedleys: number;
}

export interface PositionData {
  title: string;
  positions: { zone: "序盤" | "中盤" | "終盤"; count: number }[];
}

export interface DiversityScore {
  medleyTitle: string;
  videoId: string;
  platform: string;
  uniqueArtists: number;
  totalSongs: number;
  score: number;
}

// =============================================================================
// Explorer Tab
// =============================================================================

export type DataSource = "songs" | "artists" | "medleys";
export type ChartType = "bar" | "line" | "scatter" | "pie";

export interface DimensionOption {
  value: string;
  label: string;
  type: "categorical" | "numeric" | "temporal";
}

export const DIMENSION_OPTIONS: Record<DataSource, DimensionOption[]> = {
  songs: [
    { value: "artist", label: "アーティスト", type: "categorical" },
    { value: "usageCount", label: "使用回数", type: "numeric" },
    { value: "avgDuration", label: "平均尺", type: "numeric" },
    { value: "platform", label: "プラットフォーム", type: "categorical" },
    { value: "createdMonth", label: "登録月", type: "temporal" },
  ],
  artists: [
    { value: "songCount", label: "楽曲数", type: "numeric" },
    { value: "medleyAppearances", label: "メドレー出現回数", type: "numeric" },
    { value: "role", label: "ロール", type: "categorical" },
    { value: "createdMonth", label: "登録月", type: "temporal" },
  ],
  medleys: [
    { value: "platform", label: "プラットフォーム", type: "categorical" },
    { value: "songCount", label: "曲数", type: "numeric" },
    { value: "duration", label: "尺", type: "numeric" },
    { value: "creator", label: "作成者", type: "categorical" },
    { value: "editCount", label: "編集回数", type: "numeric" },
    { value: "createdMonth", label: "作成月", type: "temporal" },
  ],
};

export interface CrossTabConfig {
  dataSource: DataSource;
  xAxis: string;
  yAxis: string;
  chartType: ChartType;
  filters: QueryFilter[];
}

// =============================================================================
// Query Builder
// =============================================================================

export type QueryTable = "medley_songs" | "song_master" | "medleys" | "artists";

export type QueryOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "gte"
  | "lte"
  | "is_null"
  | "is_not_null";

export interface QueryFilter {
  field: string;
  operator: QueryOperator;
  value: string;
}

export const OPERATOR_LABELS: Record<QueryOperator, string> = {
  equals: "等しい",
  not_equals: "等しくない",
  contains: "含む",
  gte: "以上",
  lte: "以下",
  is_null: "空である",
  is_not_null: "空でない",
};

export const TABLE_COLUMNS: Record<QueryTable, { value: string; label: string }[]> = {
  medley_songs: [
    { value: "title", label: "タイトル" },
    { value: "artist", label: "アーティスト" },
    { value: "start_time", label: "開始時間" },
    { value: "end_time", label: "終了時間" },
    { value: "order_index", label: "順番" },
    { value: "color", label: "カラー" },
    { value: "niconico_link", label: "ニコニコリンク" },
    { value: "youtube_link", label: "YouTubeリンク" },
    { value: "spotify_link", label: "Spotifyリンク" },
  ],
  song_master: [
    { value: "title", label: "タイトル" },
    { value: "artist", label: "アーティスト" },
    { value: "niconico_link", label: "ニコニコリンク" },
    { value: "youtube_link", label: "YouTubeリンク" },
    { value: "spotify_link", label: "Spotifyリンク" },
    { value: "applemusic_link", label: "Apple Musicリンク" },
    { value: "description", label: "説明" },
  ],
  medleys: [
    { value: "title", label: "タイトル" },
    { value: "platform", label: "プラットフォーム" },
    { value: "creator", label: "作成者" },
    { value: "duration", label: "尺" },
    { value: "video_id", label: "動画ID" },
  ],
  artists: [
    { value: "name", label: "名前" },
    { value: "normalized_name", label: "正規化名" },
  ],
};

// =============================================================================
// Raw data for explorer
// =============================================================================

export interface RawStatsData {
  medleys: MedleyRow[];
  medleySongs: MedleySongRow[];
  songMaster: SongMasterRow[];
  artists: ArtistRow[];
  songArtistRelations: SongArtistRelationRow[];
  medleyEdits: MedleyEditRow[];
}
