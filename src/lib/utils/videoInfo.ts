// ニコニコ動画の情報を格納する型
export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: number;
  viewCount: number;
  commentCount: number;
  mylistCount: number;
}

// プレイヤーから受信した動画情報を正規化する関数
export function normalizeVideoInfo(data: unknown, videoId: string): VideoInfo | null {
  try {
    if (data && typeof data === 'object' && 'videoInfo' in data) {
      const info = (data as { videoInfo: Record<string, unknown> }).videoInfo;
      return {
        videoId: (info.videoId as string) || (info.watchId as string) || videoId,
        title: (info.title as string) || `動画 ${videoId}`,
        description: (info.description as string) || '',
        thumbnailUrl: (info.thumbnailUrl as string) || '',
        uploadDate: (info.postedAt as string) || '',
        duration: (info.lengthInSeconds as number) || 0,
        viewCount: (info.viewCount as number) || 0,
        commentCount: (info.commentCount as number) || 0,
        mylistCount: (info.mylistCount as number) || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error normalizing video info:', error);
    return null;
  }
}

// 数値をフォーマットする関数（既存のVideoInfoコンポーネントから移動）
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${Math.floor(num / 100000) / 10}M`;
  } else if (num >= 1000) {
    return `${Math.floor(num / 100) / 10}K`;
  }
  return num.toString();
}

// 日付をフォーマットする関数
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('ja-JP');
  } catch {
    return dateString;
  }
}