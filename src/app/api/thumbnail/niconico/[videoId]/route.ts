import { NextRequest, NextResponse } from 'next/server';

// ニコニコ動画のサムネイルを取得するプロキシAPI

/**
 * ニコニコ動画のサムネイルを複数のAPIから取得を試行
 */
async function fetchNiconicoThumbnail(videoId: string): Promise<{
  success: boolean;
  thumbnailUrl?: string;
  contentType?: string;
  error?: string;
}> {
  // videoIdから数字部分を抽出
  const numericId = videoId.replace(/^sm/, '');
  
  // 試行するサムネイルURL のパターン
  const thumbnailUrls = [
    // ニコニコCDN (大サイズ)
    `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}.L`,
    // ニコニコCDN (中サイズ)
    `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}.M`,
    // ニコニコCDN (デフォルトサイズ)
    `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}`,
    // 古いサムネイルAPI
    `https://tn.smilevideo.jp/smile?i=${numericId}`,
  ];
  
  // 各URLを順番に試行
  for (const url of thumbnailUrls) {
    try {
      console.log(`[Thumbnail API] Trying: ${url}`);
      
      const response = await fetch(url, {
        method: 'HEAD', // まずHEADリクエストで存在確認
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
        },
      });
      
      if (response.ok) {
        console.log(`[Thumbnail API] Success: ${url}`);
        return {
          success: true,
          thumbnailUrl: url,
          contentType: response.headers.get('content-type') || 'image/jpeg',
        };
      }
      
      console.log(`[Thumbnail API] Failed (${response.status}): ${url}`);
    } catch (error) {
      console.error(`[Thumbnail API] Error with ${url}:`, error);
      continue;
    }
  }
  
  // すべてのURLが失敗した場合、getthumbinfo APIを試行
  try {
    console.log(`[Thumbnail API] Trying getthumbinfo API for ${videoId}`);
    
    const apiResponse = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
      },
    });
    
    if (apiResponse.ok) {
      const xmlText = await apiResponse.text();
      
      // XMLからサムネイルURLを抽出
      const thumbnailUrlMatch = xmlText.match(/<thumbnail_url[^>]*>([^<]+)<\/thumbnail_url>/);
      if (thumbnailUrlMatch) {
        const extractedUrl = thumbnailUrlMatch[1];
        console.log(`[Thumbnail API] Extracted from XML: ${extractedUrl}`);
        
        return {
          success: true,
          thumbnailUrl: extractedUrl,
          contentType: 'image/jpeg',
        };
      }
    }
  } catch (error) {
    console.error('[Thumbnail API] getthumbinfo API error:', error);
  }
  
  return {
    success: false,
    error: 'All thumbnail sources failed',
  };
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
        { error: 'Invalid video ID format' },
        { status: 400 }
      );
    }
    
    // sm prefix を付与
    const formattedVideoId = videoId.startsWith('sm') ? videoId : `sm${videoId}`;
    
    console.log(`[Thumbnail API] Fetching thumbnail for: ${formattedVideoId}`);
    
    // サムネイル取得を試行
    const result = await fetchNiconicoThumbnail(formattedVideoId);
    
    if (result.success && result.thumbnailUrl) {
      // キャッシュヘッダー付きのリダイレクトレスポンス
      const response = NextResponse.redirect(result.thumbnailUrl);
      
      // 1時間キャッシュ（サムネイルは変更されないため）
      response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      response.headers.set('CDN-Cache-Control', 'public, max-age=86400'); // 24時間
      
      return response;
    }
    
    // すべて失敗した場合は404を返す
    return NextResponse.json(
      { error: result.error || 'Thumbnail not found' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('[Thumbnail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// キャッシュヘッダーを設定するためのOPTIONSハンドラー
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  // HEADリクエストでもGETと同じロジックを使用
  return GET(request, { params });
}