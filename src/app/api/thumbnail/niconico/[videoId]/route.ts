import { NextRequest, NextResponse } from 'next/server';

// ニコニコ動画のサムネイルを取得するプロキシAPI

/**
 * ニコニコ動画のサムネイルを複数のAPIから取得してストリーミング
 */
async function fetchNiconicoThumbnail(videoId: string): Promise<{
  success: boolean;
  imageBuffer?: Buffer;
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
        method: 'GET', // 実際に画像データを取得
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
        },
      });
      
      if (response.ok && response.body) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Content-Typeが画像かチェック
        if (contentType.startsWith('image/')) {
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          console.log(`[Thumbnail API] Success: ${url} (${imageBuffer.length} bytes, ${contentType})`);
          
          return {
            success: true,
            imageBuffer,
            contentType,
          };
        }
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
        
        // 抽出したURLから実際に画像データを取得
        try {
          const imageResponse = await fetch(extractedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
            },
          });
          
          if (imageResponse.ok && imageResponse.body) {
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            console.log(`[Thumbnail API] Success via getthumbinfo: ${extractedUrl} (${imageBuffer.length} bytes)`);
            
            return {
              success: true,
              imageBuffer,
              contentType,
            };
          }
        } catch (error) {
          console.error(`[Thumbnail API] Error fetching image from XML URL: ${extractedUrl}`, error);
        }
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
    
    if (result.success && result.imageBuffer) {
      // 画像データをストリーミングで返す
      const response = new NextResponse(result.imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': result.contentType || 'image/jpeg',
          'Content-Length': result.imageBuffer.length.toString(),
          // キャッシュヘッダー (1時間ブラウザキャッシュ、24時間CDNキャッシュ)
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'CDN-Cache-Control': 'public, max-age=86400',
          // CORS ヘッダー
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
      
      console.log(`[Thumbnail API] Streaming ${result.imageBuffer.length} bytes for ${formattedVideoId}`);
      return response;
    }
    
    // すべて失敗した場合は404を返す
    return NextResponse.json(
      { error: result.error || 'Thumbnail not found' },
      { 
        status: 404,
        headers: {
          // エラーの場合は短期キャッシュ (5分)
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        }
      }
    );
    
  } catch (error) {
    console.error('[Thumbnail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          // エラーの場合は短期キャッシュ (1分)
          'Cache-Control': 'public, max-age=60, s-maxage=60',
        }
      }
    );
  }
}

// HEAD リクエスト用ハンドラー（ヘッダー情報のみ返す）
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    
    // videoId の基本検証
    if (!videoId || !/^(sm)?\d+$/.test(videoId)) {
      return new NextResponse(null, { status: 400 });
    }
    
    // sm prefix を付与
    const formattedVideoId = videoId.startsWith('sm') ? videoId : `sm${videoId}`;
    
    console.log(`[Thumbnail API] HEAD request for: ${formattedVideoId}`);
    
    // サムネイル取得を試行
    const result = await fetchNiconicoThumbnail(formattedVideoId);
    
    if (result.success && result.imageBuffer) {
      // ヘッダー情報のみ返す（ボディは空）
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': result.contentType || 'image/jpeg',
          'Content-Length': result.imageBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'CDN-Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    return new NextResponse(null, { status: 404 });
    
  } catch (error) {
    console.error('[Thumbnail API] HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}