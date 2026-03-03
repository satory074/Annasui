"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { songFormSchema, type SongFormValues } from "@/lib/validators/song";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SongFormProps {
  defaultValues?: Partial<SongFormValues>;
  onSubmit: (data: SongFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function SongForm({
  defaultValues,
  onSubmit,
  submitLabel = "保存",
  isSubmitting = false,
}: SongFormProps) {
  const form = useForm({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: "",
      artist: "",
      niconicoLink: "",
      youtubeLink: "",
      spotifyLink: "",
      applemusicLink: "",
      ...defaultValues,
    } as SongFormValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data as SongFormValues))} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>楽曲名 *</FormLabel>
              <FormControl>
                <Input
                  placeholder="楽曲名を入力"
                  className="text-gray-900"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="artist"
          render={({ field }) => (
            <FormItem>
              <FormLabel>アーティスト名</FormLabel>
              <FormControl>
                <Input
                  placeholder="アーティスト名を入力"
                  className="text-gray-900"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-gray-500">
                ※ 空欄の場合、自動的に「Unknown Artist」として登録されます
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="niconicoLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ニコニコ動画</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://www.nicovideo.jp/..."
                    className="text-gray-900"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="youtubeLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://www.youtube.com/..."
                    className="text-gray-900"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="spotifyLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spotify</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://open.spotify.com/..."
                    className="text-gray-900"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="applemusicLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apple Music</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://music.apple.com/..."
                    className="text-gray-900"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
