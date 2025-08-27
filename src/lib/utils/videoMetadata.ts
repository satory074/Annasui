/**
 * 動画のメタデータ（タイトル、制作者、動画長）を取得するためのユーティリティ
 */

import { extractVideoId } from './thumbnail';

export interface VideoMetadata {
  title: string;
  creator: string;
  duration?: number; // 秒数
  success: boolean;
  error?: string;
}

/**
 * ニコニコ動画のメタデータをgetthumbinfo APIから取得
 */
export async function getNiconicoVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`, {
      mode: 'cors'
    });
    
    if (!response.ok) {
      return {
        title: '',
        creator: '',
        success: false,
        error: 'ニコニコ動画APIからの取得に失敗しました'
      };
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // エラーチェック
    const errorElement = xmlDoc.querySelector('error');
    if (errorElement) {
      const errorCode = errorElement.getAttribute('code');
      return {
        title: '',
        creator: '',
        success: false,
        error: `動画が見つかりません（エラーコード: ${errorCode}）`
      };
    }
    
    // データ抽出
    const title = xmlDoc.querySelector('title')?.textContent || '';
    const creator = xmlDoc.querySelector('user_nickname')?.textContent || '';
    const lengthStr = xmlDoc.querySelector('length')?.textContent || '';
    
    // 長さをmm:ss形式から秒数に変換
    let duration: number | undefined;
    if (lengthStr) {
      const [minutes, seconds] = lengthStr.split(':').map(Number);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        duration = minutes * 60 + seconds;
      }
    }
    
    return {
      title,
      creator,
      duration,
      success: true
    };
  } catch (error) {
    console.warn('Failed to fetch Niconico video metadata:', error);
    return {
      title: '',
      creator: '',
      success: false,
      error: 'ニコニコ動画の情報取得中にエラーが発生しました'
    };
  }
}

/**
 * YouTube動画のメタデータをoEmbed APIから取得
 * 注意: oEmbedには動画長の情報が含まれないため、durationは未設定
 */
export async function getYouTubeVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      return {
        title: '',
        creator: '',
        success: false,
        error: 'YouTube APIからの取得に失敗しました'
      };
    }
    
    const data = await response.json();
    
    return {
      title: data.title || '',
      creator: data.author_name || '',
      // oEmbedには動画長の情報が含まれない
      duration: undefined,
      success: true
    };
  } catch (error) {
    console.warn('Failed to fetch YouTube video metadata:', error);
    return {
      title: '',
      creator: '',
      success: false,
      error: 'YouTube動画の情報取得中にエラーが発生しました'
    };
  }
}

/**
 * 動画URLからメタデータを自動取得
 */
export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
  const { platform, id } = extractVideoId(url);
  
  if (!platform || !id) {
    return {
      title: '',
      creator: '',
      success: false,
      error: '有効な動画URLではありません'
    };
  }
  
  switch (platform) {
    case 'niconico':
      return getNiconicoVideoMetadata(id);
    case 'youtube':
      return getYouTubeVideoMetadata(id);
    default:
      return {
        title: '',
        creator: '',
        success: false,
        error: `${platform}はサポートされていません`
      };
  }
}

/**
 * 動画長を秒数から「分:秒」形式に変換
 */
export function formatDurationFromSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 「分:秒」形式の文字列を秒数に変換
 */
export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return 0;
  
  return minutes * 60 + seconds;
}