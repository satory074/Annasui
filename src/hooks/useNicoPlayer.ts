import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_CONFIG, PLAYER_STATUS } from '@/lib/constants/player';
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
    volume: number;
    playerError: string | null;
    playerReady: boolean;
    videoInfo: VideoInfo | null;
    togglePlayPause: () => void;
    seek: (seekTime: number) => void;
    setVolume: (volume: number) => void;
    toggleFullscreen: () => void;
    getEmbedUrl: () => string;
    handleIframeLoad: () => void;
    clearError: () => void;
    // デバッグ・監視情報
    debugInfo: {
        timeCorruptionCount: number;
        lastCorruptionTime: number;
        seekAttemptCount: number;
        seekSuccessCount: number;
        logPlayerStatus: () => void;
    };
}

export function useNicoPlayer({ videoId, onTimeUpdate, onDurationChange, onPlayingChange }: UseNicoPlayerProps): UseNicoPlayerReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(50); // デフォルトボリューム50%
    const [playerReady, setPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    
    const playerRef = useRef<HTMLIFrameElement | null>(null);
    const iframeLoadHandled = useRef(false);
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousTimeRef = useRef<number>(0); // 前回の正常な時間値を保持

    // プレイヤーステータス監視関数（簡略化）
    const logPlayerStatus = useCallback(() => {
        console.log(`📊 PLAYER STATUS:`);
        console.log(`  🎬 Video: ${videoId}`);
        console.log(`  ⏱️ Duration: ${duration}s | Current: ${currentTime.toFixed(1)}s`);
        console.log(`  🎮 Player Ready: ${playerReady} | Playing: ${isPlaying}`);
        console.log(`  🔗 Player Connection: ${!!playerRef.current?.contentWindow ? 'Connected' : 'Disconnected'}`);
    }, [videoId, duration, currentTime, playerReady, isPlaying]);

    // videoIdが変更されたときの初期化処理（簡略化）
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
        
        // 状態をリセット
        iframeLoadHandled.current = false;
        setCurrentTime(0);
        setDuration(0);
        setVolumeState(50); // ボリュームもリセット
        setIsPlaying(false);
        setPlayerReady(false);
        setPlayerError(null);
        setVideoInfo(null);
        previousTimeRef.current = 0;
        
        console.log("🔄 Player state reset for video:", videoId);
        
        return () => {
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [videoId]);

    // プレイヤーへのメッセージ送信（簡略化）
    const sendMessageToPlayer = useCallback((message: Record<string, unknown>) => {
        if (playerRef.current?.contentWindow) {
            playerRef.current.contentWindow.postMessage(message, PLAYER_CONFIG.EMBED_ORIGIN);
            console.log("📤 PLAYER COMMAND:", message.eventName, message.data);
        } else {
            console.warn('⚠️ Player not available for message:', message.eventName);
        }
    }, []);

    // 時間同期インターバルの開始（改善版）
    const startTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;
        
        syncIntervalRef.current = setInterval(() => {
            if (playerReady) {
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
            }
        }, 250); // ポーリング間隔を250msに変更（負荷軽減）
    }, [playerReady, sendMessageToPlayer]);

    // 時間同期インターバルの停止
    const stopTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // PostMessageの検証関数
    const validatePlayerMessage = (data: unknown): boolean => {
        // 基本的な構造チェック
        if (!data || typeof data !== 'object') {
            console.warn('⚠️ Invalid message: not an object', data);
            return false;
        }

        const messageData = data as Record<string, unknown>;

        // eventNameの存在チェック
        if (!messageData.eventName || typeof messageData.eventName !== 'string') {
            console.warn('⚠️ Invalid message: missing or invalid eventName', data);
            return false;
        }

        // dataフィールドがある場合の検証
        if (messageData.data && typeof messageData.data !== 'object') {
            console.warn('⚠️ Invalid message: data field is not an object', data);
            return false;
        }

        // 時間関連フィールドの検証
        const nestedData = messageData.data as Record<string, unknown> | undefined;
        if (nestedData && nestedData.currentTime !== undefined) {
            if (typeof nestedData.currentTime !== 'number' || !isFinite(nestedData.currentTime)) {
                console.warn('⚠️ Invalid currentTime in message', nestedData.currentTime);
                return false;
            }
        }

        if (nestedData && nestedData.duration !== undefined) {
            if (typeof nestedData.duration !== 'number' || !isFinite(nestedData.duration)) {
                console.warn('⚠️ Invalid duration in message', nestedData.duration);
                return false;
            }
        }

        return true;
    };

    // メッセージイベントハンドラー（強化された検証付き）
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== PLAYER_CONFIG.EMBED_ORIGIN) {
                console.warn(`⚠️ Message from unauthorized origin: ${event.origin}`);
                return;
            }

            try {
                const data = event.data;

                // メッセージの妥当性を検証
                if (!validatePlayerMessage(data)) {
                    console.error('❌ Message validation failed, ignoring message');
                    return;
                }

                if (data && data.eventName) {
                    switch (data.eventName) {
                        case "loadComplete":
                            console.log("Player load complete - setting playerReady to true");
                            setPlayerReady(true);
                            
                            // タイムアウトをクリア
                            if (initTimeoutRef.current) {
                                clearTimeout(initTimeoutRef.current);
                                initTimeoutRef.current = null;
                            }
                            
                            // 動画情報の処理（強化されたduration検証付き）
                            if (data.data) {
                                console.log("loadComplete - raw data:", data.data);
                                const normalizedInfo = normalizeVideoInfo(data.data, videoId);
                                if (normalizedInfo) {
                                    console.log("loadComplete - normalized info duration:", normalizedInfo.duration);
                                    setVideoInfo(normalizedInfo);
                                    const normalizedDuration = normalizeTimeValue(normalizedInfo.duration);
                                    console.log("loadComplete - final duration:", normalizedDuration);
                                    
                                    // durationの妥当性をより厳密にチェック（最大3時間）
                                    if (normalizedDuration > 0 && isFinite(normalizedDuration) && normalizedDuration < 10800) { // 3時間未満
                                        setDuration(normalizedDuration);
                                        onDurationChange?.(normalizedDuration);
                                        console.log(`✅ Valid duration set: ${normalizedDuration}s`);
                                    } else {
                                        console.warn(`⚠️ Invalid duration from loadComplete: ${normalizedDuration}s, ignoring`);
                                        // 異常値の場合はdurationを0のままにして、静的データのフォールバックを使用
                                    }
                                } else {
                                    console.warn("⚠️ Could not normalize video info from loadComplete data");
                                }
                            } else {
                                console.warn("⚠️ No data in loadComplete event");
                            }
                            
                            // 初期化完了後にステータス要求
                            sendMessageToPlayer({
                                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                                playerId: PLAYER_CONFIG.PLAYER_ID,
                                eventName: "getStatus",
                            });
                            
                            // 連続的な時間同期の開始
                            startTimeSyncInterval();
                            
                            // キューされたシークは後でuseEffectで処理する
                            
                            // プレイヤー準備完了を明確にログ出力
                            console.log("*** PLAYER FULLY INITIALIZED - Ready for seek operations ***");
                            break;

                        case "playerMetadataChange":
                            if (data.data) {
                                // currentTimeの更新（ミリ秒→秒変換付き）
                                if (data.data.currentTime !== undefined) {
                                    const rawTimeMs = data.data.currentTime;
                                    const rawTime = rawTimeMs / 1000; // ミリ秒を秒に変換
                                    
                                    // durationが異常値（0または3時間超）の場合は、currentTimeも慎重に処理
                                    const maxTime = duration > 0 && duration < 10800 ? duration : 10800;
                                    const validatedTime = Math.max(0, Math.min(rawTime, maxTime));
                                    
                                    // 値が変化した場合のみ更新
                                    if (Math.abs(validatedTime - previousTimeRef.current) > 0.1) {
                                        setCurrentTime(validatedTime);
                                        onTimeUpdate?.(validatedTime);
                                        previousTimeRef.current = validatedTime;
                                    }
                                }

                                // durationの更新（ミリ秒→秒変換付き）
                                if (data.data.duration !== undefined) {
                                    const newDurationMs = data.data.duration;
                                    const newDuration = newDurationMs / 1000; // ミリ秒を秒に変換
                                    // 3時間（10800秒）を超えるdurationは異常値として無視
                                    if (newDuration > 0 && isFinite(newDuration) && newDuration < 10800) {
                                        setDuration(newDuration);
                                        onDurationChange?.(newDuration);
                                    } else if (newDuration >= 10800) {
                                        console.warn(`⚠️ Abnormal duration rejected: ${newDuration}s (${(newDuration/3600).toFixed(1)} hours)`);
                                        // 異常値は無視し、既存のduration値を維持
                                    }
                                }
                            }
                            break;

                        case "seekStatusChange":
                            // シーク関連の処理は簡略化（必要に応じて後で実装）
                            break;

                        case "playerStatusChange":
                        case "statusChange":
                            if (data.data && data.data.playerStatus !== undefined) {
                                const newIsPlaying = data.data.playerStatus === PLAYER_STATUS.PLAYING;
                                setIsPlaying(newIsPlaying);
                                onPlayingChange?.(newIsPlaying);
                                
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
    }, [sendMessageToPlayer, onDurationChange, onPlayingChange, onTimeUpdate, videoId, startTimeSyncInterval, stopTimeSyncInterval, duration]);

    // iframeの読み込み完了時の処理
    const handleIframeLoad = useCallback(() => {
        if (iframeLoadHandled.current || !playerRef.current) return;

        console.log("Player iframe loaded - initializing...");
        iframeLoadHandled.current = true;

        // タイムアウトを設定（30秒に延長）
        initTimeoutRef.current = setTimeout(() => {
            if (!playerReady) {
                console.error("Player initialization timeout");
                setPlayerError("プレイヤーの初期化がタイムアウトしました。SafeModeに切り替えてください。");
            }
        }, 30000);

        // 最小限の初期化プロセス - loadCompleteイベントを待つ方式に変更
        setTimeout(() => {
            if (!playerRef.current?.contentWindow) {
                console.log("Player contentWindow not available");
                setPlayerError("プレイヤーの読み込みに失敗しました");
                return;
            }

            try {
                console.log("Requesting initial status - waiting for loadComplete event");
                
                // loadCompleteイベントを待つため、playerReadyは設定しない
                // 初期化完了後にステータス要求
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
                
                console.log("Initial status request sent, waiting for loadComplete");
            } catch (error) {
                console.error("Error during initialization:", error);
                setPlayerError("プレイヤーの初期化に失敗しました");
            }
        }, 1000); // より長い遅延でプレイヤーの完全な読み込みを待つ
    }, [sendMessageToPlayer, playerReady]);

    // 再生/一時停止の切り替え（簡略化）
    const togglePlayPause = useCallback(() => {
        if (playerRef.current?.contentWindow && playerReady) {
            const eventName = isPlaying ? "pause" : "play";
            console.log(`▶️ TOGGLE: ${eventName}`);
            sendMessageToPlayer({
                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                playerId: PLAYER_CONFIG.PLAYER_ID,
                eventName: eventName,
            });
        }
    }, [isPlaying, playerReady, sendMessageToPlayer]);

    // シンプルで信頼性の高いseek実装
    const seek = useCallback((seekTime: number) => {
        // 基本的な検証のみ
        if (!playerReady || !playerRef.current?.contentWindow) {
            console.warn('🚫 Seek blocked: Player not ready');
            return;
        }
        
        if (seekTime < 0 || (duration > 0 && seekTime > duration)) {
            console.warn('🚫 Seek blocked: Invalid time');
            return;
        }

        // UIを即座に更新
        setCurrentTime(seekTime);
        previousTimeRef.current = seekTime;
        
        const timeInMilliseconds = Math.floor(seekTime * 1000);
        console.log(`🎯 SEEK: ${seekTime}s → ${timeInMilliseconds}ms`);

        // プレイヤーにシークコマンドを送信
        sendMessageToPlayer({
            sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
            playerId: PLAYER_CONFIG.PLAYER_ID,
            eventName: "seek",
            data: {
                time: timeInMilliseconds,
                _frontendId: PLAYER_CONFIG.FRONTEND_ID,
                _frontendVersion: PLAYER_CONFIG.FRONTEND_VERSION
            }
        });

        // 停止中なら再生開始（シーク完了を待って実行）
        if (!isPlaying) {
            console.log('🎯 Player was paused, starting playback after seek');
            setTimeout(() => {
                console.log('🎯 Sending play command after seek');
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "play"
                });
            }, 200); // シークの完了を待つための遅延
        }
    }, [playerReady, duration, isPlaying, sendMessageToPlayer]);

    // 音量調整
    const setVolume = useCallback((volume: number) => {
        setVolumeState(volume); // ローカル状態を更新
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
        volume,
        playerError,
        playerReady,
        videoInfo,
        togglePlayPause,
        seek,
        setVolume,
        toggleFullscreen,
        getEmbedUrl,
        handleIframeLoad,
        clearError,
        // デバッグ情報（簡略化）
        debugInfo: {
            timeCorruptionCount: 0,
            lastCorruptionTime: 0,
            seekAttemptCount: 0,
            seekSuccessCount: 0,
            logPlayerStatus,
        },
    };
}