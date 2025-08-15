"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllMedleys } from "@/lib/api/medleys";
import { getMedleyByVideoId as getStaticMedleyByVideoId } from "@/data/medleys";
import { MedleyData } from "@/types";
import MedleyStatistics from "@/components/features/statistics/MedleyStatistics";

export default function Home() {
    const [medleys, setMedleys] = useState<MedleyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [genreFilter, setGenreFilter] = useState("");
    const [searchMode, setSearchMode] = useState<"medley" | "song">("medley");
    const [sortBy, setSortBy] = useState<"title" | "creator" | "duration" | "songCount">("title");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [showStatistics, setShowStatistics] = useState(false);
    const itemsPerPage = 6;

    useEffect(() => {
        async function fetchMedleys() {
            setLoading(true);
            
            // Supabaseが設定されているかチェック
            const isSupabaseConfigured = Boolean(
                process.env.NEXT_PUBLIC_SUPABASE_URL && 
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
            );

            if (isSupabaseConfigured) {
                // Supabaseから取得
                const apiMedleys = await getAllMedleys();
                setMedleys(apiMedleys);
            } else {
                // 静的データから取得（ニコニコとYouTubeの両方）
                const { getAllYouTubeMedleys } = await import("@/data/youtubeMedleys");
                const staticMedleys = [
                    getStaticMedleyByVideoId("sm500873"),
                    getStaticMedleyByVideoId("sm38343669"),
                    getStaticMedleyByVideoId("sm37796813"),
                    ...getAllYouTubeMedleys()
                ].filter(Boolean) as MedleyData[];
                
                setMedleys(staticMedleys);
            }
            
            setLoading(false);
        }

        fetchMedleys();
    }, []);

    // フィルタリング・ソート処理
    const filteredAndSortedMedleys = medleys
        .filter(medley => {
            if (searchMode === "medley") {
                const matchesSearch = medley.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (medley.creator || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchesGenre = genreFilter === "" || 
                                   medley.songs.some(song => song.genre === genreFilter);
                return matchesSearch && matchesGenre;
            } else {
                // 楽曲検索モード
                const hasMatchingSong = medley.songs.some(song => 
                    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
                );
                const matchesGenre = genreFilter === "" || 
                                   medley.songs.some(song => song.genre === genreFilter);
                return hasMatchingSong && matchesGenre;
            }
        })
        .sort((a, b) => {
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
                default:
                    return 0;
            }
            
            if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
            if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    // ページネーション処理
    const totalPages = Math.ceil(filteredAndSortedMedleys.length / itemsPerPage);
    const paginatedMedleys = filteredAndSortedMedleys.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // 楽曲検索結果（クロスメドレー検索）
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
        ).filter(song => genreFilter === "" || song.genre === genreFilter)
    : [];

    // 利用可能なジャンルを取得
    const availableGenres = Array.from(new Set(
        medleys.flatMap(medley => medley.songs.map(song => song.genre).filter(Boolean))
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="max-w-6xl mx-auto py-8 px-4">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                            メドレーアノテーションプレイヤー
                        </h1>
                        <div className="text-gray-600 dark:text-gray-400">
                            読み込み中...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto py-8 px-4">
                {/* ヘッダー */}
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                メドレーアノテーションプレイヤー
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                メドレー楽曲の詳細なアノテーション情報を提供します。楽曲ごとの時間情報を確認できます。
                            </p>
                        </div>
                        <button
                            onClick={() => setShowStatistics(!showStatistics)}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                        >
                            📊 統計情報
                            <span className="text-xs">
                                {showStatistics ? '隠す' : '表示'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 統計情報 */}
                {showStatistics && medleys.length > 0 && (
                    <MedleyStatistics medleys={medleys} />
                )}

                {/* 検索・フィルター */}
                <div className="mb-6 space-y-4">
                    {/* 検索モード切り替え */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSearchMode("medley");
                                setSearchTerm("");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                searchMode === "medley"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                        >
                            メドレー検索
                        </button>
                        <button
                            onClick={() => {
                                setSearchMode("song");
                                setSearchTerm("");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                searchMode === "song"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                        >
                            楽曲検索
                        </button>
                    </div>

                    {/* 検索・フィルター・ソート */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="lg:col-span-2">
                            <input
                                type="text"
                                placeholder={searchMode === "medley" ? "メドレー名、作者名で検索..." : "楽曲名、アーティスト名で検索..."}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <select
                                value={genreFilter}
                                onChange={(e) => {
                                    setGenreFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">すべてのジャンル</option>
                                {availableGenres.map(genre => (
                                    <option key={genre} value={genre}>{genre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                                    setSortBy(newSortBy);
                                    setSortOrder(newSortOrder);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="title-asc">タイトル(昇順)</option>
                                <option value="title-desc">タイトル(降順)</option>
                                <option value="creator-asc">作者名(昇順)</option>
                                <option value="creator-desc">作者名(降順)</option>
                                <option value="duration-asc">再生時間(短い順)</option>
                                <option value="duration-desc">再生時間(長い順)</option>
                                <option value="songCount-asc">楽曲数(少ない順)</option>
                                <option value="songCount-desc">楽曲数(多い順)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 結果表示 */}
                <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {searchMode === "medley" ? (
                            <>
                                {filteredAndSortedMedleys.length}件のメドレーが見つかりました
                                {totalPages > 1 && (
                                    <span className="ml-2">({currentPage}/{totalPages}ページ)</span>
                                )}
                            </>
                        ) : (
                            <>
                                {songSearchResults.length}件の楽曲が見つかりました
                                {filteredAndSortedMedleys.length > 0 && (
                                    <span className="ml-2">({filteredAndSortedMedleys.length}メドレー中)</span>
                                )}
                            </>
                        )}
                    </div>
                    
                    {searchTerm || genreFilter ? (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setGenreFilter("");
                                setCurrentPage(1);
                            }}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            フィルターをクリア
                        </button>
                    ) : null}
                </div>

                {/* 楽曲検索結果 */}
                {searchMode === "song" && songSearchResults.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            楽曲検索結果
                        </h2>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="max-h-96 overflow-y-auto">
                                {songSearchResults.map((song, index) => (
                                    <div key={`${song.videoId}-${song.id}`} className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 ${index === songSearchResults.length - 1 ? 'border-b-0' : ''}`}>
                                        <Link 
                                            href={getSongUrl(song)}
                                            className="block"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {song.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {song.artist}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                        収録: {song.medleyTitle} ({song.medleyCreator})
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm text-gray-500 dark:text-gray-500">
                                                    <div>{formatTime(song.startTime)} ~ {formatTime(song.endTime)}</div>
                                                    {song.genre && (
                                                        <div className="text-xs mt-1">
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                                {song.genre}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* メドレーリスト */}
                {searchMode === "medley" && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {paginatedMedleys.map((medley) => (
                        <div key={medley.videoId} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                            <Link href={getMedleyUrl(medley)} className="block">
                                <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                                    {medley.platform === 'youtube' ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${medley.videoId}/maxresdefault.jpg`}
                                            alt={medley.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = `https://img.youtube.com/vi/${medley.videoId}/hqdefault.jpg`;
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={`https://tn.smilevideo.jp/smile?i=${medley.videoId.replace('sm', '')}`}
                                            alt={medley.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                        <div className="bg-white dark:bg-gray-800 rounded-full p-3">
                                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                        {formatDuration(medley.duration)}
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                        {medley.platform === 'youtube' ? 'YouTube' : 'ニコニコ動画'}
                                    </div>
                                </div>
                                
                                <div className="p-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                        {medley.title}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        {medley.creator}
                                    </p>
                                    
                                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                                        {medley.songs.length}曲収録 • {medley.videoId}
                                    </div>

                                    {/* 楽曲サンプル表示 */}
                                    <div className="space-y-1">
                                        {medley.songs.slice(0, 3).map((song, index) => (
                                            <div key={song.id} className="flex justify-between items-center text-xs">
                                                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                                                    {index + 1}. {song.title}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-500 ml-2">
                                                    {formatTime(song.startTime)}
                                                </span>
                                            </div>
                                        ))}
                                        {medley.songs.length > 3 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                ...他{medley.songs.length - 3}曲
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                        ))}
                    </div>
                )}

                {/* ページネーション */}
                {searchMode === "medley" && totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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
                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                次 →
                            </button>
                        </div>
                    </div>
                )}

                {/* 検索結果なしの表示 */}
                {((searchMode === "medley" && paginatedMedleys.length === 0) || 
                  (searchMode === "song" && songSearchResults.length === 0)) && 
                 !loading && (searchTerm || genreFilter) && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
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

                {/* データなしの表示 */}
                {medleys.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                            メドレーデータがありません
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Supabaseの設定を確認するか、静的データを追加してください。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}