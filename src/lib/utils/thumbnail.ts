/**
 * 動画のサムネイル画像を取得するためのユーティリティ
 * セキュリティ強化: 安全なURL検証とXSS対策を含む
 */

import { sanitizeUrl } from './sanitize';
import { logger } from './logger';

export type VideoPlatform = 'youtube' | 'niconico' | 'spotify' | 'appleMusic' | null;

export interface VideoInfo {
  platform: VideoPlatform;
  id: string | null;
}

/**
 * 動画URLから動画IDとプラットフォームを抽出
 * セキュリティ強化: URL サニタイゼーションと厳格な検証を実装
 */
export function extractVideoId(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return { platform: null, id: null };
  }

  // セキュリティ: URLをサニタイゼーション
  const sanitizedUrl = sanitizeUrl(url);
  if (!sanitizedUrl) {
    logger.warn('Invalid or potentially malicious URL rejected:', url);
    return { platform: null, id: null };
  }

  try {
    const urlObj = new URL(sanitizedUrl);
    
    // ドメインの厳格な検証
    const hostname = urlObj.hostname.toLowerCase();
    const allowedDomains = [
      'youtube.com', 'www.youtube.com', 'm.youtube.com',
      'youtu.be',
      'nicovideo.jp', 'www.nicovideo.jp',
      'nico.ms',
      'spotify.com', 'open.spotify.com',
      'music.apple.com'
    ];

    if (!allowedDomains.includes(hostname)) {
      logger.warn('Rejected URL from unauthorized domain:', hostname);
      return { platform: null, id: null };
    }
    
    // YouTube の判定
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = null;
      
      if (hostname.includes('youtu.be')) {
        // youtu.be/VIDEO_ID 形式
        videoId = urlObj.pathname.slice(1);
      } else {
        // youtube.com/watch?v=VIDEO_ID 形式
        videoId = urlObj.searchParams.get('v');
      }
      
      // YouTube ID の厳格な検証 (11文字、英数字、ハイフン、アンダースコア)
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return { platform: 'youtube', id: videoId };
      }
      logger.warn('Invalid YouTube video ID format:', videoId);
      return { platform: null, id: null };
    }
    
    // ニコニコ動画の判定
    if (hostname.includes('nicovideo.jp') || hostname.includes('nico.ms')) {
      const pathMatch = urlObj.pathname.match(/\/watch\/(sm\d+)/);
      if (pathMatch) {
        const videoId = pathMatch[1];
        // ニコニコ動画IDの検証 (sm + 数字、最大8桁程度)
        if (/^sm\d{1,8}$/.test(videoId)) {
          return { platform: 'niconico', id: videoId };
        }
        logger.warn('Invalid Niconico video ID format:', videoId);
        return { platform: null, id: null };
      }
    }
    
    // Spotifyの判定
    if (hostname.includes('spotify.com')) {
      const trackMatch = urlObj.pathname.match(/\/track\/([a-zA-Z0-9]{22})/);
      if (trackMatch) {
        const trackId = trackMatch[1];
        // Spotify Track IDの検証 (正確に22文字の英数字)
        if (/^[a-zA-Z0-9]{22}$/.test(trackId)) {
          return { platform: 'spotify', id: trackId };
        }
        logger.warn('Invalid Spotify track ID format:', trackId);
        return { platform: null, id: null };
      }
    }
    
    // Apple Musicの判定
    if (hostname.includes('music.apple.com')) {
      const albumMatch = urlObj.pathname.match(/\/album\/.*\/(\d+)/);
      if (albumMatch) {
        const albumId = albumMatch[1];
        // Apple Music IDの検証 (数字のみ、最大10桁程度)
        if (/^\d{1,10}$/.test(albumId)) {
          return { platform: 'appleMusic', id: albumId };
        }
        logger.warn('Invalid Apple Music album ID format:', albumId);
        return { platform: null, id: null };
      }
    }
    
    logger.warn('No valid video ID found for URL:', sanitizedUrl);
    return { platform: null, id: null };
  } catch (error) {
    logger.error('Failed to parse video URL:', sanitizedUrl, error);
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
    logger.warn('Failed to fetch Spotify thumbnail:', error);
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
    logger.warn('Failed to fetch Apple Music thumbnail:', error);
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
    logger.warn('Failed to fetch Niconico thumbnail from API:', error);
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
      // プロキシサーバーを経由してニコニコのサムネイルを取得
      return `/api/thumbnail/niconico/${id}/`;
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
  // 優先順位に従ってサムネイルを取得（ニコニコを最優先に戻す）
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