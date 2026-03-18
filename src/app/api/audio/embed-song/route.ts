/**
 * POST /api/audio/embed-song/
 *
 * song_master の楽曲を MuQ で埋め込み、Supabase に保存する。
 * ライブラリページの「埋め込み更新」ボタンから呼び出される。
 *
 * Request body (JSON):
 *   { songId: string }          — 個別の楽曲を埋め込む
 *   { songIds: string[] }       — 複数楽曲を一括埋め込む
 *   { all: true }               — embedding が NULL の全楽曲を埋め込む
 *
 * 環境変数:
 *   MUQEXTRACTOR_URL  (default: http://localhost:8000)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MUQEXTRACTOR_URL =
  process.env.MUQEXTRACTOR_URL ?? "http://localhost:8000";

interface EmbedRequest {
  songId?: string;
  songIds?: string[];
  all?: boolean;
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body: EmbedRequest = await req.json().catch(() => ({}));

  // 対象 song_id 列を決定
  let targetIds: string[];

  if (body.all) {
    // embedding が NULL の全楽曲
    const { data, error } = await supabase
      .from("song_master")
      .select("id, niconico_link, youtube_link, spotify_link")
      .is("embedding", null)
      .limit(500); // 安全上限

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type IdRow = { id: string };
    targetIds = ((data ?? []) as IdRow[]).map((r) => r.id);
  } else if (body.songIds) {
    targetIds = body.songIds;
  } else if (body.songId) {
    targetIds = [body.songId];
  } else {
    return NextResponse.json(
      { error: "songId, songIds, or all=true is required" },
      { status: 400 }
    );
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ updated: 0, message: "No songs to embed" });
  }

  // 楽曲情報を取得
  const { data: songs, error: songsError } = await supabase
    .from("song_master")
    .select("id, title, niconico_link, youtube_link, spotify_link")
    .in("id", targetIds);

  if (songsError) {
    return NextResponse.json({ error: songsError.message }, { status: 500 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const song of songs ?? []) {
    // 楽曲のリンクから音声 URL を推定
    const audioSourceUrl =
      song.niconico_link ??
      song.youtube_link ??
      song.spotify_link ??
      null;

    try {
      // MuQ サーバーにタイトル+URLを送って楽曲埋め込みを取得
      const muqRes = await fetch(`${MUQEXTRACTOR_URL}/embed-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song_id: song.id,
          title: song.title,
          audio_url: audioSourceUrl,
        }),
      });

      if (!muqRes.ok) {
        const errText = await muqRes.text().catch(() => "");
        errors.push(`${song.id}: ${muqRes.status} ${errText}`);
        continue;
      }

      const { embedding } = await muqRes.json() as { embedding: number[] };

      // Supabase に保存
      const { error: upsertError } = await supabase
        .from("song_master")
        .update({ embedding } as Record<string, unknown>)
        .eq("id", (song as { id: string }).id);

      if (upsertError) {
        errors.push(`${song.id}: ${upsertError.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${song.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    updated,
    total: targetIds.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
