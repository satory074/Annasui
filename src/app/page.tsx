"use client";

import { useState } from "react";
import { useMedleyData } from "@/hooks/useMedleyData";
import { useCurrentTrack } from "@/hooks/useCurrentTrack";
import Header from "@/components/layout/Header";
import NicoPlayer from "@/components/features/player/NicoPlayer";
import { useNicoPlayer } from "@/hooks/useNicoPlayer";
import SongTimeline from "@/components/features/medley/SongTimeline";
import ChordBar from "@/components/features/medley/ChordBar";
import SongList from "@/components/features/medley/SongList";
import { VideoInfo as VideoInfoType } from "@/lib/utils/videoInfo";
import ModeToggle from "@/components/ui/ModeToggle";

export default function Home() {
    const [videoId, setVideoId] = useState<string>("sm500873");
    const [inputVideoId, setInputVideoId] = useState<string>("sm500873");
    const [isAnnotationMode, setIsAnnotationMode] = useState<boolean>(true);
    const [videoInfo, setVideoInfo] = useState<VideoInfoType | null>(null);

    // メドレーデータの取得
    const { medleySongs, medleyChords, medleyTitle, medleyCreator } = useMedleyData(videoId);
    
    // ニコニコプレイヤーの統合
    const {
        playerRef,
        isPlaying,
        currentTime,
        duration,
        playerError,
        videoInfo: nicoVideoInfo,
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
    const { currentSong, currentChord } = useCurrentTrack(currentTime, medleySongs, medleyChords);

    // 動画IDが変更されたときの処理
    const handleVideoIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.info("Loading video:", inputVideoId);
        setVideoId(inputVideoId);
        // ニコニコプレイヤーが状態をリセットするため、
        // videoInfoのみローカル状態をリセット
        setVideoInfo(null);
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
                    medleyTitle={isAnnotationMode ? medleyTitle : ""}
                    medleyCreator={isAnnotationMode ? medleyCreator : ""}
                />

                {/* モード切り替え */}
                <ModeToggle
                    isAnnotationMode={isAnnotationMode}
                    onToggle={setIsAnnotationMode}
                />

                {/* 動画情報表示（通常モードのみ） */}
                {!isAnnotationMode && (nicoVideoInfo || videoInfo) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700">
                        <h2 className="text-lg font-bold">{(nicoVideoInfo || videoInfo)?.title}</h2>
                        <p className="text-sm text-gray-600">{(nicoVideoInfo || videoInfo)?.videoId}</p>
                    </div>
                )}

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

                {/* アノテーション表示（アノテーションモードのみ） */}
                {isAnnotationMode && (
                    <>
                        {/* 楽曲アノテーションタイムライン */}
                        {medleySongs.length > 0 && (
                            <SongTimeline
                                songs={medleySongs}
                                currentTime={currentTime}
                                duration={duration}
                                onSeek={seek}
                            />
                        )}

                        {/* コード進行バー */}
                        {medleyChords.length > 0 && (
                            <ChordBar
                                chords={medleyChords}
                                currentTime={currentTime}
                                duration={duration}
                                currentChord={currentChord}
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
                    </>
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