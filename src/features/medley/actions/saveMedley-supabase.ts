import {
  saveMedleySongs as supabaseSaveSongs,
  restoreFromEditHistory,
} from "@/lib/api/medleys";
import type { SongSection, MedleySnapshot } from "../types";

// Input sanitization (kept from Drizzle version)
function sanitizeString(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export async function saveMedleySongs(
  videoId: string,
  songs: Omit<SongSection, "id">[],
  editorNickname: string,
  medleyMeta?: { title: string; creator?: string; duration: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    // First we need the medley ID from the video ID
    const { getMedleyByVideoId } = await import("@/lib/api/medleys");
    const medley = await getMedleyByVideoId(videoId);
    if (!medley) return { success: false, error: "Medley not found" };

    const sanitizedNick = sanitizeString(editorNickname);

    // Update medley metadata if provided
    if (medleyMeta) {
      const { supabase } = await import("@/lib/supabase");
      if (supabase) {
        await supabase
          .from("medleys")
          .update({
            title: medleyMeta.title
              ? sanitizeString(medleyMeta.title)
              : undefined,
            creator: medleyMeta.creator
              ? sanitizeString(medleyMeta.creator)
              : undefined,
            duration: medleyMeta.duration,
            last_editor: sanitizedNick || null,
            last_edited_at: new Date().toISOString(),
          })
          .eq("id", medley.id as string);
      }
    }

    // Use existing Supabase saveMedleySongs (which handles delete+insert+history)
    const success = await supabaseSaveSongs(
      medley.id as string,
      songs,
      sanitizedNick || undefined,
      medleyMeta
    );

    if (!success) {
      return { success: false, error: "Failed to save songs" };
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

export async function restoreFromSnapshot(
  editHistoryId: string,
  editorNickname: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await restoreFromEditHistory(editHistoryId, editorNickname);
    if (!result) {
      return { success: false, error: "Failed to restore snapshot" };
    }
    return { success: true };
  } catch (error) {
    console.error("restoreFromSnapshot error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
