"use client";

import { useState } from "react";
import { useMedleyData } from "@/hooks/useMedleyData";
import { useCurrentTrack } from "@/hooks/useCurrentTrack";
import Header from "@/components/layout/Header";
import NicoPlayer from "@/components/features/player/NicoPlayer";
import { useNicoPlayer } from "@/hooks/useNicoPlayer";
import SongTimeline from "@/components/features/medley/SongTimeline";
import SongList from "@/components/features/medley/SongList";

export default function Home() {
    const [videoId, setVideoId] = useState<string>("sm500873");
    const [inputVideoId, setInputVideoId] = useState<string>("sm500873");

    // メドレーデータの取得
    const { medleySongs, medleyTitle, medleyCreator } = useMedleyData(videoId);
    
    // ニコニコプレイヤーの統合
    const {
        playerRef,
        isPlaying,
        currentTime,
        duration,
        playerError,
        togglePlayPause,
        seek: nicoSeek,
        getEmbedUrl,
        handleIframeLoad,
        clearError
    } = useNicoPlayer({
        videoId,
        onTimeUpdate: () => {
            // タイムラインの更新はuseNicoPlayerが自動処理
        },
        onDurationChange: () => {
            // 動画の長さはuseNicoPlayerが自動処理
        },
        onPlayingChange: () => {
            // 再生状態の変化はuseNicoPlayerが自動処理
        }
    });
    
    // シーク機能をnicoSeekに接続
    const seek = (seekTime: number) => {
        nicoSeek(seekTime);
    };

    // 現在のトラックの追跡
    const { currentSong } = useCurrentTrack(currentTime, medleySongs);

    // 動画IDが変更されたときの処理
    const handleVideoIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.info("Loading video:", inputVideoId);
        setVideoId(inputVideoId);
        // ニコニコプレイヤーが状態をリセット
    };

    // 曲の開始時間へジャンプボタンの処理
    const jumpToSong = (songId: number) => {
        const song = medleySongs.find((s) => s.id === songId);
        if (song) {
            seek(song.startTime);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                {/* ヘッダー */}
                <Header
                    inputVideoId={inputVideoId}
                    onInputVideoIdChange={setInputVideoId}
                    onVideoIdSubmit={handleVideoIdSubmit}
                    medleyTitle={medleyTitle}
                    medleyCreator={medleyCreator}
                />



                {/* プレイヤーコンテナ */}
                <div className="relative">
                    <NicoPlayer
                        playerRef={playerRef}
                        embedUrl={getEmbedUrl()}
                        onIframeLoad={handleIframeLoad}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        playerError={playerError}
                        onTogglePlayPause={togglePlayPause}
                        onErrorDismiss={clearError}
                    />
                </div>

                {/* 楽曲アノテーションタイムライン */}
                {medleySongs.length > 0 && (
                    <SongTimeline
                        songs={medleySongs}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={seek}
                    />
                )}


                {/* 楽曲リスト */}
                {medleySongs.length > 0 && (
                    <SongList
                        songs={medleySongs}
                        currentTime={currentTime}
                        onSeek={seek}
                    />
                )}

                {/* フッター */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-xs flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {currentSong && (
                            <button 
                                className="px-2 py-1 bg-pink-500 text-white rounded"
                                onClick={() => jumpToSong(currentSong.id)}
                            >
                                現在の曲から再生
                            </button>
                        )}
                        <span className="text-gray-500">© 2025 ニコニコメドレーアノテーションプレイヤー</span>
                    </div>
                    <div>
                        <select className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                            <option>日本語</option>
                            <option>English</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}