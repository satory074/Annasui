import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

export interface YouTubeMetadataResponse {
  success: boolean;
  title?: string;
  creator?: string;
  description?: string;
  thumbnail?: string;
  error?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!videoId || !/^[a-zA-Z0-9_-]{6,12}$/.test(videoId)) {
    return NextResponse.json(
      { success: false, error: "Invalid video ID format" } satisfies YouTubeMetadataResponse,
      { status: 400 }
    );
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    logger.debug(`[YouTube Metadata] Fetching: ${oembedUrl}`);

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `YouTube oEmbed error: HTTP ${response.status}`,
        } satisfies YouTubeMetadataResponse,
        { status: response.status >= 400 && response.status < 500 ? 404 : 502 }
      );
    }

    const data = await response.json();
    logger.debug("[YouTube Metadata] oEmbed data:", { title: data.title, author_name: data.author_name });

    const result: YouTubeMetadataResponse = {
      success: true,
      title: data.title ?? "",
      creator: data.author_name ?? "",
      thumbnail: data.thumbnail_url ?? "",
      // YouTube oEmbed does not provide video descriptions
      description: undefined,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=3600",
      },
    });
  } catch (error) {
    logger.error("[YouTube Metadata] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } satisfies YouTubeMetadataResponse,
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const response = await GET(request, { params });
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
