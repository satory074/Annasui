"use server";

import { db } from "@/lib/db";
import { medleys, medleySongs, medleyEdits, songMaster } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { SongSection, MedleySnapshot } from "../types";

// Input sanitization
function sanitizeString(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const allowed = [
      "nicovideo.jp", "www.nicovideo.jp", "nico.ms",
      "youtube.com", "www.youtube.com", "youtu.be",
      "spotify.com", "open.spotify.com",
      "music.apple.com", "apple.co",
    ];
    const host = parsed.hostname.toLowerCase();
    if (!allowed.some((d) => host === d || host.endsWith("." + d))) return null;
    return url.trim();
  } catch {
    return null;
  }
}

function normalizeSongInfo(title: string, artist: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s　]+/g, "")
      .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return `${normalize(title)}_${normalize(artist)}`;
}

// Look up song_master IDs for a batch of songs
async function lookupSongIds(
  songs: Array<{ title: string; artist: string }>
): Promise<Map<string, string>> {
  const normalizedIds = songs.map((s) => normalizeSongInfo(s.title, s.artist || ""));
  const unique = [...new Set(normalizedIds)];
  if (!unique.length) return new Map();

  const masters = await db
    .select({ id: songMaster.id, normalizedId: songMaster.normalizedId })
    .from(songMaster)
    .where(inArray(songMaster.normalizedId, unique));

  const map = new Map<string, string>();
  masters.forEach((m) => {
    if (m.normalizedId) map.set(m.normalizedId, m.id);
  });
  return map;
}

export async function saveMedleySongs(
  videoId: string,
  songs: Omit<SongSection, "id">[],
  editorNickname: string,
  medleyMeta?: { title: string; creator?: string; duration: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get medley
    const medley = await db.query.medleys.findFirst({
      where: eq(medleys.videoId, videoId),
    });
    if (!medley) return { success: false, error: "Medley not found" };

    const sanitizedNick = sanitizeString(editorNickname);

    // Update medley metadata
    await db
      .update(medleys)
      .set({
        title: medleyMeta?.title ? sanitizeString(medleyMeta.title) : undefined,
        creator: medleyMeta?.creator ? sanitizeString(medleyMeta.creator) : undefined,
        duration: medleyMeta?.duration,
        lastEditor: sanitizedNick || null,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(medleys.id, medley.id));

    // Delete existing songs
    await db.delete(medleySongs).where(eq(medleySongs.medleyId, medley.id));

    // Look up song_master IDs for songs without songId
    const needLookup = songs
      .filter((s) => !s.songId)
      .map((s) => ({
        title: s.title,
        artist: Array.isArray(s.artist) ? s.artist.join(", ") : (s.artist || ""),
      }));
    const songIdMap = needLookup.length ? await lookupSongIds(needLookup) : new Map();

    // Insert new songs
    if (songs.length > 0) {
      const rows = songs.map((song, index) => {
        const artistStr = Array.isArray(song.artist) ? song.artist.join(", ") : (song.artist || "");

        let resolvedSongId: string | null = song.songId || null;
        if (!resolvedSongId) {
          const nid = normalizeSongInfo(song.title, artistStr);
          resolvedSongId = songIdMap.get(nid) || null;
        }

        return {
          medleyId: medley.id,
          songId: resolvedSongId,
          orderIndex: index + 1,
          startTime: song.startTime,
          endTime: song.endTime,
          title: sanitizeString(song.title) || "Untitled",
          artist: artistStr || "Unknown Artist",
          composers: song.composers?.join(", ") || null,
          arrangers: song.arrangers?.join(", ") || null,
          color: song.color || "#4299e1",
          niconicoLink: sanitizeUrl(song.niconicoLink),
          youtubeLink: sanitizeUrl(song.youtubeLink),
          spotifyLink: sanitizeUrl(song.spotifyLink),
          applemusicLink: sanitizeUrl(song.applemusicLink),
          lastEditor: sanitizedNick || null,
          lastEditedAt: new Date(),
        };
      });

      await db.insert(medleySongs).values(rows);
    }

    // Record edit history with snapshot
    if (sanitizedNick && medleyMeta) {
      const snapshot: MedleySnapshot = {
        title: medleyMeta.title,
        creator: medleyMeta.creator,
        duration: medleyMeta.duration,
        songs,
      };

      await db.insert(medleyEdits).values({
        medleyId: medley.id,
        editorNickname: sanitizedNick,
        action: "update_medley",
        changes: { snapshot, songCount: songs.length },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("saveMedleySongs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function createMedley(
  videoId: string,
  platform: string,
  title: string,
  creator: string,
  duration: number,
  editorNickname: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [medley] = await db
      .insert(medleys)
      .values({
        videoId,
        platform,
        title: sanitizeString(title),
        creator: sanitizeString(creator) || null,
        duration,
        lastEditor: sanitizeString(editorNickname) || null,
        lastEditedAt: new Date(),
      })
      .returning();

    if (editorNickname) {
      await db.insert(medleyEdits).values({
        medleyId: medley.id,
        editorNickname: sanitizeString(editorNickname),
        action: "create_medley",
        changes: { title, songCount: 0 },
      });
    }

    return { success: true, id: medley.id };
  } catch (error) {
    console.error("createMedley error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
