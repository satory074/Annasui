import { z } from "zod";

export const loginSchema = z.object({
  nickname: z
    .string()
    .min(1, "ニックネームを入力してください")
    .max(50, "ニックネームは50文字以内で入力してください")
    .transform((v) => v.trim()),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
