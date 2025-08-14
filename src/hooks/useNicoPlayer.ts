import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_CONFIG, PLAYER_STATUS, SEEK_STATUS } from '@/lib/constants/player';
import { normalizeTimeValue } from '@/lib/utils/time';
import { VideoInfo, normalizeVideoInfo } from '@/lib/utils/videoInfo';

interface UseNicoPlayerProps {
    videoId: string;
    onTimeUpdate?: (time: number) => void;
    onDurationChange?: (duration: number) => void;
    onPlayingChange?: (isPlaying: boolean) => void;
}

interface UseNicoPlayerReturn {
    playerRef: React.RefObject<HTMLIFrameElement | null>;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playerError: string | null;
    videoInfo: VideoInfo | null;
    togglePlayPause: () => void;
    seek: (seekTime: number) => void;
    setVolume: (volume: number) => void;
    toggleFullscreen: () => void;
    getEmbedUrl: () => string;
    handleIframeLoad: () => void;
    clearError: () => void;
}

export function useNicoPlayer({ videoId, onTimeUpdate, onDurationChange, onPlayingChange }: UseNicoPlayerProps): UseNicoPlayerReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [commandInProgress, setCommandInProgress] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    
    const playerRef = useRef<HTMLIFrameElement | null>(null);
    const iframeLoadHandled = useRef(false);
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // videoIdが変更されたときにiframeLoadHandledをリセット
    useEffect(() => {
        // 既存のタイムアウトとインターバルをクリア
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
        }
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
        
        iframeLoadHandled.current = false;
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        setCommandInProgress(false);
        setPlayerReady(false);
        setPlayerError(null);
        setVideoInfo(null);
        console.log("Video ID changed, resetting player state:", videoId);
        
        return () => {
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [videoId]);

    // プレイヤーへの通信を直接処理する安全な関数
    const sendMessageToPlayer = useCallback((message: Record<string, unknown>) => {
        if (playerRef.current?.contentWindow) {
            playerRef.current.contentWindow.postMessage(message, PLAYER_CONFIG.EMBED_ORIGIN);
            console.log("COMMAND TO PLAYER:", message);
        }
    }, []);

    // 時間同期インターバルの開始
    const startTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return; // 既に実行中の場合は何もしない
        
        syncIntervalRef.current = setInterval(() => {
            if (playerReady && !commandInProgress) {
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
            }
        }, PLAYER_CONFIG.POLLING_INTERVAL_MS);
    }, [playerReady, commandInProgress, sendMessageToPlayer]);

    // 時間同期インターバルの停止
    const stopTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // メッセージイベントハンドラー
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== PLAYER_CONFIG.EMBED_ORIGIN) return;

            try {
                const data = event.data;

                if (data && data.eventName) {
                    switch (data.eventName) {
                        case "loadComplete":
                            console.log("Player load complete");
                            setPlayerReady(true);
                            
                            // タイムアウトをクリア
                            if (initTimeoutRef.current) {
                                clearTimeout(initTimeoutRef.current);
                                initTimeoutRef.current = null;
                            }
                            
                            // 動画情報の処理
                            if (data.data) {
                                console.log("loadComplete - raw data:", data.data);
                                const normalizedInfo = normalizeVideoInfo(data.data, videoId);
                                if (normalizedInfo) {
                                    console.log("loadComplete - normalized info duration:", normalizedInfo.duration);
                                    setVideoInfo(normalizedInfo);
                                    const normalizedDuration = normalizeTimeValue(normalizedInfo.duration);
                                    console.log("loadComplete - final duration:", normalizedDuration);
                                    setDuration(normalizedDuration);
                                    onDurationChange?.(normalizedDuration);
                                }
                            }
                            
                            // 初期化完了後にステータス要求
                            sendMessageToPlayer({
                                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                                playerId: PLAYER_CONFIG.PLAYER_ID,
                                eventName: "getStatus",
                            });
                            
                            // 連続的な時間同期の開始
                            startTimeSyncInterval();
                            break;

                        case "playerMetadataChange":
                            if (data.data) {
                                console.log("playerMetadataChange - raw data:", data.data);
                                
                                // currentTimeの更新
                                if (data.data.currentTime !== undefined) {
                                    console.log("playerMetadataChange - raw currentTime:", data.data.currentTime);
                                    const normalizedTime = normalizeTimeValue(data.data.currentTime);
                                    console.log("playerMetadataChange - normalized currentTime:", normalizedTime);
                                    setCurrentTime(normalizedTime);
                                    onTimeUpdate?.(normalizedTime);
                                }

                                // durationの更新
                                if (data.data.duration !== undefined) {
                                    console.log("playerMetadataChange - raw duration:", data.data.duration);
                                    const normalizedDuration = normalizeTimeValue(data.data.duration);
                                    console.log("playerMetadataChange - normalized duration:", normalizedDuration);
                                    setDuration(normalizedDuration);
                                    onDurationChange?.(normalizedDuration);
                                }
                            }
                            break;

                        case "seekStatusChange":
                            if (data.data) {
                                if (data.data.seekStatus === SEEK_STATUS.COMPLETE && commandInProgress) {
                                    setTimeout(() => {
                                        sendMessageToPlayer({
                                            sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                                            playerId: PLAYER_CONFIG.PLAYER_ID,
                                            eventName: "getStatus",
                                        });
                                    }, PLAYER_CONFIG.SEEK_DEBOUNCE_MS);

                                    setCommandInProgress(false);
                                } else if (data.data.seekStatus === SEEK_STATUS.IN_PROGRESS || data.data.seekStatus === SEEK_STATUS.STARTED) {
                                    setCommandInProgress(true);
                                }
                            }
                            break;

                        case "playerStatusChange":
                        case "statusChange":
                            if (data.data && data.data.playerStatus !== undefined) {
                                const newIsPlaying = data.data.playerStatus === PLAYER_STATUS.PLAYING;
                                setIsPlaying(newIsPlaying);
                                onPlayingChange?.(newIsPlaying);
                                
                                // プレイヤーステータスが変更されたらcommandInProgressをリセット
                                setCommandInProgress(false);
                                
                                // 再生状態に応じて時間同期の開始/停止
                                if (newIsPlaying) {
                                    startTimeSyncInterval();
                                } else {
                                    stopTimeSyncInterval();
                                }
                            }
                            break;

                        case "error":
                            console.error("Player error:", data);
                            console.error("Full error details:", JSON.stringify(data, null, 2));
                            setCommandInProgress(false);
                            
                            // エラーの詳細な分析とログ出力
                            let errorMessage = "不明なプレイヤーエラーが発生しました";
                            if (data.data?.message) {
                                errorMessage = data.data.message;
                                console.error(`プレイヤーエラー詳細: ${errorMessage}`);
                            }
                            if (data.data?.code) {
                                console.error(`エラーコード: ${data.data.code}`);
                            }
                            if (data.data?.reason) {
                                console.error(`エラー理由: ${data.data.reason}`);
                            }
                            
                            setPlayerError(errorMessage);
                            break;
                    }
                }
            } catch (error) {
                console.error("Error handling message:", error);
                console.error("Message event details:", {
                    origin: event.origin,
                    data: event.data,
                    type: event.type
                });
                setPlayerError("メッセージ処理エラーが発生しました");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [sendMessageToPlayer, commandInProgress, onDurationChange, onPlayingChange, onTimeUpdate, videoId, startTimeSyncInterval, stopTimeSyncInterval]);

    // iframeの読み込み完了時の処理
    const handleIframeLoad = useCallback(() => {
        if (iframeLoadHandled.current || !playerRef.current) return;

        console.log("Player iframe loaded - initializing...");
        iframeLoadHandled.current = true;

        // タイムアウトを設定
        initTimeoutRef.current = setTimeout(() => {
            if (!playerReady) {
                console.error("Player initialization timeout");
                setPlayerError("プレイヤーの初期化がタイムアウトしました。SafeModeに切り替えてください。");
            }
        }, 8000);

        // 最小限の初期化プロセス - registerCallbackを削除し直接getStatusを送信
        setTimeout(() => {
            if (!playerRef.current?.contentWindow) {
                console.log("Player contentWindow not available");
                setPlayerError("プレイヤーの読み込みに失敗しました");
                return;
            }

            try {
                console.log("Attempting direct status request without registerCallback");
                
                // プレイヤーの準備を仮定してgetStatusを直接送信
                setPlayerReady(true);
                
                // 初期化完了後にステータス要求
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
                
                // タイムアウトをクリア（成功と仮定）
                if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                }
                
                console.log("Direct initialization complete, player ready");
            } catch (error) {
                console.error("Error during initialization:", error);
                setPlayerError("プレイヤーの初期化に失敗しました");
            }
        }, 1000); // より長い遅延でプレイヤーの完全な読み込みを待つ
    }, [sendMessageToPlayer, playerReady]);

    // 再生/一時停止の切り替え
    const togglePlayPause = useCallback(() => {
        console.log("togglePlayPause called:", { 
            hasPlayer: !!playerRef.current, 
            hasContentWindow: !!playerRef.current?.contentWindow,
            commandInProgress, 
            isPlaying,
            playerReady,
            iframeLoaded: iframeLoadHandled.current
        });
        
        if (playerRef.current?.contentWindow && !commandInProgress && playerReady) {
            setCommandInProgress(true);
            const eventName = isPlaying ? "pause" : "play";
            console.log(`Sending ${eventName} command to player`);
            sendMessageToPlayer({
                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                playerId: PLAYER_CONFIG.PLAYER_ID,
                eventName: eventName,
            });
        } else {
            console.log("Cannot toggle play/pause:", {
                noPlayer: !playerRef.current?.contentWindow,
                commandInProgress,
                playerReady,
                playerRef: !!playerRef.current
            });
        }
    }, [isPlaying, commandInProgress, playerReady, sendMessageToPlayer]);

    // シーク操作
    const seek = useCallback((seekTime: number) => {
        if (!playerRef.current?.contentWindow || commandInProgress) {
            return;
        }

        setCommandInProgress(true);
        
        // 時間値の正規化 - 無効な値を防ぐ
        const normalizedSeekTime = normalizeTimeValue(seekTime);
        if (normalizedSeekTime < 0 || (duration > 0 && normalizedSeekTime > duration)) {
            console.warn(`無効なシーク時間: ${seekTime}秒 (正規化後: ${normalizedSeekTime}秒, 動画長: ${duration}秒)`);
            setCommandInProgress(false);
            return;
        }

        // UIを先行更新
        setCurrentTime(normalizedSeekTime);

        const numericSeekTime = Math.floor(normalizedSeekTime);
        
        // 再生中の場合は pause → seek → play のシーケンスを実行
        if (isPlaying) {
            console.log(`再生中のシーク: ${numericSeekTime}秒へ (pause→seek→play シーケンス)`);
            
            // Step 1: 一時停止
            sendMessageToPlayer({
                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                playerId: PLAYER_CONFIG.PLAYER_ID,
                eventName: "pause"
            });
            
            // Step 2: 少し待ってからシーク
            setTimeout(() => {
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "seek",
                    data: {
                        time: numericSeekTime,
                        _frontendId: PLAYER_CONFIG.FRONTEND_ID,
                        _frontendVersion: PLAYER_CONFIG.FRONTEND_VERSION
                    }
                });
                
                // Step 3: さらに待ってから再生再開
                setTimeout(() => {
                    sendMessageToPlayer({
                        sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                        playerId: PLAYER_CONFIG.PLAYER_ID,
                        eventName: "play"
                    });
                    
                    setCommandInProgress(false);
                }, 200);
            }, 100);
        } else {
            // 停止中の場合は通常のシーク
            console.log(`停止中のシーク: ${numericSeekTime}秒へ`);
            
            sendMessageToPlayer({
                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                playerId: PLAYER_CONFIG.PLAYER_ID,
                eventName: "seek",
                data: {
                    time: numericSeekTime,
                    _frontendId: PLAYER_CONFIG.FRONTEND_ID,
                    _frontendVersion: PLAYER_CONFIG.FRONTEND_VERSION
                }
            });
            
            setTimeout(() => {
                setCommandInProgress(false);
            }, PLAYER_CONFIG.SEEK_DEBOUNCE_MS);
        }
    }, [commandInProgress, sendMessageToPlayer, isPlaying, duration]);

    // 音量調整
    const setVolume = useCallback((volume: number) => {
        sendMessageToPlayer({
            sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
            playerId: PLAYER_CONFIG.PLAYER_ID,
            eventName: "volumeChange",
            data: {
                volume: volume / 100,
            },
        });
    }, [sendMessageToPlayer]);

    // フルスクリーン切り替え
    const toggleFullscreen = useCallback(() => {
        sendMessageToPlayer({
            sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
            playerId: PLAYER_CONFIG.PLAYER_ID,
            eventName: "fullscreenChange",
        });
    }, [sendMessageToPlayer]);

    // エラーをクリアする関数
    const clearError = useCallback(() => {
        setPlayerError(null);
    }, []);

    // 埋め込みURL生成
    const getEmbedUrl = useCallback((): string => {
        // 2024年8月5日以降の新しい埋め込み形式
        return `https://embed.nicovideo.jp/watch/${videoId}?jsapi=1&playerId=${PLAYER_CONFIG.PLAYER_ID}&from=0&allowProgrammaticFullScreen=1&noRelatedVideo=1&autoplay=0&_frontendId=${PLAYER_CONFIG.FRONTEND_ID}&_frontendVersion=${PLAYER_CONFIG.FRONTEND_VERSION}`;
    }, [videoId]);

    return {
        playerRef,
        isPlaying,
        currentTime,
        duration,
        playerError,
        videoInfo,
        togglePlayPause,
        seek,
        setVolume,
        toggleFullscreen,
        getEmbedUrl,
        handleIframeLoad,
        clearError,
    };
}