import { getMedleyByVideoId, getMedleyEditHistory } from "@/lib/api/medleys";
import type { SongSection, MedleyMeta, MedleyEditEntry } from "../types";

/**
 * Supabase JS versions of query functions.
 * No "use server" directive — these use public env vars only and work in Firebase.
 */

export async function fetchMedley(
  videoId: string
): Promise<MedleyMeta | null> {
  const data = await getMedleyByVideoId(videoId);
  if (!data || !data.id) return null;

  return {
    id: data.id,
    videoId: data.videoId,
    platform: (data.platform ?? "niconico") as MedleyMeta["platform"],
    title: data.title,
    creator: data.creator || undefined,
    duration: data.duration,
    lastEditor: data.lastEditor,
    lastEditedAt: data.lastEditedAt ?? undefined,
    createdAt: data.createdAt ?? undefined,
    updatedAt: data.updatedAt ?? undefined,
  };
}

export async function fetchMedleySongs(
  videoId: string
): Promise<SongSection[]> {
  const data = await getMedleyByVideoId(videoId);
  if (!data) return [];

  return data.songs.map((song, index) => ({
    id: String(song.id ?? crypto.randomUUID()),
    songId: song.songId ?? undefined,
    orderIndex: index + 1,
    title: song.title ?? "",
    artist: Array.isArray(song.artist) ? song.artist : ["Unknown Artist"],
    composers: song.composers,
    arrangers: song.arrangers,
    startTime: song.startTime ?? 0,
    endTime: song.endTime ?? 0,
    color: song.color ?? "#4299e1",
    niconicoLink: song.niconicoLink ?? undefined,
    youtubeLink: song.youtubeLink ?? undefined,
    spotifyLink: song.spotifyLink ?? undefined,
    applemusicLink: song.applemusicLink ?? undefined,
  }));
}

export async function fetchEditHistory(
  medleyId: string,
  limit = 20
): Promise<MedleyEditEntry[]> {
  const history = await getMedleyEditHistory(medleyId, limit);

  return history.map((entry) => ({
    id: entry.id,
    editorNickname: entry.editorNickname,
    action: entry.action,
    changes: entry.changes,
    createdAt: entry.createdAt,
  }));
}
