"use client";

import { useState } from "react";
import { DatabaseDuplicateGroup, SongDatabaseEntry, mergeDuplicateSongs, MergeOverrides } from "@/lib/utils/songDatabase";
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

type MergeStep = 'select-master' | 'select-values';

interface MergeValues {
  title: string;
  artist: string;
  niconicoLink: string | null;
  youtubeLink: string | null;
  spotifyLink: string | null;
  applemusicLink: string | null;
}

type LinkField = 'niconicoLink' | 'youtubeLink' | 'spotifyLink' | 'applemusicLink';

export default function DuplicateGroupCard({ group, onMergeComplete, onDismiss }: DuplicateGroupCardProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<string>(group.primarySong.id);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [mergeStep, setMergeStep] = useState<MergeStep>('select-master');
  const [mergeValues, setMergeValues] = useState<MergeValues | null>(null);

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

  // Get all non-null values for a link field across all songs, as {songId, value} pairs
  const getLinkOptions = (key: LinkField): { songId: string; value: string }[] => {
    const seen = new Set<string>();
    const result: { songId: string; value: string }[] = [];
    for (const song of allSongs) {
      const val = song[key] as string | null | undefined;
      if (val && !seen.has(val)) {
        seen.add(val);
        result.push({ songId: song.id, value: val });
      }
    }
    return result;
  };

  // Get best initial link value: master first, then any other song
  const getInitialLink = (key: LinkField): string | null => {
    const master = allSongs.find(s => s.id === selectedPrimary);
    const masterVal = master?.[key] as string | null | undefined;
    if (masterVal) return masterVal;
    for (const song of allSongs) {
      const val = song[key] as string | null | undefined;
      if (val) return val;
    }
    return null;
  };

  const handleMerge = () => {
    const sourceSongs = allSongs.filter(s => s.id !== selectedPrimary);
    if (sourceSongs.length === 0) return;

    const master = allSongs.find(s => s.id === selectedPrimary)!;
    const initial: MergeValues = {
      title: master.title,
      artist: master.artist[0]?.name || 'Unknown Artist',
      niconicoLink: getInitialLink('niconicoLink'),
      youtubeLink: getInitialLink('youtubeLink'),
      spotifyLink: getInitialLink('spotifyLink'),
      applemusicLink: getInitialLink('applemusicLink'),
    };
    setMergeValues(initial);
    setMergeStep('select-values');
  };

  const handleBackToMasterSelect = () => {
    setMergeStep('select-master');
    setMergeValues(null);
  };

  const handleProceedToConfirm = () => {
    setConfirmDialogOpen(true);
  };

  const confirmMerge = async () => {
    const sourceSongs = allSongs.filter(s => s.id !== selectedPrimary);
    setIsMerging(true);
    setError(null);

    try {
      let overrides: MergeOverrides | undefined;

      if (mergeValues) {
        const master = allSongs.find(s => s.id === selectedPrimary)!;
        overrides = {};
        if (mergeValues.title !== master.title) overrides.title = mergeValues.title;
        // Always pass artist so song_artist_relations is synced even when unchanged
        overrides.artist = mergeValues.artist;
        overrides.niconicoLink = mergeValues.niconicoLink;
        overrides.youtubeLink = mergeValues.youtubeLink;
        overrides.spotifyLink = mergeValues.spotifyLink;
        overrides.applemusicLink = mergeValues.applemusicLink;
      }

      const result = await mergeDuplicateSongs(
        selectedPrimary,
        sourceSongs.map(s => s.id),
        overrides && Object.keys(overrides).length > 0 ? overrides : undefined
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

  // Check if all songs share the same value for a text field
  const allSameTitles = new Set(allSongs.map(s => s.title)).size === 1;
  const allSameArtists = new Set(allSongs.map(s => s.artist[0]?.name || 'Unknown Artist')).size === 1;

  const linkLabels: Record<LinkField, string> = {
    niconicoLink: 'ニコニコ',
    youtubeLink: 'YouTube',
    spotifyLink: 'Spotify',
    applemusicLink: 'Apple Music',
  };

  const linkFields: LinkField[] = ['niconicoLink', 'youtubeLink', 'spotifyLink', 'applemusicLink'];

  // Compute if any field needs user selection
  const hasSelectableFields =
    !allSameTitles ||
    !allSameArtists ||
    linkFields.some(f => getLinkOptions(f).length > 1);

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
          {mergeStep === 'select-master' && (
            <>
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
            </>
          )}
          {mergeStep === 'select-values' && (
            <>
              <button
                onClick={handleBackToMasterSelect}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                ← 戻る
              </button>
              <button
                onClick={handleProceedToConfirm}
                disabled={isMerging}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                マージ確認 →
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {mergeStep === 'select-master' && (
        <>
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
        </>
      )}

      {mergeStep === 'select-values' && mergeValues && (
        <div className="mt-2">
          <div className="text-sm font-medium text-gray-700 mb-3">マージの設定</div>

          {!hasSelectableFields && (
            <div className="text-sm text-gray-500 py-2">
              全フィールドが同じ値です。マージを確認してください。
            </div>
          )}

          <div className="space-y-4">
            {/* Title — show only if differs */}
            {!allSameTitles && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">タイトル</div>
                <div className="space-y-1">
                  {allSongs.map(song => (
                    <label key={song.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`title-${group.primarySong.id}`}
                        checked={mergeValues.title === song.title}
                        onChange={() => setMergeValues(v => v ? { ...v, title: song.title } : v)}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm text-gray-900">{song.title}</span>
                      <span className="text-xs text-gray-400 truncate">[{song.artist[0]?.name || 'Unknown'}]</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Artist — show only if differs */}
            {!allSameArtists && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">アーティスト</div>
                <div className="space-y-1">
                  {allSongs.map(song => {
                    const artistName = song.artist[0]?.name || 'Unknown Artist';
                    return (
                      <label key={song.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`artist-${group.primarySong.id}`}
                          checked={mergeValues.artist === artistName}
                          onChange={() => setMergeValues(v => v ? { ...v, artist: artistName } : v)}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm text-gray-900">{artistName}</span>
                        <span className="text-xs text-gray-400 truncate">[{song.title}]</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Platform links */}
            {linkFields.map(field => {
              const options = getLinkOptions(field);
              if (options.length === 0) return null;

              const label = linkLabels[field];
              const currentValue = mergeValues[field];

              if (options.length === 1) {
                // Auto-selected — display only
                return (
                  <div key={field}>
                    <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-600">✓</span>
                      <span className="truncate max-w-xs">{options[0].value}</span>
                      <span className="text-xs text-gray-400">
                        [{allSongs.find(s => s.id === options[0].songId)?.title ?? ''}]
                      </span>
                      <span className="text-xs text-gray-400">（自動）</span>
                    </div>
                  </div>
                );
              }

              // Multiple options — radio select
              return (
                <div key={field}>
                  <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
                  <div className="space-y-1">
                    {options.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${field}-${group.primarySong.id}`}
                          checked={currentValue === opt.value}
                          onChange={() => setMergeValues(v => v ? { ...v, [field]: opt.value } : v)}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm text-gray-900 truncate max-w-xs">{opt.value}</span>
                        <span className="text-xs text-gray-400">
                          [{allSongs.find(s => s.id === opt.songId)?.title ?? ''}]
                        </span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`${field}-${group.primarySong.id}`}
                        checked={currentValue === null}
                        onChange={() => setMergeValues(v => v ? { ...v, [field]: null } : v)}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm text-gray-500">なし</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
