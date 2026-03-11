"use client";

import { useState } from "react";
import { DatabaseDuplicateGroup, SongDatabaseEntry, mergeDuplicateSongs } from "@/lib/utils/songDatabase";
import { logger } from "@/lib/utils/logger";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DuplicateGroupCardProps {
  group: DatabaseDuplicateGroup;
  onMergeComplete: () => void;
  onDismiss: () => void;
}

export default function DuplicateGroupCard({ group, onMergeComplete, onDismiss }: DuplicateGroupCardProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<string>(group.primarySong.id);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const allSongs = [group.primarySong, ...group.duplicates];

  const getThumbnailUrl = (song: SongDatabaseEntry): string => {
    if (song.niconicoLink) {
      const videoId = song.niconicoLink.split('/').pop();
      return `/api/thumbnail/niconico/${videoId}/`;
    }
    if (song.youtubeLink) {
      const videoId = song.youtubeLink.split('v=')[1]?.split('&')[0];
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    if (song.spotifyLink) {
      const trackId = new URL(song.spotifyLink).pathname.split('/').pop();
      return `/api/thumbnail/spotify/${trackId}/`;
    }
    return "/placeholder-thumbnail.png";
  };

  const handleMerge = () => {
    const sourceSongs = allSongs.filter(s => s.id !== selectedPrimary);
    if (sourceSongs.length === 0) return;
    setConfirmDialogOpen(true);
  };

  const confirmMerge = async () => {
    const sourceSongs = allSongs.filter(s => s.id !== selectedPrimary);
    setIsMerging(true);
    setError(null);

    try {
      const result = await mergeDuplicateSongs(
        selectedPrimary,
        sourceSongs.map(s => s.id)
      );
      logger.info('Merge completed:', result);
      onMergeComplete();
    } catch (err) {
      logger.error('Merge failed:', err);
      setError('マージに失敗しました。');
    } finally {
      setIsMerging(false);
    }
  };

  const primaryTitle = allSongs.find(s => s.id === selectedPrimary)?.title ?? '';
  const sourceSongsCount = allSongs.filter(s => s.id !== selectedPrimary).length;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-gray-700">
            重複の可能性: {allSongs.length}件
          </span>
          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
            {group.reason}
          </span>
          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            類似度 {group.similarity}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            重複ではない
          </button>
          <button
            onClick={handleMerge}
            disabled={isMerging || allSongs.length < 2}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMerging ? 'マージ中...' : 'マージ実行'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 mb-3">
        マスターとして残す楽曲を選択してください。他の楽曲の参照はマスターに統合されます。
      </div>

      <div className="space-y-2">
        {allSongs.map((song) => (
          <label
            key={song.id}
            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedPrimary === song.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`primary-${group.primarySong.id}`}
              value={song.id}
              checked={selectedPrimary === song.id}
              onChange={() => setSelectedPrimary(song.id)}
              className="mr-3"
            />
            <div className="relative w-12 h-9 flex-shrink-0 mr-3">
              <Image
                src={getThumbnailUrl(song)}
                alt={song.title}
                fill
                className="object-cover rounded"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {song.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {song.artist.map(a => a.name).join(', ')}
              </div>
            </div>
            <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
              {song.usageCount > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                  使用: {song.usageCount}回
                </span>
              )}
              {selectedPrimary === song.id && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  マスター
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マージの確認</AlertDialogTitle>
            <AlertDialogDescription>
              「{primaryTitle}」をマスターとして、{sourceSongsCount}件の楽曲を統合します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMerge}
              className="bg-blue-600 hover:bg-blue-700"
            >
              マージ実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

DuplicateGroupCard.displayName = 'DuplicateGroupCard';
