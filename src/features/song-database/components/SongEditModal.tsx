"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SongForm } from "./SongForm";
import type { SongFormValues } from "@/lib/validators/song";

interface SongEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: {
    id: string;
    title: string;
    artist?: string;
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
  } | null;
  onSave: (id: string, data: SongFormValues) => void | Promise<void>;
  isSaving?: boolean;
}

export function SongEditModal({
  open,
  onOpenChange,
  song,
  onSave,
  isSaving,
}: SongEditModalProps) {
  if (!song) return null;

  const handleSubmit = async (data: SongFormValues) => {
    await onSave(song.id, data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>楽曲を編集</DialogTitle>
        </DialogHeader>

        <SongForm
          defaultValues={{
            title: song.title,
            artist: song.artist ?? "",
            niconicoLink: song.niconicoLink ?? "",
            youtubeLink: song.youtubeLink ?? "",
            spotifyLink: song.spotifyLink ?? "",
            applemusicLink: song.applemusicLink ?? "",
          }}
          onSubmit={handleSubmit}
          submitLabel="更新"
          isSubmitting={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
