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

    // videoIdが変更されたときにiframeLoadHandledをリセット
    useEffect(() => {
        // 既存のタイムアウトをクリア
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
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
        };
    }, [videoId]);

    // プレイヤーへの通信を直接処理する安全な関数
    const sendMessageToPlayer = useCallback((message: Record<string, unknown>) => {
        if (playerRef.current?.contentWindow) {
            playerRef.current.contentWindow.postMessage(message, PLAYER_CONFIG.EMBED_ORIGIN);
            console.log("COMMAND TO PLAYER:", message);
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
                                const normalizedInfo = normalizeVideoInfo(data.data, videoId);
                                if (normalizedInfo) {
                                    setVideoInfo(normalizedInfo);
                                    const normalizedDuration = normalizeTimeValue(normalizedInfo.duration);
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
                            break;

                        case "playerMetadataChange":
                            if (data.data) {
                                // currentTimeの更新
                                if (data.data.currentTime !== undefined) {
                                    const normalizedTime = normalizeTimeValue(data.data.currentTime);
                                    setCurrentTime(normalizedTime);
                                    onTimeUpdate?.(normalizedTime);
                                }

                                // durationの更新
                                if (data.data.duration !== undefined) {
                                    const normalizedDuration = normalizeTimeValue(data.data.duration);
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
                                
                                if (data.data.playerStatus !== PLAYER_STATUS.PLAYING) {
                                    setCommandInProgress(false);
                                }
                            }
                            break;

                        case "error":
                            console.error("Player error:", data);
                            console.error("Full error details:", JSON.stringify(data, null, 2));
                            setCommandInProgress(false);
                            if (data.data?.message) {
                                setPlayerError(data.data.message);
                            } else {
                                setPlayerError("不明なプレイヤーエラーが発生しました");
                            }
                            break;
                    }
                }
            } catch (error) {
                console.error("Error handling message:", error);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [sendMessageToPlayer, commandInProgress, onDurationChange, onPlayingChange, onTimeUpdate, videoId]);

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

        // 簡略化された初期化プロセス
        setTimeout(() => {
            if (!playerRef.current?.contentWindow) {
                console.log("Player contentWindow not available");
                setPlayerError("プレイヤーの読み込みに失敗しました");
                return;
            }

            try {
                // 単一の初期化メッセージのみ送信
                const initMessage = {
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "registerCallback",
                    data: {
                        _frontendId: PLAYER_CONFIG.FRONTEND_ID,
                        _frontendVersion: PLAYER_CONFIG.FRONTEND_VERSION,
                    },
                };

                console.log("Sending simplified init message:", initMessage);
                sendMessageToPlayer(initMessage);
            } catch (error) {
                console.error("Error during initialization:", error);
                setPlayerError("プレイヤーの初期化に失敗しました");
            }
        }, 500); // 短縮した遅延
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
        setCurrentTime(seekTime);

        const numericSeekTime = Math.floor(Number(seekTime));

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
    }, [commandInProgress, sendMessageToPlayer]);

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