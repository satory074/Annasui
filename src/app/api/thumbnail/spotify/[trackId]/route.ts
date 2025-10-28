import { NextRequest, NextResponse } from 'next/server';

// SpotifyのサムネイルをoEmbed APIから取得するプロキシAPI

/**
 * Spotify oEmbed APIからサムネイルURLを取得し、画像データをストリーミング
 */
async function fetchSpotifyThumbnail(trackId: string): Promise<{
  success: boolean;
  imageBuffer?: Buffer;
  contentType?: string;
  error?: string;
}> {
  try {
    console.log(`[Spotify Thumbnail API] Fetching thumbnail for track: ${trackId}`);

    // Spotify oEmbed APIからサムネイルURLを取得
    const oEmbedUrl = `https://embed.spotify.com/oembed/?url=spotify:track:${trackId}`;
    const oEmbedResponse = await fetch(oEmbedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
      },
    });

    if (!oEmbedResponse.ok) {
      console.log(`[Spotify Thumbnail API] oEmbed API failed (${oEmbedResponse.status})`);
      return {
        success: false,
        error: `oEmbed API returned ${oEmbedResponse.status}`,
      };
    }

    const oEmbedData = await oEmbedResponse.json();
    const thumbnailUrl = oEmbedData.thumbnail_url;

    if (!thumbnailUrl) {
      console.log('[Spotify Thumbnail API] No thumbnail_url in oEmbed response');
      return {
        success: false,
        error: 'No thumbnail_url found in oEmbed response',
      };
    }

    console.log(`[Spotify Thumbnail API] Found thumbnail URL: ${thumbnailUrl}`);

    // サムネイル画像の実データを取得
    const imageResponse = await fetch(thumbnailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)',
      },
    });

    if (!imageResponse.ok || !imageResponse.body) {
      console.log(`[Spotify Thumbnail API] Image fetch failed (${imageResponse.status})`);
      return {
        success: false,
        error: `Image fetch returned ${imageResponse.status}`,
      };
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Content-Typeが画像かチェック
    if (!contentType.startsWith('image/')) {
      console.log(`[Spotify Thumbnail API] Invalid content type: ${contentType}`);
      return {
        success: false,
        error: `Invalid content type: ${contentType}`,
      };
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`[Spotify Thumbnail API] Success: ${imageBuffer.length} bytes, ${contentType}`);

    return {
      success: true,
      imageBuffer,
      contentType,
    };

  } catch (error) {
    console.error('[Spotify Thumbnail API] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    // trackId の基本検証 (Spotifyのtrack IDは22文字の英数字)
    if (!trackId || !/^[a-zA-Z0-9]{22}$/.test(trackId)) {
      return NextResponse.json(
        { error: 'Invalid Spotify track ID format (expected 22 alphanumeric characters)' },
        { status: 400 }
      );
    }

    console.log(`[Spotify Thumbnail API] GET request for: ${trackId}`);

    // サムネイル取得を試行
    const result = await fetchSpotifyThumbnail(trackId);

    if (result.success && result.imageBuffer) {
      // 画像データをストリーミングで返す
      const response = new NextResponse(new Uint8Array(result.imageBuffer), {
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

      console.log(`[Spotify Thumbnail API] Streaming ${result.imageBuffer.length} bytes for ${trackId}`);
      return response;
    }

    // 失敗した場合は404を返す
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
    console.error('[Spotify Thumbnail API] Unexpected error:', error);
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
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    // trackId の基本検証
    if (!trackId || !/^[a-zA-Z0-9]{22}$/.test(trackId)) {
      return new NextResponse(null, { status: 400 });
    }

    console.log(`[Spotify Thumbnail API] HEAD request for: ${trackId}`);

    // サムネイル取得を試行
    const result = await fetchSpotifyThumbnail(trackId);

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
    console.error('[Spotify Thumbnail API] HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
