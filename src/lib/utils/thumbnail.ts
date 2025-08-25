/**
 * 動画のサムネイル画像を取得するためのユーティリティ
 */

export type VideoPlatform = 'youtube' | 'niconico' | 'spotify' | 'appleMusic' | null;

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
    
    // Spotifyの判定
    if (urlObj.hostname.includes('spotify.com')) {
      const trackMatch = urlObj.pathname.match(/\/track\/([a-zA-Z0-9]{22})/);
      if (trackMatch) {
        return { platform: 'spotify', id: trackMatch[1] };
      }
    }
    
    // Apple Musicの判定
    if (urlObj.hostname.includes('music.apple.com')) {
      const albumMatch = urlObj.pathname.match(/\/album\/.*\/(\d+)/);
      if (albumMatch) {
        return { platform: 'appleMusic', id: albumMatch[1] };
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
 * ニコニコ動画のサムネイルURLを生成（直接CDN URL）
 */
export function getNiconicoThumbnail(videoId: string, size: 'default' | 'M' | 'L' = 'L'): string {
  // sm500873 → 500873 のように数字部分を抽出
  const numericId = videoId.replace(/^sm/, '');
  const sizeSuffix = size === 'default' ? '' : `.${size}`;
  
  return `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}${sizeSuffix}`;
}

/**
 * ニコニコ動画のプレースホルダー画像URL（フォールバック用）
 */
export function getNiconicoThumbnailPlaceholder(): string {
  // ニコニコ動画のアイコンカラーに基づいたプレースホルダー
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23ff6f00'/%3E%3Ctext x='160' y='90' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='16' fill='white'%3Eニコニコ動画%3C/text%3E%3C/svg%3E";
}

/**
 * Spotify楽曲のアルバムアートワークをoEmbed APIから取得
 */
export async function getSpotifyThumbnail(trackId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://embed.spotify.com/oembed/?url=spotify:track:${trackId}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.warn('Failed to fetch Spotify thumbnail:', error);
    return null;
  }
}

/**
 * Apple Music楽曲のアルバムアートワークをOpen Graphメタタグから取得
 */
export async function getAppleMusicThumbnail(url: string): Promise<string | null> {
  try {
    // CORSの制限により、直接フェッチはできない場合があります
    // 実際の実装では、プロキシサーバーまたは別の方法が必要
    const response = await fetch(url, { mode: 'no-cors' });
    const html = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const ogImage = doc.querySelector('meta[property="og:image"]');
    return ogImage ? ogImage.getAttribute('content') : null;
  } catch (error) {
    console.warn('Failed to fetch Apple Music thumbnail:', error);
    return null;
  }
}

/**
 * Spotifyのプレースホルダー画像URL（フォールバック用）
 */
export function getSpotifyThumbnailPlaceholder(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%231db954'/%3E%3Ctext x='160' y='90' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='16' fill='white'%3ESpotify%3C/text%3E%3C/svg%3E";
}

/**
 * Apple Musicのプレースホルダー画像URL（フォールバック用）
 */
export function getAppleMusicThumbnailPlaceholder(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23fa243c'/%3E%3Ctext x='160' y='90' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='16' fill='white'%3EApple Music%3C/text%3E%3C/svg%3E";
}

/**
 * getthumbinfo APIからサムネイル情報を取得（オプション）
 */
export async function getNiconicoThumbnailFromAPI(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`, {
      mode: 'cors'
    });
    
    if (!response.ok) return null;
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const thumbnailUrl = xmlDoc.querySelector('thumbnail_url')?.textContent;
    return thumbnailUrl || null;
  } catch (error) {
    console.warn('Failed to fetch Niconico thumbnail from API:', error);
    return null;
  }
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
      // 直接CDN URLを試行（Lサイズ）
      return getNiconicoThumbnail(id, 'L');
    case 'spotify':
      // SpotifyはasyncなAPIが必要なため、同期的にはプレースホルダーを返す
      return getSpotifyThumbnailPlaceholder();
    case 'appleMusic':
      // Apple Musicも同様にプレースホルダーを返す
      return getAppleMusicThumbnailPlaceholder();
    default:
      return null;
  }
}

/**
 * サムネイル画像のエラーハンドリング用のフォールバック
 */
export function handleThumbnailError(imgElement: HTMLImageElement, originalLink: string) {
  const { platform, id } = extractVideoId(originalLink);
  
  if (platform === 'youtube') {
    // YouTubeの場合、低解像度版にフォールバック
    const currentSrc = imgElement.src;
    if (currentSrc.includes('mqdefault')) {
      imgElement.src = currentSrc.replace('mqdefault', 'default');
    } else {
      // それでも失敗した場合は非表示
      imgElement.style.display = 'none';
    }
  } else if (platform === 'niconico' && id) {
    // ニコニコ動画の場合、段階的フォールバック
    const currentSrc = imgElement.src;
    
    if (currentSrc.includes('.L')) {
      // Lサイズが失敗した場合、Mサイズを試行
      imgElement.src = getNiconicoThumbnail(id, 'M');
    } else if (currentSrc.includes('.M')) {
      // Mサイズが失敗した場合、デフォルトサイズを試行
      imgElement.src = getNiconicoThumbnail(id, 'default');
    } else if (currentSrc.includes('nicovideo.cdn.nimg.jp')) {
      // デフォルトサイズも失敗した場合、プレースホルダーを表示
      imgElement.src = getNiconicoThumbnailPlaceholder();
    } else {
      // プレースホルダーも失敗した場合は非表示
      imgElement.style.display = 'none';
    }
  } else {
    // その他の場合は非表示
    imgElement.style.display = 'none';
  }
}

/**
 * 複数のリンクから最適なサムネイルを取得（優先順位: ニコニコ > YouTube > Spotify > Apple Music）
 */
export async function getBestThumbnailFromLinks(links: {
  niconico?: string;
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
} | undefined, originalLink?: string): Promise<string | null> {
  // 優先順位に従ってサムネイルを取得
  if (links?.niconico) {
    const thumbnail = getThumbnailUrl(links.niconico);
    if (thumbnail) return thumbnail;
  }
  
  if (links?.youtube) {
    const thumbnail = getThumbnailUrl(links.youtube);
    if (thumbnail) return thumbnail;
  }
  
  if (links?.spotify) {
    const { id } = extractVideoId(links.spotify);
    if (id) {
      const thumbnail = await getSpotifyThumbnail(id);
      if (thumbnail) return thumbnail;
    }
  }
  
  if (links?.appleMusic) {
    const thumbnail = await getAppleMusicThumbnail(links.appleMusic);
    if (thumbnail) return thumbnail;
  }
  
  // 後方互換性のため、originalLinkもチェック
  if (originalLink) {
    return getThumbnailUrl(originalLink);
  }
  
  return null;
}