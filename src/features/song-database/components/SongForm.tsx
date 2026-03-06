"use client";

import { useState } from "react";
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
    mode: "onBlur",
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

  // Check if any platform links have values (for initial state)
  const hasExistingLinks = !!(
    defaultValues?.niconicoLink ||
    defaultValues?.youtubeLink ||
    defaultValues?.spotifyLink ||
    defaultValues?.applemusicLink
  );
  const [showPlatformLinks, setShowPlatformLinks] = useState(hasExistingLinks);

  // Count filled platform links
  const watchedValues = form.watch(["niconicoLink", "youtubeLink", "spotifyLink", "applemusicLink"]);
  const filledLinkCount = watchedValues.filter((v) => v && v.trim()).length;

  const platformFields = ["niconicoLink", "youtubeLink", "spotifyLink", "applemusicLink"] as const;
  const labels: Record<string, string> = {
    niconicoLink: "ニコニコ動画",
    youtubeLink: "YouTube",
    spotifyLink: "Spotify",
    applemusicLink: "Apple Music",
  };
  const placeholders: Record<string, string> = {
    niconicoLink: "https://www.nicovideo.jp/...",
    youtubeLink: "https://www.youtube.com/...",
    spotifyLink: "https://open.spotify.com/...",
    applemusicLink: "https://music.apple.com/...",
  };

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

        {/* Progressive Disclosure for Platform Links */}
        <div>
          <button
            type="button"
            onClick={() => setShowPlatformLinks(!showPlatformLinks)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showPlatformLinks ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            プラットフォームリンクを追加
            {filledLinkCount > 0 ? (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                {filledLinkCount}/4
              </span>
            ) : (
              <span className="text-xs text-gray-400">（省略可）</span>
            )}
          </button>

          {showPlatformLinks && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 border-l-2 border-gray-200">
              {platformFields.map((name) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{labels[name]}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={placeholders[name]}
                            className="text-gray-900 pr-8"
                            {...field}
                          />
                          {field.value && !fieldState.invalid && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          {fieldState.invalid && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
