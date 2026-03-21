"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useMedleyData } from "@/hooks/useMedleyData";
import { useCurrentTrack } from "@/hooks/useCurrentTrack";
import { useMedleyEdit } from "@/hooks/useMedleyEdit";
import { useAuth } from "@/features/auth/context";
import AppHeader from "@/components/layout/AppHeader";
import NicoPlayer from "@/components/features/player/NicoPlayer";
import YouTubePlayer from "@/components/features/player/YouTubePlayer";
import { useNicoPlayer } from "@/hooks/useNicoPlayer";
import SongListGrouped from "@/components/features/medley/SongListGrouped";
import SongEditModal from "@/components/features/medley/SongEditModal";
import SongDetailTooltip from "@/components/features/medley/SongDetailTooltip";
import SongSearchModal from "@/components/features/medley/SongSearchModal";
import ManualSongAddModal from "@/components/features/medley/ManualSongAddModal";
import ContributorsDisplay from "@/components/features/medley/ContributorsDisplay";
import RestoreConfirmModal from "@/components/features/medley/RestoreConfirmModal";
import LoginModal from "@/components/features/auth/LoginModal";
import { SongSection, MedleyEditHistory, MedleySnapshot } from "@/types";
import { SongDatabaseEntry, createSongFromDatabase, addManualSong, updateManualSong, normalizeSongInfo } from "@/lib/utils/songDatabase";
import { getMedleyEditHistory, restoreFromEditHistory } from "@/lib/api/medleys";
import { logger } from "@/lib/utils/logger";
import { PlayerLoadingMessage } from "@/components/ui/loading/PlayerSkeleton";
import { ActiveSongPopup } from "@/components/ui/song/ActiveSongPopup";
import { ActiveSongDebugPanel } from "@/components/ui/debug/ActiveSongDebugPanel";
import { getNiconicoVideoMetadata } from "@/lib/utils/videoMetadata";
import MedleyHeader from "@/components/features/medley/MedleyHeader";
import ImportSetlistModal from "@/components/features/medley/ImportSetlistModal";
import FixedPlayerBar from "@/components/features/player/FixedPlayerBar";
import { RightSidebar } from "@/components/features/player/RightSidebar";
import { Button } from "@/components/ui/button";

interface MedleyPlayerProps {
  initialVideoId?: string;
  initialTime?: number; // ディープリンク用
  platform?: 'niconico' | 'youtube';
}

export default function MedleyPlayer({ 
  initialVideoId = "sm500873", 
  initialTime = 0,
  platform = 'niconico'
}: MedleyPlayerProps) {
    const [videoId, setVideoId] = useState<string>(initialVideoId);
    const [inputVideoId, setInputVideoId] = useState<string>(initialVideoId);
    
    // Debouncing for duration warning messages
    const lastWarningTime = useRef<number>(0);
    const lastWarningVideoId = useRef<string>('');
    
    // プレイヤーコンテナの参照（ActiveSongPopupの位置調整用）
    const playerContainerRef = useRef<HTMLDivElement>(null);

    // 編集モード関連の状態
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [editingSong, setEditingSong] = useState<SongSection | null>(null);
    const [isNewSong, setIsNewSong] = useState<boolean>(false);
    const [continuousInputMode, setContinuousInputMode] = useState<boolean>(false);
    
    // 楽曲検索モーダル関連の状態
    const [songSearchModalOpen, setSongSearchModalOpen] = useState<boolean>(false);
    const [selectedDatabaseSong, setSelectedDatabaseSong] = useState<SongDatabaseEntry | null>(null);
    const [isChangingSong, setIsChangingSong] = useState<boolean>(false); // 楽曲変更モードかどうか
    
    
    // 手動楽曲追加モーダル関連の状態
    const [manualAddModalOpen, setManualAddModalOpen] = useState<boolean>(false);

    // 自動保存フラグ（重複保存防止用）- useRefで同期的に制御
    const isAutoSavedRef = useRef<boolean>(false);

    // 🔍 DEBUG: Call counters
    const callCounters = useRef({
        handleSelectSongFromDatabase: 0,
        handleSaveSong: 0,
        handleImmediateSave: 0
    });

    // 認証関連の状態
    const { isAuthenticated, nickname, loading: authLoading } = useAuth();
    const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

    // メタデータ関連の状態
    const [videoMetadata, setVideoMetadata] = useState<{title: string, creator: string} | null>(null);
    const videoMetadataRef = useRef<{title: string, creator: string} | null>(null);
    const [, setFetchingMetadata] = useState<boolean>(false);

    // 編集履歴の状態
    const [editHistory, setEditHistory] = useState<MedleyEditHistory[]>([]);

    // 復元関連の状態
    const [restoreModalOpen, setRestoreModalOpen] = useState<boolean>(false);
    const [restoringEditHistoryId, setRestoringEditHistoryId] = useState<string | null>(null);
    const [restoreSnapshot, setRestoreSnapshot] = useState<MedleySnapshot | null>(null);
    const [restoreCreatedAt, setRestoreCreatedAt] = useState<Date | null>(null);
    const [isRestoring, setIsRestoring] = useState<boolean>(false);

    // セットリストインポートモーダル関連
    const [importSetlistModalOpen, setImportSetlistModalOpen] = useState<boolean>(false);
    const [importSetlistPrefillText, setImportSetlistPrefillText] = useState<string>("");
    const [fetchingDescription, setFetchingDescription] = useState<boolean>(false);

    // 楽曲選択とツールチップ関連の状態
    const [selectedSong, setSelectedSong] = useState<SongSection | null>(null);
    // ツールチップ関連の状態
    const [tooltipSong, setTooltipSong] = useState<SongSection | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);
    
    const [, setIsHoveringTooltip] = useState<boolean>(false);
    const [, setIsHoveringSong] = useState<boolean>(false);
    const [hideTooltipTimeout, setHideTooltipTimeout] = useState<NodeJS.Timeout | null>(null);



    // メドレーデータの取得
    const { medleySongs, medleyTitle, medleyCreator, medleyDuration, medleyData, loading, isRefetching, error, refetch } = useMedleyData(videoId);

    // Refを常に最新に保つ
    const medleySongsRef = useRef<SongSection[]>([]);
    useEffect(() => {
        medleySongsRef.current = medleySongs;
    }, [medleySongs]);

    useEffect(() => {
        videoMetadataRef.current = videoMetadata;
    }, [videoMetadata]);

    // 即時保存コールバック（useMedleyEditより前に定義するため、saveMedleyとrefetchは後で設定）
    const handleImmediateSaveRef = useRef<(songs: SongSection[]) => Promise<void>>(async () => {});

    // 編集機能
    const {
        editingSongs,
        hasChanges,
        isSaving,
        saveFailed,
        saveError,
        updateSong,
        addSong,
        deleteSong,
        saveMedley,
        batchUpdate,
        undo,
        redo,
        resetSaveError,
    } = useMedleyEdit({
        originalSongs: medleySongs,
        isRefetching: isRefetching,
        onSaveSuccess: refetch,
        onAfterAdd: (songs) => handleImmediateSaveRef.current?.(songs),
        onAfterUpdate: (songs) => handleImmediateSaveRef.current?.(songs),
        onAfterDelete: (songs) => handleImmediateSaveRef.current?.(songs),
        onAfterBatchUpdate: (songs) => handleImmediateSaveRef.current?.(songs)
    });

    // 即時保存の実装（useEffectで設定して依存関係を適切に管理）
    useEffect(() => {
        handleImmediateSaveRef.current = async (songsToSave: SongSection[]) => {
            callCounters.current.handleImmediateSave++;
            const callId = `CALL-${callCounters.current.handleImmediateSave}`;

            if (!isAuthenticated || !nickname) {
                logger.debug(`⏸️ [${callId}] Skipping immediate save: not authenticated`);
                return;
            }

            // For new medleys, wait for metadata if it's still loading
            if (medleySongsRef.current.length === 0 && !videoMetadataRef.current && platform === 'niconico') {
                logger.info(`⏳ [${callId}] Waiting for metadata before save...`);
                // Wait up to 3 seconds for metadata
                let attempts = 0;
                while (!videoMetadataRef.current && attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                if (!videoMetadataRef.current) {
                    logger.warn(`⚠️ [${callId}] Metadata fetch timed out, proceeding with fallback values`);
                } else {
                    logger.info(`✅ [${callId}] Metadata loaded successfully after waiting`);
                }
            }

            // メタデータが取得できている場合はそれを使用、なければデフォルト値
            const title = medleyTitle || videoMetadataRef.current?.title || `${videoId} メドレー`;
            const creator = medleyCreator || videoMetadataRef.current?.creator || '匿名ユーザー';
            const saveDuration = medleyDuration || duration || 0;

            logger.info(`💾 [${callId}] Immediate save triggered`, {
                callNumber: callCounters.current.handleImmediateSave,
                videoId,
                title,
                creator,
                duration: saveDuration,
                songCount: songsToSave.length,
                songs: songsToSave.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    startTime: s.startTime,
                    endTime: s.endTime
                })),
                editor: nickname,
                hasVideoMetadata: !!videoMetadataRef.current
            });

            const success = await saveMedley(
                videoId,
                title,
                creator,
                saveDuration,
                nickname || undefined,
                songsToSave // 最新の楽曲リストを渡す
            );

            if (success) {
                logger.info(`✅ [${callId}] Immediate save successful, refetching data`);
                await refetch();

                // 編集履歴も再取得
                if (medleyData?.id) {
                    const history = await getMedleyEditHistory(medleyData.id, 10);
                    setEditHistory(history);
                    logger.debug('✅ Edit history refetched after immediate save');
                }

                logger.info(`✅ [${callId}] Refetch completed`);
            } else {
                logger.error(`❌ [${callId}] Immediate save failed`, {
                    videoId,
                    songCount: songsToSave.length,
                    songs: songsToSave.map(s => ({ title: s.title, artist: s.artist }))
                });
            }
        };
    }, [isAuthenticated, nickname, platform, medleyTitle, medleyCreator, medleyDuration, videoId, saveMedley, refetch]);
    
    // ニコニコプレイヤーの統合
    const {
        playerRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        playerError,
        playerReady,
        togglePlayPause,
        seek: nicoSeek,
        setVolume,
        toggleFullscreen,
        getEmbedUrl,
        handleIframeLoad,
        clearError
    } = useNicoPlayer({
        videoId,
        onTimeUpdate: () => {
            // タイムラインの更新はuseNicoPlayerが自動処理
        },
        onDurationChange: (actualDuration: number) => {
            // 実際の動画長さと設定された長さを比較
            if (medleyDuration && Math.abs(actualDuration - medleyDuration) > 5) {
                // Debouncing: Only log warning once per video per 30 seconds
                const now = Date.now();
                const warningKey = `${videoId}-${medleyDuration}-${actualDuration}`;
                
                if (lastWarningVideoId.current !== warningKey || (now - lastWarningTime.current) > 30000) {
                    logger.warn(`動画長さ不整合を検出: 設定値=${medleyDuration}s, 実際値=${actualDuration}s`);
                    lastWarningTime.current = now;
                    lastWarningVideoId.current = warningKey;
                    
                    // 自動修正を実行（ただし、実際の長さが妥当な範囲内の場合のみ）
                    if (actualDuration > 0 && actualDuration < 14400 && actualDuration !== medleyDuration) { // 4時間未満
                        logger.info(`動画長さを自動修正します: ${medleyDuration}s → ${actualDuration}s`);
                        
                        // Note: Database update for medley duration will be implemented when API endpoints are available
                    }
                }
            }
        },
        onPlayingChange: () => {
            // 再生状態の変化はuseNicoPlayerが自動処理
        }
    });
    
    // 新規メドレー用にメタデータを取得
    useEffect(() => {
        // メドレーデータがない場合かつニコニコ動画の場合のみメタデータを取得
        if (medleySongs.length === 0 && !loading && !error && platform === 'niconico' && videoId.startsWith('sm')) {
            const fetchMetadata = async () => {
                setFetchingMetadata(true);
                try {
                    logger.debug('📹 Fetching metadata for new medley:', videoId);
                    const metadata = await getNiconicoVideoMetadata(videoId);
                    if (metadata.success) {
                        setVideoMetadata({
                            title: metadata.title,
                            creator: metadata.creator
                        });
                        logger.debug('✅ Metadata fetched successfully:', metadata.title);
                    } else {
                        logger.warn('⚠️ Failed to fetch metadata:', metadata.error);
                    }
                } catch (error) {
                    logger.error('❌ Error fetching metadata:', error);
                } finally {
                    setFetchingMetadata(false);
                }
            };

            fetchMetadata();
        }
    }, [medleySongs.length, loading, error, platform, videoId]);

    // 編集履歴を取得
    useEffect(() => {
        const fetchEditHistory = async () => {
            if (medleyData?.id) {
                logger.debug('📜 Fetching edit history for medley:', medleyData.id);
                const history = await getMedleyEditHistory(medleyData.id, 10);
                setEditHistory(history);
                logger.debug('✅ Edit history fetched:', history.length, 'entries');
            }
        };

        fetchEditHistory();
    }, [medleyData?.id]);

    // durationを決定（静的データを優先、プレイヤーデータはフォールバック）
    const effectiveDuration = medleyDuration || duration;
    
    // シーク機能をプラットフォーム別に実装
    const seek = (seekTime: number) => {
        if (platform === 'youtube') {
            // YouTube用のシーク実装（将来的にYouTube APIを使用）
            logger.debug('YouTube seek not implemented yet:', seekTime);
        } else {
            nicoSeek(seekTime);
        }
    };

    // ボリューム変更ハンドラ
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
    };

    // 初期時間へのシーク（ディープリンク対応）
    useEffect(() => {
        if (initialTime > 0 && effectiveDuration > 0 && initialTime <= effectiveDuration && playerReady) {
            // プレイヤーが準備完了してからシーク（待機時間を短縮）
            const timer = setTimeout(() => {
                logger.info(`Initial time seek to ${initialTime} seconds`);
                seek(initialTime);
            }, 500);
            
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTime, effectiveDuration, playerReady]);

    // URLが変更された時の処理（ブラウザの戻る/進む対応）
    useEffect(() => {
        setVideoId(initialVideoId);
        setInputVideoId(initialVideoId);
    }, [initialVideoId]);

    // Undo/Redoキーボードショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (false && (e.ctrlKey || e.metaKey)) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo]);

    // スペースキーで再生/一時停止
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // スペースキーの場合
            if (e.key === ' ') {
                // テキスト入力中やモーダル表示中は無効化
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.getAttribute('contenteditable') === 'true'
                );
                
                // モーダルが開いている場合は無効化
                const isModalOpen = editModalOpen || songSearchModalOpen || manualAddModalOpen;
                
                // プレイヤーが準備完了していない場合は無効化
                if (isInputFocused || isModalOpen || !playerReady) {
                    return;
                }
                
                e.preventDefault();
                togglePlayPause();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [editModalOpen, songSearchModalOpen, manualAddModalOpen, playerReady, togglePlayPause]);


    // コンポーネントのアンマウント時にタイムアウトをクリーンアップ
    useEffect(() => {
        return () => {
            if (hideTooltipTimeout) {
                clearTimeout(hideTooltipTimeout);
            }
        };
    }, [hideTooltipTimeout]);

    // ドキュメントクリックでツールチップを非表示
    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (isTooltipVisible) {
                // クリックされた要素がツールチップ内またはプラットフォームリンクかどうかをチェック
                const target = event.target as HTMLElement;
                const tooltipElement = target.closest('[data-tooltip]');
                const platformLink = target.closest('a[href*="spotify.com"], a[href*="apple.com"], a[href*="youtube.com"], a[href*="nicovideo.jp"]');
                
                // ツールチップ内またはプラットフォームリンクのクリックの場合は閉じない
                if (tooltipElement || platformLink) {
                    return;
                }
                
                setIsTooltipVisible(false);
                setIsHoveringTooltip(false);
                setIsHoveringSong(false);
                if (hideTooltipTimeout) {
                    clearTimeout(hideTooltipTimeout);
                    setHideTooltipTimeout(null);
                }
                // 少し遅延してからツールチップをクリア
                setTimeout(() => {
                    setTooltipSong(null);
                }, 100);
            }
        };

        if (isTooltipVisible) {
            document.addEventListener('click', handleDocumentClick);
            return () => {
                document.removeEventListener('click', handleDocumentClick);
            };
        }
    }, [isTooltipVisible, hideTooltipTimeout]);
    
    // 現在のトラックの追跡（編集中か元のデータかを切り替え）
    // hasChanges, isSaving, isRefetching, saveFailedをチェックして、保存処理中もeditingSongsを表示し続ける（UIフリッカー防止＆即時反映）
    const displaySongs = useMemo(() => {
        // 編集中、保存中、refetch中、保存失敗後はeditingSongsを使用（即時反映＆データ保護）
        if (hasChanges || isSaving || isRefetching || saveFailed) {
            return editingSongs;
        }
        // すべて完了したらmedleySongsに切り替え（DB同期済み）
        return medleySongs;
    }, [hasChanges, isSaving, isRefetching, saveFailed, editingSongs, medleySongs]);
    
    // Debug logging for displaySongs changes
    useEffect(() => {
        logger.debug('🔄 MedleyPlayer: displaySongs changed', {
            songsCount: displaySongs.length,
            songsInfo: displaySongs.map(s => ({ id: s.id, title: s.title, start: s.startTime, end: s.endTime }))
        });
    }, [displaySongs]);
    useCurrentTrack(currentTime, displaySongs);

    // 現在再生中の楽曲を取得
    const getCurrentSongs = () => {
        return displaySongs.filter(song => 
            currentTime >= song.startTime && currentTime <= song.endTime
        );
    };

    // タイムラインクリックハンドラ
    const handleTimelineClick = (time: number) => {
        seek(time);
    };

    // 隣接する楽曲を検索するヘルパー関数
    const findAdjacentSongs = (currentSong: SongSection) => {
        const sortedSongs = [...displaySongs].sort((a, b) => a.startTime - b.startTime);
        const currentIndex = sortedSongs.findIndex(song => song.id === currentSong.id);
        
        const previousSong = currentIndex > 0 ? sortedSongs[currentIndex - 1] : undefined;
        const nextSong = currentIndex < sortedSongs.length - 1 ? sortedSongs[currentIndex + 1] : undefined;
        
        return { previousSong, nextSong };
    };

    // 編集機能のハンドラ

    
    // 楽曲DB検索モーダルのハンドラ
    const handleSelectSongFromDatabase = (dbSong: SongDatabaseEntry) => {
        callCounters.current.handleSelectSongFromDatabase++;
        const callId = `CALL-${callCounters.current.handleSelectSongFromDatabase}`;

        setSongSearchModalOpen(false);
        setSelectedDatabaseSong(dbSong);

        // デバッグ用ログ - 詳細な状態確認
        logger.info(`🎵 [${callId}] handleSelectSongFromDatabase called - DETAILED STATE CHECK`, {
            callNumber: callCounters.current.handleSelectSongFromDatabase,
            isChangingSong: isChangingSong,
            editModalOpen: editModalOpen,
            editingSong: editingSong ? {
                id: editingSong.id,
                title: editingSong.title,
                startTime: editingSong.startTime,
                endTime: editingSong.endTime,
                isEmpty: editingSong.title.startsWith('空の楽曲')
            } : null,
            selectedSong: dbSong ? { title: dbSong.title, artist: dbSong.artist } : null,
            // 条件の詳細チェック
            condition1: (isChangingSong || (editModalOpen && editingSong)),
            condition2: !!editingSong,
            finalCondition: ((isChangingSong || (editModalOpen && editingSong)) && editingSong)
        });

        // 楽曲DBから基本情報を取得
        const songTemplate = createSongFromDatabase(dbSong, 0, 0);

        // 楽曲置換の判定を簡素化 - editingSongが存在する場合は常に置換
        if (editingSong) {
            // editingSongsに既に存在するかチェック
            const existsInTimeline = editingSongs.some(s => s.id === editingSong.id);

            logger.info('🔍 [DEBUG] Checking if song exists in timeline', {
                editingSongId: editingSong.id,
                editingSongsIds: editingSongs.map(s => s.id),
                existsInTimeline: existsInTimeline,
                editingSongsCount: editingSongs.length
            });

            logger.info('🔄 [REPLACEMENT PATH] Replacing existing song with database selection', {
                preservedId: editingSong.id,
                preservedStartTime: editingSong.startTime,
                preservedEndTime: editingSong.endTime,
                newTitle: songTemplate.title,
                newArtist: songTemplate.artist,
                replacingEmptySong: editingSong.title.startsWith('空の楽曲') || editingSong.title === '',
                existsInTimeline: existsInTimeline,
                isEmptyPlaceholder: editingSong.title === '' && editingSong.artist.join(", ") === ''
            });

            // 既存楽曲がある場合は必ず置換 - ID、時間情報を保持して楽曲情報のみ更新
            const replacedSong = {
                ...editingSong,
                title: songTemplate.title,
                artist: songTemplate.artist,
                niconicoLink: songTemplate.niconicoLink,
                youtubeLink: songTemplate.youtubeLink,
                spotifyLink: songTemplate.spotifyLink,
                applemusicLink: songTemplate.applemusicLink
            };

            setEditingSong(replacedSong);

            logger.info('🔍 After setEditingSong - ID VERIFICATION', {
                newEditingSongId: replacedSong.id,
                newEditingSongTitle: replacedSong.title,
                stillMatchesOriginalId: replacedSong.id === editingSong.id,
                existsInTimeline: existsInTimeline
            });

            // 保存タイミング修正: 即時保存せず、SongEditModalで時間調整後にユーザーが保存する
            if (existsInTimeline) {
                setIsNewSong(false);
                logger.info(`📝 [${callId}] Setting isNewSong=false (song exists in timeline - will update on save)`);
                // 既存楽曲を更新（タイムラインに表示するため即時更新）
                updateSong(replacedSong);
                isAutoSavedRef.current = true;
                logger.info(`✅ [${callId}] Updated existing song in timeline`);
            } else {
                // 新規追加: モーダルで時間を確認・調整してから保存
                setIsNewSong(true);
                logger.info(`📝 [${callId}] Keeping isNewSong=true - user will save from SongEditModal after time adjustment`);
                isAutoSavedRef.current = false;
            }

            // 編集モーダルを開く
            setEditModalOpen(true);
            logger.info('✅ Song replacement completed - opening edit modal');
        } else {
            logger.info('➕ [NEW SONG PATH] Creating new song from database selection', {
                reason: 'No editingSong exists',
                isChangingSong: isChangingSong,
                editModalOpen: editModalOpen,
                newId: Date.now(),
                newTitle: songTemplate.title,
                newArtist: songTemplate.artist
            });

            // 新規追加の場合
            setEditingSong({
                id: Date.now(), // 一時的なID
                ...songTemplate
            });
            setIsNewSong(true);
            setEditModalOpen(true);
        }
    };
    
    const handleManualAddSong = () => {
        setSongSearchModalOpen(false);
        setManualAddModalOpen(true);
    };

    // 手動楽曲追加モーダルから楽曲を保存
    const handleManualSongSave = async (songData: {
        title: string;
        artist: string[];
        composers?: string[];
        arrangers?: string[];
        niconicoLink?: string;
        youtubeLink?: string;
        spotifyLink?: string;
        applemusicLink?: string;
    }) => {
        try {
            // 楽曲をデータベースに追加
            const addedSong = await addManualSong(songData);
            
            setManualAddModalOpen(false);
            
            // 置換モードの場合は、追加した楽曲で直接置換処理を実行
            if (editingSong && (isChangingSong || editModalOpen)) {
                logger.info('🔄 Manual song added in replacement context - executing direct replacement', {
                    editingSongId: editingSong.id,
                    editingSongTitle: editingSong.title,
                    newSongTitle: addedSong.title,
                    newSongArtist: addedSong.artist,
                    isChangingSong: isChangingSong,
                    editModalOpen: editModalOpen
                });
                
                // 直接置換処理を実行（SongSearchModalを再開せずに）
                handleSelectSongFromDatabase(addedSong);
            } else {
                // 新規追加の場合も、追加した楽曲を自動的に選択
                logger.info('➕ Manual song added in new song context - auto-selecting added song');
                handleSelectSongFromDatabase(addedSong);
            }
            
            // 成功メッセージ（オプション）
            logger.info(`楽曲「${addedSong.title}」を楽曲データベースに追加しました`);
        } catch (error) {
            logger.error('楽曲の追加に失敗しました:', error);
        }
    };

    // 類似楽曲を使用するコールバック（ManualSongAddModalから）
    const handleUseSimilarSong = (song: SongDatabaseEntry) => {
        logger.info('🔄 Using similar song from database:', {
            songId: song.id,
            songTitle: song.title,
            songArtist: song.artist.map(a => a.name).join(', ')
        });
        // ManualSongAddModalを閉じる
        setManualAddModalOpen(false);
        // 選択された楽曲でSongEditModalを開く
        handleSelectSongFromDatabase(song);
    };


    // 新しい楽曲区間を追加する関数
    const handleAddNewSong = () => {
        logger.info('➕ handleAddNewSong called - adding new song at current time', {
            currentTime: currentTime || 0,
            duration: duration,
            playerReady: playerReady
        });

        // 現在時刻に30秒の区間を作成
        const newSong: SongSection = {
            id: Date.now(),
            title: "",
            artist: [],
            startTime: currentTime || 0,
            endTime: Math.min((currentTime || 0) + 30, duration),
            color: "bg-orange-400",
            niconicoLink: "",
            youtubeLink: "",
            spotifyLink: "",
            applemusicLink: ""
        };

        // 新規楽曲として編集状態にセット
        setEditingSong(newSong);
        setIsNewSong(true);
        setIsChangingSong(false); // 楽曲変更モードではない

        // 編集モーダルを直接開く（フォームで入力またはDBから検索）
        setEditModalOpen(true);

        logger.info('✅ New song segment created, opening edit modal', {
            newSongId: newSong.id,
            startTime: newSong.startTime,
            endTime: newSong.endTime
        });
    };

    // 楽曲変更の開始
    const handleChangeSong = () => {
        logger.info('🔄 handleChangeSong called', {
            currentStates: {
                editingSong: editingSong ? {
                    id: editingSong.id,
                    title: editingSong.title,
                    isEmpty: editingSong.title.startsWith('空の楽曲')
                } : null,
                isNewSong: isNewSong,
                editModalOpen: editModalOpen,
                isChangingSong: isChangingSong
            },
            aboutToSet: {
                isChangingSong: true,
                songSearchModalOpen: true
            }
        });
        
        setIsChangingSong(true);
        setSongSearchModalOpen(true);
    };

    // 楽曲検索モーダルから楽曲を編集
    const handleEditSongFromDatabase = async (updatedSong: SongDatabaseEntry) => {
        try {
            // データベースに楽曲情報を保存
            const savedSong = await updateManualSong({
                id: updatedSong.id,
                title: updatedSong.title,
                artist: updatedSong.artist.map(a => a.name),
                composers: updatedSong.composers?.map(c => c.name),
                arrangers: updatedSong.arrangers?.map(a => a.name),
                niconicoLink: updatedSong.niconicoLink,
                youtubeLink: updatedSong.youtubeLink,
                spotifyLink: updatedSong.spotifyLink,
                applemusicLink: updatedSong.applemusicLink
            });

            logger.info('✅ Database update successful:', {
                id: savedSong.id,
                title: savedSong.title,
                artist: savedSong.artist,
                niconicoLink: savedSong.niconicoLink,
                youtubeLink: savedSong.youtubeLink,
                spotifyLink: savedSong.spotifyLink,
                applemusicLink: savedSong.applemusicLink
            });

            // 最新情報を選択中楽曲として保持（SongEditModalで参照）
            setSelectedDatabaseSong(savedSong);

            // 現在編集中の楽曲を更新された情報に変更
            if (editingSong) {
                const updatedSongSection: SongSection = {
                    ...editingSong,
                    title: savedSong.title,
                    artist: savedSong.artist.map(a => a.name),
                    composers: savedSong.composers?.map(c => c.name),
                    arrangers: savedSong.arrangers?.map(a => a.name),
                    niconicoLink: savedSong.niconicoLink || "",
                    youtubeLink: savedSong.youtubeLink || "",
                    spotifyLink: savedSong.spotifyLink || "",
                    applemusicLink: savedSong.applemusicLink || ""
                };
                setEditingSong(updatedSongSection);
            }
        } catch (error) {
            logger.error('❌ Failed to update song in database:', error);
            // エラーを通知
            alert('楽曲情報の更新に失敗しました。もう一度お試しください。');
        }
    };

    const handleSaveSong = (song: SongSection) => {
        callCounters.current.handleSaveSong++;
        const callId = `CALL-${callCounters.current.handleSaveSong}`;

        logger.info(`💾 [${callId}] handleSaveSong called - DETAILED ID TRACKING`, {
            callNumber: callCounters.current.handleSaveSong,
            isNewSong: isNewSong,
            isChangingSong: isChangingSong,
            isAutoSaved: isAutoSavedRef.current,
            songId: song.id,
            songTitle: song.title,
            songArtist: song.artist,
            editingSongId: editingSong?.id,
            editingSongTitle: editingSong?.title,
            currentEditingSongs: editingSongs.map(s => ({ id: s.id, title: s.title })),
            willCallAddSong: isNewSong,
            willCallUpdateSong: !isNewSong,
            idMatch: editingSongs.some(s => s.id === song.id)
        });

        // 自動保存済みの場合は重複保存をスキップ
        if (isAutoSavedRef.current) {
            logger.info(`⏭️ [${callId}] Skipping save - song was already auto-saved in handleSelectSongFromDatabase`);

            // 保存完了後にisChangingSongフラグをリセット
            if (isChangingSong) {
                logger.info('✅ Song replacement saved (auto-saved) - resetting isChangingSong flag');
                setIsChangingSong(false);
            }

            // 連続入力モードでない場合はモーダルを閉じる
            if (!continuousInputMode) {
                setEditModalOpen(false);
            }

            return; // 重複保存を防ぐため、ここで処理を終了
        }

        // Check if song already exists in timeline (was already added)
        const songExistsInTimeline = editingSongs.some(s => s.id === song.id);

        if (songExistsInTimeline) {
            // Song already exists - just update it
            logger.info('🔄 Song already in timeline - calling updateSong');
            updateSong(song);
        } else if (isNewSong) {
            // New song - add it
            logger.info('➕ Calling addSong - will create NEW song');
            addSong(song);
        } else {
            // This shouldn't happen, but log it for debugging
            logger.warn('⚠️ Unexpected state: !isNewSong but song not in timeline', {
                songId: song.id,
                availableIds: editingSongs.map(s => s.id)
            });
            updateSong(song);
        }

        // song_masterも更新（存在する場合）
        // This ensures that changes made in SongEditModal are persisted to song_master
        (async () => {
            try {
                const normalizedId = normalizeSongInfo(song.title, song.artist.join(", "));
                await updateManualSong({
                    id: normalizedId,
                    title: song.title,
                    artist: song.artist,
                    niconicoLink: song.niconicoLink || undefined,
                    youtubeLink: song.youtubeLink || undefined,
                    spotifyLink: song.spotifyLink || undefined,
                    applemusicLink: song.applemusicLink || undefined
                });
                logger.info(`✅ [${callId}] song_master updated successfully for:`, { title: song.title, artist: song.artist });
            } catch (error) {
                logger.debug(`ℹ️ [${callId}] song_master update skipped (song not in master table):`, error);
            }
        })();

        // 保存完了後にisChangingSongフラグをリセット
        if (isChangingSong) {
            logger.info('✅ Song replacement saved - resetting isChangingSong flag');
            setIsChangingSong(false);
        }

        // 連続入力モードでない場合はモーダルを閉じる
        if (!continuousInputMode) {
            setEditModalOpen(false);
        }
    };

    const handleSaveAndNext = (song: SongSection) => {
        if (isNewSong) {
            addSong(song);
        } else {
            updateSong(song);
        }
        
        // 次の楽曲を準備（自動時間設定を適用）
        const nextStartTime = song.endTime;
        const nextSong: SongSection = {
            id: Date.now() + 1, // 一意なIDを作成
            title: "",
            artist: [],
            startTime: Math.round(nextStartTime * 10) / 10,
            endTime: Math.round((nextStartTime + 30) * 10) / 10, // デフォルト30秒
            color: "bg-blue-400",
            niconicoLink: "",
            youtubeLink: "",
            spotifyLink: "",
            applemusicLink: ""
        };
        
        setEditingSong(nextSong);
        setIsNewSong(true);
        // モーダルは閉じない
    };

    const handleToggleContinuousMode = () => {
        setContinuousInputMode(!continuousInputMode);
    };

    // 重複楽曲の一括更新（マルチセグメント対応）
    const handleBatchUpdate = (updatedSongs: SongSection[]) => {
        if (updatedSongs.length === 0) return;

        // 既存のインスタンスを削除してから新しいセグメントを追加する場合
        if (editingSong) {
            logger.debug('🔄 handleBatchUpdate called with:', updatedSongs.length, 'segments');
            // 現在編集中の楽曲と同じタイトル・アーティストの全インスタンスを取得
            const currentTitle = editingSong.title.trim();
            const currentArtist = editingSong.artist.join(", ").trim();
            const existingInstances = displaySongs.filter(song =>
                song.title.trim() === currentTitle && song.artist.join(", ").trim() === currentArtist
            );

            // 削除するIDリストと追加する楽曲リストを準備
            const idsToRemove = existingInstances.map(instance => instance.id);
            const songsToAdd = updatedSongs.map(song => ({
                title: song.title,
                artist: song.artist,
                startTime: song.startTime,
                endTime: song.endTime,
                color: song.color,
                niconicoLink: song.niconicoLink,
                youtubeLink: song.youtubeLink,
                spotifyLink: song.spotifyLink,
                applemusicLink: song.applemusicLink
            }));

            // 一括更新を実行（アトミック操作）
            batchUpdate(idsToRemove, songsToAdd);

            logger.info(`✅ 「${currentTitle}」の${existingInstances.length}個のインスタンスを削除し、${updatedSongs.length}個のセグメントを追加しました`);
        } else {
            // 従来の単純な更新処理
            updatedSongs.forEach(song => {
                updateSong(song);
            });
            logger.debug(`${updatedSongs.length}つの楽曲インスタンスを一括更新しました`);
        }
        
        setEditModalOpen(false);
    };



    
    const handleHoverSong = (song: SongSection | null, position: { x: number; y: number }) => {
        if (song) {
            // 既存のタイムアウトをクリア
            if (hideTooltipTimeout) {
                clearTimeout(hideTooltipTimeout);
                setHideTooltipTimeout(null);
            }
            
            setTooltipSong(song);
            setTooltipPosition(position);
            setIsTooltipVisible(true);
            setIsHoveringSong(true);
        } else {
            setIsHoveringSong(false);
            
            // タイムアウトを設定して遅延後に非表示
            // 状態更新が非同期なので、現在の状態ではなく false を直接使用
            const timeout = setTimeout(() => {
                // isHoveringTooltip の現在の値を確認してから非表示にする
                setIsHoveringSong(currentHoveringSong => {
                    setIsHoveringTooltip(currentHoveringTooltip => {
                        if (!currentHoveringTooltip && !currentHoveringSong) {
                            setIsTooltipVisible(false);
                            setTooltipSong(null);
                        }
                        return currentHoveringTooltip;
                    });
                    return currentHoveringSong;
                });
            }, 500); // 500ms の遅延（ツールチップ操作のための猶予）
            
            setHideTooltipTimeout(timeout);
        }
    };

    const handleTooltipMouseEnter = () => {
        // 既存のタイムアウトをクリア
        if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
            setHideTooltipTimeout(null);
        }
        setIsHoveringTooltip(true);
    };

    const handleTooltipMouseLeave = () => {
        setIsHoveringTooltip(false);

        // タイムアウトを設定して遅延後に非表示
        const timeout = setTimeout(() => {
            // 状態更新が非同期なので、現在の状態値を正確に取得
            setIsHoveringTooltip(currentHoveringTooltip => {
                setIsHoveringSong(currentHoveringSong => {
                    if (!currentHoveringTooltip && !currentHoveringSong) {
                        setIsTooltipVisible(false);
                        setTooltipSong(null);
                    }
                    return currentHoveringSong;
                });
                return currentHoveringTooltip;
            });
        }, 500); // 500ms の遅延（ツールチップ操作のための猶予）

        setHideTooltipTimeout(timeout);
    };

    // ツールチップから編集ボタンがクリックされた時の処理
    const handleEditFromTooltip = (song: SongSection) => {
        // 認証チェック
        if (!isAuthenticated) {
            setLoginModalOpen(true);
            return;
        }

        // ツールチップを閉じる
        setIsTooltipVisible(false);
        setTooltipSong(null);
        if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
            setHideTooltipTimeout(null);
        }

        // 編集モーダルを開く
        setEditingSong(song);
        setIsNewSong(false);
        setEditModalOpen(true);
        logger.info('編集モーダルをツールチップから開きました:', { songTitle: song.title, songId: song.id });
    };

    // 楽曲をダブルクリックして編集モーダルを開く
    const handleEditSongClick = (song: SongSection) => {
        setEditingSong(song);
        setIsNewSong(false);
        setEditModalOpen(true);
        logger.info('編集モーダルをダブルクリックから開きました:', { songTitle: song.title, songId: song.id });
    };

    // 編集履歴から復元
    const handleRestoreRequest = (editHistoryId: string) => {
        if (!isAuthenticated) {
            setLoginModalOpen(true);
            return;
        }

        logger.info('🔄 Restore requested for edit history:', editHistoryId);

        // 編集履歴を取得してスナップショットを確認
        const edit = editHistory.find(e => e.id === editHistoryId);
        if (!edit) {
            logger.error('Edit history not found:', editHistoryId);
            return;
        }

        const snapshot = edit.changes?.snapshot as MedleySnapshot | undefined;
        if (!snapshot) {
            logger.error('No snapshot found in edit history:', editHistoryId);
            return;
        }

        logger.info('📸 Snapshot found, opening restore confirmation modal', {
            songCount: snapshot.songs.length,
            title: snapshot.title
        });

        setRestoringEditHistoryId(editHistoryId);
        setRestoreSnapshot(snapshot);
        setRestoreCreatedAt(edit.createdAt);
        setRestoreModalOpen(true);
    };

    const handleRestoreConfirm = async () => {
        if (!restoringEditHistoryId || !nickname) {
            logger.error('Cannot restore: missing edit history ID or nickname');
            return;
        }

        setIsRestoring(true);
        logger.info('🔄 Executing restore from edit history:', restoringEditHistoryId);

        try {
            const restoredData = await restoreFromEditHistory(restoringEditHistoryId, nickname);

            if (restoredData) {
                logger.info('✅ Restore successful, refetching data');
                await refetch();

                // 編集履歴も再取得
                if (medleyData?.id) {
                    const history = await getMedleyEditHistory(medleyData.id, 10);
                    setEditHistory(history);
                }

                setRestoreModalOpen(false);
                setRestoringEditHistoryId(null);
                setRestoreSnapshot(null);
                setRestoreCreatedAt(null);

                logger.info('✅ Restore completed successfully');
            } else {
                logger.error('❌ Restore failed');
                alert('復元に失敗しました。もう一度お試しください。');
            }
        } catch (error) {
            logger.error('❌ Error during restore:', error);
            alert('復元中にエラーが発生しました。');
        } finally {
            setIsRestoring(false);
        }
    };




    // 動画IDが変更されたときの処理  
    const handleVideoIdSubmit = (e: React.FormEvent) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        e.preventDefault();
        logger.info("Loading video:", inputVideoId);
        
        // URLを更新（ブラウザの履歴に追加）
        const newUrl = inputVideoId === "sm500873" ? "/" : `/${inputVideoId}`;
        window.history.pushState(null, "", newUrl);
        
        setVideoId(inputVideoId);
        // ニコニコプレイヤーが状態をリセット
    };



    // 説明文取得 → ImportSetlistModal を開く
    const handleFetchDescriptionForImport = async () => {
        if (!isAuthenticated) {
            setLoginModalOpen(true);
            return;
        }
        setFetchingDescription(true);
        try {
            const apiPath = platform === 'youtube'
                ? `/api/metadata/youtube/${videoId}/`
                : `/api/metadata/niconico/${videoId}/`;
            const res = await fetch(apiPath);
            const data = await res.json();
            if (data.success && data.description) {
                setImportSetlistPrefillText(data.description);
                setImportSetlistModalOpen(true);
            } else {
                setImportSetlistPrefillText('');
                setImportSetlistModalOpen(true);
            }
        } catch {
            setImportSetlistPrefillText('');
            setImportSetlistModalOpen(true);
        } finally {
            setFetchingDescription(false);
        }
    };

    // ImportSetlistModal からのインポート
    const handleImportSetlistSongs = (songs: SongSection[]) => {
        songs.forEach(song => addSong(song));
        setImportSetlistModalOpen(false);
    };

    // 元動画URL生成
    const generateOriginalVideoUrl = () => {
        if (platform === 'youtube') {
            return `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return `https://www.nicovideo.jp/watch/${videoId}`;
        }
    };

    // Show loading screen while data is loading
    if (loading) {
        return <PlayerLoadingMessage videoId={videoId} />;
    }

    return (
        <div className="min-h-screen bg-gray-100 pt-16 pb-24">
            {/* App Header */}
            <AppHeader variant="player" />

            {/* 2カラムレイアウト */}
            <div className="flex max-w-[1920px] mx-auto">
                {/* 左カラム: メインコンテンツ */}
                <div className="flex-1 bg-white shadow-lg">
                    {/* プレイヤーコンテナ */}
                <div
                    className="relative"
                    ref={playerContainerRef}
                >
                    {platform === 'youtube' ? (
                        <YouTubePlayer
                            videoId={videoId}
                            className="w-full aspect-video"
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            volume={volume}
                            onTogglePlayPause={togglePlayPause}
                            onSeek={seek}
                            onVolumeChange={handleVolumeChange}
                            onToggleFullscreen={toggleFullscreen}
                        />
                    ) : (
                        <NicoPlayer
                            playerRef={playerRef}
                            embedUrl={getEmbedUrl()}
                            onIframeLoad={handleIframeLoad}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            volume={volume}
                            playerError={playerError}
                            onTogglePlayPause={togglePlayPause}
                            onSeek={seek}
                            onVolumeChange={handleVolumeChange}
                            onToggleFullscreen={toggleFullscreen}
                            onErrorDismiss={clearError}
                        />
                    )}
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400">
                        <div className="flex">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">データの読み込みエラー</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg mx-4">
                        {error}
                    </div>
                )}

                {/* Refetch中のインジケーター */}
                {isRefetching && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-blue-700">データを同期中...</span>
                        </div>
                    </div>
                )}

                {/* 保存失敗時のエラーバナー */}
                {saveFailed && saveError && (
                    <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-red-900 mb-1">保存に失敗しました</h4>
                                    <p className="text-xs text-red-800 mb-2">{saveError}</p>
                                    <p className="text-xs text-red-700">✅ 編集内容は保持されています。もう一度保存を試すか、編集を続けることができます。</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        logger.info('🔄 User requested save retry');
                                        const title = medleyTitle || videoMetadataRef.current?.title || `${videoId} メドレー`;
                                        const creator = medleyCreator || videoMetadataRef.current?.creator || '匿名ユーザー';
                                        const success = await saveMedley(videoId, title, creator, medleyDuration || duration || 0, nickname || undefined);
                                        if (success) {
                                            await refetch();
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                                >
                                    再試行
                                </button>
                                <button
                                    onClick={() => {
                                        logger.info('🔕 User dismissed save error banner');
                                        resetSaveError();
                                    }}
                                    className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors text-sm"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 楽曲リスト（統合コントロール付き） */}
                {!loading && displaySongs.length > 0 && (
                    <SongListGrouped
                        key={`songs-${displaySongs.length}-${displaySongs.map(s => s.id).join('-')}`}
                        songs={displaySongs}
                        currentTime={currentTime}
                        duration={effectiveDuration}
                        actualPlayerDuration={duration}
                        currentSongs={getCurrentSongs()}
                        onTimelineClick={handleTimelineClick}
                        onSeek={seek}
                        onDeleteSong={deleteSong}
                        onTogglePlayPause={togglePlayPause}
                        isPlaying={isPlaying}
                        selectedSong={selectedSong}
                        onSelectSong={setSelectedSong}
                        onSongHover={(song: SongSection, element: HTMLElement) => {
                            const rect = element.getBoundingClientRect();
                            handleHoverSong(song, {
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10
                            });
                        }}
                        onSongHoverEnd={() => handleHoverSong(null, { x: 0, y: 0 })}
                        medleyTitle="" // MedleyHeaderで表示するため空にする
                        medleyCreator="" // MedleyHeaderで表示するため空にする
                        originalVideoUrl=""
                        onAddSong={isAuthenticated ? handleAddNewSong : undefined}
                        onEditSong={isAuthenticated ? handleEditSongClick : undefined}
                    />
                )}


                {/* Edit History Display */}
                {!loading && !error && displaySongs.length > 0 && editHistory.length > 0 && (
                    <div className="p-6">
                        <ContributorsDisplay
                            editHistory={editHistory}
                            lastEditor={medleyData?.lastEditor}
                            lastEditedAt={medleyData?.lastEditedAt}
                            compact={false}
                            isAuthenticated={isAuthenticated}
                            onRestore={handleRestoreRequest}
                        />
                    </div>
                )}

                {/* メドレーデータがない場合の表示 - 新規作成UI */}
                {!loading && !error && medleySongs.length === 0 && editingSongs.length === 0 && (
                    <div className="p-6">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">楽曲タイムラインを作成</h3>
                                <p className="text-sm text-gray-600">
                                    動画の再生に合わせて楽曲情報を追加し、アノテーション付きメドレーを完成させましょう。
                                </p>
                            </div>

                            <div className="space-y-4">
                                    {authLoading ? (
                                        <div className="w-full px-6 py-3 bg-gray-100 rounded-lg">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-sm text-gray-600">読み込み中...</span>
                                            </div>
                                        </div>
                                    ) : isAuthenticated ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    // Open song search modal to add first song
                                                    handleAddNewSong();
                                                }}
                                                className="w-full px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-colors duration-200 font-medium"
                                            >
                                                楽曲を追加して編集開始
                                            </button>
                                            <button
                                                onClick={handleFetchDescriptionForImport}
                                                disabled={fetchingDescription}
                                                className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium disabled:opacity-50"
                                            >
                                                {fetchingDescription ? '取得中...' : '説明文からセットリストを取り込む'}
                                            </button>
                                            <p className="text-xs text-gray-500">
                                                編集モードでは、動画の再生時間に楽曲情報を追加できます。
                                                <br />
                                                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">M</kbd> キーで楽曲を追加、
                                                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">S</kbd>/<kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">E</kbd> キーで開始・終了時間を設定
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-blue-900 mb-1">編集するにはログインが必要です</h4>
                                                        <p className="text-xs text-blue-800">
                                                            メドレーの作成・編集機能を利用するには、ログインしてください。
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setLoginModalOpen(true)}
                                                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors duration-200 font-medium"
                                            >
                                                ログイン
                                            </button>
                                        </>
                                    )}
                                    
                                    {/* 空のタイムライン表示 */}
                                    {false && (
                                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                            <div className="text-center text-gray-500 mb-4">
                                                <p className="text-sm font-medium">楽曲タイムライン</p>
                                                <p className="text-xs">動画の再生に合わせて楽曲情報を追加してください</p>
                                            </div>
                                            
                                            {/* 簡易タイムライン表示 */}
                                            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                                                    動画時間: {Math.floor(effectiveDuration / 60)}:{String(Math.floor(effectiveDuration % 60)).padStart(2, '0')}
                                                </div>
                                                {/* 現在再生位置の表示 */}
                                                {effectiveDuration > 0 && (
                                                    <div
                                                        className="absolute top-0 bottom-0 w-1 bg-orange-500"
                                                        style={{
                                                            left: `${(currentTime / effectiveDuration) * 100}%`
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            
                                            <div className="mt-4 text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddNewSong}
                                                >
                                                    楽曲データベースから選択
                                                </Button>
                                            </div>
                                            
                                            {/* 楽曲が追加された場合の保存機能 */}
                                            {editingSongs.length > 0 && (
                                                <div className="mt-6 pt-4 border-t border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-sm text-gray-700 mb-4">
                                                            {editingSongs.length}曲の楽曲が追加されました。
                                                            <br />
                                                            メドレーデータを保存しますか？
                                                        </p>
                                                        <button
                                                            onClick={async () => {
                                                                // メタデータが取得できている場合はそれを使用、なければデフォルト値
                                                                const title = videoMetadata?.title || `${videoId} メドレー`;
                                                                const creator = videoMetadata?.creator || '匿名ユーザー';
                                                                
                                                                logger.debug('💾 Saving new medley:', { videoId, title, creator, songCount: editingSongs.length, editor: nickname });
                                                                const success = await saveMedley(videoId, title, creator, effectiveDuration, nickname || undefined);

                                                                if (success) {
                                                                    alert('メドレーを保存しました！ページを再読み込みして通常の表示に切り替えます。');
                                                                    window.location.reload();
                                                                } else {
                                                                    alert('メドレーの保存に失敗しました。しばらく時間をおいて再度お試しください。');
                                                                }
                                                            }}
                                                            disabled={isSaving}
                                                            className={`px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-colors duration-200 font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isSaving ? '保存中...' : 'メドレーを保存'}
                                                        </button>
                                                        
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            保存後はページが再読み込みされ、通常のタイムライン表示に変わります
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                        </div>
                    </div>
                )}

                </div>
                {/* 左カラム終了 */}

                {/* 右カラム: サイドバー（デスクトップ用） */}
                <div className="hidden lg:block">
                    <RightSidebar
                        currentTime={currentTime}
                        songs={displaySongs}
                        isVisible={playerReady && !editModalOpen}
                        onEditSong={handleEditSongClick}
                        isAuthenticated={isAuthenticated}
                    />
                </div>
            </div>
            {/* 2カラムレイアウト終了 */}

            {/* 楽曲編集モーダル */}
            <SongEditModal
                isOpen={editModalOpen}
                onClose={() => {
                    logger.info('🚪 Modal closing - resetting flags');
                    setEditModalOpen(false);
                    setSelectedDatabaseSong(null);
                    setContinuousInputMode(false); // モーダルを閉じる時は連続モードもリセット
                    setIsChangingSong(false); // 楽曲変更モードもリセット
                    isAutoSavedRef.current = false; // 自動保存フラグもリセット（同期的）
                    logger.info('✅ Reset isAutoSavedRef.current = false');
                }}
                song={editingSong}
                onSave={handleSaveSong}
                onDelete={deleteSong}
                isNew={isNewSong}
                maxDuration={effectiveDuration}
                currentTime={currentTime}
                isFromDatabase={selectedDatabaseSong !== null}
                // 楽曲変更用
                onChangeSong={handleChangeSong}
                isChangingSong={isChangingSong}
                // 連続入力モード用
                continuousMode={continuousInputMode}
                onSaveAndNext={handleSaveAndNext}
                onToggleContinuousMode={handleToggleContinuousMode}
                // プレビュー再生用
                onSeek={seek}
                isPlaying={isPlaying}
                onTogglePlayPause={togglePlayPause}
                // 隣接する楽曲との時刻合わせ用
                {...(editingSong && !isNewSong ? findAdjacentSongs(editingSong) : {})}
                // 重複処理用
                allSongs={displaySongs}
                onBatchUpdate={handleBatchUpdate}
            />

            {/* 楽曲検索モーダル */}
            <SongSearchModal
                isOpen={songSearchModalOpen}
                onClose={() => {
                    setSongSearchModalOpen(false);
                    setIsChangingSong(false); // 楽曲変更モードをリセット
                }}
                onSelectSong={handleSelectSongFromDatabase}
                onManualAdd={handleManualAddSong}
                onEditSong={handleEditSongFromDatabase}
                videoId={videoId}
                medleyTitle={medleyTitle}
                medleyCreator={medleyCreator}
                medleyDuration={medleyDuration}
            />


            {/* 手動楽曲追加モーダル */}
            <ManualSongAddModal
                isOpen={manualAddModalOpen}
                onClose={() => setManualAddModalOpen(false)}
                onSave={handleManualSongSave}
                existingSongs={displaySongs}
                onUseSimilarSong={handleUseSimilarSong}
            />

            {/* セットリストインポートモーダル */}
            <ImportSetlistModal
                isOpen={importSetlistModalOpen}
                onClose={() => setImportSetlistModalOpen(false)}
                onImport={handleImportSetlistSongs}
                prefillText={importSetlistPrefillText}
            />

            
            {/* 楽曲詳細ツールチップ */}
            <SongDetailTooltip
                song={tooltipSong}
                isVisible={isTooltipVisible}
                position={tooltipPosition}
                onSeek={seek}
                onEdit={isAuthenticated ? handleEditFromTooltip : undefined}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
            />

            {/* 現在再生中の楽曲ポップアップ（モバイル用） */}
            <div className="lg:hidden">
                {(() => {
                    // Runtime component detection for production debugging
                    const isVisibleCondition = playerReady && !editModalOpen;

                    // Enhanced production logging (using logger only)
                    logger.debug('🔥 MedleyPlayer: Rendering ActiveSongPopup', {
                        playerReady,
                        editModalOpen,
                        songSearchModalOpen,
                        manualAddModalOpen,
                        isVisible: isVisibleCondition,
                        currentTime,
                        songsCount: displaySongs.length
                    });

                    // Ensure component exists before rendering
                    if (!ActiveSongPopup) {
                        logger.error('🚨 CRITICAL: ActiveSongPopup component is undefined!');
                        return <div style={{
                            position: 'fixed',
                            top: '6rem',
                            right: '1rem',
                            zIndex: 1000,
                            background: 'red',
                            color: 'white',
                            padding: '1rem'
                        }}>
                            ERROR: ActiveSongPopup not loaded
                        </div>;
                    }

                    return (
                        <ActiveSongPopup
                            currentTime={currentTime}
                            songs={displaySongs}
                            isVisible={isVisibleCondition}
                            playerContainerRef={playerContainerRef}
                        />
                    );
                })()}
            </div>

            {/* デバッグパネル */}
            <ActiveSongDebugPanel
                currentTime={currentTime}
                songs={displaySongs}
                isVisible={playerReady && !editModalOpen}
                playerReady={playerReady}
                editModalOpen={editModalOpen}
                songSearchModalOpen={songSearchModalOpen}
                manualAddModalOpen={manualAddModalOpen}
                activeSongs={displaySongs.filter(song =>
                    currentTime >= song.startTime && currentTime < song.endTime + 0.1
                )}
            />

            {/* ログインモーダル */}
            <LoginModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={() => {
                    logger.info('✅ Login successful, enabling edit mode');
                    setLoginModalOpen(false);
                }}
            />

            {/* 復元確認モーダル */}
            <RestoreConfirmModal
                isOpen={restoreModalOpen}
                onClose={() => {
                    setRestoreModalOpen(false);
                    setRestoringEditHistoryId(null);
                    setRestoreSnapshot(null);
                    setRestoreCreatedAt(null);
                }}
                onConfirm={handleRestoreConfirm}
                snapshot={restoreSnapshot}
                currentSongCount={displaySongs.length}
                restoredAt={restoreCreatedAt}
                isLoading={isRestoring}
            />

            {/* 下部固定プレイヤーバー */}
            <FixedPlayerBar
                title={medleyTitle || videoMetadata?.title}
                creator={medleyCreator || videoMetadata?.creator}
                originalVideoUrl={generateOriginalVideoUrl()}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={effectiveDuration}
                onTogglePlayPause={togglePlayPause}
                onSeek={seek}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                onToggleFullscreen={toggleFullscreen}
            />
        </div>
    );
}
