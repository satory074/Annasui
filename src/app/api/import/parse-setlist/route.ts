import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

interface ParsedSong {
  startTime: string;
  title: string;
  artist: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text: string };

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = `以下のテキストはメドレー動画のセットリスト（曲目リスト）です。
このテキストを解析して、各楽曲の情報をJSON形式で抽出してください。

テキスト:
"""
${text}
"""

以下のJSON配列形式のみを返してください（説明や他のテキストは一切含めないでください）:
[
  {
    "startTime": "MM:SS または HH:MM:SS 形式の開始時間（不明な場合は空文字）",
    "title": "曲名",
    "artist": ["アーティスト名1", "アーティスト名2"]
  }
]

注意:
- 開始時間が不明な場合は "" （空文字）を使用してください
- アーティスト名が不明な場合は [] （空配列）を使用してください
- JSON配列以外のテキストは絶対に含めないでください
- コードブロック（\`\`\`）も含めないでください`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      logger.error("[AI Parser] Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    logger.debug("[AI Parser] Gemini response length:", content.length);

    // Extract JSON array from response (strip any surrounding text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.error("[AI Parser] Could not find JSON array in response:", content.substring(0, 200));
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 422 }
      );
    }

    let songs: ParsedSong[];
    try {
      songs = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error("[AI Parser] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in AI response" },
        { status: 422 }
      );
    }

    // Normalize: ensure artist is always an array
    songs = songs.map((s) => ({
      startTime: s.startTime ?? "",
      title: String(s.title ?? "").trim(),
      artist: Array.isArray(s.artist) ? s.artist.map(String) : [],
    }));

    logger.debug("[AI Parser] Parsed songs:", songs.length);
    return NextResponse.json({ songs });
  } catch (error) {
    logger.error("[AI Parser] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
