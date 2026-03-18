/**
 * POST /api/audio/analyze/
 *
 * マルチパート受信 (audio/wav + medley_id) →
 * MuQ Feature Server に転送して埋め込み取得 →
 * song_master 埋め込みを Supabase から取得 →
 * TypeScript medleyDetector を実行 →
 * 検出区間を返す
 *
 * 環境変数:
 *   MUQEXTRACTOR_URL  (default: http://localhost:8000)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { detectSegments, segmentsToParsedEntries } from "@/lib/audio/medleyDetector";
import type { SongEmbedding } from "@/lib/audio/songMatcher";

const MUQEXTRACTOR_URL =
  process.env.MUQEXTRACTOR_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const medleyId = formData.get("medley_id") as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: "audio field is required" }, { status: 400 });
    }

    // ── Step 1: MuQ Feature Server に音声を送信して埋め込み取得 ──
    const muqForm = new FormData();
    muqForm.append("audio", audioFile, "audio.wav");

    const muqRes = await fetch(`${MUQEXTRACTOR_URL}/embed`, {
      method: "POST",
      body: muqForm,
    }).catch((err) => {
      throw new Error(`MuQ server unreachable: ${err.message}`);
    });

    if (!muqRes.ok) {
      const errText = await muqRes.text().catch(() => "");
      throw new Error(`MuQ server error ${muqRes.status}: ${errText}`);
    }

    const muqData = await muqRes.json() as {
      embeddings: number[][];
      hop_sec: number;
    };

    const hopSec: number = muqData.hop_sec ?? 1.0;
    const embeddings: Float32Array[] = muqData.embeddings.map(
      (row) => new Float32Array(row)
    );

    // ── Step 2: song_master 埋め込みを Supabase から取得 ──
    let candidates: SongEmbedding[] = [];
    let songInfoMap = new Map<string, { title: string; artist: string }>();

    if (supabase) {
      // pgvector カラム "embedding" を取得（NULL除外）
      const { data, error } = await supabase
        .from("song_master")
        .select("id, title, artist, embedding")
        .not("embedding", "is", null)
        .limit(10000);

      if (!error && data) {
        type SongRow = { id: string; title: string; artist: string | null; embedding: number[] | null };
        const rows = data as SongRow[];
        candidates = rows
          .filter((row) => row.embedding != null)
          .map((row) => ({
            songId: row.id,
            embedding: new Float32Array(row.embedding as number[]),
          }));

        songInfoMap = new Map(
          rows.map((row) => [
            row.id,
            { title: row.title, artist: row.artist ?? "" },
          ])
        );
      }
    }

    // ── Step 3: メドレー総時間を取得（medley_id が渡された場合） ──
    let totalDurationSec: number | null = null;
    if (medleyId && supabase) {
      const { data } = await supabase
        .from("medleys")
        .select("duration")
        .eq("id", medleyId as string)
        .single();
      if (data) totalDurationSec = (data as { duration: number }).duration;
    }

    // ── Step 4: TypeScript medleyDetector 実行 ──
    const segments = detectSegments(
      embeddings,
      hopSec,
      totalDurationSec,
      candidates
    );

    const entries = segmentsToParsedEntries(segments, songInfoMap);

    return NextResponse.json({
      segments,
      entries,
      meta: {
        totalFrames: embeddings.length,
        hopSec,
        candidateCount: candidates.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
