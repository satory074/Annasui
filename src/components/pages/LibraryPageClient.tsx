"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSongDatabase, SongDatabaseEntry, deleteManualSong } from "@/lib/utils/songDatabase";
import { useSongSearch } from "@/hooks/useSongSearch";
import { logger } from "@/lib/utils/logger";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/features/auth/LoginModal";
import SongDatabaseEditModal from "@/components/features/library/SongDatabaseEditModal";
import Image from "next/image";

type SortField = "title" | "artist" | "updatedAt" | "createdAt";
type SortOrder = "asc" | "desc";

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

  // Search and pagination using the extracted hook
  const { searchResults, totalPages, paginatedResults } = useSongSearch({
    songDatabase,
    searchTerm,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE
  });

  // Sort results
  const sortedResults = useMemo(() => {
    const results = [...paginatedResults];
    results.sort((a, b) => {
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

    return results;
  }, [paginatedResults, sortField, sortOrder]);

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

  const handleDeleteSong = async (song: SongDatabaseEntry) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }

    if (!confirm(`「${song.title}」を削除しますか？\n\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteManualSong(song.id);
      // Refresh database
      const db = await getSongDatabase();
      setSongDatabase(db);
      logger.info('Song deleted', { songId: song.id, title: song.title });
    } catch (error) {
      logger.error('Failed to delete song', error);
      alert('楽曲の削除に失敗しました。');
    }
  };

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

  // Show login prompt if not authenticated
  if (loading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">ログインが必要です</h2>
            <p className="text-gray-600 mb-6">
              楽曲ライブラリを表示するには、ログインしてください。
            </p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">楽曲ライブラリ</h1>
            <p className="text-gray-600">
              登録されている楽曲: {songDatabase.length}曲
              {searchTerm && ` / 検索結果: ${searchResults.length}曲`}
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="楽曲名、アーティスト名で検索..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12 text-gray-600">
              読み込み中...
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              {searchTerm ? '該当する楽曲が見つかりませんでした。' : '楽曲が登録されていません。'}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("title")}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            タイトル
                          </span>
                          {sortField === "title" && (
                            <span className="text-gray-400">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("artist")}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            アーティスト
                          </span>
                          {sortField === "artist" && (
                            <span className="text-gray-400">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          プラットフォーム
                        </span>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("updatedAt")}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            更新日
                          </span>
                          {sortField === "updatedAt" && (
                            <span className="text-gray-400">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
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

                      return (
                        <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative w-16 h-12">
                              <Image
                                src={getThumbnailUrl(song)}
                                alt={song.title}
                                fill
                                className="object-cover rounded"
                                sizes="64px"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {song.title}
                            </div>
                            {song.matchType !== 'exact' && (
                              <div className="text-xs text-gray-500">
                                {song.matchType}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{artistName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {song.niconicoLink && (
                                <a
                                  href={song.niconicoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                  title="ニコニコ動画"
                                >
                                  🎬
                                </a>
                              )}
                              {song.youtubeLink && (
                                <a
                                  href={song.youtubeLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                  title="YouTube"
                                >
                                  ▶️
                                </a>
                              )}
                              {song.spotifyLink && (
                                <a
                                  href={song.spotifyLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                  title="Spotify"
                                >
                                  🎵
                                </a>
                              )}
                              {song.applemusicLink && (
                                <a
                                  href={song.applemusicLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                  title="Apple Music"
                                >
                                  🍎
                                </a>
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
          )}
        </div>
      </div>

      {/* Modals */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <SongDatabaseEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSong(null);
        }}
        song={selectedSong}
        onSave={async () => {
          // Refresh database
          const db = await getSongDatabase();
          setSongDatabase(db);
          logger.info('Song database refreshed after edit');
        }}
        onDelete={async () => {
          // Refresh database
          const db = await getSongDatabase();
          setSongDatabase(db);
          logger.info('Song database refreshed after delete');
        }}
      />
    </>
  );
}

LibraryPageClient.displayName = 'LibraryPageClient';
