import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { songMaster, medleySongs } from "@/lib/db/schema";

// DB schema → Zod schema (auto-generated, always in sync)
export const insertSongMasterSchema = createInsertSchema(songMaster, {
  title: z.string().min(1, "楽曲名は必須です").max(200),
  artist: z.string().optional(),
  niconicoLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  youtubeLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  spotifyLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  applemusicLink: z.string().url("無効なURLです").optional().or(z.literal("")),
});

export const selectSongMasterSchema = createSelectSchema(songMaster);

// Form schema (user-facing fields only)
export const songFormSchema = z.object({
  title: z.string().min(1, "楽曲名は必須です").max(200),
  artist: z.string().optional().default(""),
  niconicoLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  youtubeLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  spotifyLink: z.string().url("無効なURLです").optional().or(z.literal("")),
  applemusicLink: z.string().url("無効なURLです").optional().or(z.literal("")),
});

export type SongFormValues = z.infer<typeof songFormSchema>;

// Medley song (timeline entry) schema
export const insertMedleySongSchema = createInsertSchema(medleySongs, {
  startTime: z.number().min(0, "開始時間は0以上"),
  endTime: z.number().min(0, "終了時間は0以上"),
  title: z.string().min(1, "楽曲名は必須です"),
});

export const medleySongFormSchema = z.object({
  title: z.string().min(1, "楽曲名は必須です"),
  artist: z.string().optional().default(""),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  color: z.string().default("#4299e1"),
  niconicoLink: z.string().optional().default(""),
  youtubeLink: z.string().optional().default(""),
  spotifyLink: z.string().optional().default(""),
  applemusicLink: z.string().optional().default(""),
});

export type MedleySongFormValues = z.infer<typeof medleySongFormSchema>;
