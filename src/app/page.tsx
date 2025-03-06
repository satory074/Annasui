"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-unused-vars */

// 動画シーンのデータモデル
type Scene = {
    id: number;
    title: string;
    startTime: number; // 秒単位
    endTime: number; // 秒単位
    color: string;
};

// コードプログレッションデータモデル
type ChordSection = {
    id: number;
    chord: string;
    startTime: number;
    endTime: number;
    color: string;
};

// サンプルシーンデータ
const sampleScenes: Scene[] = [
    { id: 1, title: "シーン1: イントロ", startTime: 0, endTime: 15, color: "bg-blue-500" },
    { id: 2, title: "シーン2: 本編", startTime: 15, endTime: 45, color: "bg-green-500" },
    { id: 3, title: "シーン3: クライマックス", startTime: 45, endTime: 70, color: "bg-yellow-500" },
    { id: 4, title: "シーン4: エンディング", startTime: 70, endTime: 90, color: "bg-red-500" },
];

// サンプルコードプログレッション
const sampleChords: ChordSection[] = [
    { id: 1, chord: "Em7", startTime: 0, endTime: 6, color: "bg-purple-300" },
    { id: 2, chord: "B", startTime: 6, endTime: 12, color: "bg-purple-200" },
    { id: 3, chord: "F#add9", startTime: 12, endTime: 18, color: "bg-blue-200" },
    { id: 4, chord: "C#sus4", startTime: 18, endTime: 24, color: "bg-pink-200" },
    { id: 5, chord: "Bb/D", startTime: 24, endTime: 30, color: "bg-yellow-200" },
    { id: 6, chord: "Em7", startTime: 30, endTime: 36, color: "bg-purple-300" },
    { id: 7, chord: "B", startTime: 36, endTime: 42, color: "bg-purple-200" },
    { id: 8, chord: "C#sus4", startTime: 42, endTime: 48, color: "bg-pink-200" },
    { id: 9, chord: "C#", startTime: 48, endTime: 54, color: "bg-pink-300" },
    { id: 10, chord: "C#sus4", startTime: 54, endTime: 60, color: "bg-pink-200" },
    { id: 11, chord: "C#", startTime: 60, endTime: 66, color: "bg-pink-300" },
];

export default function Home() {
    const [videoId, setVideoId] = useState<string>("sm9");
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(50);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [currentScene, setCurrentScene] = useState<Scene | null>(null);
    const [currentChord, setCurrentChord] = useState<ChordSection | null>(null);
    const [inputVideoId, setInputVideoId] = useState<string>("sm9");
    const [domReady, setDomReady] = useState(false);
    const [browserReady, setBrowserReady] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [commandInProgress, setCommandInProgress] = useState<boolean>(false);

    const playerRef = useRef<HTMLIFrameElement | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    // autoPlayAttemptedをコンポーネントのトップレベルで宣言
    const autoPlayAttemptedRef = useRef<boolean>(false);

    // ニコニコ動画プレイヤーAPIのメッセージイベントを処理
    useEffect(() => {
        setDomReady(true);
        setBrowserReady(true);

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://embed.nicovideo.jp") return;
            console.log("COMPLETE EVENT DATA:", JSON.stringify(event.data, null, 2));

            try {
                const data = event.data;
                console.log("RECEIVED FROM EMBED:", event.origin, data);

                if (data && data.eventName) {
                    switch (data.eventName) {
                        case "loadComplete":
                            console.log("Player load complete");
                            if (data.data?.videoInfo?.lengthInSeconds) {
                                setDuration(data.data.videoInfo.lengthInSeconds);
                                console.log(`Set video duration: ${data.data.videoInfo.lengthInSeconds}`);
                            }
                            break;

                        case "playerMetadataChange":
                            if (data.data) {
                                // シーク操作に関連するメタデータの場合は特別に処理
                                if (commandInProgress && data.data.currentTime !== undefined) {
                                    console.log(`Metadata update during seek - currentTime: ${data.data.currentTime}`);
                                    // シーク関連のメタデータ更新は保持するが、commandInProgressフラグはまだ解除しない
                                    setCurrentTime(data.data.currentTime);
                                } else if (!commandInProgress) {
                                    // 通常の再生中のメタデータ更新
                                    if (data.data.currentTime !== undefined) {
                                        setCurrentTime(data.data.currentTime);
                                    }

                                    // その他の既存の処理...
                                }
                            }
                            break;

                        case "seekStatusChange":
                            console.log("Seek status changed:", data);

                            // シークの状態によって処理を分ける
                            if (data.data?.seekStatus === 0) {
                                // シーク完了 - 次のステップに進む
                                if (commandInProgress) {
                                    // シークの最終ステップとして再生状態を回復
                                    setTimeout(() => {
                                        if (playerRef.current) {
                                            const playMessage = {
                                                sourceConnectorType: 1,
                                                playerId: "1",
                                                eventName: "play",
                                            };

                                            console.log("Resuming playback after seek:", JSON.stringify(playMessage));
                                            playerRef.current.contentWindow?.postMessage(
                                                playMessage,
                                                "https://embed.nicovideo.jp"
                                            );

                                            // コマンド完了フラグを遅延設定
                                            setTimeout(() => {
                                                setCommandInProgress(false);
                                            }, 300);
                                        }
                                    }, 100);
                                }
                            }
                            break;

                        case "statusChange":
                            console.log("Status changed:", data);

                            // playerStatusとseekStatusの両方を処理
                            if (data.data) {
                                // シーク中は状態更新を延期
                                if (!commandInProgress || data.data.seekStatus === 0) {
                                    if (data.data.playerStatus !== undefined) {
                                        const newIsPlaying = data.data.playerStatus === 2;
                                        setIsPlaying(newIsPlaying);
                                    }
                                }
                            }
                            break;

                        case "error":
                            console.error("Player error:", data);
                            break;

                        default:
                            console.log(`Unhandled event: ${data.eventName}`);
                    }
                }
            } catch (error) {
                console.error("Error handling message:", error);
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("message", handleMessage);
            return () => window.removeEventListener("message", handleMessage);
        }
    }, []);

    // イベント分析用の強化版ハンドラ
    const analyzeMessages = (event: MessageEvent) => {
        if (event.origin !== "https://embed.nicovideo.jp") return;

        try {
            const data = event.data;

            // イベント名と詳細データの構造をログ
            console.log(`======= EVENT: ${data?.eventName} =======`);
            console.log(
                "DATA STRUCTURE:",
                JSON.stringify(
                    {
                        topLevelKeys: Object.keys(data || {}),
                        dataKeys: Object.keys(data?.data || {}),
                        completeData: data,
                    },
                    null,
                    2
                )
            );

            // シーク関連イベントの詳細分析
            if (
                data?.eventName === "seekStatusChange" ||
                data?.eventName === "seek" ||
                data?.eventName?.includes("seek")
            ) {
                console.log("SEEK EVENT DETAILED ANALYSIS:");
                console.log("- Has currentTime:", data?.data?.currentTime !== undefined);
                console.log("- Has position:", data?.data?.position !== undefined);
                console.log("- Has time:", data?.data?.time !== undefined);
                console.log("- All possible time values:", {
                    currentTime: data?.data?.currentTime,
                    position: data?.data?.position,
                    time: data?.data?.time,
                    playbackTime: data?.data?.playbackTime,
                    progress: data?.data?.progress,
                });
            }
        } catch (error) {
            console.error("Analysis error:", error);
        }
    };

    // 既存のメッセージハンドラに追加または置き換え
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.addEventListener("message", analyzeMessages);
            return () => window.removeEventListener("message", analyzeMessages);
        }
    }, []);

    // 動画IDが変更されたときの処理
    const handleVideoIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setVideoId(inputVideoId);
        setCurrentTime(0);
    };

    // 現在の再生時間に基づいてシーンとコードを更新
    useEffect(() => {
        const scene = sampleScenes.find((scene) => currentTime >= scene.startTime && currentTime < scene.endTime);
        if (scene && (!currentScene || scene.id !== currentScene.id)) {
            setCurrentScene(scene);
        }

        const chord = sampleChords.find((chord) => currentTime >= chord.startTime && currentTime < chord.endTime);
        if (chord && (!currentChord || chord.id !== currentChord.id)) {
            setCurrentChord(chord);
        }
    }, [currentTime, currentScene, currentChord]);

    // 現在の再生時間に基づいてシーンナビゲーションバーを更新
    useEffect(() => {
        const handleTimeUpdate = () => {
            if (timelineRef.current) {
                const progressBar = timelineRef.current.querySelector(".progress-bar") as HTMLDivElement | null;
                if (progressBar) {
                    const progress = (currentTime / duration) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            }
        };

        const interval = setInterval(handleTimeUpdate, 100); // 0.1秒ごとに更新

        return () => {
            clearInterval(interval);
        };
    }, [currentTime, duration]);

    // iframeの読み込み完了時の処理を更新
    const handleIframeLoad = () => {
        console.log("Player iframe loaded");
        setIframeLoaded(true);

        if (playerRef.current) {
            // 更新された初期化メッセージシーケンス
            const initMessages = [
                {
                    sourceConnectorType: 1,
                    playerId: "1",
                    eventName: "registerCallback",
                    data: {
                        _frontendId: 6,
                        _frontendVersion: 0,
                    },
                },
                {
                    sourceConnectorType: 1,
                    playerId: "1",
                    eventName: "setFrontendId",
                    data: { frontendId: "6", version: "0" },
                },
                {
                    sourceConnectorType: 1,
                    playerId: "1",
                    eventName: "getStatus",
                    data: {
                        _frontendId: 6,
                        _frontendVersion: 0,
                    },
                },
            ];

            // 順次送信
            initMessages.forEach((msg, index) => {
                setTimeout(() => {
                    console.log(`Sending init message ${index + 1}:`, JSON.stringify(msg));
                    playerRef.current?.contentWindow?.postMessage(msg, "https://embed.nicovideo.jp");
                }, index * 500);
            });
        }
    };

    // アクティブポーリングを削減し、イベントベースに移行
    useEffect(() => {
        let timerId = null;

        // 最初の通信確立とステータス確認のみポーリング
        if (playerRef.current && iframeLoaded) {
            timerId = setTimeout(() => {
                playerRef.current?.contentWindow?.postMessage(
                    { sourceConnectorType: 1, playerId: "1", eventName: "getStatus" },
                    "https://embed.nicovideo.jp"
                );
            }, 2000); // 初期化後の一度だけのステータス確認
        }

        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [iframeLoaded]);

    // 再生/一時停止の切り替え
    const togglePlayPause = () => {
        if (playerRef.current && !commandInProgress) {
            setCommandInProgress(true); // コマンド処理中フラグ

            const newPlayingState = !isPlaying;

            const message = {
                sourceConnectorType: 1,
                playerId: "1",
                eventName: newPlayingState ? "play" : "pause",
            };

            console.log(`Sending ${newPlayingState ? "play" : "pause"} command:`, JSON.stringify(message));
            playerRef.current.contentWindow?.postMessage(message, "https://embed.nicovideo.jp");

            // 直後にステータス要求を送信
            setTimeout(() => {
                playerRef.current?.contentWindow?.postMessage(
                    {
                        sourceConnectorType: 1,
                        playerId: "1",
                        eventName: "getStatus",
                    },
                    "https://embed.nicovideo.jp"
                );
            }, 300);

            // UIのローカル更新は遅延させる
            setTimeout(() => {
                setIsPlaying(newPlayingState);
                setCommandInProgress(false); // コマンド処理完了
            }, 500);
        }
    };

    // シーク操作の改善版
    const seekAndPlay = (seekTime: number) => {
        if (playerRef.current && !commandInProgress) {
            // コマンド処理中フラグを設定
            setCommandInProgress(true);

            // UIを一時的に更新（現在時間を表示）
            setCurrentTime(seekTime);

            // シークコマンドのシーケンス
            const executeSeek = async () => {
                try {
                    // ステップ1: 一時停止
                    const pauseMessage = {
                        sourceConnectorType: 1,
                        playerId: "1",
                        eventName: "pause",
                    };
                    console.log("Step 1: Pause before seek:", JSON.stringify(pauseMessage));
                    playerRef.current?.contentWindow?.postMessage(pauseMessage, "https://embed.nicovideo.jp");

                    // 一時停止が反映されるのを待つ
                    await new Promise((resolve) => setTimeout(resolve, 300));

                    // ステップ2: シーク実行
                    const seekMessage = {
                        sourceConnectorType: 1,
                        playerId: "1",
                        eventName: "seek",
                        data: {
                            time: seekTime,
                            _frontendId: 6,
                            _frontendVersion: 0,
                        },
                    };
                    console.log("Step 2: Executing seek:", JSON.stringify(seekMessage));
                    playerRef.current?.contentWindow?.postMessage(seekMessage, "https://embed.nicovideo.jp");

                    // シークの残りの処理はイベントハンドラで完了
                    // seekStatusChangeイベントが0になったとき、再生を再開
                } catch (e) {
                    console.error("Error during seek:", e);
                    setCommandInProgress(false); // エラー時にフラグを解除
                }
            };

            // シークシーケンスを実行
            executeSeek();
        }
    };

    // 音量調整
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);

        if (playerRef.current) {
            // 発見された正しいフォーマットを使用
            const message = {
                sourceConnectorType: 1,
                playerId: "1",
                eventName: "volumeChange",
                data: {
                    volume: newVolume / 100,
                },
            };

            console.log("Sending volume command:", JSON.stringify(message));
            playerRef.current?.contentWindow?.postMessage(message, "https://embed.nicovideo.jp");
        }
    };

    // フルスクリーン切り替え
    const toggleFullscreen = () => {
        if (playerRef.current) {
            // 発見された正しいフォーマットを使用
            const message = {
                sourceConnectorType: 1,
                playerId: "1",
                eventName: "fullscreenChange",
            };

            console.log("Sending fullscreen command:", JSON.stringify(message));
            playerRef.current?.contentWindow?.postMessage(message, "https://embed.nicovideo.jp");
            setIsFullscreen(!isFullscreen);
        }
    };

    // サビへジャンプボタンの処理
    const jumpToChorus = () => {
        const chorusStartTime = 45; // 例: 45秒がサビの開始時間
        seekAndPlay(chorusStartTime); // シークして再生
    };

    // 時間フォーマット関数
    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // SSR対応
    const getEmbedUrl = (): string => {
        const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?jsapi=1&playerId=1&_frontendId=6&_frontendVersion=0&noRelatedVideo=1`;
        return embedUrl;
    };

    // シークバーの操作
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const seekTime = parseFloat(e.target.value);
        seekAndPlay(seekTime); // シークして再生
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {/* ヘッダー - niconicoスタイル */}
                <div className="bg-pink-600 text-white p-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold">ニコニコ動画 外部プレイヤー</h1>
                        <form onSubmit={handleVideoIdSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={inputVideoId}
                                onChange={(e) => setInputVideoId(e.target.value)}
                                placeholder="動画ID (例: sm9)"
                                className="px-3 py-1 text-black rounded"
                            />
                            <button type="submit" className="px-3 py-1 bg-pink-700 rounded">
                                表示
                            </button>
                        </form>
                    </div>
                </div>

                {/* プレイヤーコンテナ */}
                <div className="relative">
                    {/* niconicoの埋め込みプレイヤー (2024年8月5日以降のAPI対応) */}
                    <div className="aspect-video bg-black relative">
                        {browserReady && (
                            <iframe
                                ref={playerRef}
                                src={getEmbedUrl()}
                                width="100%"
                                height="100%"
                                allowFullScreen
                                allow="autoplay; fullscreen"
                                frameBorder="0"
                                className="w-full h-full"
                                onLoad={handleIframeLoad}
                            ></iframe>
                        )}

                        {/* オーバーレイ表示（再生状態デバッグ用） */}
                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {isPlaying ? "再生中" : "停止中"} - {Math.floor(currentTime)}秒 / {duration}秒
                        </div>

                        {/* 代替コントロールオーバーレイ - iframe操作の代替 */}
                        <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={togglePlayPause}>
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black bg-opacity-50 rounded-full p-4 cursor-pointer hover:bg-opacity-70 transition-all">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-16 w-16 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* コントロールバー */}
                    <div className="bg-gray-800 p-3 flex items-center gap-3">
                        <button
                            onClick={togglePlayPause}
                            className="text-white bg-pink-600 hover:bg-pink-700 p-2 rounded-full"
                        >
                            {isPlaying ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        <div className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>

                        <div className="flex-grow">
                            <input
                                type="range"
                                min="0"
                                max={duration}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="text-white"
                            >
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                            </svg>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                        </div>

                        <button onClick={toggleFullscreen} className="text-white hover:text-pink-300">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* コード進行バー */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">コード進行</h3>
                    <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex">
                        {sampleChords.map((chord) => {
                            const chordWidth = ((chord.endTime - chord.startTime) / duration) * 100;
                            const chordLeft = (chord.startTime / duration) * 100;

                            return (
                                <div
                                    key={chord.id}
                                    className={`absolute h-full ${chord.color} flex items-center justify-center
                                    ${currentChord?.id === chord.id ? "border-2 border-white" : ""}`}
                                    style={{
                                        left: `${chordLeft}%`,
                                        width: `${chordWidth}%`,
                                    }}
                                    title={chord.chord}
                                    onClick={() => {
                                        const seekTime = chord.startTime;
                                        seekAndPlay(seekTime); // シークして再生
                                    }}
                                >
                                    <span className="text-xs text-gray-800 font-bold truncate px-1">{chord.chord}</span>
                                </div>
                            );
                        })}

                        {/* 現在位置インジケーター */}
                        <div
                            className="absolute h-full w-0.5 bg-red-500 z-10"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* アノテーションバー */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        シーンナビゲーション - 現在: {formatTime(currentTime)}
                    </h3>
                    <div
                        className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickPositionRatio = (e.clientX - rect.left) / rect.width;
                            const seekTime = duration * clickPositionRatio;
                            seekAndPlay(seekTime); // シークして再生
                        }}
                    >
                        {/* シーンの表示 */}
                        {sampleScenes.map((scene) => {
                            const sceneWidth = ((scene.endTime - scene.startTime) / duration) * 100;
                            const sceneLeft = (scene.startTime / duration) * 100;

                            return (
                                <div
                                    key={scene.id}
                                    className={`absolute h-full ${scene.color} flex items-center justify-center
                                    ${currentScene?.id === scene.id ? "border-2 border-white" : ""}`}
                                    style={{
                                        left: `${sceneLeft}%`,
                                        width: `${sceneWidth}%`,
                                    }}
                                    title={`${scene.title} (${formatTime(scene.startTime)} - ${formatTime(
                                        scene.endTime
                                    )})`}
                                    onClick={(e) => {
                                        e.stopPropagation(); // 親要素のクリックイベントを停止
                                        const seekTime = scene.startTime;
                                        seekAndPlay(seekTime); // シークして再生
                                    }}
                                >
                                    <span className="text-xs text-white font-bold truncate px-1">
                                        {scene.title} ({formatTime(scene.startTime)})
                                    </span>
                                </div>
                            );
                        })}

                        {/* 現在の再生位置インジケーター */}
                        <div
                            className="absolute h-full w-1 bg-red-500 z-20"
                            style={{
                                left: `${(currentTime / duration) * 100}%`,
                                boxShadow: "0 0 5px rgba(255, 255, 255, 0.8)",
                            }}
                        ></div>

                        {/* 現在時間の吹き出し表示 */}
                        <div
                            className="absolute top-0 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded z-20"
                            style={{
                                left: `${(currentTime / duration) * 100}%`,
                            }}
                        >
                            {formatTime(currentTime)}
                        </div>
                    </div>

                    {/* タイムライン */}
                    <div className="mt-2 h-6 relative" ref={timelineRef}>
                        <div className="absolute w-full h-1 bg-gray-300 top-0">
                            <div className="progress-bar absolute h-full bg-red-500" style={{ width: "0%" }}></div>
                        </div>
                        <div className="absolute w-full flex justify-between px-2 text-xs text-gray-500">
                            {Array.from({ length: 5 }).map((_, index) => {
                                const position = (index / 4) * 100;
                                const timeValue = (index / 4) * duration;
                                return (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center"
                                        style={{
                                            left: `${position}%`,
                                            position: "absolute",
                                            transform: "translateX(-50%)",
                                        }}
                                    >
                                        <div className="h-1.5 w-0.5 bg-gray-400"></div>
                                        <span>{formatTime(timeValue)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* フッター */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-xs flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button className="px-2 py-1 bg-pink-500 text-white rounded" onClick={jumpToChorus}>
                            サビから再生
                        </button>
                        <span className="text-gray-500">© 2024 niconico風プレイヤーサンプル</span>
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
