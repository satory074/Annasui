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

    function isSkinTone(s: Swatch): boolean {
      const [h, sat, l] = s.hsl;
      const hDeg = h * 360;
      return hDeg >= 10 && hDeg <= 50 && sat > 0.15 && sat < 0.65 && l > 0.2 && l < 0.8;
    }

    function isLowSaturation(s: Swatch): boolean {
      return s.hsl[1] < 0.15;
    }

    const namedSwatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ];

    // Pass 1: Named swatch that is neither skin tone nor low saturation
    let swatch: Swatch | null = null;
    let source = "none";
    for (const candidate of namedSwatches) {
      if (candidate && !isSkinTone(candidate) && !isLowSaturation(candidate)) {
        swatch = candidate;
        source = "named";
        break;
      }
    }

    // Pass 2: Quantized colors with saturation-dominant scoring
    if (!swatch) {
      const allColors: Swatch[] = vibrant.result?.colors ?? [];
      const quantizedCandidates = allColors.filter((s) => {
        const [, sat, l] = s.hsl;
        return sat > 0.35 && l > 0.1 && l < 0.9 && !isSkinTone(s);
      });
      if (quantizedCandidates.length > 0) {
        swatch = quantizedCandidates.reduce((best, cur) => {
          const scoreCur = Math.pow(cur.hsl[1], 2) * Math.pow(cur.population, 0.5);
          const scoreBest = Math.pow(best.hsl[1], 2) * Math.pow(best.population, 0.5);
          return scoreCur > scoreBest ? cur : best;
        });
        source = "quantized";
      }
    }

    // Pass 3: Any non-null named swatch (skin tone acceptable)
    if (!swatch) {
      swatch = namedSwatches.find((s) => s != null) ?? null;
      if (swatch) source = "fallback";
    }

    if (!swatch) {
      logger.debug("[Color API] No swatch extracted from image");
      return NextResponse.json({ color: null });
    }

    const [hDbg, sDbg] = swatch.hsl;
    logger.debug(
      `[Color API] Winner (${source}): hue=${(hDbg * 360).toFixed(0)}° sat=${(sDbg * 100).toFixed(0)}% pop=${swatch.population}`
    );

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
