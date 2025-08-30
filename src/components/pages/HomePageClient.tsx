"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createMedley } from "@/lib/api/medleys";
import { MedleyData } from "@/types";
import MedleyStatistics from "@/components/features/statistics/MedleyStatistics";
import CreateMedleyModal from "@/components/features/medley/CreateMedleyModal";
import UserProfileDropdown from "@/components/features/auth/UserProfileDropdown";
import AuthModal from "@/components/features/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { getThumbnailUrl, getYouTubeThumbnail } from "@/lib/utils/thumbnail";
import Logo from "@/components/ui/Logo";

interface HomePageClientProps {
    initialMedleys: MedleyData[];
}

export default function HomePageClient({ initialMedleys }: HomePageClientProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [medleys, setMedleys] = useState<MedleyData[]>(initialMedleys);
    // Remove unused loading state as it's not currently used for homepage data loading
    const [searchTerm, setSearchTerm] = useState("");
    const [genreFilter, setGenreFilter] = useState("");
    const [searchMode, setSearchMode] = useState<"medley" | "song">("medley");
    const [sortBy, setSortBy] = useState<"title" | "creator" | "duration" | "songCount" | "createdAt" | "updatedAt" | "viewCount" | "random">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [showStatistics, setShowStatistics] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [showCreateMedleyModal, setShowCreateMedleyModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleCreateMedley = async (medleyData: Omit<MedleyData, 'songs'>) => {
        // Check authentication
        if (!user) {
            console.warn('⚠️ User not authenticated, cannot create medley');
            setShowAuthModal(true);
            return;
        }

        console.log('🔐 Creating medley with user:', user.id, user.email);
        
        try {
            // Create medley in database with user_id
            const newMedley = await createMedley({
                ...medleyData,
                songs: [],
                user_id: user.id
            });
            
            if (newMedley) {
                // Update medley list
                setMedleys(prev => [newMedley, ...prev]);
                setShowCreateMedleyModal(false);
                
                // Navigate to editing page
                const platform = medleyData.platform || 'niconico';
                router.push(`/${platform}/${medleyData.videoId}`);
                
                console.log('✅ Medley created successfully:', newMedley.id);
            } else {
                alert('メドレーの作成に失敗しました');
            }
        } catch (error) {
            console.error('❌ Error creating medley:', error);
            alert('メドレーの作成に失敗しました。もう一度お試しください。');
        }
    };

    const handleCreateMedleyClick = () => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        setShowCreateMedleyModal(true);
    };

    // Filtering and sorting logic
    const filteredAndSortedMedleys = medleys
        .filter(medley => {
            if (searchMode === "medley") {
                const matchesSearch = medley.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (medley.creator || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchesGenre = true;
                return matchesSearch && matchesGenre;
            } else {
                // Song search mode
                const hasMatchingSong = medley.songs.some(song => 
                    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
                );
                const matchesGenre = true;
                return hasMatchingSong && matchesGenre;
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

    // Song search results (cross-medley search)
    const songSearchResults = searchMode === "song" && searchTerm ? 
        medleys.flatMap(medley => 
            medley.songs
                .filter(song => 
                    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(song => ({
                    ...song,
                    medleyTitle: medley.title,
                    medleyCreator: medley.creator,
                    videoId: medley.videoId,
                    platform: medley.platform || 'niconico'
                }))
        )
    : [];

    // Available genres
    const availableGenres = Array.from(new Set(
        []
    )).sort();

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
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-6xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Logo size="xl" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-200">
                                    ALPHA
                                </span>
                            </div>
                            <p className="text-lg text-gray-600">
                                メドレー楽曲の詳細なアノテーション・検索プラットフォーム
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* User profile dropdown */}
                            <UserProfileDropdown />

                            {/* Feedback button */}
                            <a
                                href="https://github.com/anthropics/claude-code/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                title="フィードバック・バグ報告"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">フィードバック</span>
                            </a>

                            {/* Statistics button */}
                            <button
                                onClick={() => setShowStatistics(!showStatistics)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                </svg>
                                統計情報
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {showStatistics ? '隠す' : '表示'}
                                </span>
                            </button>

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
                                {!user && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )}
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

                {/* Statistics */}
                {showStatistics && medleys.length > 0 && (
                    <MedleyStatistics medleys={medleys} />
                )}

                {/* Search and filter UI */}
                <div className="mb-8">
                    {/* Search bar */}
                    <div className="mb-6">
                        <div className="relative max-w-2xl mx-auto">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder={searchMode === "medley" ? "メドレー名、作者名で検索..." : "楽曲名、アーティスト名で検索..."}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-12 pr-4 py-4 text-lg bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Tabs and filters */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        {/* Tab switching */}
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6" aria-label="Tabs">
                                <button
                                    onClick={() => {
                                        setSearchMode("medley");
                                        setSearchTerm("");
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
                                        setSearchTerm("");
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

                        {/* Filter and sort controls */}
                        <div className="p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ジャンル
                                    </label>
                                    <select
                                        value={genreFilter}
                                        onChange={(e) => {
                                            setGenreFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">すべてのジャンル</option>
                                        {availableGenres.map(genre => (
                                            <option key={genre} value={genre}>{genre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        並び順
                                    </label>
                                    <select
                                        value={`${sortBy}-${sortOrder}`}
                                        onChange={(e) => {
                                            const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                                            setSortBy(newSortBy);
                                            setSortOrder(newSortOrder);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                                        <span className="font-medium text-gray-900">
                                            {songSearchResults.length}件
                                        </span>
                                        <span>の楽曲が見つかりました</span>
                                        {filteredAndSortedMedleys.length > 0 && (
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                {filteredAndSortedMedleys.length}メドレー中
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {(searchTerm || genreFilter) && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setGenreFilter("");
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
                {searchMode === "song" && songSearchResults.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            楽曲検索結果
                        </h2>
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="max-h-96 overflow-y-auto">
                                {songSearchResults.map((song, index) => (
                                    <div key={`${song.videoId}-${song.id}`} className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${index === songSearchResults.length - 1 ? 'border-b-0' : ''}`}>
                                        <Link 
                                            href={getSongUrl(song)}
                                            className="block"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">
                                                        {song.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {song.artist}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        収録: {song.medleyTitle} ({song.medleyCreator})
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm text-gray-500">
                                                    <div>{formatTime(song.startTime)} ~ {formatTime(song.endTime)}</div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Medley list */}
                {searchMode === "medley" && (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedMedleys.map((medley) => (
                        <div key={medley.videoId} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-gray-200">
                            <Link href={getMedleyUrl(medley)} className="block">
                                <div className="aspect-video bg-gray-200 relative overflow-hidden">
                                    {medley.platform === 'youtube' ? (
                                        <img
                                            src={getYouTubeThumbnail(medley.videoId, 'maxresdefault')}
                                            alt={medley.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = getYouTubeThumbnail(medley.videoId, 'hqdefault');
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={getThumbnailUrl(`https://www.nicovideo.jp/watch/${medley.videoId}`) || '/default-thumbnail.svg'}
                                            alt={medley.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/default-thumbnail.svg';
                                                target.alt = `${medley.title} (デフォルトサムネイル)`;
                                            }}
                                        />
                                    )}
                                    
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
                                    
                                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                        {formatDuration(medley.duration)}
                                    </div>

                                    <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                        {medley.songs.length}曲
                                    </div>
                                </div>
                                
                                <div className="p-4">
                                    <h2 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
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
                {searchMode === "medley" && totalPages > 1 && (
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
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
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
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-2 rounded ${
                                                    currentPage === page
                                                        ? "bg-blue-500 text-white"
                                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                            
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                次 →
                            </button>
                        </div>
                    </div>
                )}

                {/* No search results */}
                {((searchMode === "medley" && paginatedMedleys.length === 0) || 
                  (searchMode === "song" && songSearchResults.length === 0)) && 
                 (searchTerm || genreFilter) && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">
                            {searchMode === "medley" ? "検索条件に一致するメドレーが見つかりませんでした" : "検索条件に一致する楽曲が見つかりませんでした"}
                        </div>
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setGenreFilter("");
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            フィルターをリセット
                        </button>
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

            {/* Authentication modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                title="メドレー作成にはログインが必要です"
                description="新しいメドレーを作成・編集するには、GitHubまたはGoogleアカウントでログインしてください。"
            />
        </div>
    );
}