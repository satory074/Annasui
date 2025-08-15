"use client";

import { MedleyData } from "@/types";

interface MedleyStatisticsProps {
    medleys: MedleyData[];
}

export default function MedleyStatistics({ medleys }: MedleyStatisticsProps) {
    if (medleys.length === 0) return null;

    // 統計情報の計算
    const stats = {
        totalMedleys: medleys.length,
        totalSongs: medleys.reduce((sum, medley) => sum + medley.songs.length, 0),
        totalDuration: medleys.reduce((sum, medley) => sum + medley.duration, 0),
        averageSongsPerMedley: Math.round(
            medleys.reduce((sum, medley) => sum + medley.songs.length, 0) / medleys.length
        ),
        averageDuration: Math.round(
            medleys.reduce((sum, medley) => sum + medley.duration, 0) / medleys.length
        ),
    };

    // ジャンル別統計
    const genreStats = medleys
        .flatMap(medley => medley.songs)
        .reduce((acc, song) => {
            if (song.genre) {
                acc[song.genre] = (acc[song.genre] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

    const topGenres = Object.entries(genreStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // アーティスト別統計
    const artistStats = medleys
        .flatMap(medley => medley.songs)
        .reduce((acc, song) => {
            acc[song.artist] = (acc[song.artist] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const topArtists = Object.entries(artistStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // 作者別統計
    const creatorStats = medleys
        .filter(medley => medley.creator)
        .reduce((acc, medley) => {
            const creator = medley.creator!;
            acc[creator] = (acc[creator] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const topCreators = Object.entries(creatorStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}時間${minutes}分${secs}秒`;
        }
        return `${minutes}分${secs}秒`;
    };

    return (
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 基本統計 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📊 基本統計
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">メドレー数</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {stats.totalMedleys}本
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">総楽曲数</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {stats.totalSongs}曲
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">総再生時間</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatDuration(stats.totalDuration)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">平均楽曲数</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {stats.averageSongsPerMedley}曲/本
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">平均再生時間</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatDuration(stats.averageDuration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ジャンル別統計 */}
            {topGenres.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🎵 人気ジャンル
                    </h3>
                    <div className="space-y-3">
                        {topGenres.map(([genre, count], index) => (
                            <div key={genre} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs flex items-center justify-center mr-3">
                                        {index + 1}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                        {genre}
                                    </span>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {count}曲
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* アーティスト別統計 */}
            {topArtists.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🎤 人気アーティスト
                    </h3>
                    <div className="space-y-3">
                        {topArtists.map(([artist, count], index) => (
                            <div key={artist} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs flex items-center justify-center mr-3">
                                        {index + 1}
                                    </span>
                                    <span className="text-gray-900 dark:text-white truncate">
                                        {artist}
                                    </span>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {count}曲
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 作者別統計 */}
            {topCreators.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        👤 メドレー作者
                    </h3>
                    <div className="space-y-3">
                        {topCreators.map(([creator, count], index) => (
                            <div key={creator} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs flex items-center justify-center mr-3">
                                        {index + 1}
                                    </span>
                                    <span className="text-gray-900 dark:text-white truncate">
                                        {creator}
                                    </span>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {count}本
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}