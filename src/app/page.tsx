"use client";

import { useEffect, useRef, useState } from "react";
import SongTimeline from "@/components/SongTimeline";
import SongList from "@/components/SongList";
import { ChordSection, SongSection } from "@/types";
import { getMedleyByVideoId } from "@/data/medleys";

export default function Home() {
    const [videoId, setVideoId] = useState<string>("sm9");
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(50);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [currentSong, setCurrentSong] = useState<SongSection | null>(null);
    const [currentChord, setCurrentChord] = useState<ChordSection | null>(null);
    const [inputVideoId, setInputVideoId] = useState<string>("sm9");
    const [browserReady] = useState(true); // 最初からtrueに設定
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [commandInProgress, setCommandInProgress] = useState<boolean>(false);
    const [medleySongs, setMedleySongs] = useState<SongSection[]>([]);
    const [medleyChords, setMedleyChords] = useState<ChordSection[]>([]);
    const [medleyTitle, setMedleyTitle] = useState<string>("");
    const [medleyCreator, setMedleyCreator] = useState<string>("");

    const playerRef = useRef<HTMLIFrameElement | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // 時間値（currentTime, duration）が大きすぎる場合はミリ秒→秒に変換
    function normalizeTimeValue(timeValue: number): number {
        // 明らかに異常に大きい値（10000秒以上）は秒に変換
        // 通常の動画であれば数千秒（1-3時間程度）はあり得るので、閾値を上げる
        if (timeValue > 10000) {
            return timeValue / 1000;
        }

        // すでに適切な秒単位の値と判断
        return timeValue;
    }

    // プレイヤーへの通信を直接処理する安全な関数を提供
    function sendMessageToPlayer(message: Record<string, unknown>) {
        if (playerRef.current?.contentWindow) {
            playerRef.current.contentWindow.postMessage(message, "https://embed.nicovideo.jp");
            console.log("COMMAND TO PLAYER:", message);
        }
    }

    // ニコニコ動画プレイヤーAPIのメッセージイベントを処理
    useEffect(() => {

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
                                const rawDuration = data.data.videoInfo.lengthInSeconds;
                                const normalizedDuration = normalizeTimeValue(rawDuration);
                                console.log(`動画長さ変換: ${rawDuration} → ${normalizedDuration}秒`);
                                setDuration(normalizedDuration);
                            }
                            break;

                        case "playerMetadataChange":
                            if (data.data) {
                                // シーク操作に関連するメタデータの場合は特別に処理
                                console.log("メタデータ更新 (変換前):", {
                                    currentTime: data.data.currentTime,
                                    duration: data.data.duration
                                });

                                if (commandInProgress && data.data.currentTime !== undefined) {
                                    console.log(`Metadata update during seek - currentTime: ${data.data.currentTime}`);
                                    // シーク関連のメタデータ更新は保持するが、commandInProgressフラグはまだ解除しない
                                    const normalizedTime = normalizeTimeValue(data.data.currentTime);
                                    console.log(`時間変換: ${data.data.currentTime} → ${normalizedTime}秒`);
                                    setCurrentTime(normalizedTime);
                                } else if (!commandInProgress) {
                                    // 通常の再生中のメタデータ更新
                                    if (data.data.currentTime !== undefined) {
                                        const normalizedTime = normalizeTimeValue(data.data.currentTime);
                                        console.log(`時間変換: ${data.data.currentTime} → ${normalizedTime}秒`);
                                        setCurrentTime(normalizedTime);
                                    }

                                    // 長さの更新
                                    if (data.data.duration !== undefined) {
                                        const normalizedDuration = normalizeTimeValue(data.data.duration);
                                        console.log(`長さ変換: ${data.data.duration} → ${normalizedDuration}秒`);
                                        setDuration(normalizedDuration);
                                    }
                                }
                            }
                            break;

                        case "seekStatusChange":
                            console.log("シーク状態変更:", data);

                            // シークの状態によって処理を分ける
                            if (data.data) {
                                console.log(`シーク状態 = ${data.data.seekStatus} (0=完了, 1=処理中, 2=開始)`);

                                // シーク完了の場合
                                if (data.data.seekStatus === 0 && commandInProgress) {
                                    console.log("シーク完了を検出");

                                    // シークが完了したら、現在のシーク時間を取得
                                    setTimeout(() => {
                                        playerRef.current?.contentWindow?.postMessage(
                                            {
                                                sourceConnectorType: 1,
                                                playerId: "1",
                                                eventName: "getStatus",
                                            },
                                            "https://embed.nicovideo.jp"
                                        );
                                    }, 100);

                                    // シークの最終ステップとして再生状態を回復
                                    setTimeout(() => {
                                        if (playerRef.current && isPlaying) {
                                            const playMessage = {
                                                sourceConnectorType: 1,
                                                playerId: "1",
                                                eventName: "play",
                                            };

                                            console.log("シーク後の再生再開:", JSON.stringify(playMessage));
                                            playerRef.current.contentWindow?.postMessage(
                                                playMessage,
                                                "https://embed.nicovideo.jp"
                                            );
                                        }

                                        // コマンド完了フラグを遅延設定
                                        setTimeout(() => {
                                            setCommandInProgress(false);
                                            console.log("コマンド完了フラグをリセット");
                                        }, 300);
                                    }, 200);
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


    // 動画IDが変更されたときの処理
    const handleVideoIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setVideoId(inputVideoId);
        setCurrentTime(0);
    };

    // 動画IDが変更されたら、対応するメドレーデータを読み込む
    useEffect(() => {
        const medleyData = getMedleyByVideoId(videoId);
        if (medleyData) {
            setMedleySongs(medleyData.songs);
            setMedleyChords(medleyData.chords || []);
            setDuration(medleyData.duration);
            setMedleyTitle(medleyData.title);
            setMedleyCreator(medleyData.creator || "");
        } else {
            // メドレーデータがない場合は空の配列にする
            setMedleySongs([]);
            setMedleyChords([]);
            setMedleyTitle("");
            setMedleyCreator("");
        }
    }, [videoId]);

    // 現在の再生時間に基づいてシーンとコードを更新
    useEffect(() => {
        const song = medleySongs.find((song) => currentTime >= song.startTime && currentTime < song.endTime);
        if (song && (!currentSong || song.id !== currentSong.id)) {
            setCurrentSong(song);
        }

        const chord = medleyChords.find((chord) => currentTime >= chord.startTime && currentTime < chord.endTime);
        if (chord && (!currentChord || chord.id !== currentChord.id)) {
            setCurrentChord(chord);
        }
    }, [currentTime, currentSong, currentChord, medleySongs, medleyChords]);

    // 現在の再生時間に基づいてシーンナビゲーションバーを更新 - ref.currentがnullエラーを修正
    const [timelineReady, setTimelineReady] = useState(false);

    // タイムラインのDOM参照ができたらフラグを立てる
    useEffect(() => {
        if (timelineRef.current) {
            setTimelineReady(true);
        }
    }, []);

    // タイムラインの更新処理
    useEffect(() => {
        // タイムラインが準備できていなければ何もしない
        if (!timelineReady) return;

        const handleTimeUpdate = () => {
            try {
                if (timelineRef.current) {
                    const progressBar = timelineRef.current.querySelector(".progress-bar") as HTMLDivElement | null;
                    if (progressBar) {
                        const progress = (currentTime / duration) * 100;
                        progressBar.style.width = `${progress}%`;
                    }
                }
            } catch (error) {
                console.error("タイムライン更新中にエラー:", error);
            }
        };

        // すぐに一度実行
        handleTimeUpdate();

        // 定期的に更新
        const interval = setInterval(handleTimeUpdate, 100);
        return () => clearInterval(interval);
    }, [currentTime, duration, timelineReady]);

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
        const timerId = setTimeout(() => {
            if (playerRef.current && iframeLoaded) {
                playerRef.current.contentWindow?.postMessage(
                    { sourceConnectorType: 1, playerId: "1", eventName: "getStatus" },
                    "https://embed.nicovideo.jp"
                );
            }
        }, 2000); // 初期化後の一度だけのステータス確認

        return () => clearTimeout(timerId);
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

    // シーク操作の完全な書き直し - よりロバストな検証機能を追加
    const seekAndPlay = (seekTime: number) => {
        console.log(`[DEBUG] シーク開始: ${seekTime}秒へ シーク (source:ユーザー操作)`);

        if (!playerRef.current?.contentWindow || commandInProgress) {
            console.log("[警告] シーク不可: プレイヤー未準備またはコマンド実行中");
            return;
        }

        // コマンド処理中フラグを設定
        setCommandInProgress(true);

        // UIを即時に更新
        setCurrentTime(seekTime);

        // シーク処理を実行 - 二重シーク防止のためasyncを使用
        const executeSeek = async () => {
            try {
                // 現在の状態をログ
                console.log(`[DEBUG] シーク前のプレイヤー状態: 再生=${isPlaying}, 現在時間=${currentTime}秒, 動画長=${duration}秒`);

                // すべてのシーク処理は一度停止させてから行う
                const wasPreviouslyPlaying = isPlaying;
                let seekAttempts = 0;
                const maxAttempts = 2;

                // ステップ1: 常に一時停止を行う
                console.log("[DEBUG] シーク: 一時停止コマンド送信");
                const pauseMessage = {
                    sourceConnectorType: 1,
                    playerId: "1",
                    eventName: "pause",
                };
                sendMessageToPlayer(pauseMessage);

                // ポーズ状態が反映されるまで待機
                await new Promise(resolve => setTimeout(resolve, 700));

                // リトライループでシーク成功を確認
                while (seekAttempts < maxAttempts) {
                    seekAttempts++;
                    console.log(`[DEBUG] シーク試行 ${seekAttempts}/${maxAttempts}`);

                    // シーク実行 - 明示的に数値型に変換
                    const numericSeekTime = Number(seekTime);
                    console.log(`[DEBUG] シーク: シークコマンド送信 (${numericSeekTime}秒へ)`);

                    // シークコマンドを送信 - 追加のパラメータをすべて削除してシンプルに
                    const seekMessage = {
                        sourceConnectorType: 1,
                        playerId: "1",
                        eventName: "seek",
                        data: {
                            time: numericSeekTime,
                            absolute: true // 絶対時間指定を明示
                        }
                    };
                    sendMessageToPlayer(seekMessage);

                    // シーク完了をより長く待つ
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // 現在の状態確認
                    playerRef.current?.contentWindow?.postMessage(
                        { sourceConnectorType: 1, playerId: "1", eventName: "getStatus" },
                        "https://embed.nicovideo.jp"
                    );

                    await new Promise(resolve => setTimeout(resolve, 500));

                    // シーク成功またはリトライ上限に達したらループを抜ける
                    if (Math.abs(currentTime - numericSeekTime) < 10 || seekAttempts >= maxAttempts) {
                        console.log(`[DEBUG] シーク結果: 現在時間=${currentTime}秒 (目標=${numericSeekTime}秒)`);
                        break;
                    }

                    console.log("[警告] シーク失敗、再試行します");
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // 最後のステップ: 元の再生状態に戻す
                if (wasPreviouslyPlaying) {
                    console.log("[DEBUG] シーク: 元の再生状態(再生)に復帰");
                    const playMessage = {
                        sourceConnectorType: 1,
                        playerId: "1",
                        eventName: "play"
                    };
                    sendMessageToPlayer(playMessage);

                    // 再生開始を待つ
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // 完了処理
                console.log("[DEBUG] シーク操作完了");

            } catch (error) {
                console.error("[エラー] シーク操作中に例外:", error);
            } finally {
                // 確実にフラグを解除
                setCommandInProgress(false);
            }
        };

        // シーク処理を実行
        executeSeek();
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

    // 曲の開始時間へジャンプボタンの処理
    const jumpToSong = (songId: number) => {
        const song = medleySongs.find((s) => s.id === songId);
        if (song) {
            seekAndPlay(song.startTime);
        }
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
        seekAndPlay(seekTime);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {/* ヘッダー - niconicoスタイル */}
                <div className="bg-pink-600 text-white p-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold">ニコニコ楽曲アノテーションプレイヤー</h1>
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
                    {medleyTitle && (
                        <div className="mt-2 text-sm">
                            <div>{medleyTitle}</div>
                            {medleyCreator && <div className="text-pink-200">制作: {medleyCreator}</div>}
                        </div>
                    )}
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
                            {isPlaying ? "再生中" : "停止中"} - {formatTime(currentTime)} / {formatTime(duration)}
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

                {/* 楽曲アノテーションタイムライン */}
                {medleySongs.length > 0 && (
                    <SongTimeline
                        songs={medleySongs}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={seekAndPlay}
                    />
                )}

                {/* コード進行バー */}
                {medleyChords.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">コード進行</h3>
                        <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex">
                            {medleyChords.map((chord) => {
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
                                        onClick={() => seekAndPlay(chord.startTime)}
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
                )}

                {/* 楽曲リスト */}
                {medleySongs.length > 0 && (
                    <SongList
                        songs={medleySongs}
                        currentTime={currentTime}
                        onSeek={seekAndPlay}
                    />
                )}

                {/* フッター */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-xs flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {currentSong && (
                            <button className="px-2 py-1 bg-pink-500 text-white rounded"
                                onClick={() => jumpToSong(currentSong.id)}>
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
