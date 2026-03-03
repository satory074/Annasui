"use server";

import { db } from "@/lib/db";
import { medleySongs, medleyEdits, medleys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function deleteMedleySong(
  songRowId: string,
  editorNickname: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the song to find the medley
    const song = await db.query.medleySongs.findFirst({
      where: eq(medleySongs.id, songRowId),
    });
    if (!song) return { success: false, error: "Song not found" };

    await db.delete(medleySongs).where(eq(medleySongs.id, songRowId));

    // Record edit history
    await db.insert(medleyEdits).values({
      medleyId: song.medleyId,
      editorNickname,
      action: "delete_song",
      changes: { title: song.title, artist: song.artist },
    });

    return { success: true };
  } catch (error) {
    console.error("deleteMedleySong error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function restoreFromSnapshot(
  editHistoryId: string,
  editorNickname: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const edit = await db.query.medleyEdits.findFirst({
      where: eq(medleyEdits.id, editHistoryId),
    });
    if (!edit) return { success: false, error: "Edit history not found" };

    const changes = edit.changes as Record<string, unknown> | null;
    const snapshot = changes?.snapshot as
      | { title: string; creator?: string; duration: number; songs: unknown[] }
      | undefined;

    if (!snapshot) return { success: false, error: "No snapshot in edit" };
    if (!edit.medleyId) return { success: false, error: "No medley ID" };

    // Get medley to find videoId
    const medley = await db.query.medleys.findFirst({
      where: eq(medleys.id, edit.medleyId),
    });
    if (!medley) return { success: false, error: "Medley not found" };

    // Update medley metadata
    await db
      .update(medleys)
      .set({
        title: snapshot.title,
        creator: snapshot.creator || null,
        duration: snapshot.duration,
        lastEditor: editorNickname,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(medleys.id, edit.medleyId));

    // Delete current songs and insert snapshot songs
    await db
      .delete(medleySongs)
      .where(eq(medleySongs.medleyId, edit.medleyId));

    if (snapshot.songs.length > 0) {
      const rows = (snapshot.songs as Array<Record<string, unknown>>).map(
        (song, index) => ({
          medleyId: edit.medleyId!,
          songId: (song.songId as string) || null,
          orderIndex: index + 1,
          startTime: (song.startTime as number) ?? 0,
          endTime: (song.endTime as number) ?? 0,
          title: (song.title as string) ?? "Untitled",
          artist: Array.isArray(song.artist)
            ? (song.artist as string[]).join(", ")
            : ((song.artist as string) ?? "Unknown Artist"),
          color: (song.color as string) ?? "#4299e1",
          niconicoLink: (song.niconicoLink as string) || null,
          youtubeLink: (song.youtubeLink as string) || null,
          spotifyLink: (song.spotifyLink as string) || null,
          applemusicLink: (song.applemusicLink as string) || null,
          lastEditor: editorNickname,
          lastEditedAt: new Date(),
        })
      );

      await db.insert(medleySongs).values(rows);
    }

    // Record the restore in edit history
    await db.insert(medleyEdits).values({
      medleyId: edit.medleyId,
      editorNickname,
      action: "restore_snapshot",
      changes: { restoredFrom: editHistoryId, songCount: snapshot.songs.length },
    });

    return { success: true };
  } catch (error) {
    console.error("restoreFromSnapshot error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
