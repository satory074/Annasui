// 楽曲セクションのデータモデル
export type SongSection = {
  id: number;
  title: string;        // 曲名
  artist: string;       // アーティスト名
  startTime: number;    // 開始時間（秒）
  endTime: number;      // 終了時間（秒）
  color: string;        // 表示色（CSS color code）
  genre?: string;       // ジャンル（オプション）
  originalLink?: string; // 原曲へのリンク（オプション）
};

// メドレー情報全体のデータモデル
export type MedleyData = {
  videoId: string;      // 動画ID
  title: string;        // メドレータイトル
  creator?: string;     // 制作者
  duration: number;     // 総再生時間（秒）
  songs: SongSection[]; // 楽曲セクション配列
  platform?: 'niconico' | 'youtube'; // プラットフォーム（オプション、デフォルトは'niconico'）
};