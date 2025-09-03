"use client";

import { useState, useEffect, useRef } from "react";
import { useMedleyData } from "@/hooks/useMedleyData";
import { useCurrentTrack } from "@/hooks/useCurrentTrack";
import { useMedleyEdit } from "@/hooks/useMedleyEdit";
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
import { SongSection } from "@/types";
import { SongDatabaseEntry, createSongFromDatabase, addManualSong } from "@/lib/utils/songDatabase";
import { logger } from "@/lib/utils/logger";
import { PlayerLoadingMessage } from "@/components/ui/loading/PlayerSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import AuthorizationBanner from "@/components/ui/AuthorizationBanner";
import { ActiveSongPopup } from "@/components/ui/song/ActiveSongPopup";
import { ActiveSongDebugPanel } from "@/components/ui/debug/ActiveSongDebugPanel";

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
    const { user, isApproved } = useAuth();
    
    // 認証・承認状態のデバッグログ（プロダクション環境での問題調査用）
    logger.info('🔐 MedleyPlayer: Auth state', {
        user: user ? {
            id: user.id,
            email: user.email
        } : null,
        isApproved,
        hasEditPermission: !!(user && isApproved)
    });
    
    const [videoId, setVideoId] = useState<string>(initialVideoId);
    const [inputVideoId, setInputVideoId] = useState<string>(initialVideoId);
    
    // Debouncing for duration warning messages
    const lastWarningTime = useRef<number>(0);
    const lastWarningVideoId = useRef<string>('');
    
    // 編集モード関連の状態
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
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

    // 楽曲選択とツールチップ関連の状態
    const [selectedSong, setSelectedSong] = useState<SongSection | null>(null);
    // ツールチップ関連の状態
    const [tooltipSong, setTooltipSong] = useState<SongSection | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);
    
    const [isHoveringTooltip, setIsHoveringTooltip] = useState<boolean>(false);
    const [isHoveringSong, setIsHoveringSong] = useState<boolean>(false);
    const [hideTooltipTimeout, setHideTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

    // 仮アノテーション作成用の状態
    const [tempStartTime, setTempStartTime] = useState<number | null>(null);
    const [untitledSongCounter, setUntitledSongCounter] = useState<number>(1);

    // メドレーデータの取得
    const { medleySongs, medleyTitle, medleyCreator, medleyDuration, medleyData, loading, error } = useMedleyData(videoId);
    
    // 編集機能
    const {
        editingSongs,
        hasChanges,
        isSaving,
        updateSong,
        addSong,
        deleteSong,
        saveMedley,
        resetChanges,
        batchUpdate,
        undo,
        redo
    } = useMedleyEdit(medleySongs);
    
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
            if (isEditMode && (e.ctrlKey || e.metaKey)) {
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
    }, [isEditMode, undo, redo]);

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
    const displaySongs = isEditMode ? editingSongs : medleySongs;
    
    // Debug logging for displaySongs changes
    useEffect(() => {
        logger.debug('🔄 MedleyPlayer: displaySongs changed', {
            isEditMode,
            songsCount: displaySongs.length,
            songsInfo: displaySongs.map(s => ({ id: s.id, title: s.title, start: s.startTime, end: s.endTime }))
        });
    }, [displaySongs, isEditMode]);
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
    const handleEditSong = (song: SongSection) => {
        setEditingSong(song);
        setIsNewSong(false);
        setEditModalOpen(true);
    };

    
    // 楽曲DB検索モーダルのハンドラ
    const handleSelectSongFromDatabase = (dbSong: SongDatabaseEntry) => {
        setSongSearchModalOpen(false);
        setSelectedDatabaseSong(dbSong);
        
        // 楽曲DBから基本情報を取得
        const songTemplate = createSongFromDatabase(dbSong, 0, 0);
        
        if (isChangingSong && editModalOpen && editingSong) {
            // 楽曲変更モードの場合は、時間情報を保持したまま楽曲情報を更新
            setEditingSong({
                ...editingSong,
                title: songTemplate.title,
                artist: songTemplate.artist,
                originalLink: songTemplate.originalLink,
                links: songTemplate.links
            });
            setIsChangingSong(false);
        } else if (editModalOpen && editingSong) {
            // 編集モーダルが既に開いている場合は、現在の楽曲情報を更新
            setEditingSong({
                ...editingSong,
                title: songTemplate.title,
                artist: songTemplate.artist,
                originalLink: songTemplate.originalLink
            });
        } else {
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
    const handleManualSongSave = async (songData: { title: string; artist: string; originalLink?: string }) => {
        try {
            // 楽曲をデータベースに追加
            const addedSong = await addManualSong(songData);
            
            // 楽曲検索モーダルを開き直して、追加された楽曲を検索可能にする
            setManualAddModalOpen(false);
            setSongSearchModalOpen(true);
            
            // 成功メッセージ（オプション）
            logger.info(`楽曲「${addedSong.title}」を楽曲データベースに追加しました`);
        } catch (error) {
            logger.error('楽曲の追加に失敗しました:', error);
        }
    };


    // 楽曲変更の開始
    const handleChangeSong = () => {
        setIsChangingSong(true);
        setSongSearchModalOpen(true);
    };

    // 楽曲検索モーダルから楽曲を編集
    const handleEditSongFromDatabase = (updatedSong: SongDatabaseEntry) => {
        // 現在編集中の楽曲を更新された情報に変更
        if (editingSong) {
            const updatedSongSection: SongSection = {
                ...editingSong,
                title: updatedSong.title,
                artist: updatedSong.artist,
                originalLink: updatedSong.originalLink || "",
                links: updatedSong.links
            };
            setEditingSong(updatedSongSection);
        }
        
        // Todo: 実際のデータベース更新ロジックも必要に応じて実装
        logger.debug('楽曲情報を更新:', updatedSong);
    };

    const handleSaveSong = (song: SongSection) => {
        if (isNewSong) {
            addSong(song);
        } else {
            updateSong(song);
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
            artist: "",
            startTime: Math.round(nextStartTime * 10) / 10,
            endTime: Math.round((nextStartTime + 30) * 10) / 10, // デフォルト30秒
            color: "bg-blue-400",
                originalLink: ""
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
            const currentArtist = editingSong.artist.trim();
            const existingInstances = displaySongs.filter(song => 
                song.title.trim() === currentTitle && song.artist.trim() === currentArtist
            );

            // 削除するIDリストと追加する楽曲リストを準備
            const idsToRemove = existingInstances.map(instance => instance.id);
            const songsToAdd = updatedSongs.map(song => ({
                title: song.title,
                artist: song.artist,
                startTime: song.startTime,
                endTime: song.endTime,
                color: song.color,
                originalLink: song.originalLink,
                links: song.links
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
            const timeout = setTimeout(() => {
                if (!isHoveringTooltip && !isHoveringSong) {
                    setIsTooltipVisible(false);
                    setTooltipSong(null);
                }
            }, 200); // 200ms の遅延
            
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
            if (!isHoveringTooltip && !isHoveringSong) {
                setIsTooltipVisible(false);
                setTooltipSong(null);
            }
        }, 200); // 200ms の遅延
        
        setHideTooltipTimeout(timeout);
    };


    const handleSaveChanges = async () => {
        const success = await saveMedley(videoId, medleyTitle, medleyCreator, effectiveDuration);
        if (success) {
            alert("変更を保存しました。");
            setIsEditMode(false);
        }
    };

    const handleToggleEditMode = () => {
        if (!user || !isApproved) {
            return; // Only approved users can toggle edit mode
        }
        setIsEditMode(!isEditMode);
    };

    const handleAddSongFromTempBar = (startTime: number, endTime: number) => {
        if (!user || !isApproved) {
            return; // Only approved users can add songs
        }
        
        logger.debug('🎵 Creating song from temporary timeline bar', { startTime, endTime });
        
        // Create a new song with placeholder data
        const newSong: SongSection = {
            id: Date.now(), // Temporary ID
            title: `空の楽曲 ${untitledSongCounter}`,
            artist: 'アーティスト未設定',
            startTime: Math.round(startTime * 10) / 10,
            endTime: Math.round(endTime * 10) / 10,
            color: '#9333ea', // Purple color to match the temporary bar
            originalLink: undefined
        };
        
        // Add the song to the medley
        addSong(newSong);
        
        // Increment counter for next untitled song
        setUntitledSongCounter(prev => prev + 1);
        
        // Do not open edit modal - allow continuous addition of empty songs
    };



    // ホットキー機能のハンドラー
    const handleQuickSetStartTime = (time: number) => {
        if (editingSong) {
            // 編集中の楽曲がある場合は、開始時刻を更新
            const updatedSong = {
                ...editingSong,
                startTime: Math.round(time * 10) / 10 // 0.1秒精度に丸める
            };
            updateSong(updatedSong);
            setEditingSong(updatedSong);
        } else {
            // 編集中の楽曲がない場合は、開始時刻を一時保存
            const roundedTime = Math.round(time * 10) / 10;
            setTempStartTime(roundedTime);
            logger.debug(`開始時刻を設定: ${roundedTime}秒 (Eキーで終了時刻を設定してアノテーションを作成)`);
        }
    };

    const handleQuickSetEndTime = (time: number) => {
        if (editingSong) {
            // 編集中の楽曲がある場合は、終了時刻を更新
            const updatedSong = {
                ...editingSong,
                endTime: Math.max(editingSong.startTime + 0.1, Math.round(time * 10) / 10)
            };
            updateSong(updatedSong);
            setEditingSong(updatedSong);
        } else if (tempStartTime !== null) {
            // tempStartTimeが設定されている場合は、仮アノテーションを自動作成
            const roundedEndTime = Math.round(time * 10) / 10;
            const roundedStartTime = tempStartTime;
            
            // 終了時刻が開始時刻より前の場合は調整
            const finalEndTime = Math.max(roundedStartTime + 0.1, roundedEndTime);
            
            const newSong: SongSection = {
                id: Date.now(),
                title: `未設定の楽曲 ${untitledSongCounter}`,
                artist: "アーティスト未設定",
                startTime: roundedStartTime,
                endTime: finalEndTime,
                color: "bg-gray-400",
                        originalLink: ""
            };
            
            // 楽曲を追加
            addSong(newSong);
            logger.debug(`仮アノテーションを作成: ${roundedStartTime}秒〜${finalEndTime}秒 "${newSong.title}"`);
            
            // 状態をリセット
            setTempStartTime(null);
            setUntitledSongCounter(prev => prev + 1);
        } else {
            // tempStartTimeが設定されていない場合は、前の楽曲の終了時刻から開始
            const previousSongEndTime = displaySongs.length > 0 
                ? Math.max(...displaySongs.map(s => s.endTime))
                : 0;
            const newSong: SongSection = {
                id: Date.now(),
                title: "新しい楽曲",
                artist: "",
                startTime: Math.round(previousSongEndTime * 10) / 10,
                endTime: Math.round(time * 10) / 10,
                color: "bg-blue-400",
                        originalLink: ""
            };
            setEditingSong(newSong);
            setIsNewSong(true);
            setEditModalOpen(true);
        }
    };

    const handleQuickAddMarker = (time: number) => {
        logger.debug('🚀 handleQuickAddMarker called with time:', time);
        // 現在時刻に空の楽曲を直接追加（編集モーダルを開かない）
        const newSong: SongSection = {
            id: Date.now(),
            title: `空の楽曲 ${untitledSongCounter}`,
            artist: "アーティスト未設定",
            startTime: Math.round(time * 10) / 10,
            endTime: Math.round(time * 10) / 10 + 30, // デフォルト30秒
            color: "#9333ea", // 紫色
            originalLink: ""
        };
        logger.debug('📝 Empty song created and added directly to timeline:', newSong);
        
        // 直接楽曲を追加
        addSong(newSong);
        
        // カウンターをインクリメント
        setUntitledSongCounter(prev => prev + 1);
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
        return <PlayerLoadingMessage />;
    }

    return (
        <div className="min-h-screen bg-gray-100 pt-16">
            {/* App Header */}
            <AppHeader variant="player" />
            
            <div className="max-w-6xl mx-auto bg-white shadow-lg">

                {/* プレイヤーコンテナ */}
                <div className="relative">
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


                {/* Authorization Banner */}
                <div className="p-4">
                    <AuthorizationBanner />
                </div>

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
                        onEditSong={user && isApproved ? handleEditSong : undefined}
                        onDeleteSong={user && isApproved ? deleteSong : undefined}
                        onTogglePlayPause={togglePlayPause}
                        isPlaying={isPlaying}
                        isEditMode={user && isApproved ? isEditMode : false}
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
                        onSaveChanges={user && isApproved ? handleSaveChanges : undefined}
                        onResetChanges={user && isApproved ? () => resetChanges(medleySongs) : undefined}
                        hasChanges={hasChanges}
                        isSaving={isSaving}
                        onQuickSetStartTime={user && isApproved ? handleQuickSetStartTime : undefined}
                        onQuickSetEndTime={user && isApproved ? handleQuickSetEndTime : undefined}
                        onQuickAddMarker={user && isApproved ? handleQuickAddMarker : undefined}
                        tempStartTime={tempStartTime}
                        medleyTitle={medleyTitle}
                        medleyCreator={medleyCreator}
                        originalVideoUrl={generateOriginalVideoUrl()}
                        onToggleEditMode={user && isApproved ? handleToggleEditMode : undefined}
                        canUndo={editingSongs.length > 0}
                        canRedo={false}
                        onUndo={undo}
                        onRedo={redo}
                        onAddSongFromTempBar={user && isApproved ? handleAddSongFromTempBar : undefined}
                    />
                )}

                {/* Contributors Display */}
                {!loading && !error && displaySongs.length > 0 && medleyData?.contributors && (
                    <div className="p-6">
                        <ContributorsDisplay 
                            contributors={medleyData.contributors}
                            lastUpdated={medleyData.updatedAt}
                            compact={false}
                        />
                    </div>
                )}

                {/* メドレーデータがない場合の表示 */}
                {!loading && !error && medleySongs.length === 0 && (
                    <div className="p-8 text-center text-gray-600">
                        <p className="text-lg mb-2">メドレーデータが見つかりません</p>
                        <p className="text-sm">動画ID「{videoId}」のアノテーションデータが登録されていません。</p>
                    </div>
                )}

            </div>

            {/* 楽曲編集モーダル */}
            <SongEditModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setSelectedDatabaseSong(null);
                    setContinuousInputMode(false); // モーダルを閉じる時は連続モードもリセット
                    setIsChangingSong(false); // 楽曲変更モードもリセット
                }}
                song={editingSong}
                onSave={handleSaveSong}
                onDelete={isEditMode ? deleteSong : undefined}
                isNew={isNewSong}
                maxDuration={effectiveDuration}
                currentTime={currentTime}
                isFromDatabase={selectedDatabaseSong !== null}
                // 楽曲変更用
                onChangeSong={handleChangeSong}
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
            />


            {/* 手動楽曲追加モーダル */}
            <ManualSongAddModal
                isOpen={manualAddModalOpen}
                onClose={() => setManualAddModalOpen(false)}
                onSave={handleManualSongSave}
                existingSongs={displaySongs}
            />

            
            {/* 楽曲詳細ツールチップ */}
            <SongDetailTooltip
                song={tooltipSong}
                isVisible={isTooltipVisible}
                position={tooltipPosition}
                onSeek={seek}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
            />

            {/* 現在再生中の楽曲ポップアップ */}
            {(() => {
                // Runtime component detection for production debugging
                const isVisibleCondition = playerReady && !editModalOpen;
                
                // Enhanced production logging
                console.log('🔥 MedleyPlayer: Rendering ActiveSongPopup', {
                    playerReady,
                    editModalOpen,
                    songSearchModalOpen,
                    manualAddModalOpen,
                    isVisible: isVisibleCondition,
                    currentTime,
                    songsCount: displaySongs.length,
                    timestamp: new Date().toISOString(),
                    componentExists: !!ActiveSongPopup,
                    componentName: ActiveSongPopup?.displayName || 'undefined'
                });
                logger.info('🔥 MedleyPlayer: Rendering ActiveSongPopup', {
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
                    console.error('🚨 CRITICAL: ActiveSongPopup component is undefined!');
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
                    />
                );
            })()}

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
        </div>
    );
}