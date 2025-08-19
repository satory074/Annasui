/**
 * 動画のサムネイル画像を取得するためのユーティリティ
 */

export type VideoPlatform = 'youtube' | 'niconico' | null;

export interface VideoInfo {
  platform: VideoPlatform;
  id: string | null;
}

/**
 * 動画URLから動画IDとプラットフォームを抽出
 */
export function extractVideoId(url: string): VideoInfo {
  if (!url) return { platform: null, id: null };

  try {
    const urlObj = new URL(url);
    
    // YouTube の判定
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = null;
      
      if (urlObj.hostname.includes('youtu.be')) {
        // youtu.be/VIDEO_ID 形式
        videoId = urlObj.pathname.slice(1);
      } else {
        // youtube.com/watch?v=VIDEO_ID 形式
        videoId = urlObj.searchParams.get('v');
      }
      
      if (videoId) {
        return { platform: 'youtube', id: videoId };
      }
    }
    
    // ニコニコ動画の判定
    if (urlObj.hostname.includes('nicovideo.jp') || urlObj.hostname.includes('nico.ms')) {
      const pathMatch = urlObj.pathname.match(/\/watch\/(sm\d+)/);
      if (pathMatch) {
        return { platform: 'niconico', id: pathMatch[1] };
      }
    }
    
    return { platform: null, id: null };
  } catch (error) {
    console.warn('Failed to parse video URL:', url, error);
    return { platform: null, id: null };
  }
}

/**
 * YouTube動画のサムネイルURLを生成
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * ニコニコ動画のプレースホルダー画像URL（実際のサムネイルは取得困難のため）
 * 将来的にAPIを使用する場合に備えてプレースホルダーを返す
 */
export function getNiconicoThumbnailPlaceholder(): string {
  // ニコニコ動画のアイコンカラーに基づいたプレースホルダー
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23ff6f00'/%3E%3Ctext x='160' y='90' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='16' fill='white'%3Eニコニコ動画%3C/text%3E%3C/svg%3E";
}

/**
 * 動画URLからサムネイルURLを取得
 */
export function getThumbnailUrl(originalLink: string): string | null {
  const { platform, id } = extractVideoId(originalLink);
  
  if (!platform || !id) return null;
  
  switch (platform) {
    case 'youtube':
      return getYouTubeThumbnail(id);
    case 'niconico':
      // ニコニコ動画は現在API制限によりプレースホルダーを返す
      return getNiconicoThumbnailPlaceholder();
    default:
      return null;
  }
}

/**
 * サムネイル画像のエラーハンドリング用のフォールバック
 */
export function handleThumbnailError(imgElement: HTMLImageElement, originalLink: string) {
  const { platform } = extractVideoId(originalLink);
  
  if (platform === 'youtube') {
    // YouTubeの場合、低解像度版にフォールバック
    const currentSrc = imgElement.src;
    if (currentSrc.includes('mqdefault')) {
      imgElement.src = currentSrc.replace('mqdefault', 'default');
    } else {
      // それでも失敗した場合は非表示
      imgElement.style.display = 'none';
    }
  } else {
    // その他の場合は非表示
    imgElement.style.display = 'none';
  }
}