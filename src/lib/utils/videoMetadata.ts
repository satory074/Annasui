/**
 * 動画のメタデータ（タイトル、制作者、動画長）を取得するためのユーティリティ
 */

import { extractVideoId, getYouTubeThumbnail } from './thumbnail';
import { logger } from './logger';

export interface VideoMetadata {
  title: string;
  creator: string;
  duration?: number; // 秒数
  thumbnail?: string; // サムネイル画像URL
  success: boolean;
  error?: string;
  debugInfo?: {
    apiUrl?: string;
    responseStatus?: number;
    responseText?: string;
    errorDetails?: unknown;
    corsError?: boolean;
  };
}

/**
 * ニコニコ動画のメタデータをプロキシAPI経由で取得
 */
export async function getNiconicoVideoMetadata(videoId: string): Promise<VideoMetadata> {
  // プロキシAPI経由でアクセス（CORS制限を回避）
  const apiUrl = `/api/metadata/niconico/${videoId}`;
  logger.debug('🎬 Fetching Niconico metadata via proxy:', { videoId, apiUrl });
  
  try {
    const response = await fetch(apiUrl);
    
    logger.debug('📡 Niconico API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const responseText = await response.text().catch(() => 'テキスト取得失敗');
      
      // プロキシAPIからのエラーレスポンス（JSONフォーマット）を解析
      let parsedError;
      try {
        parsedError = JSON.parse(responseText);
      } catch {
        parsedError = { error: responseText };
      }
      
      const errorResult = {
        title: '',
        creator: '',
        thumbnail: undefined,
        success: false,
        error: parsedError.error || `プロキシAPI経由での取得に失敗しました (HTTP ${response.status})`,
        debugInfo: {
          ...parsedError.debugInfo,
          proxyApiUrl: apiUrl,
          proxyResponseStatus: response.status
        }
      };
      logger.error('❌ Niconico proxy API HTTP error:', errorResult.debugInfo);
      return errorResult;
    }
    
    // プロキシAPIからのJSONレスポンスを解析
    const data = await response.json();
    logger.debug('📊 Niconico proxy API JSON response:', data);
    
    // プロキシAPIが失敗を返した場合
    if (!data.success) {
      const errorResult = {
        title: '',
        creator: '',
        thumbnail: undefined,
        success: false,
        error: data.error || 'プロキシAPI経由でのデータ取得に失敗しました',
        debugInfo: {
          ...data.debugInfo,
          proxyApiUrl: apiUrl,
          proxyResponseStatus: response.status,
          usingProxy: true
        }
      };
      logger.error('❌ Niconico proxy API returned error:', errorResult.debugInfo);
      return errorResult;
    }
    
    // 成功した場合、プロキシAPIから取得したデータをそのまま使用
    const result = {
      title: data.title || '',
      creator: data.creator || '',
      duration: data.duration,
      thumbnail: data.thumbnail || undefined,
      success: true,
      debugInfo: {
        ...data.debugInfo,
        proxyApiUrl: apiUrl,
        proxyResponseStatus: response.status,
        usingProxy: true
      }
    };
    
    logger.info('✅ Niconico metadata fetched successfully via proxy:', { 
      videoId, 
      title: result.title, 
      creator: result.creator, 
      duration: result.duration 
    });
    return result;
  } catch (error) {
    // プロキシAPI経由でのネットワークエラー
    const isNetworkError = error instanceof TypeError && error.message.includes('Failed to fetch');
    
    const errorResult = {
      title: '',
      creator: '',
      thumbnail: undefined,
      success: false,
      error: isNetworkError 
        ? 'プロキシサーバーへの接続に失敗しました' 
        : 'ニコニコ動画の情報取得中にエラーが発生しました',
      debugInfo: {
        proxyApiUrl: apiUrl,
        responseStatus: undefined,
        responseText: undefined,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        },
        usingProxy: true,
        corsError: false // プロキシ経由なのでCORSエラーではない
      }
    };
    
    logger.error('❌ Failed to fetch Niconico video metadata via proxy:', errorResult.debugInfo);
    return errorResult;
  }
}

/**
 * YouTube動画のメタデータをoEmbed APIから取得
 * 注意: oEmbedには動画長の情報が含まれないため、durationは未設定
 */
export async function getYouTubeVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  logger.debug('🎬 Fetching YouTube metadata:', { videoId, apiUrl });
  
  try {
    const response = await fetch(apiUrl);
    
    logger.debug('📡 YouTube API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorResult = {
        title: '',
        creator: '',
        thumbnail: undefined,
        success: false,
        error: `YouTube APIからの取得に失敗しました (HTTP ${response.status})`,
        debugInfo: {
          apiUrl,
          responseStatus: response.status,
          responseText: await response.text().catch(() => 'テキスト取得失敗'),
          corsError: false
        }
      };
      logger.error('❌ YouTube API HTTP error:', errorResult.debugInfo);
      return errorResult;
    }
    
    const data = await response.json();
    logger.debug('📊 YouTube API JSON response:', data);
    
    // サムネイルURLを生成（oEmbedのthumbnail_urlまたは標準的なYouTubeサムネイルURLを使用）
    const thumbnail = data.thumbnail_url || getYouTubeThumbnail(videoId);
    
    const result = {
      title: data.title || '',
      creator: data.author_name || '',
      // oEmbedには動画長の情報が含まれない
      duration: undefined,
      thumbnail: thumbnail || undefined,
      success: true,
      debugInfo: {
        apiUrl,
        responseStatus: response.status,
        responseText: JSON.stringify(data),
        corsError: false
      }
    };
    
    logger.info('✅ YouTube metadata fetched successfully:', { videoId, title: result.title, creator: result.creator });
    return result;
  } catch (error) {
    const isCorsError = error instanceof TypeError && error.message.includes('Failed to fetch');
    
    const errorResult = {
      title: '',
      creator: '',
      thumbnail: undefined,
      success: false,
      error: isCorsError 
        ? 'CORS制限によりYouTube動画情報を取得できません' 
        : 'YouTube動画の情報取得中にエラーが発生しました',
      debugInfo: {
        apiUrl,
        responseStatus: undefined,
        responseText: undefined,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        },
        corsError: isCorsError
      }
    };
    
    logger.error('❌ Failed to fetch YouTube video metadata:', errorResult.debugInfo);
    return errorResult;
  }
}

/**
 * 動画URLからメタデータを自動取得
 */
export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
  logger.debug('🔍 Getting video metadata:', { url });
  
  const { platform, id } = extractVideoId(url);
  logger.debug('🎯 Extracted video info:', { platform, id });
  
  if (!platform || !id) {
    const errorResult = {
      title: '',
      creator: '',
      thumbnail: undefined,
      success: false,
      error: '有効な動画URLではありません',
      debugInfo: {
        apiUrl: undefined,
        responseStatus: undefined,
        responseText: undefined,
        errorDetails: { url, extractedPlatform: platform, extractedId: id },
        corsError: false
      }
    };
    logger.error('❌ Invalid video URL:', errorResult.debugInfo);
    return errorResult;
  }
  
  switch (platform) {
    case 'niconico':
      return getNiconicoVideoMetadata(id);
    case 'youtube':
      return getYouTubeVideoMetadata(id);
    default:
      const errorResult = {
        title: '',
        creator: '',
        thumbnail: undefined,
        success: false,
        error: `${platform}はサポートされていません`,
        debugInfo: {
          apiUrl: undefined,
          responseStatus: undefined,
          responseText: undefined,
          errorDetails: { unsupportedPlatform: platform },
          corsError: false
        }
      };
      logger.error('❌ Unsupported platform:', errorResult.debugInfo);
      return errorResult;
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