"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createMedley, deleteMedley } from "@/lib/api/medleys";
import { MedleyData, SongSection } from "@/types";
import CreateMedleyModal from "@/features/medley/components/CreateMedleyModal";
import AppHeader from "@/components/layout/AppHeader";
import { LoginModal } from "@/features/auth/components/LoginModal";
import { getThumbnailUrl, getYouTubeThumbnail } from "@/lib/utils/thumbnail";
import { autoCorrectPlatform } from "@/lib/utils/platformDetection";
import { logger } from "@/lib/utils/logger";
import { useAuth } from "@/features/auth/context";
import { Button } from "@/components/ui/button";

interface HomePageClientProps {
    initialMedleys: MedleyData[];
}

export default function HomePageClient({ initialMedleys }: HomePageClientProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [medleys, setMedleys] = useState<MedleyData[]>(initialMedleys);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMode, setSearchMode] = useState<"medley" | "song">("medley");
    const [sortBy, setSortBy] = useState<"title" | "creator" | "duration" | "songCount" | "createdAt" | "updatedAt" | "viewCount" | "random">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [songSortBy, setSongSortBy] = useState<"songTitle" | "artist" | "medleyTitle" | "startTime">("songTitle");
    const [songSortOrder, setSongSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [showCreateMedleyModal, setShowCreateMedleyModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [deletingMedleyId, setDeletingMedleyId] = useState<string | null>(null);

    // Reset pagination when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleCreateMedley = async (medleyData: Omit<MedleyData, 'songs'>) => {
        try {
            // Create medley in database without user_id
            const newMedley = await createMedley({
                ...medleyData,
                songs: []
            });

            if (newMedley) {
                // Update medley list
                setMedleys(prev => [newMedley, ...prev]);
                setShowCreateMedleyModal(false);

                // Navigate to editing page
                const platform = medleyData.platform || 'niconico';
                router.push(`/${platform}/${medleyData.videoId}`);

                logger.info('✅ Medley created successfully:', newMedley.id);
            } else {
                alert('メドレーの作成に失敗しました');
            }
        } catch (error) {
            logger.error('❌ Error creating medley:', error);
            alert('メドレーの作成に失敗しました。もう一度お試しください。');
        }
    };

    const handleCreateMedleyClick = () => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        setShowCreateMedleyModal(true);
    };

    const handleDeleteMedley = async (medley: MedleyData) => {
        // Confirmation dialog
        const confirmMessage = `「${medley.title}」を完全に削除しますか？\n\n作成者: ${medley.creator}\n楽曲数: ${medley.songs.length}曲\n\nこの操作は取り消せません。`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            setDeletingMedleyId(medley.videoId);

            const success = await deleteMedley(medley.videoId);

            if (success) {
                // Remove from local state
                setMedleys(prev => prev.filter(m => m.videoId !== medley.videoId));
                logger.info('✅ Medley deleted successfully:', medley.videoId);

                // Show success message
                alert(`「${medley.title}」を削除しました`);
            } else {
                alert('メドレーの削除に失敗しました');
            }
        } catch (error) {
            logger.error('❌ Error deleting medley:', error);
            alert('メドレーの削除に失敗しました。もう一度お試しください。');
        } finally {
            setDeletingMedleyId(null);
        }
    };

    // Filtering and sorting logic
    const filteredAndSortedMedleys = medleys
        .filter(medley => {
            if (searchMode === "medley") {
                const matchesSearch = medley.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (medley.creator || '').toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
            } else {
                // Song search mode
                const hasMatchingSong = medley.songs.some(song =>
                    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    song.artist.join(", ").toLowerCase().includes(searchTerm.toLowerCase())
                );
                return hasMatchingSong;
            }
        })
        .sort((a, b) => {
            // Random sort special handling
            if (sortBy === "random") {
                return Math.random() - 0.5;
            }

            let valueA, valueB;
            
            switch (sortBy) {
                case "title":
                    valueA = a.title.toLowerCase();
                    valueB = b.title.toLowerCase();
                    break;
                case "creator":
                    valueA = (a.creator || '').toLowerCase();
                    valueB = (b.creator || '').toLowerCase();
                    break;
                case "duration":
                    valueA = a.duration;
                    valueB = b.duration;
                    break;
                case "songCount":
                    valueA = a.songs.length;
                    valueB = b.songs.length;
                    break;
                case "createdAt":
                    valueA = new Date(a.createdAt || '1970-01-01').getTime();
                    valueB = new Date(b.createdAt || '1970-01-01').getTime();
                    break;
                case "updatedAt":
                    valueA = new Date(a.updatedAt || '1970-01-01').getTime();
                    valueB = new Date(b.updatedAt || '1970-01-01').getTime();
                    break;
                case "viewCount":
                    valueA = a.viewCount || 0;
                    valueB = b.viewCount || 0;
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
            if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    // Pagination logic
    const totalPages = Math.ceil(filteredAndSortedMedleys.length / itemsPerPage);
    const paginatedMedleys = filteredAndSortedMedleys.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Helper function to get thumbnail URL for individual songs
    const getSongThumbnailUrl = (song: SongSection, medley: MedleyData): string => {
        // Priority 1: Try to get thumbnail from song's platform links
        // Use the priority system: niconico > youtube > spotify > appleMusic
        if (song.niconicoLink) {
            const thumbnailUrl = getThumbnailUrl(song.niconicoLink);
            if (thumbnailUrl) return thumbnailUrl;
        }
        if (song.youtubeLink) {
            const thumbnailUrl = getThumbnailUrl(song.youtubeLink);
            if (thumbnailUrl) return thumbnailUrl;
        }
        if (song.spotifyLink) {
            // For Spotify, use placeholder for now (could be enhanced with async call later)
            return getThumbnailUrl(song.spotifyLink) || '/default-thumbnail.svg';
        }
        if (song.applemusicLink) {
            // For Apple Music, use placeholder for now (could be enhanced with async call later)
            return getThumbnailUrl(song.applemusicLink) || '/default-thumbnail.svg';
        }

        // Priority 2: Fallback to medley's thumbnail
        if (medley.platform === 'youtube') {
            return getYouTubeThumbnail(medley.videoId, 'default');
        } else {
            const medleyThumbnail = getThumbnailUrl(`https://www.nicovideo.jp/watch/${medley.videoId}`);
            if (medleyThumbnail) return medleyThumbnail;
        }

        // Final fallback to default thumbnail
        return '/default-thumbnail.svg';
    };

    // Song search results (cross-medley search)
    const allSongs = medleys.flatMap(medley => 
        medley.songs.map(song => ({
            ...song,
            medleyTitle: medley.title,
            medleyCreator: medley.creator,
            videoId: medley.videoId,
            platform: medley.platform || 'niconico',
            thumbnailUrl: getSongThumbnailUrl(song, medley)
        }))
    );

    const filteredSongs = searchMode === "song" && searchTerm ?
        allSongs.filter(song =>
            song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            song.artist.join(", ").toLowerCase().includes(searchTerm.toLowerCase())
        )
    : [];

    // Sort filtered songs
    const sortedFilteredSongs = [...filteredSongs].sort((a, b) => {
        switch (songSortBy) {
            case "songTitle":
                return songSortOrder === "asc"
                    ? a.title.localeCompare(b.title, "ja")
                    : b.title.localeCompare(a.title, "ja");
            case "artist":
                return songSortOrder === "asc"
                    ? a.artist.join(", ").localeCompare(b.artist.join(", "), "ja")
                    : b.artist.join(", ").localeCompare(a.artist.join(", "), "ja");
            case "medleyTitle":
                return songSortOrder === "asc"
                    ? a.medleyTitle.localeCompare(b.medleyTitle, "ja")
                    : b.medleyTitle.localeCompare(a.medleyTitle, "ja");
            case "startTime":
                return songSortOrder === "asc"
                    ? a.startTime - b.startTime
                    : b.startTime - a.startTime;
            default:
                return 0;
        }
    });

    // Pagination for songs
    const totalSongPages = Math.ceil(sortedFilteredSongs.length / itemsPerPage);
    const paginatedSongs = sortedFilteredSongs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );


    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}分${remainingSeconds}秒`;
    };

    const getMedleyUrl = (medley: MedleyData) => {
        const platform = medley.platform || 'niconico';
        return `/${platform}/${medley.videoId}`;
    };

    const getSongUrl = (song: { platform: string; videoId: string; startTime: number }) => {
        const platform = song.platform || 'niconico';
        return `/${platform}/${song.videoId}?t=${Math.floor(song.startTime)}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-16">
            {/* New App Header */}
            <AppHeader variant="home" />

            <div className="max-w-6xl mx-auto py-8 px-4">
                {/* Page Title and Actions */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                メドレー一覧
                            </h1>
                            <p className="text-lg text-gray-600">
                                メドレー楽曲の詳細なアノテーション・検索プラットフォーム
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* New medley registration button */}
                            <button
                                onClick={handleCreateMedleyClick}
                                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:shadow-lg font-medium"
                                style={{ background: 'var(--gradient-primary)' }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                新規メドレー登録
                            </button>

                            {/* Medley count display */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {medleys.length}件のメドレー
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter UI */}
                <div className="mb-8">
                    {/* Tabs and filters */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        {/* Tab switching */}
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6" aria-label="Tabs">
                                <button
                                    onClick={() => {
                                        setSearchMode("medley");
                                        setCurrentPage(1);
                                    }}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        searchMode === "medley"
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        メドレー検索
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchMode("song");
                                        setCurrentPage(1);
                                    }}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        searchMode === "song"
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                        </svg>
                                        楽曲検索
                                    </div>
                                </button>
                            </nav>
                        </div>

                        {/* Search input field */}
                        <div className="border-b border-gray-200 px-6 pt-6 pb-4">
                            <div className="relative max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setSearchTerm("");
                                        }
                                    }}
                                    placeholder={searchMode === "medley"
                                        ? "メドレー名または作者名で検索..."
                                        : "楽曲名またはアーティスト名で検索..."
                                    }
                                    className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent bg-gray-50 text-gray-900"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter and sort controls */}
                        <div className="p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        並び順
                                    </label>
                                    {searchMode === "medley" ? (
                                        <select
                                            value={`${sortBy}-${sortOrder}`}
                                            onChange={(e) => {
                                                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                                                setSortBy(newSortBy);
                                                setSortOrder(newSortOrder);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                        >
                                            <option value="createdAt-desc">🆕 新着順</option>
                                            <option value="viewCount-desc">🔥 人気順（再生回数）</option>
                                            <option value="updatedAt-desc">📝 更新順</option>
                                            <option value="random-asc">🎲 ランダム</option>
                                            <option value="title-asc">タイトル(昇順)</option>
                                            <option value="title-desc">タイトル(降順)</option>
                                            <option value="creator-asc">作者名(昇順)</option>
                                            <option value="creator-desc">作者名(降順)</option>
                                            <option value="duration-asc">再生時間(短い順)</option>
                                            <option value="duration-desc">再生時間(長い順)</option>
                                            <option value="songCount-asc">楽曲数(少ない順)</option>
                                            <option value="songCount-desc">楽曲数(多い順)</option>
                                            <option value="createdAt-asc">投稿日(古い順)</option>
                                            <option value="viewCount-asc">再生回数(少ない順)</option>
                                            <option value="updatedAt-asc">更新日(古い順)</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={`${songSortBy}-${songSortOrder}`}
                                            onChange={(e) => {
                                                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof songSortBy, typeof songSortOrder];
                                                setSongSortBy(newSortBy);
                                                setSongSortOrder(newSortOrder);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                        >
                                            <option value="songTitle-asc">タイトル(昇順)</option>
                                            <option value="songTitle-desc">タイトル(降順)</option>
                                            <option value="artist-asc">アーティスト名(昇順)</option>
                                            <option value="artist-desc">アーティスト名(降順)</option>
                                            <option value="medleyTitle-asc">メドレー名(昇順)</option>
                                            <option value="medleyTitle-desc">メドレー名(降順)</option>
                                            <option value="startTime-asc">開始時間(早い順)</option>
                                            <option value="startTime-desc">開始時間(遅い順)</option>
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        表示件数
                                    </label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            const newItemsPerPage = parseInt(e.target.value);
                                            setItemsPerPage(newItemsPerPage);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                    >
                                        <option value={8}>8件</option>
                                        <option value={16}>16件</option>
                                        <option value={32}>32件</option>
                                        <option value={64}>64件</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results display and actions */}
                <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600">
                                {searchMode === "medley" ? (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {filteredAndSortedMedleys.length}件
                                        </span>
                                        <span>のメドレーが見つかりました</span>
                                        {totalPages > 1 && (
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                {currentPage}/{totalPages}ページ
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {searchTerm ? (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {sortedFilteredSongs.length}件
                                                </span>
                                                <span>の楽曲が見つかりました</span>
                                                {medleys.length > 0 && (
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                        {medleys.length}メドレー中
                                                    </span>
                                                )}
                                                {totalSongPages > 1 && (
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                        {currentPage}/{totalSongPages}ページ
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-500">
                                                {allSongs.length}曲が登録されています
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setCurrentPage(1);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                フィルターをクリア
                            </button>
                        )}
                    </div>
                </div>

                {/* Song search results */}
                {searchMode === "song" && searchTerm && paginatedSongs.length > 0 && (
                    <div className="mb-8">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {paginatedSongs.map((song, index) => (
                                <Link
                                    key={`${song.videoId}-${song.id}-${song.startTime}`}
                                    href={getSongUrl(song)}
                                    className={`flex items-center gap-4 px-5 py-3 hover:bg-orange-50 transition-colors group ${
                                        index !== paginatedSongs.length - 1 ? "border-b border-gray-100" : ""
                                    }`}
                                >
                                    {/* Music icon */}
                                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 group-hover:bg-orange-200 transition-colors">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                        </svg>
                                    </div>

                                    {/* Song info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                                {song.title}
                                            </span>
                                            {song.artist.length > 0 && (
                                                <span className="text-sm text-gray-500 line-clamp-1 hidden sm:block">
                                                    {song.artist.join(", ")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                            <span className="line-clamp-1">{song.medleyTitle}</span>
                                            {song.medleyCreator && (
                                                <>
                                                    <span>·</span>
                                                    <span>{song.medleyCreator}</span>
                                                </>
                                            )}
                                        </div>
                                        {/* Artist on mobile */}
                                        {song.artist.length > 0 && (
                                            <p className="text-sm text-gray-500 line-clamp-1 sm:hidden mt-0.5">
                                                {song.artist.join(", ")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Time range */}
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono whitespace-nowrap">
                                            {formatTime(song.startTime)} - {formatTime(song.endTime)}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Song search empty state (no query) */}
                {searchMode === "song" && !searchTerm && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 font-medium mb-1">楽曲を検索</p>
                        <p className="text-sm text-gray-400">
                            {allSongs.length}曲が登録されています。タイトルまたはアーティスト名で検索してください。
                        </p>
                    </div>
                )}

                {/* Medley list */}
                {searchMode === "medley" && (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedMedleys.map((medley) => (
                        <div key={medley.videoId} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-gray-200">
                            <Link href={getMedleyUrl(medley)} className="block">
                                <div className="aspect-video bg-gray-200 relative overflow-hidden">
                                    {(() => {
                                        // Auto-detect platform if there's a mismatch
                                        const correction = autoCorrectPlatform(medley.videoId, medley.platform as 'niconico' | 'youtube' | 'spotify' | 'appleMusic');
                                        const effectivePlatform = correction.correctedPlatform;
                                        
                                        if (effectivePlatform === 'youtube') {
                                            return (
                                                <Image
                                                    src={getYouTubeThumbnail(medley.videoId, 'maxresdefault')}
                                                    alt={medley.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = getYouTubeThumbnail(medley.videoId, 'hqdefault');
                                                    }}
                                                />
                                            );
                                        } else {
                                            // Default to Niconico for legacy compatibility
                                            // Use proxy API to handle CORS and fallback properly
                                            const proxyThumbnailUrl = `/api/thumbnail/niconico/${medley.videoId}/`;
                                            return (
                                                // Use regular img instead of Next.js Image to avoid redirect issues
                                                <img
                                                    src={proxyThumbnailUrl}
                                                    alt={medley.title}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        // Fallback to default thumbnail on error
                                                        target.src = '/default-thumbnail.svg';
                                                        target.alt = `${medley.title} (デフォルトサムネイル)`;
                                                    }}
                                                />
                                            );
                                        }
                                    })()}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M8 5v10l8-5-8-5z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-md text-white ${
                                            medley.platform === 'youtube' 
                                                ? 'bg-red-600/90' 
                                                : 'bg-orange-600/90'
                                        } backdrop-blur-sm`}>
                                            {medley.platform === 'youtube' ? 'YouTube' : 'ニコニコ'}
                                        </span>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteMedley(medley);
                                        }}
                                        disabled={deletingMedleyId === medley.videoId}
                                        className="absolute top-3 right-3 p-2 bg-red-600/90 backdrop-blur-sm text-white rounded-full hover:bg-red-700/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="メドレーを削除"
                                    >
                                        {deletingMedleyId === medley.videoId ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                    
                                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                        {formatDuration(medley.duration)}
                                    </div>

                                    <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                        {medley.songs.length}曲
                                    </div>
                                </div>
                                
                                <div className="p-4">
                                    <h2 className="text-display text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {medley.title}
                                    </h2>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                                        {medley.creator}
                                    </p>
                                    

                                    {/* Metadata */}
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            {formatDuration(medley.duration)}
                                        </span>
                                        <span>•</span>
                                        <span>{medley.songs.length}曲</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {((searchMode === "medley" && totalPages > 1) || (searchMode === "song" && totalSongPages > 1)) && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← 前
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {Array.from({ length: searchMode === "medley" ? totalPages : totalSongPages }, (_, i) => i + 1)
                                    .filter(page => 
                                        page === 1 || 
                                        page === totalPages || 
                                        (page >= currentPage - 2 && page <= currentPage + 2)
                                    )
                                    .map((page, index, array) => (
                                        <div key={page} className="flex items-center">
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className="px-2 text-gray-500">...</span>
                                            )}
                                            <Button
                                                size="sm"
                                                variant={currentPage === page ? "default" : "secondary"}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        </div>
                                    ))
                                }
                            </div>
                            
                            <button
                                onClick={() => setCurrentPage(Math.min(searchMode === "medley" ? totalPages : totalSongPages, currentPage + 1))}
                                disabled={currentPage === (searchMode === "medley" ? totalPages : totalSongPages)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                次 →
                            </button>
                        </div>
                    </div>
                )}

                {/* No search results */}
                {((searchMode === "medley" && paginatedMedleys.length === 0) ||
                  (searchMode === "song" && sortedFilteredSongs.length === 0)) &&
                 searchTerm && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">
                            {searchMode === "medley" ? "検索条件に一致するメドレーが見つかりませんでした" : "検索条件に一致する楽曲が見つかりませんでした"}
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                setSearchTerm("");
                                setCurrentPage(1);
                            }}
                        >
                            フィルターをリセット
                        </Button>
                    </div>
                )}

                {/* No data message */}
                {medleys.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">
                            メドレーデータがありません
                        </div>
                        <p className="text-sm text-gray-400">
                            新規メドレー登録機能を使用してメドレーを追加してください。
                        </p>
                    </div>
                )}
            </div>

            {/* New medley creation modal */}
            <CreateMedleyModal
                isOpen={showCreateMedleyModal}
                onClose={() => setShowCreateMedleyModal(false)}
                onCreateMedley={handleCreateMedley}
            />

            {/* Login modal */}
            <LoginModal
                open={showLoginModal}
                onOpenChange={setShowLoginModal}
                onSuccess={() => {
                    setShowCreateMedleyModal(true);
                }}
            />
        </div>
    );
}