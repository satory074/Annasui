"use client";

import { useState, useEffect } from "react";
import { SongDatabaseEntry, updateManualSong, deleteManualSong } from "@/lib/utils/songDatabase";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongThumbnail from "@/components/ui/song/SongThumbnail";
import ArtistSelector from "@/components/ui/form/ArtistSelector";
import { logger } from "@/lib/utils/logger";

interface Artist {
  id: string;
  name: string;
}

interface SongDatabaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongDatabaseEntry | null;
  onSave: (song: SongDatabaseEntry) => void;
  onDelete?: () => void;
}

export default function SongDatabaseEditModal({
  isOpen,
  onClose,
  song,
  onSave,
  onDelete
}: SongDatabaseEditModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    artist: Artist[];
    composers: Artist[];
    arrangers: Artist[];
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
  }>({
    title: "",
    artist: [],
    composers: [],
    arrangers: [],
    niconicoLink: "",
    youtubeLink: "",
    spotifyLink: "",
    applemusicLink: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form data when modal opens or song changes
  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || "",
        artist: song.artist || [],
        composers: song.composers || [],
        arrangers: song.arrangers || [],
        niconicoLink: song.niconicoLink || "",
        youtubeLink: song.youtubeLink || "",
        spotifyLink: song.spotifyLink || "",
        applemusicLink: song.applemusicLink || ""
      });
      setErrors({});
    }
  }, [song]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "楽曲名を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!song || !validateForm()) return;

    setIsSaving(true);

    try {
      const updatedSong = await updateManualSong({
        id: song.id,
        title: formData.title.trim(),
        artist: formData.artist.map(a => a.name),
        composers: formData.composers.map(c => c.name),
        arrangers: formData.arrangers.map(a => a.name),
        niconicoLink: formData.niconicoLink?.trim() || undefined,
        youtubeLink: formData.youtubeLink?.trim() || undefined,
        spotifyLink: formData.spotifyLink?.trim() || undefined,
        applemusicLink: formData.applemusicLink?.trim() || undefined
      });

      logger.info('Song updated successfully', { songId: song.id, title: formData.title });
      onSave(updatedSong);
      onClose();
    } catch (error) {
      logger.error('Failed to save song', error);
      alert('楽曲の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!song) return;

    if (!confirm(`「${song.title}」を削除しますか？\n\nこの楽曲がメドレーで使用されている場合、紐付けが解除されます。\nこの操作は取り消せません。`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteManualSong(song.id);
      logger.info('Song deleted successfully', { songId: song.id, title: song.title });
      onDelete?.();
      onClose();
    } catch (error) {
      logger.error('Failed to delete song', error);
      alert('楽曲の削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!song) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={handleCancel} maxWidth="lg">
      <div className="space-y-6">
        {/* Modal Title */}
        <h2 className="text-2xl font-bold text-gray-900">楽曲情報の編集</h2>
        {/* Thumbnail Preview */}
        <div className="flex justify-center">
          <SongThumbnail
            title={formData.title || "楽曲"}
            niconicoLink={formData.niconicoLink}
            youtubeLink={formData.youtubeLink}
            spotifyLink={formData.spotifyLink}
            size="lg"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            楽曲名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="楽曲名を入力"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title}</p>
          )}
        </div>

        {/* Artist */}
        <div>
          <ArtistSelector
            label="アーティスト"
            selectedArtists={formData.artist}
            onChange={(artists) => setFormData({ ...formData, artist: artists })}
            placeholder="アーティスト名を入力"
          />
        </div>

        {/* Composers */}
        <div>
          <ArtistSelector
            label="作曲者"
            selectedArtists={formData.composers}
            onChange={(composers) => setFormData({ ...formData, composers })}
            placeholder="作曲者名を入力"
          />
        </div>

        {/* Arrangers */}
        <div>
          <ArtistSelector
            label="編曲者"
            selectedArtists={formData.arrangers}
            onChange={(arrangers) => setFormData({ ...formData, arrangers })}
            placeholder="編曲者名を入力"
          />
        </div>

        {/* Platform Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">プラットフォームリンク</h3>

          {/* Niconico Link */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">🎬 ニコニコ動画</label>
            <input
              type="url"
              value={formData.niconicoLink || ""}
              onChange={(e) => setFormData({ ...formData, niconicoLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.nicovideo.jp/watch/..."
            />
          </div>

          {/* YouTube Link */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">▶️ YouTube</label>
            <input
              type="url"
              value={formData.youtubeLink || ""}
              onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* Spotify Link */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">🎵 Spotify</label>
            <input
              type="url"
              value={formData.spotifyLink || ""}
              onChange={(e) => setFormData({ ...formData, spotifyLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://open.spotify.com/track/..."
            />
          </div>

          {/* Apple Music Link */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">🍎 Apple Music</label>
            <input
              type="url"
              value={formData.applemusicLink || ""}
              onChange={(e) => setFormData({ ...formData, applemusicLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://music.apple.com/..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>

          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

SongDatabaseEditModal.displayName = 'SongDatabaseEditModal';
