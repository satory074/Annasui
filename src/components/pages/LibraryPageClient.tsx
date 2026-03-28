"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/context";
import { getSongDatabase, SongDatabaseEntry, deleteManualSong, findDuplicateGroups, DatabaseDuplicateGroup, searchSongs } from "@/lib/utils/songDatabase";
import { logger } from "@/lib/utils/logger";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/features/auth/components/LoginModal";
import SongDatabaseEditModal from "@/features/song-database/components/SongDatabaseEditModal";
import DuplicateGroupCard from "@/features/song-database/components/DuplicateGroupCard";
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
import ManualSongAddModal from "@/features/song-database/components/ManualSongAddModal";
import { toast } from "sonner";

type SortField = "title" | "artist" | "updatedAt" | "createdAt";
type SortOrder = "asc" | "desc";
type TabType = "songs" | "duplicates";

export default function LibraryPageClient() {
  const { isAuthenticated, loading } = useAuth();
  const [songDatabase, setSongDatabase] = useState<SongDatabaseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongDatabaseEntry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<SongDatabaseEntry | null>(null);

  // Add song modal state
  const [addSongModalOpen, setAddSongModalOpen] = useState(false);

  // タブ管理
  const [activeTab, setActiveTab] = useState<TabType>("songs");
  const [duplicateGroups, setDuplicateGroups] = useState<DatabaseDuplicateGroup[]>([]);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [dismissedGroupIds, setDismissedGroupIds] = useState<Set<string>>(new Set());

  // Load song database
  useEffect(() => {
    const loadDatabase = async () => {
      setIsLoading(true);
      try {
        const db = await getSongDatabase();
        setSongDatabase(db);
        logger.info('Song database loaded', { count: db.length });
      } catch (error) {
        logger.error('Failed to load song database', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabase();
  }, []);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Load duplicate groups when tab changes
  useEffect(() => {
    const loadDuplicates = async () => {
      if (activeTab !== "duplicates") return;

      setIsLoadingDuplicates(true);
      try {
        const groups = await findDuplicateGroups();
        setDuplicateGroups(groups);
        logger.info('Duplicate groups loaded', { count: groups.length });
      } catch (error) {
        logger.error('Failed to load duplicate groups', error);
      } finally {
        setIsLoadingDuplicates(false);
      }
    };

    loadDuplicates();
  }, [activeTab]);

  // Refresh duplicate groups after merge
  const handleMergeComplete = async () => {
    const db = await getSongDatabase();
    setSongDatabase(db);
    const groups = await findDuplicateGroups();
    setDuplicateGroups(groups);
    logger.info('Data refreshed after merge');
  };

  // Search results
  const searchResults = useMemo(() => searchSongs(songDatabase, searchTerm), [songDatabase, searchTerm]);
  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);

  // Sort all results then paginate
  const sortedResults = useMemo(() => {
    const sorted = [...searchResults].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "artist":
          aValue = (a.artist[0]?.name || "unknown artist").toLowerCase();
          bValue = (b.artist[0]?.name || "unknown artist").toLowerCase();
          break;
        case "updatedAt":
          aValue = new Date(a.updatedAt || 0).getTime();
          bValue = new Date(b.updatedAt || 0).getTime();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [searchResults, currentPage, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleEditSong = (song: SongDatabaseEntry) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setSelectedSong(song);
    setEditModalOpen(true);
  };

  const handleDeleteSong = (song: SongDatabaseEntry) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setSongToDelete(song);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;

    try {
      await deleteManualSong(songToDelete.id);
      const db = await getSongDatabase();
      setSongDatabase(db);
      logger.info('Song deleted', { songId: songToDelete.id, title: songToDelete.title });
      toast.success(`「${songToDelete.title}」を削除しました`);
    } catch (error) {
      logger.error('Failed to delete song', error);
      toast.error('楽曲の削除に失敗しました');
    } finally {
      setDeleteDialogOpen(false);
      setSongToDelete(null);
    }
  };

  const handleAddSong = async (songData: {
    title: string;
    artist: string[];
    composers?: string[];
    arrangers?: string[];
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
  }) => {
    // The ManualSongAddModal handles its own save via songDatabase utils
    // We just need to refresh the local state
    logger.info('Song added from library', { title: songData.title });
    const db = await getSongDatabase();
    setSongDatabase(db);
    toast.success(`「${songData.title}」を追加しました`);
  };

  const handleUseSimilarSong = (song: SongDatabaseEntry) => {
    setAddSongModalOpen(false);
    setSelectedSong(song);
    setEditModalOpen(true);
  };

  const visibleGroups = useMemo(
    () => duplicateGroups.filter(g => !dismissedGroupIds.has(g.primarySong.id)),
    [duplicateGroups, dismissedGroupIds]
  );

  const handleDismissGroup = (primaryId: string) => {
    setDismissedGroupIds(prev => new Set(prev).add(primaryId));
  };

  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());

  const getThumbnailUrl = (song: SongDatabaseEntry): string | null => {
    if (thumbnailErrors.has(song.id)) return null;
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
    return null;
  };

  const handleThumbnailError = (songId: string) => {
    setThumbnailErrors(prev => new Set(prev).add(songId));
  };

  // SVG fallback for broken/missing thumbnails
  const ThumbnailFallback = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-center bg-gray-100 rounded ${className || ''}`}>
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    </div>
  );

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => (
    <span className={`ml-1 ${sortField === field ? 'text-blue-600' : 'text-gray-300'}`}>
      {sortField === field ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  // Show login prompt if not authenticated
  if (loading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-[var(--background)] pt-[var(--header-height)] flex items-center justify-center">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-[var(--background)] pt-[var(--header-height)] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">ログインが必要です</h2>
            <p className="text-gray-600 mb-6">
              楽曲ライブラリを表示するには、ログインしてください。
            </p>
            <Button
              onClick={() => setLoginModalOpen(true)}
              className="w-full"
            >
              ログイン
            </Button>
          </div>
        </div>
        <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-[var(--background)] pt-[var(--header-height)] py-8">
        <div className="max-w-[var(--content-max-w-wide)] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">楽曲ライブラリ</h1>
              <p className="text-gray-600">
                登録されている楽曲: {songDatabase.length}曲
                {activeTab === "songs" && searchTerm && ` / 検索結果: ${searchResults.length}曲`}
                {activeTab === "duplicates" && visibleGroups.length > 0 && ` / 重複候補: ${visibleGroups.length}グループ`}
              </p>
            </div>
            <button
              onClick={() => setAddSongModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              楽曲を追加
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("songs")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "songs"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                楽曲一覧
              </button>
              <button
                onClick={() => setActiveTab("duplicates")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "duplicates"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                重複管理
                {visibleGroups.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                    {visibleGroups.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Search Bar (only for songs tab) */}
          {activeTab === "songs" && (
            <div className="mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="楽曲名、アーティスト名で検索..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === "duplicates" ? (
            // Duplicates Tab
            isLoadingDuplicates ? (
              <div className="text-center py-12 text-gray-600">
                重複を検索中...
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-2">重複の可能性がある楽曲は見つかりませんでした。</div>
                <p className="text-sm text-gray-500">
                  楽曲名の表記揺れ（カタカナ/ひらがな、全角/半角など）がある場合に検出されます。
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>重複管理について:</strong> 表記揺れにより同じ楽曲が複数登録されている可能性があります。
                    マスターとなる楽曲を選択し、「マージ実行」をクリックすると、他の楽曲の参照がマスターに統合されます。
                    重複でない場合は「重複ではない」をクリックして非表示にできます。
                  </p>
                </div>
                {visibleGroups.map((group, index) => (
                  <DuplicateGroupCard
                    key={`${group.primarySong.id}-${index}`}
                    group={group}
                    onMergeComplete={handleMergeComplete}
                    onDismiss={() => handleDismissGroup(group.primarySong.id)}
                  />
                ))}
              </div>
            )
          ) : (
            // Songs Tab (Table)
            isLoading ? (
              <div className="text-center py-12 text-gray-600">
                読み込み中...
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                {searchTerm ? '該当する楽曲が見つかりませんでした。' : '楽曲が登録されていません。'}
              </div>
            ) : (
              <>
                {/* Sort controls (visible on mobile) */}
                <div className="flex flex-wrap gap-2 mb-4 sm:hidden">
                  <span className="text-xs text-gray-500 self-center">並び替え:</span>
                  {(["title", "artist", "updatedAt"] as SortField[]).map((field) => {
                    const labels: Record<SortField, string> = { title: "タイトル", artist: "アーティスト", updatedAt: "更新日", createdAt: "作成日" };
                    return (
                      <button
                        key={field}
                        onClick={() => handleSort(field)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          sortField === field ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {labels[field]}
                        {sortField === field && (sortOrder === "asc" ? " ▲" : " ▼")}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {sortedResults.map((song) => {
                    const artistName = song.artist[0]?.name || "Unknown Artist";
                    const thumbUrl = getThumbnailUrl(song);

                    return (
                      <div key={song.id} className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="relative w-14 h-14 shrink-0">
                            {thumbUrl ? (
                              <Image
                                src={thumbUrl}
                                alt={song.title}
                                fill
                                className="object-cover rounded"
                                sizes="56px"
                                onError={() => handleThumbnailError(song.id)}
                              />
                            ) : (
                              <ThumbnailFallback className="w-14 h-14" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{song.title}</p>
                            <p className="text-xs text-gray-500 truncate">{artistName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {song.niconicoLink && <span title="ニコニコ動画">🎬</span>}
                              {song.youtubeLink && <span title="YouTube">▶️</span>}
                              {song.spotifyLink && <span title="Spotify">🎵</span>}
                              {song.applemusicLink && <span title="Apple Music">🍎</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleEditSong(song)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSong(song)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left w-20">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          サムネイル
                        </span>
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors ${sortField === "title" ? "bg-blue-50" : ""}`}
                        onClick={() => handleSort("title")}
                      >
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            タイトル
                          </span>
                          <SortIndicator field="title" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors ${sortField === "artist" ? "bg-blue-50" : ""}`}
                        onClick={() => handleSort("artist")}
                      >
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            アーティスト
                          </span>
                          <SortIndicator field="artist" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          プラットフォーム
                        </span>
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors ${sortField === "updatedAt" ? "bg-blue-50" : ""}`}
                        onClick={() => handleSort("updatedAt")}
                      >
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            更新日
                          </span>
                          <SortIndicator field="updatedAt" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedResults.map((song) => {
                      const artistName = song.artist[0]?.name || "Unknown Artist";
                      const updatedAt = song.updatedAt
                        ? new Date(song.updatedAt).toLocaleDateString('ja-JP')
                        : '-';
                      const thumbUrl = getThumbnailUrl(song);

                      return (
                        <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative w-16 h-12">
                              {thumbUrl ? (
                                <Image
                                  src={thumbUrl}
                                  alt={song.title}
                                  fill
                                  className="object-cover rounded"
                                  sizes="64px"
                                  onError={() => handleThumbnailError(song.id)}
                                />
                              ) : (
                                <ThumbnailFallback className="w-16 h-12" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {song.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{artistName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {song.niconicoLink && (
                                <a href={song.niconicoLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors" title="ニコニコ動画">🎬</a>
                              )}
                              {song.youtubeLink && (
                                <a href={song.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors" title="YouTube">▶️</a>
                              )}
                              {song.spotifyLink && (
                                <a href={song.spotifyLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors" title="Spotify">🎵</a>
                              )}
                              {song.applemusicLink && (
                                <a href={song.applemusicLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors" title="Apple Music">🍎</a>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {updatedAt}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditSong(song)}
                              className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteSong(song)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )
        )}
        </div>
      </div>

      {/* Modals */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      <SongDatabaseEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSong(null);
        }}
        song={selectedSong}
        onSave={async () => {
          const db = await getSongDatabase();
          setSongDatabase(db);
          toast.success('楽曲を更新しました');
        }}
        onDelete={async () => {
          const db = await getSongDatabase();
          setSongDatabase(db);
          toast.success('楽曲を削除しました');
        }}
      />
      <ManualSongAddModal
        isOpen={addSongModalOpen}
        onClose={() => setAddSongModalOpen(false)}
        onSave={handleAddSong}
        onUseSimilarSong={handleUseSimilarSong}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>楽曲を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{songToDelete?.title}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSongToDelete(null)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSong}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

LibraryPageClient.displayName = 'LibraryPageClient';
