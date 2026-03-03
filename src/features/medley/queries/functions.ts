"use server";

import { db } from "@/lib/db";
import { medleys, medleySongs, medleyEdits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type {
  SongSection,
  MedleyMeta,
  MedleyEditEntry,
} from "@/features/medley/types";

// =============================================================================
// Server actions — callable from both Server Components and Client Components
// =============================================================================

export async function fetchMedley(
  videoId: string
): Promise<MedleyMeta | null> {
  const result = await db.query.medleys.findFirst({
    where: eq(medleys.videoId, videoId),
  });

  if (!result) return null;

  return {
    id: result.id,
    videoId: result.videoId,
    platform: result.platform as MedleyMeta["platform"],
    title: result.title,
    creator: result.creator ?? undefined,
    duration: result.duration ?? 0,
    lastEditor: result.lastEditor ?? undefined,
    lastEditedAt: result.lastEditedAt?.toISOString(),
    createdAt: result.createdAt?.toISOString(),
    updatedAt: result.updatedAt?.toISOString(),
  };
}

export async function fetchMedleySongs(
  videoId: string
): Promise<SongSection[]> {
  // First get the medley ID
  const medley = await db.query.medleys.findFirst({
    where: eq(medleys.videoId, videoId),
  });

  if (!medley) return [];

  const rows = await db.query.medleySongs.findMany({
    where: eq(medleySongs.medleyId, medley.id),
    orderBy: medleySongs.orderIndex,
  });

  return rows.map((row) => ({
    id: row.id,
    songId: row.songId ?? undefined,
    orderIndex: row.orderIndex ?? 0,
    title: row.title ?? "",
    artist: row.artist
      ? row.artist
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : ["Unknown Artist"],
    composers: row.composers
      ? row.composers
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined,
    arrangers: row.arrangers
      ? row.arrangers
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : undefined,
    startTime: row.startTime ?? 0,
    endTime: row.endTime ?? 0,
    color: row.color ?? "#4299e1",
    niconicoLink: row.niconicoLink ?? undefined,
    youtubeLink: row.youtubeLink ?? undefined,
    spotifyLink: row.spotifyLink ?? undefined,
    applemusicLink: row.applemusicLink ?? undefined,
  }));
}

export async function fetchEditHistory(
  medleyId: string,
  limit = 20
): Promise<MedleyEditEntry[]> {
  const rows = await db
    .select()
    .from(medleyEdits)
    .where(eq(medleyEdits.medleyId, medleyId))
    .orderBy(desc(medleyEdits.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    editorNickname: row.editorNickname,
    action: row.action,
    changes: (row.changes as Record<string, unknown>) ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  }));
}

export async function fetchAllMedleys(): Promise<MedleyMeta[]> {
  const rows = await db.query.medleys.findMany({
    orderBy: desc(medleys.createdAt),
  });

  return rows.map((row) => ({
    id: row.id,
    videoId: row.videoId,
    platform: row.platform as MedleyMeta["platform"],
    title: row.title,
    creator: row.creator ?? undefined,
    duration: row.duration ?? 0,
    lastEditor: row.lastEditor ?? undefined,
    lastEditedAt: row.lastEditedAt?.toISOString(),
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  }));
}
