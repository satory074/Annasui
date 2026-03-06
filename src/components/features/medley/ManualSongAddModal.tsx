"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";
import { checkForDuplicateBeforeAdd } from "@/lib/utils/duplicateSongs";
import { findSimilarSongsInDatabase, SimilarSongResult, SongDatabaseEntry } from "@/lib/utils/songDatabase";
import { logger } from "@/lib/utils/logger";
import { SongSection } from "@/types";
import ArtistSelector from "@/components/ui/form/ArtistSelector";

interface ManualSongAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songData: {
    title: string;
    artist: string[];
    composers?: string[];
    arrangers?: string[];
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
  }) => void;
  existingSongs?: SongSection[]; // 重複チェック用
  onUseSimilarSong?: (song: SongDatabaseEntry) => void; // 類似楽曲を使用
}

interface Artist {
  id: string;
  name: string;
}

export default function ManualSongAddModal({
  isOpen,
  onClose,
  onSave,
  existingSongs = [],
  onUseSimilarSong
}: ManualSongAddModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: [] as Artist[],
    composers: [] as Artist[],
    arrangers: [] as Artist[],
    niconicoLink: "",
    youtubeLink: "",
    spotifyLink: "",
    applemusicLink: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPlatformLinks, setShowPlatformLinks] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDuplicate: boolean; existingInstances: SongSection[] }>({ isDuplicate: false, existingInstances: [] });

  // 類似楽曲検索用ステート
  const [similarSongs, setSimilarSongs] = useState<SimilarSongResult[]>([]);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: "",
        artist: [] as Artist[],
        composers: [] as Artist[],
        arrangers: [] as Artist[],
        niconicoLink: "",
        youtubeLink: "",
        spotifyLink: "",
        applemusicLink: ""
      });
      setErrors({});
      setDuplicateWarning({ isDuplicate: false, existingInstances: [] });
      setSimilarSongs([]);
      setIsSearchingSimilar(false);
      setShowPlatformLinks(false);
    }
  }, [isOpen]);

  // 重複チェック（現在のメドレー内）
  useEffect(() => {
    const artistString = formData.artist.map(a => a.name).join(", ");
    if (formData.title.trim() && artistString.trim()) {
      const result = checkForDuplicateBeforeAdd(
        { title: formData.title.trim(), artist: artistString.trim() },
        existingSongs
      );
      setDuplicateWarning(result);
    } else {
      setDuplicateWarning({ isDuplicate: false, existingInstances: [] });
    }
  }, [formData.title, formData.artist, existingSongs]);

  // 類似楽曲検索（song_master全体から）
  useEffect(() => {
    const searchSimilar = async () => {
      const artistString = formData.artist.map(a => a.name).join(", ");
      if (formData.title.trim().length < 2) {
        setSimilarSongs([]);
        return;
      }

      setIsSearchingSimilar(true);
      try {
        const results = await findSimilarSongsInDatabase(
          formData.title.trim(),
          artistString.trim() || 'Unknown Artist'
        );
        setSimilarSongs(results.slice(0, 5)); // 上位5件
      } catch (error) {
        logger.error('Failed to search similar songs:', error);
        setSimilarSongs([]);
      } finally {
        setIsSearchingSimilar(false);
      }
    };

    const debounceTimer = setTimeout(searchSimilar, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.title, formData.artist]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "楽曲名は必須です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      // Artist配列から名前配列に変換
      const artistArray = formData.artist.map(a => a.name);
      const composersArray = formData.composers.map(c => c.name);
      const arrangersArray = formData.arrangers.map(a => a.name);

      onSave({
        title: formData.title.trim(),
        artist: artistArray.length > 0 ? artistArray : ["Unknown Artist"],
        composers: composersArray.length > 0 ? composersArray : undefined,
        arrangers: arrangersArray.length > 0 ? arrangersArray : undefined,
        niconicoLink: formData.niconicoLink.trim() || undefined,
        youtubeLink: formData.youtubeLink.trim() || undefined,
        spotifyLink: formData.spotifyLink.trim() || undefined,
        applemusicLink: formData.applemusicLink.trim() || undefined
      });
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div onKeyDown={handleKeyPress}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          新しい楽曲を追加
        </h2>
        
        <p className="text-sm text-gray-600 mb-6">
          楽曲の基本情報を入力してください。この楽曲は楽曲データベースに追加され、後で検索して選択できるようになります。
        </p>

        <div className="space-y-4">
          {/* 楽曲名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              楽曲名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="楽曲名を入力"
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* アーティスト名 */}
          <ArtistSelector
            selectedArtists={formData.artist}
            onChange={(artists) => setFormData({ ...formData, artist: artists })}
            label="アーティスト名"
            placeholder="アーティスト名を選択または新規追加（省略可）"
          />
          <p className="text-xs text-gray-500 -mt-2 mb-2">
            ※ 空欄の場合、自動的に「Unknown Artist」として登録されます
          </p>

          {/* 作曲者 */}
          <ArtistSelector
            selectedArtists={formData.composers}
            onChange={(artists) => setFormData({ ...formData, composers: artists })}
            label="作曲者"
            placeholder="作曲者を選択または新規追加（省略可）"
          />

          {/* 編曲者 */}
          <ArtistSelector
            selectedArtists={formData.arrangers}
            onChange={(artists) => setFormData({ ...formData, arrangers: artists })}
            label="編曲者"
            placeholder="編曲者を選択または新規追加（省略可）"
          />

          {/* プラットフォームリンク (Progressive Disclosure) */}
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
              {(() => {
                const linkCount = [formData.niconicoLink, formData.youtubeLink, formData.spotifyLink, formData.applemusicLink].filter(l => l.trim()).length;
                return linkCount > 0 ? (
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {linkCount}/4
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">（省略可）</span>
                );
              })()}
            </button>

            {showPlatformLinks && (
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-gray-200">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">🎬 ニコニコ動画</label>
                  <input
                    type="url"
                    value={formData.niconicoLink}
                    onChange={(e) => setFormData({ ...formData, niconicoLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                    placeholder="https://www.nicovideo.jp/watch/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">▶️ YouTube</label>
                  <input
                    type="url"
                    value={formData.youtubeLink}
                    onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">🎵 Spotify</label>
                  <input
                    type="url"
                    value={formData.spotifyLink}
                    onChange={(e) => setFormData({ ...formData, spotifyLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                    placeholder="https://open.spotify.com/track/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">🍎 Apple Music</label>
                  <input
                    type="url"
                    value={formData.applemusicLink}
                    onChange={(e) => setFormData({ ...formData, applemusicLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                    placeholder="https://music.apple.com/..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 重複警告（現在のメドレー内） */}
        {duplicateWarning.isDuplicate && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 mb-2">
                  既存の楽曲と重複しています
                </p>
                <p className="text-xs text-amber-600 mb-2">
                  この楽曲は既に {duplicateWarning.existingInstances.length} 回登場しています：
                </p>
                <ul className="text-xs text-amber-600 list-disc list-inside space-y-1">
                  {duplicateWarning.existingInstances.map((song) => (
                    <li key={song.id}>
                      {Math.floor(song.startTime / 60)}:{String(Math.floor(song.startTime % 60)).padStart(2, '0')} - {Math.floor(song.endTime / 60)}:{String(Math.floor(song.endTime % 60)).padStart(2, '0')}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  重複して追加しても問題ありません。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 類似楽曲の警告（song_masterテーブル全体から検索） */}
        {similarSongs.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 mb-2">
                  データベースに類似の楽曲が見つかりました
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  既存の楽曲を使用すると、重複登録を防げます。
                </p>
                <ul className="space-y-2">
                  {similarSongs.map((result) => (
                    <li key={result.song.id} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-sm font-medium text-gray-900 block truncate">{result.song.title}</span>
                        <span className="text-xs text-gray-500 block truncate">
                          {result.song.artist.map(a => a.name).join(", ")}
                        </span>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                          result.matchReason === 'exact_normalized_id' ? 'bg-green-100 text-green-700' :
                          result.matchReason === 'title_match' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.matchReason === 'exact_normalized_id' ? '完全一致' :
                           result.matchReason === 'title_match' ? 'タイトル一致' :
                           `${result.similarity}%類似`}
                        </span>
                      </div>
                      {onUseSimilarSong && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onUseSimilarSong(result.song);
                          }}
                          className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          この楽曲を使用
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 検索中表示 */}
        {isSearchingSimilar && (
          <div className="mt-4 text-center text-sm text-gray-500">
            類似楽曲を検索中...
          </div>
        )}

        {/* ヘルプテキスト */}
        <div className="mt-4 p-3 bg-orange-50 rounded-md">
          <p className="text-sm text-orange-800">
            💡 楽曲を追加後は、楽曲検索から選択してタイムラインに配置できます
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600"
          >
            楽曲を追加
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          Ctrl + Enter で保存
        </div>
      </div>
    </BaseModal>
  );
}