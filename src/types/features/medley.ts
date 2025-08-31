// 楽曲セクションのデータモデル
export type SongSection = {
  id: number;
  title: string;        // 曲名
  artist: string;       // アーティスト名
  startTime: number;    // 開始時間（秒）
  endTime: number;      // 終了時間（秒）
  color: string;        // 表示色（CSS color code）
  originalLink?: string; // 原曲へのリンク（後方互換性のため維持）
  links?: {             // 複数プラットフォーム対応
    niconico?: string;  // ニコニコ動画URL
    youtube?: string;   // YouTubeURL
    spotify?: string;   // SpotifyURL
    appleMusic?: string; // Apple MusicURL
  };
};

// コントリビューター情報のデータモデル
export type MedleyContributor = {
  userId: string | null;    // ユーザーID（null = 匿名）
  name: string | null;      // ユーザー名
  email?: string;           // メールアドレス
  avatarUrl: string | null; // アバターURL
  editCount: number;        // 編集回数
  firstContribution: string; // 初回貢献日時
  lastContribution: string;  // 最終貢献日時
  isCreator: boolean;       // 作成者かどうか
};

// メドレー情報全体のデータモデル
export type MedleyData = {
  id?: string;          // データベースID（作成後に付与）
  videoId: string;      // 動画ID
  title: string;        // メドレータイトル
  creator?: string;     // 制作者
  duration: number;     // 総再生時間（秒）
  songs: SongSection[]; // 楽曲セクション配列
  platform?: 'niconico' | 'youtube'; // プラットフォーム（オプション、デフォルトは'niconico'）
  user_id?: string;     // 作成者のユーザーID（認証済みユーザーの場合）
  createdAt?: string;   // 投稿日時（ISO 8601形式）
  updatedAt?: string;   // 更新日時（ISO 8601形式）
  viewCount?: number;   // 再生回数
  contributors?: MedleyContributor[]; // コントリビューター一覧
};