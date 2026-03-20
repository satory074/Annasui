import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_CONFIG, PLAYER_STATUS } from '@/lib/constants/player';
import { normalizeTimeValue } from '@/lib/utils/time';
import { VideoInfo, normalizeVideoInfo } from '@/lib/utils/videoInfo';
import { logger } from '@/lib/utils/logger';
import { usePlayerStore } from '@/features/player/store';

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
    play: () => void;
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
    const playerReadyRef = useRef(false); // クロージャ問題を回避するための ref

    // プレイヤー初期化リトライ用の状態
    const [initRetryCount, setInitRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const maxRetryCount = 3; // 最大リトライ回数

    // プレイヤーステータス監視関数（簡略化）
    const logPlayerStatus = useCallback(() => {
        logger.debug(`📊 PLAYER STATUS:`);
        logger.debug(`  🎬 Video: ${videoId}`);
        logger.debug(`  ⏱️ Duration: ${duration}s | Current: ${currentTime.toFixed(1)}s`);
        logger.debug(`  🎮 Player Ready: ${playerReady} | Playing: ${isPlaying}`);
        logger.debug(`  🔗 Player Connection: ${!!playerRef.current?.contentWindow ? 'Connected' : 'Disconnected'}`);
        logger.debug(`  🔄 Retry Count: ${initRetryCount}/${maxRetryCount} | Retrying: ${isRetrying}`);
    }, [videoId, duration, currentTime, playerReady, isPlaying, initRetryCount, isRetrying]);

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
        setInitRetryCount(0);
        setIsRetrying(false);
        
        logger.info("🔄 Player state reset for video:", videoId);
        
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
            logger.debug("📤 PLAYER COMMAND:", message.eventName, message.data);
        } else {
            logger.warn('⚠️ Player not available for message:', message.eventName);
        }
    }, []);

    // playerReady を ref に同期（インターバル内クロージャから最新値を読めるようにする）
    useEffect(() => {
        playerReadyRef.current = playerReady;
    }, [playerReady]);

    // 時間同期インターバルの開始（改善版）
    const startTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;

        syncIntervalRef.current = setInterval(() => {
            if (playerReadyRef.current) { // ref を使用してクロージャの陳腐化を回避
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
            }
        }, 100); // 100ms polling — improves metronome sync accuracy (max drift ≈ 100ms)
    }, [sendMessageToPlayer]); // playerReady は ref 経由で読むため deps 不要

    // 時間同期インターバルの停止
    const stopTimeSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // プレイヤー初期化のリトライ機構
    const retryInitialization = useCallback(() => {
        if (initRetryCount >= maxRetryCount) {
            logger.error(`❌ Maximum retry count (${maxRetryCount}) reached. Suggesting SafeMode.`);
            setPlayerError("プレイヤーの初期化に失敗しました。SafeModeに切り替えてください。");
            setIsRetrying(false);
            return;
        }

        logger.warn(`🔄 Retrying player initialization... (${initRetryCount + 1}/${maxRetryCount})`);
        setIsRetrying(true);
        setInitRetryCount(prev => prev + 1);
        setPlayerError(null);

        // iframeをリロードしてリトライ
        setTimeout(() => {
            if (playerRef.current) {
                const currentSrc = playerRef.current.src;
                playerRef.current.src = '';
                setTimeout(() => {
                    if (playerRef.current) {
                        playerRef.current.src = currentSrc;
                        iframeLoadHandled.current = false;
                    }
                }, 100);
            }
        }, 1000);
    }, [initRetryCount, maxRetryCount]);

    // PostMessageの検証関数
    const validatePlayerMessage = (data: unknown): boolean => {
        // 基本的な構造チェック
        if (!data || typeof data !== 'object') {
            logger.warn('⚠️ Invalid message: not an object', data);
            return false;
        }

        const messageData = data as Record<string, unknown>;

        // eventNameの存在チェック
        if (!messageData.eventName || typeof messageData.eventName !== 'string') {
            logger.warn('⚠️ Invalid message: missing or invalid eventName', data);
            return false;
        }

        // dataフィールドがある場合の検証
        if (messageData.data && typeof messageData.data !== 'object') {
            logger.warn('⚠️ Invalid message: data field is not an object', data);
            return false;
        }

        // 時間関連フィールドの検証
        const nestedData = messageData.data as Record<string, unknown> | undefined;
        if (nestedData && nestedData.currentTime !== undefined) {
            if (typeof nestedData.currentTime !== 'number' || !isFinite(nestedData.currentTime)) {
                logger.warn('⚠️ Invalid currentTime in message', nestedData.currentTime);
                return false;
            }
        }

        if (nestedData && nestedData.duration !== undefined) {
            if (typeof nestedData.duration !== 'number' || !isFinite(nestedData.duration)) {
                logger.warn('⚠️ Invalid duration in message', nestedData.duration);
                return false;
            }
        }

        return true;
    };

    // メッセージイベントハンドラー（強化された検証付き）
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== PLAYER_CONFIG.EMBED_ORIGIN) {
                logger.warn(`⚠️ Message from unauthorized origin: ${event.origin}`);
                return;
            }

            try {
                const data = event.data;

                // メッセージの妥当性を検証
                if (!validatePlayerMessage(data)) {
                    logger.error('❌ Message validation failed, ignoring message');
                    return;
                }

                if (data && data.eventName) {
                    switch (data.eventName) {
                        case "loadComplete":
                            logger.info("Player load complete - setting playerReady to true");
                            setPlayerReady(true);
                            setIsRetrying(false);
                            
                            // タイムアウトをクリア
                            if (initTimeoutRef.current) {
                                clearTimeout(initTimeoutRef.current);
                                initTimeoutRef.current = null;
                            }
                            
                            if (initRetryCount > 0) {
                                logger.info(`✅ Player initialization succeeded after ${initRetryCount} retry(s)`);
                            }
                            
                            // 動画情報の処理（強化されたduration検証付き）
                            if (data.data) {
                                logger.debug("loadComplete - raw data:", data.data);
                                const normalizedInfo = normalizeVideoInfo(data.data, videoId);
                                if (normalizedInfo) {
                                    logger.debug("loadComplete - normalized info duration:", normalizedInfo.duration);
                                    setVideoInfo(normalizedInfo);
                                    const normalizedDuration = normalizeTimeValue(normalizedInfo.duration);
                                    logger.debug("loadComplete - final duration:", normalizedDuration);
                                    
                                    // durationの妥当性をより厳密にチェック（最大3時間）
                                    if (normalizedDuration > 0 && isFinite(normalizedDuration) && normalizedDuration < 10800) { // 3時間未満
                                        setDuration(normalizedDuration);
                                        onDurationChange?.(normalizedDuration);
                                        logger.info(`✅ Valid duration set: ${normalizedDuration}s`);
                                    } else {
                                        logger.warn(`⚠️ Invalid duration from loadComplete: ${normalizedDuration}s, ignoring`);
                                        // 異常値の場合はdurationを0のままにして、静的データのフォールバックを使用
                                    }
                                } else {
                                    logger.warn("⚠️ Could not normalize video info from loadComplete data");
                                }
                            } else {
                                logger.warn("⚠️ No data in loadComplete event");
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
                            logger.info("*** PLAYER FULLY INITIALIZED - Ready for seek operations ***");
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
                                        // useMetronome のドリフト検出が依存するため store も更新
                                        usePlayerStore.getState().setCurrentTime(validatedTime);
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
                                        logger.warn(`⚠️ Abnormal duration rejected: ${newDuration}s (${(newDuration/3600).toFixed(1)} hours)`);
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
                                usePlayerStore.getState().setIsPlaying(newIsPlaying);
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
                            logger.error("Player error:", data);
                            
                            // エラーの詳細な分析とログ出力
                            let errorMessage = "不明なプレイヤーエラーが発生しました";
                            if (data.data?.message) {
                                errorMessage = data.data.message;
                                logger.error(`プレイヤーエラー詳細: ${errorMessage}`);
                            }
                            if (data.data?.code) {
                                logger.error(`エラーコード: ${data.data.code}`);
                            }
                            if (data.data?.reason) {
                                logger.error(`エラー理由: ${data.data.reason}`);
                            }
                            
                            setPlayerError(errorMessage);
                            break;
                    }
                }
            } catch (error) {
                logger.error("Error handling message:", error);
                logger.error("Message event details:", {
                    origin: event.origin,
                    data: event.data,
                    type: event.type
                });
                setPlayerError("メッセージ処理エラーが発生しました");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [sendMessageToPlayer, onDurationChange, onPlayingChange, onTimeUpdate, videoId, startTimeSyncInterval, stopTimeSyncInterval, duration, initRetryCount]);

    // iframeの読み込み完了時の処理
    const handleIframeLoad = useCallback(() => {
        if (iframeLoadHandled.current || !playerRef.current) return;

        logger.info("Player iframe loaded - initializing...");
        iframeLoadHandled.current = true;

        // タイムアウトを設定（20秒に延長してより安定したロードを促進）
        initTimeoutRef.current = setTimeout(() => {
            if (!playerReady && !isRetrying) {
                logger.error(`Player initialization timeout after 20s for video: ${videoId}`);
                logger.error(`Player state: ready=${playerReady}, retrying=${isRetrying}, retryCount=${initRetryCount}/${maxRetryCount}`);
                if (initRetryCount < maxRetryCount) {
                    logger.warn(`⏱️ Initialization timeout. Triggering retry (${initRetryCount + 1}/${maxRetryCount})`);
                    retryInitialization();
                } else {
                    logger.error(`❌ Maximum retries exceeded for video: ${videoId}. Player initialization failed completely.`);
                    setPlayerError("プレイヤーの初期化に失敗しました。ページを再読み込みするか、SafeModeに切り替えてください。");
                }
            }
        }, 20000); // 20秒に延長してより安定したロードを促進

        // 最小限の初期化プロセス - loadCompleteイベントを待つ方式に変更
        setTimeout(() => {
            if (!playerRef.current?.contentWindow) {
                logger.warn(`Player contentWindow not available for video: ${videoId}`);
                logger.warn(`iframe src: ${playerRef.current?.src || 'not set'}`);
                setPlayerError("プレイヤーの読み込みに失敗しました");
                return;
            }

            try {
                logger.info(`🎬 Starting player initialization for video: ${videoId}`);
                logger.debug(`iframe ready: ${!!playerRef.current}`);
                logger.debug(`contentWindow ready: ${!!playerRef.current?.contentWindow}`);
                logger.debug("Requesting initial status - waiting for loadComplete event");
                
                // loadCompleteイベントを待つため、playerReadyは設定しない
                // 初期化完了後にステータス要求
                sendMessageToPlayer({
                    sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                    playerId: PLAYER_CONFIG.PLAYER_ID,
                    eventName: "getStatus",
                });
                
                logger.info(`✅ Initial status request sent for video: ${videoId}, waiting for loadComplete`);
            } catch (error) {
                logger.error(`Error during initialization for video ${videoId}:`, error);
                setPlayerError("プレイヤーの初期化に失敗しました");
            }
        }, 2000); // 2秒に延長してプレイヤーの完全な読み込みを待つ
    }, [sendMessageToPlayer, playerReady, retryInitialization, initRetryCount, maxRetryCount, isRetrying, videoId]);

    // 再生のみ（一時停止中でも再生開始）
    const play = useCallback(() => {
        if (playerRef.current?.contentWindow && playerReady) {
            logger.debug(`▶️ PLAY: Starting playback`);
            sendMessageToPlayer({
                sourceConnectorType: PLAYER_CONFIG.SOURCE_CONNECTOR_TYPE,
                playerId: PLAYER_CONFIG.PLAYER_ID,
                eventName: "play",
            });
        }
    }, [playerReady, sendMessageToPlayer]);

    // 再生/一時停止の切り替え（簡略化）
    const togglePlayPause = useCallback(() => {
        if (playerRef.current?.contentWindow && playerReady) {
            const eventName = isPlaying ? "pause" : "play";
            logger.debug(`▶️ TOGGLE: ${eventName}`);
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
            logger.warn('🚫 Seek blocked: Player not ready');
            return;
        }
        
        if (seekTime < 0 || (duration > 0 && seekTime > duration)) {
            logger.warn('🚫 Seek blocked: Invalid time');
            return;
        }

        // UIを即座に更新
        setCurrentTime(seekTime);
        previousTimeRef.current = seekTime;
        
        const timeInMilliseconds = Math.floor(seekTime * 1000);
        logger.debug(`🎯 SEEK: ${seekTime}s → ${timeInMilliseconds}ms`);

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
            logger.debug('🎯 Player was paused, starting playback after seek');
            setTimeout(() => {
                logger.debug('🎯 Sending play command after seek');
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
        play,
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