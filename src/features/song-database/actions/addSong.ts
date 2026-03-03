"use server";

import { db } from "@/lib/db";
import { songMaster } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeSongInfo } from "../utils/normalize";

interface AddSongInput {
  title: string;
  artist?: string;
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}

export async function addSongToDatabase(
  input: AddSongInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const title = input.title.trim();
    if (!title) return { success: false, error: "楽曲名は必須です" };

    const artist = input.artist?.trim() || "Unknown Artist";
    const normalizedId = normalizeSongInfo(title, artist);

    // Check for duplicates
    const existing = await db.query.songMaster.findFirst({
      where: eq(songMaster.normalizedId, normalizedId),
    });

    if (existing) {
      return {
        success: false,
        error: "同じ楽曲が既に登録されています",
      };
    }

    const [inserted] = await db
      .insert(songMaster)
      .values({
        title,
        artist,
        normalizedId,
        niconicoLink: input.niconicoLink?.trim() || null,
        youtubeLink: input.youtubeLink?.trim() || null,
        spotifyLink: input.spotifyLink?.trim() || null,
        applemusicLink: input.applemusicLink?.trim() || null,
      })
      .returning();

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error("addSongToDatabase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateSongInDatabase(
  id: string,
  input: AddSongInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const title = input.title.trim();
    if (!title) return { success: false, error: "楽曲名は必須です" };

    const artist = input.artist?.trim() || "Unknown Artist";
    const normalizedId = normalizeSongInfo(title, artist);

    await db
      .update(songMaster)
      .set({
        title,
        artist,
        normalizedId,
        niconicoLink: input.niconicoLink?.trim() || null,
        youtubeLink: input.youtubeLink?.trim() || null,
        spotifyLink: input.spotifyLink?.trim() || null,
        applemusicLink: input.applemusicLink?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(songMaster.id, id));

    return { success: true };
  } catch (error) {
    console.error("updateSongInDatabase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteSongFromDatabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(songMaster).where(eq(songMaster.id, id));
    return { success: true };
  } catch (error) {
    console.error("deleteSongFromDatabase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
