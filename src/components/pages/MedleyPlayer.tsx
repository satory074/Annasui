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
import ShareButtons from "@/components/features/share/ShareButtons";
import { SongSection } from "@/types";

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
    
    // 楽曲詳細モーダル関連の状態
    const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
    const [detailSong, setDetailSong] = useState<SongSection | null>(null);

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
        playerError,
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
    
    // durationを決定（プレイヤーから取得できない場合は静的データを使用）
    const effectiveDuration = duration > 0 ? duration : medleyDuration;
    
    // シーク機能をプラットフォーム別に実装
    const seek = (seekTime: number) => {
        if (platform === 'youtube') {
            // YouTube用のシーク実装（将来的にYouTube APIを使用）
            console.log('YouTube seek not implemented yet:', seekTime);
        } else {
            nicoSeek(seekTime);
        }
    };

    // 初期時間へのシーク（ディープリンク対応）
    useEffect(() => {
        if (initialTime > 0 && effectiveDuration > 0 && initialTime <= effectiveDuration) {
            // プレイヤーが準備完了してから少し待ってシーク
            const timer = setTimeout(() => {
                seek(initialTime);
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTime, effectiveDuration]);

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

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                {/* ヘッダー */}
                <Header
                    inputVideoId={inputVideoId}
                    onInputVideoIdChange={setInputVideoId}
                    onVideoIdSubmit={handleVideoIdSubmit}
                    medleyTitle={medleyTitle}
                    medleyCreator={medleyCreator}
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
                            playerError={playerError}
                            onTogglePlayPause={togglePlayPause}
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

                {/* 共有ボタン */}
                {!loading && displaySongs.length > 0 && (
                    <ShareButtons 
                        url={generateShareUrl()}
                        title={`${medleyTitle} | ニコニコメドレーアノテーションプレイヤー`}
                        currentTime={currentTime}
                        currentSong={currentSong || undefined}
                    />
                )}

                {/* 編集コントロールバー */}
                {!loading && displaySongs.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleToggleEditMode}
                                    className={`px-4 py-2 rounded-md font-medium ${
                                        isEditMode
                                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    {isEditMode ? '編集モード終了' : '編集モード'}
                                </button>
                                
                                {isEditMode && (
                                    <>
                                        <button
                                            onClick={handleAddSong}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                                        >
                                            楽曲追加
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={undo}
                                                disabled={!canUndo}
                                                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="元に戻す (Ctrl+Z)"
                                            >
                                                ↶
                                            </button>
                                            <button
                                                onClick={redo}
                                                disabled={!canRedo}
                                                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="やり直し (Ctrl+Y)"
                                            >
                                                ↷
                                            </button>
                                        </div>
                                        {hasChanges && (
                                            <span className="text-sm text-orange-600 dark:text-orange-400">
                                                未保存の変更があります
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            {isEditMode && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => resetChanges(medleySongs)}
                                        disabled={!hasChanges}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        リセット
                                    </button>
                                    <button
                                        onClick={handleSaveChanges}
                                        disabled={!hasChanges || isSaving}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {isSaving ? '保存中...' : '変更を保存'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 楽曲リスト */}
                {!loading && displaySongs.length > 0 && (
                    <SongList
                        songs={displaySongs}
                        currentTime={currentTime}
                        duration={effectiveDuration}
                        onSeek={seek}
                        isEditMode={isEditMode}
                        onEditSong={handleEditSong}
                        onDeleteSong={deleteSong}
                        onUpdateSong={updateSong}
                        onShowSongDetail={handleShowSongDetail}
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
                onClose={() => setEditModalOpen(false)}
                song={editingSong}
                onSave={handleSaveSong}
                onDelete={deleteSong}
                isNew={isNewSong}
                maxDuration={effectiveDuration}
                currentTime={currentTime}
            />

            {/* 楽曲詳細モーダル */}
            <SongDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                song={detailSong}
                onSeek={seek}
            />
        </div>
    );
}