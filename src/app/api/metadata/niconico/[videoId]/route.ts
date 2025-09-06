import { NextRequest, NextResponse } from 'next/server';

// ニコニコ動画のメタデータを取得するプロキシAPI

export interface NiconicoMetadataResponse {
  success: boolean;
  title?: string;
  creator?: string;
  duration?: number; // 秒数
  thumbnail?: string;
  error?: string;
  debugInfo?: {
    apiUrl: string;
    responseStatus: number;
    responseText?: string;
    errorDetails?: unknown;
    corsError: boolean;
  };
}

/**
 * ニコニコ動画のメタデータをgetthumbinfo APIから取得
 */
async function fetchNiconicoMetadata(videoId: string): Promise<NiconicoMetadataResponse> {
  const apiUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;
  console.log(`[Metadata API] Fetching metadata for: ${videoId} from ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
      },
    });
    
    console.log(`[Metadata API] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const responseText = await response.text().catch(() => 'テキスト取得失敗');
      return {
        success: false,
        error: `ニコニコ動画APIからの取得に失敗しました (HTTP ${response.status})`,
        debugInfo: {
          apiUrl,
          responseStatus: response.status,
          responseText,
          corsError: false
        }
      };
    }
    
    const xmlText = await response.text();
    console.log(`[Metadata API] XML response length: ${xmlText.length}`);
    
    // Node.js環境でのXML解析（正規表現を使用）
    // APIエラーチェック
    const errorMatch = xmlText.match(/<error[^>]+code="([^"]+)"[^>]*>/);
    if (errorMatch) {
      const errorCode = errorMatch[1];
      const errorDescriptionMatch = xmlText.match(/<description[^>]*>([^<]+)<\/description>/);
      const errorDescription = errorDescriptionMatch ? errorDescriptionMatch[1] : '';
      console.error('[Metadata API] API error:', errorCode, errorDescription);
      
      return {
        success: false,
        error: `動画が見つかりません（エラーコード: ${errorCode}）`,
        debugInfo: {
          apiUrl,
          responseStatus: response.status,
          responseText: xmlText,
          errorDetails: { code: errorCode, description: errorDescription },
          corsError: false
        }
      };
    }
    
    // データ抽出（正規表現を使用）
    const titleMatch = xmlText.match(/<title[^>]*>([^<]+)<\/title>/);
    const creatorMatch = xmlText.match(/<user_nickname[^>]*>([^<]+)<\/user_nickname>/);
    const lengthMatch = xmlText.match(/<length[^>]*>([^<]+)<\/length>/);
    const thumbnailMatch = xmlText.match(/<thumbnail_url[^>]*>([^<]+)<\/thumbnail_url>/);
    
    const title = titleMatch ? titleMatch[1] : '';
    const creator = creatorMatch ? creatorMatch[1] : '';
    const lengthStr = lengthMatch ? lengthMatch[1] : '';
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';
    
    console.log(`[Metadata API] Extracted data:`, { title, creator, lengthStr, thumbnail });
    
    // 長さをmm:ss形式から秒数に変換
    let duration: number | undefined;
    if (lengthStr) {
      const [minutes, seconds] = lengthStr.split(':').map(Number);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        duration = minutes * 60 + seconds;
        console.log(`[Metadata API] Duration converted: ${lengthStr} -> ${duration}s`);
      } else {
        console.warn('[Metadata API] Invalid duration format:', lengthStr);
      }
    }
    
    const result: NiconicoMetadataResponse = {
      success: true,
      title,
      creator,
      duration,
      thumbnail: thumbnail || undefined,
      debugInfo: {
        apiUrl,
        responseStatus: response.status,
        responseText: xmlText.substring(0, 1000) + '...',
        corsError: false
      }
    };
    
    console.log(`[Metadata API] Success:`, { title, creator, duration });
    return result;
    
  } catch (error) {
    console.error('[Metadata API] Fetch error:', error);
    
    return {
      success: false,
      error: 'ニコニコ動画の情報取得中にサーバーエラーが発生しました',
      debugInfo: {
        apiUrl,
        responseStatus: 0,
        responseText: undefined,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        },
        corsError: false // サーバーサイドなのでCORSエラーではない
      }
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    
    // videoId の基本検証
    if (!videoId || !/^(sm)?\d+$/.test(videoId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid video ID format',
          debugInfo: {
            apiUrl: 'N/A',
            responseStatus: 400,
            errorDetails: { videoId },
            corsError: false
          }
        } satisfies NiconicoMetadataResponse,
        { status: 400 }
      );
    }
    
    // sm prefix を付与
    const formattedVideoId = videoId.startsWith('sm') ? videoId : `sm${videoId}`;
    
    console.log(`[Metadata API] Processing request for: ${formattedVideoId}`);
    
    // メタデータ取得を実行
    const result = await fetchNiconicoMetadata(formattedVideoId);
    
    // キャッシュヘッダーを設定（メタデータは変更されにくいため、長めにキャッシュ）
    const response = NextResponse.json(result, {
      status: result.success ? 200 : (result.debugInfo?.responseStatus || 500)
    });
    
    // キャッシュ設定
    if (result.success) {
      response.headers.set('Cache-Control', 'public, max-age=1800, s-maxage=3600'); // 30分 / 1時間
      response.headers.set('CDN-Cache-Control', 'public, max-age=7200'); // 2時間
    } else {
      // エラーは短時間キャッシュ
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5分
    }
    
    return response;
    
  } catch (error) {
    console.error('[Metadata API] Unexpected error:', error);
    
    const errorResponse: NiconicoMetadataResponse = {
      success: false,
      error: 'Internal server error',
      debugInfo: {
        apiUrl: 'N/A',
        responseStatus: 500,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        corsError: false
      }
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// HEADリクエスト対応
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const response = await GET(request, { params });
  // ボディを削除してヘッダーのみを返す
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers
  });
}