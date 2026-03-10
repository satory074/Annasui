"use server";

import { db } from "@/lib/db";
import { medleys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function updateMedleyBpm(
  videoId: string,
  bpm: number | null,
  beatOffset: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(medleys)
      .set({
        bpm: bpm,
        beatOffset: beatOffset,
        updatedAt: new Date(),
      })
      .where(eq(medleys.videoId, videoId));

    return { success: true };
  } catch (error) {
    console.error("updateMedleyBpm error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
