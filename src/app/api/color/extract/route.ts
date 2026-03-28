import { NextRequest, NextResponse } from "next/server";
import { Vibrant } from "node-vibrant/node";
import type { Swatch } from "@vibrant/color";
import { toPastelHex } from "@/lib/utils/color";
import { logger } from "@/lib/utils/logger";

interface ExtractColorRequest {
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
}

/** Extract a video/track ID from a platform link. */
function extractYouTubeId(link: string): string | null {
  const match = link.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function extractNiconicoId(link: string): string | null {
  const match = link.match(/(sm\d+)/);
  return match?.[1] ?? null;
}

function extractSpotifyId(link: string): string | null {
  const match = link.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

/** Fetch an image as a Buffer with a timeout. */
async function fetchImage(
  url: string,
  timeoutMs = 5000
): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Medlean/1.0; +https://anasui-e6f49.web.app)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Resolve platform links to a thumbnail image Buffer. Priority: nico > youtube > spotify */
async function resolveImageBuffer(
  links: ExtractColorRequest
): Promise<Buffer | null> {
  // Niconico — use CDN URLs (L → M → default)
  if (links.niconicoLink) {
    const id = extractNiconicoId(links.niconicoLink);
    if (id) {
      const numericId = id.replace(/^sm/, "");
      const urls = [
        `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}.L`,
        `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}.M`,
        `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}`,
      ];
      for (const url of urls) {
        const buf = await fetchImage(url);
        if (buf) return buf;
      }
    }
  }

  // YouTube — direct thumbnail URL
  if (links.youtubeLink) {
    const id = extractYouTubeId(links.youtubeLink);
    if (id) {
      const buf = await fetchImage(
        `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      );
      if (buf) return buf;
    }
  }

  // Spotify — oEmbed → thumbnail_url
  if (links.spotifyLink) {
    const trackId = extractSpotifyId(links.spotifyLink);
    if (trackId) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(oembedUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data.thumbnail_url) {
            const buf = await fetchImage(data.thumbnail_url);
            if (buf) return buf;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractColorRequest = await request.json();

    if (!body.niconicoLink && !body.youtubeLink && !body.spotifyLink) {
      return NextResponse.json({ color: null });
    }

    const imageBuffer = await resolveImageBuffer(body);
    if (!imageBuffer) {
      logger.debug("[Color API] No image could be fetched from provided links");
      return NextResponse.json({ color: null });
    }

    const vibrant = new Vibrant(imageBuffer);
    const palette = await vibrant.getPalette();

    // Access the full quantized color list (default 64 colors) for true
    // population-based selection instead of the 6 named swatches.
    const allColors: Swatch[] = vibrant.result?.colors ?? [];

    // Filter out near-white (L > 90%) and near-black (L < 10%) which
    // aren't useful as UI accent colors, then pick the most frequent.
    const candidates = allColors.filter((s) => {
      const [, , l] = s.hsl;
      return l > 0.1 && l < 0.9;
    });

    const swatch =
      candidates.length > 0
        ? candidates.reduce((best, cur) =>
            cur.population > best.population ? cur : best
          )
        : // Fallback to named swatches if all quantized colors were filtered out
          palette.Vibrant ??
          palette.Muted ??
          palette.DarkVibrant ??
          palette.LightVibrant ??
          palette.DarkMuted ??
          palette.LightMuted;

    if (!swatch) {
      logger.debug("[Color API] No swatch extracted from image");
      return NextResponse.json({ color: null });
    }

    const hex = swatch.hex;
    const pastel = toPastelHex(hex);

    logger.debug(`[Color API] Extracted ${hex} → pastel ${pastel}`);

    return NextResponse.json(
      { color: pastel },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    logger.error("[Color API] Unexpected error:", error);
    return NextResponse.json({ color: null }, { status: 200 });
  }
}
