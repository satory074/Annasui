"use client";

import { useState, useEffect } from "react";
import { useMedleyData } from "@/hooks/useMedleyData";
import { useCurrentTrack } from "@/hooks/useCurrentTrack";
import { useMedleyEdit } from "@/hooks/useMedleyEdit";
import Header from "@/components/layout/Header";
import NicoPlayer from "@/components/features/player/NicoPlayer";
import YouTubePlayer from "@/components/features/player/YouTubePlayer";
import { useNicoPlayer } from "@/hooks/useNicoPlayer";
import SongList from "@/components/features/medley/SongList";
import SongEditModal from "@/components/features/medley/SongEditModal";
import SongDetailModal from "@/components/features/medley/SongDetailModal";
import SongDetailTooltip from "@/components/features/medley/SongDetailTooltip";
import SongSearchModal from "@/components/features/medley/SongSearchModal";
import { SongSection } from "@/types";
import { SongDatabaseEntry, createSongFromDatabase } from "@/lib/utils/songDatabase";

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
    
    // 編集モード関連の状態
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [editingSong, setEditingSong] = useState<SongSection | null>(null);
    const [isNewSong, setIsNewSong] = useState<boolean>(false);
    
    // 楽曲検索モーダル関連の状態
    const [songSearchModalOpen, setSongSearchModalOpen] = useState<boolean>(false);
    const [selectedDatabaseSong, setSelectedDatabaseSong] = useState<SongDatabaseEntry | null>(null);
    
    // 楽曲詳細モーダル関連の状態
    const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
    const [detailSong, setDetailSong] = useState<SongSection | null>(null);
    
    // ツールチップ関連の状態
    const [tooltipSong, setTooltipSong] = useState<SongSection | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);
    const [isHoveringTooltip, setIsHoveringTooltip] = useState<boolean>(false);
    const [isHoveringSong, setIsHoveringSong] = useState<boolean>(false);
    const [hideTooltipTimeout, setHideTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

    // メドレーデータの取得
    const { medleySongs, medleyTitle, medleyCreator, medleyDuration, loading, error } = useMedleyData(videoId);
    
    // 編集機能
    const {
        editingSongs,
        hasChanges,
        isSaving,
        canUndo,
        canRedo,
        updateSong,
        addSong,
        deleteSong,
        saveMedley,
        resetChanges,
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
        onDurationChange: () => {
            // 動画の長さはuseNicoPlayerが自動処理
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
            console.log('YouTube seek not implemented yet:', seekTime);
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
                console.log(`Initial time seek to ${initialTime} seconds`);
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
        const handleDocumentClick = () => {
            if (isTooltipVisible) {
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
    const { currentSong } = useCurrentTrack(currentTime, displaySongs);

    // 編集機能のハンドラ
    const handleEditSong = (song: SongSection) => {
        setEditingSong(song);
        setIsNewSong(false);
        setEditModalOpen(true);
    };

    const handleAddSong = () => {
        setSelectedDatabaseSong(null);
        setSongSearchModalOpen(true);
    };
    
    // 楽曲DB検索モーダルのハンドラ
    const handleSelectSongFromDatabase = (dbSong: SongDatabaseEntry) => {
        setSongSearchModalOpen(false);
        setSelectedDatabaseSong(dbSong);
        
        // 楽曲DBから基本情報を取得して編集モーダルを開く
        const songTemplate = createSongFromDatabase(dbSong, 0, 0);
        setEditingSong({
            id: Date.now(), // 一時的なID
            ...songTemplate
        });
        setIsNewSong(true);
        setEditModalOpen(true);
    };
    
    const handleManualAddSong = () => {
        setSongSearchModalOpen(false);
        setSelectedDatabaseSong(null);
        setEditingSong(null);
        setIsNewSong(true);
        setEditModalOpen(true);
    };

    const handleSaveSong = (song: SongSection) => {
        if (isNewSong) {
            addSong(song);
        } else {
            updateSong(song);
        }
    };

    const handleShowSongDetail = (song: SongSection) => {
        setDetailSong(song);
        setDetailModalOpen(true);
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

    const handleToggleEditMode = () => {
        if (isEditMode && hasChanges) {
            if (confirm("未保存の変更があります。編集モードを終了しますか？")) {
                resetChanges(medleySongs);
                setIsEditMode(false);
            }
        } else {
            setIsEditMode(!isEditMode);
        }
    };

    const handleSaveChanges = async () => {
        const success = await saveMedley(videoId, medleyTitle, medleyCreator, effectiveDuration);
        if (success) {
            alert("変更を保存しました。");
            setIsEditMode(false);
        }
    };

    // 動画IDが変更されたときの処理
    const handleVideoIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.info("Loading video:", inputVideoId);
        
        // URLを更新（ブラウザの履歴に追加）
        const newUrl = inputVideoId === "sm500873" ? "/" : `/${inputVideoId}`;
        window.history.pushState(null, "", newUrl);
        
        setVideoId(inputVideoId);
        // ニコニコプレイヤーが状態をリセット
    };

    // 曲の開始時間へジャンプボタンの処理
    const jumpToSong = (songId: number) => {
        const song = displaySongs.find((s) => s.id === songId);
        if (song) {
            seek(song.startTime);
        }
    };

    // 共有URL生成
    const generateShareUrl = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const path = `/${platform}/${videoId}`;
        const timeParam = currentTime > 0 ? `?t=${Math.floor(currentTime)}` : '';
        return `${baseUrl}${path}${timeParam}`;
    };

    // 元動画URL生成
    const generateOriginalVideoUrl = () => {
        if (platform === 'youtube') {
            return `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return `https://www.nicovideo.jp/watch/${videoId}`;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg">
                {/* ヘッダー */}
                <Header
                    inputVideoId={inputVideoId}
                    onInputVideoIdChange={setInputVideoId}
                    onVideoIdSubmit={handleVideoIdSubmit}
                    showSearch={false}
                />

                {/* プレイヤーコンテナ */}
                <div className="relative">
                    {platform === 'youtube' ? (
                        <YouTubePlayer
                            videoId={videoId}
                            className="w-full aspect-video"
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

                {/* データロード状態とエラー表示 */}
                {loading && (
                    <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        メドレーデータを読み込み中...
                    </div>
                )}

                {error && (
                    <div className="p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mx-4">
                        {error}
                    </div>
                )}


                {/* 楽曲リスト（統合コントロール付き） */}
                {!loading && displaySongs.length > 0 && (
                    <SongList
                        songs={displaySongs}
                        currentTime={currentTime}
                        duration={effectiveDuration}
                        isEditMode={isEditMode}
                        onEditSong={handleEditSong}
                        onDeleteSong={deleteSong}
                        onUpdateSong={updateSong}
                        onShowSongDetail={handleShowSongDetail}
                        onHoverSong={handleHoverSong}
                        // 統合されたコントロール用の props
                        shareUrl={generateShareUrl()}
                        shareTitle={`${medleyTitle} | ニコニコメドレーアノテーションプレイヤー`}
                        originalVideoUrl={generateOriginalVideoUrl()}
                        onToggleEditMode={handleToggleEditMode}
                        onAddSong={handleAddSong}
                        onSaveChanges={handleSaveChanges}
                        onResetChanges={() => resetChanges(medleySongs)}
                        hasChanges={hasChanges}
                        isSaving={isSaving}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={undo}
                        onRedo={redo}
                        currentSong={currentSong || undefined}
                        // メドレー情報
                        medleyTitle={medleyTitle}
                        medleyCreator={medleyCreator}
                    />
                )}

                {/* メドレーデータがない場合の表示 */}
                {!loading && !error && medleySongs.length === 0 && (
                    <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                        <p className="text-lg mb-2">メドレーデータが見つかりません</p>
                        <p className="text-sm">動画ID「{videoId}」のアノテーションデータが登録されていません。</p>
                    </div>
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

            {/* 楽曲編集モーダル */}
            <SongEditModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setSelectedDatabaseSong(null);
                }}
                song={editingSong}
                onSave={handleSaveSong}
                onDelete={deleteSong}
                isNew={isNewSong}
                maxDuration={effectiveDuration}
                currentTime={currentTime}
                isFromDatabase={selectedDatabaseSong !== null}
            />

            {/* 楽曲検索モーダル */}
            <SongSearchModal
                isOpen={songSearchModalOpen}
                onClose={() => setSongSearchModalOpen(false)}
                onSelectSong={handleSelectSongFromDatabase}
                onManualAdd={handleManualAddSong}
            />

            {/* 楽曲詳細モーダル */}
            <SongDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                song={detailSong}
                onSeek={seek}
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
        </div>
    );
}