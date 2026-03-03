import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { medleys } from "@/lib/db/schema";

export const insertMedleySchema = createInsertSchema(medleys, {
  videoId: z.string().min(1, "動画IDは必須です"),
  title: z.string().min(1, "タイトルは必須です").max(200),
  platform: z.enum(["niconico", "youtube", "spotify", "appleMusic"]),
  duration: z.number().positive("再生時間は正の数です"),
});

export const medleyFormSchema = z.object({
  videoId: z.string().min(1, "動画IDは必須です"),
  title: z.string().min(1, "タイトルは必須です").max(200),
  creator: z.string().optional().default(""),
  platform: z.enum(["niconico", "youtube", "spotify", "appleMusic"]),
  duration: z.number().positive("再生時間は正の数です"),
});

export type MedleyFormValues = z.infer<typeof medleyFormSchema>;
