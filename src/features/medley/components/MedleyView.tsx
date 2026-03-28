"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { medleyKeys } from "../queries/keys";
import { fetchMedley, fetchMedleySongs, fetchEditHistory } from "../queries/functions-supabase";
import { useTimelineStore, useTimelineHistory } from "../store";
import { useUIStore } from "../store-ui";
import { usePlayerStore, useCurrentTime, useLiveMode } from "@/features/player/store";
import { useAuth } from "@/features/auth/context";
import { useSaveSongs, useRestoreSnapshot } from "../hooks/useMedleyMutations";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { FixedPlayerBar } from "@/features/player/components/FixedPlayerBar";
import { RightSidebar } from "@/features/player/components/RightSidebar";
import { SongList } from "./SongList";
import { EditHistoryPanel } from "./EditHistoryPanel";
import { LoginModal } from "@/features/auth/components/LoginModal";
import { SongEditModal } from "./SongEditModal";
import { SongSearchModal } from "@/features/song-database/components/SongSearchModal";
import { LiveAnnotationBar } from "./LiveAnnotationBar";
import ImportSetlistModal from "@/components/features/medley/ImportSetlistModal";
import { Button } from "@/components/ui/button";
import { useDraggable } from "@/features/player/hooks/useDraggable";
import type { PlatformType, SongSection } from "../types";
import type { SongSection as LegacySongSection } from "@/types";
import type { SongDatabaseEntry } from "@/lib/utils/songDatabase";

interface MedleyViewProps {
  platform: string;
  videoId: string;
}

export function MedleyView({ platform, videoId }: MedleyViewProps) {
  const { isAuthenticated, nickname, loading: authLoading } = useAuth();
  const currentTime = useCurrentTime();
  const duration = usePlayerStore((s) => s.duration);
  const liveMode = useLiveMode();

  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string>("");

  // Data queries
  const { data: medley } = useQuery({
    queryKey: medleyKeys.detail(videoId),
    queryFn: () => fetchMedley(videoId),
  });

  const { data: songs = [], isLoading: songsLoading } = useQuery({
    queryKey: medleyKeys.songs(videoId),
    queryFn: () => fetchMedleySongs(videoId),
  });

  const { data: editHistory = [] } = useQuery({
    queryKey: medleyKeys.editHistory(medley?.id ?? ""),
    queryFn: () => fetchEditHistory(medley?.id ?? ""),
    enabled: !!medley?.id,
  });

  // Stores
  const timelineSongs = useTimelineStore((s) => s.songs);
  const setSongs = useTimelineStore((s) => s.setSongs);
  const isEditMode = useUIStore((s) => s.isEditMode);
  const setEditMode = useUIStore((s) => s.setEditMode);
  const openModal = useUIStore((s) => s.openModal);
  const modalData = useUIStore((s) => s.modalData);
  const openModalWith = useUIStore((s) => s.openModalWith);
  const closeModal = useUIStore((s) => s.closeModal);
  const videoDisplayMode = useUIStore((s) => s.videoDisplayMode);
  const setVideoDisplayMode = useUIStore((s) => s.setVideoDisplayMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
  const historyCollapsed = useUIStore((s) => s.historyCollapsed);
  const toggleHistoryCollapsed = useUIStore((s) => s.toggleHistoryCollapsed);

  // PiP drag
  const { position: pipPosition, isDragging: isPipDragging, handlePointerDown: handlePipPointerDown, resetPosition: resetPipPosition } = useDraggable();

  // Reset PiP position when leaving PiP mode
  useEffect(() => {
    if (videoDisplayMode !== "pip") {
      resetPipPosition();
    }
  }, [videoDisplayMode, resetPipPosition]);

  const pipStyle = useMemo(() => {
    if (videoDisplayMode !== "pip") return undefined;
    if (pipPosition) {
      return { top: pipPosition.y, left: pipPosition.x, bottom: "auto" as const, right: "auto" as const };
    }
    return { bottom: 64, right: 16 };
  }, [videoDisplayMode, pipPosition]);

  // Undo/Redo
  const { undo, redo } = useTimelineHistory();

  // Mutations
  const saveSongs = useSaveSongs(videoId);
  const restoreSnapshot = useRestoreSnapshot(videoId);

  // Sync query data into timeline store
  useEffect(() => {
    if (songs.length > 0 && !saveSongs.isPending) {
      setSongs(songs);
    }
  }, [songs, setSongs, saveSongs.isPending]);

  // Displayed songs: editing ones in edit mode, server data otherwise
  const displaySongs = isEditMode ? timelineSongs : songs;

  const handleSeek = useCallback((time: number) => {
    usePlayerStore.getState().seek(time);
  }, []);

  const handleEditSong = useCallback(
    (song: SongSection) => {
      if (!isAuthenticated) {
        openModalWith("login");
        return;
      }
      openModalWith("songEdit", { song });
    },
    [isAuthenticated, openModalWith]
  );

  const handleDeleteSong = useCallback(
    (id: string) => {
      if (!isAuthenticated || !nickname) return;
      useTimelineStore.getState().deleteSong(id);
    },
    [isAuthenticated, nickname]
  );

  const handleSave = useCallback(async () => {
    if (!isAuthenticated || !nickname || !medley) return;
    const songsToSave = useTimelineStore.getState().songs.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id, ...rest }) => rest
    );
    await saveSongs.mutateAsync({
      songs: songsToSave,
      editorNickname: nickname,
      medleyMeta: {
        title: medley.title,
        creator: medley.creator,
        duration: medley.duration,
      },
    });
    setEditMode(false);
  }, [isAuthenticated, nickname, medley, saveSongs, setEditMode]);

  const handleRestore = useCallback(
    async (entryId: string) => {
      if (!isAuthenticated || !nickname) return;
      await restoreSnapshot.mutateAsync({
        editHistoryId: entryId,
        editorNickname: nickname,
      });
    },
    [isAuthenticated, nickname, restoreSnapshot]
  );

  const handleToggleEdit = useCallback(() => {
    if (!isAuthenticated) {
      openModalWith("login");
      return;
    }
    setEditMode(!isEditMode);
  }, [isAuthenticated, isEditMode, setEditMode, openModalWith]);

  // Ctrl+Z / Ctrl+Shift+Z undo/redo (edit mode only)
  useEffect(() => {
    if (!isEditMode) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEditMode, undo, redo]);

  // Ctrl+Shift+F / Cmd+Shift+F: toggle focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key !== "F") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      const current = useUIStore.getState().focusMode;
      useUIStore.getState().setFocusMode(!current);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleReorder = useCallback((reorderedSongs: SongSection[]) => {
    useTimelineStore.getState().setSongs(reorderedSongs);
  }, []);

  const handleAddSong = useCallback(() => {
    if (!isAuthenticated) {
      openModalWith("login");
      return;
    }
    openModalWith("songSearch");
  }, [isAuthenticated, openModalWith]);

  const handleOpenImportSetlist = useCallback(() => {
    if (!isAuthenticated) {
      openModalWith("login");
      return;
    }
    openModalWith("importSetlist");
  }, [isAuthenticated, openModalWith]);

  const handleImportSetlist = useCallback(
    (legacySongs: LegacySongSection[]) => {
      const base = useTimelineStore.getState().songs.length;
      legacySongs.forEach((song, index) => {
        useTimelineStore.getState().addSong({
          id: crypto.randomUUID(),
          orderIndex: base + index,
          title: song.title,
          artist: song.artist,
          startTime: song.startTime,
          endTime: song.endTime,
          color: song.color,
          songId: song.songId,
          niconicoLink: song.niconicoLink ?? "",
          youtubeLink: song.youtubeLink ?? "",
          spotifyLink: song.spotifyLink ?? "",
          applemusicLink: song.applemusicLink ?? "",
        });
      });
      closeModal();
    },
    [closeModal]
  );

  const handleFetchDescription = useCallback(async () => {
    if (!isAuthenticated) {
      openModalWith("login");
      return;
    }

    setDescriptionError("");
    setDescriptionLoading(true);

    try {
      const apiPath =
        platform === "youtube"
          ? `/api/metadata/youtube/${videoId}/`
          : `/api/metadata/niconico/${videoId}/`;

      const res = await fetch(apiPath);
      const data = await res.json();

      if (data.success && data.description) {
        openModalWith("importSetlist", { prefillText: data.description });
      } else if (data.success) {
        setDescriptionError("この動画の説明文が見つかりませんでした。");
      } else {
        setDescriptionError(data.error ?? "説明文の取得に失敗しました。");
      }
    } catch {
      setDescriptionError("説明文の取得中にエラーが発生しました。");
    } finally {
      setDescriptionLoading(false);
    }
  }, [isAuthenticated, platform, videoId, openModalWith]);

  const handleToggleLiveMode = useCallback(() => {
    if (!isAuthenticated) {
      openModalWith("login");
      return;
    }
    const current = usePlayerStore.getState().liveMode;
    usePlayerStore.getState().setLiveMode(!current);
  }, [isAuthenticated, openModalWith]);

  const handleSongSearchSelect = useCallback(
    (song: SongDatabaseEntry) => {
      closeModal();
      openModalWith("songEdit", {
        song: null,
        isNew: true,
        prefill: {
          title: song.title,
          artist: song.artist.map((a) => a.name),
          links: {
            niconicoLink: song.niconicoLink ?? undefined,
            youtubeLink: song.youtubeLink ?? undefined,
            spotifyLink: song.spotifyLink ?? undefined,
            applemusicLink: song.applemusicLink ?? undefined,
          },
        },
      });
    },
    [closeModal, openModalWith]
  );

  const handleSongSearchManualAdd = useCallback(() => {
    closeModal();
    openModalWith("songEdit", { song: null, isNew: true });
  }, [closeModal, openModalWith]);

  const handleModalSave = useCallback((song: SongSection) => {
    const { songs: current } = useTimelineStore.getState();
    const exists = current.find((s) => s.id === song.id);
    if (exists) {
      useTimelineStore.getState().updateSong(song.id, song);
    } else {
      useTimelineStore.getState().addSong(song);
    }
    closeModal();
  }, [closeModal]);

  const handleModalDelete = useCallback(
    (id: string) => {
      useTimelineStore.getState().deleteSong(id);
      closeModal();
    },
    [closeModal]
  );

  if (!medley && !songsLoading) {
    return (
      <div className="text-center py-16 text-gray-500">
        メドレーが見つかりません
      </div>
    );
  }

  return (
    <div className="flex max-w-[var(--content-max-w-player)] mx-auto h-[calc(100vh-var(--header-height)-var(--breadcrumb-height))] overflow-hidden">
      {/* Main content */}
      <div className="flex-1 bg-white shadow-lg flex flex-col overflow-hidden relative">
        {/* Video player wrapper — mode-dependent className, single render to avoid iframe remount */}
        <div
          data-draggable-container
          className={
            videoDisplayMode === "pip"
              ? "fixed z-40 w-[320px] h-[180px] rounded-lg shadow-2xl overflow-hidden border border-gray-700"
              : videoDisplayMode === "collapsed"
                ? "sr-only"
                : "shrink-0 relative"
          }
          style={pipStyle}
        >
          <VideoPlayer
            platform={platform as PlatformType}
            videoId={videoId}
            overlay={videoDisplayMode === "pip"}
          />
          {/* Normal mode: overlay controls on top-right of video */}
          {videoDisplayMode === "normal" && (
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 bg-black/40 hover:bg-black/60 text-white"
                onClick={() => setVideoDisplayMode("collapsed")}
                title="動画を折りたたむ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 bg-black/40 hover:bg-black/60 text-white"
                onClick={() => setVideoDisplayMode("pip")}
                title="ピクチャ・イン・ピクチャ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h13.5A2.25 2.25 0 0019 13.75v-7.5A2.25 2.25 0 0016.75 4H3.25zM2.5 6.25a.75.75 0 01.75-.75h13.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H11v-4.25A1.25 1.25 0 009.75 9h-3.5A1.25 1.25 0 005 10.25v4.25H3.25a.75.75 0 01-.75-.75v-7.5z" />
                </svg>
              </Button>
            </div>
          )}
          {/* PiP mode: drag handle + restore and close buttons */}
          {videoDisplayMode === "pip" && (
            <div
              className="absolute top-0 left-0 right-0 h-8 flex items-center justify-end gap-1 px-1 z-10 bg-gradient-to-b from-black/50 to-transparent"
              style={{ cursor: isPipDragging ? "grabbing" : "grab" }}
              onPointerDown={handlePipPointerDown}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setVideoDisplayMode("normal")}
                title="通常表示に戻す"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setVideoDisplayMode("collapsed")}
                title="動画を閉じる"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </Button>
            </div>
          )}
        </div>

        {/* Collapsed mode: expand bar */}
        {videoDisplayMode === "collapsed" && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-gray-100 border-b border-gray-200">
            <button
              onClick={() => setVideoDisplayMode("normal")}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
              動画を表示
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-900"
              onClick={() => setVideoDisplayMode("pip")}
              title="ピクチャ・イン・ピクチャ"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h13.5A2.25 2.25 0 0019 13.75v-7.5A2.25 2.25 0 0016.75 4H3.25zM2.5 6.25a.75.75 0 01.75-.75h13.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H11v-4.25A1.25 1.25 0 009.75 9h-3.5A1.25 1.25 0 005 10.25v4.25H3.25a.75.75 0 01-.75-.75v-7.5z" />
              </svg>
            </Button>
          </div>
        )}

        <div className="px-4 py-2 space-y-2 flex-1 min-h-0 overflow-y-auto">
            {/* Medley title */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">
                  {medley?.title ?? "Loading..."}
                </h1>
                {medley?.creator && (
                  <p className="text-sm text-gray-500">{medley.creator}</p>
                )}
              </div>
              {!authLoading && (
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Focus mode toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFocusMode(!focusMode)}
                    title={focusMode ? "フォーカスモード解除 (Ctrl+Shift+F)" : "フォーカスモード (Ctrl+Shift+F)"}
                  >
                    {focusMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-orange-500">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
                        <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0110 17a10.003 10.003 0 01-9.335-6.41 1.651 1.651 0 010-1.186A10.007 10.007 0 014.06 5.12l1.81 1.81A4 4 0 0010.748 13.93z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M3.75 3.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0V5.81l2.72 2.72a.75.75 0 001.06-1.06L4.81 4.75h1.44a.75.75 0 000-1.5h-3.5zM16.25 3.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V5.81l-2.72 2.72a.75.75 0 01-1.06-1.06l2.72-2.72h-1.44a.75.75 0 010-1.5h3.5zM3.75 16.25a.75.75 0 01-.75-.75v-3.5a.75.75 0 011.5 0v1.44l2.72-2.72a.75.75 0 011.06 1.06L5.56 14.5h1.44a.75.75 0 010 1.5h-3.5zM16.25 16.25a.75.75 0 00.75-.75v-3.5a.75.75 0 00-1.5 0v1.44l-2.72-2.72a.75.75 0 00-1.06 1.06l2.72 2.72h-1.44a.75.75 0 000 1.5h3.5z" />
                      </svg>
                    )}
                  </Button>
                  {isEditMode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenImportSetlist}
                        title="セットリストテキストから一括インポート"
                      >
                        一括インポート
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFetchDescription}
                        disabled={descriptionLoading}
                        title="動画の説明文からセットリストを取り込む"
                      >
                        {descriptionLoading ? "取得中..." : "説明文から取り込む"}
                      </Button>
                      <Button
                        variant={liveMode ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleLiveMode}
                        title="ライブ入力モード (Ctrl+L)"
                      >
                        {liveMode ? "ライブ入力中" : "ライブ入力"}
                      </Button>
                    </>
                  )}
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleEdit}
                  >
                    {isEditMode ? "編集中" : "編集"}
                  </Button>
                  {isEditMode && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saveSongs.isPending}
                    >
                      {saveSongs.isPending ? "保存中..." : "保存"}
                    </Button>
                  )}
                </div>
              )}
              {descriptionError && (
                <p className="text-xs text-red-600 mt-1">{descriptionError}</p>
              )}
            </div>
            {/* Song list */}
            <SongList
              songs={displaySongs}
              currentTime={currentTime}
              duration={duration}
              isEditMode={isEditMode}
              onSeek={handleSeek}
              onEdit={isAuthenticated ? handleEditSong : undefined}
              onDelete={isAuthenticated ? handleDeleteSong : undefined}
              onReorder={isAuthenticated ? handleReorder : undefined}
            />

            {/* Add song button (edit mode only) */}
            {isEditMode && (
              <button
                onClick={handleAddSong}
                className="w-full py-2 text-sm border-2 border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 rounded-lg transition-colors"
              >
                + 楽曲を追加
              </button>
            )}

            {/* Edit history — collapsible */}
            <div className="transition-all duration-200 ease-out motion-reduce:transition-none">
              {historyCollapsed ? (
                <button
                  onClick={toggleHistoryCollapsed}
                  className="flex items-center gap-1.5 w-full text-left py-1 group"
                  title="編集履歴を展開"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">編集履歴</span>
                  {editHistory.length > 0 && (
                    <span className="text-xs text-gray-400">({editHistory.length})</span>
                  )}
                </button>
              ) : (
                <div>
                  <button
                    onClick={toggleHistoryCollapsed}
                    className="flex items-center gap-1.5 mb-1 group"
                    title="編集履歴を折りたたむ"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <EditHistoryPanel
                    entries={editHistory}
                    onRestore={isAuthenticated ? handleRestore : undefined}
                    isRestoring={restoreSnapshot.isPending}
                  />
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Right sidebar (desktop) */}
      <div className="h-full overflow-hidden hidden lg:block">
        <RightSidebar songs={displaySongs} currentTime={currentTime} />
      </div>

      {/* Login modal */}
      <LoginModal
        open={openModal === "login"}
        onOpenChange={(v) => (v ? openModalWith("login") : closeModal())}
      />

      {/* Song search modal */}
      <SongSearchModal
        open={openModal === "songSearch"}
        onOpenChange={(v) => (v ? openModalWith("songSearch") : closeModal())}
        onSelect={handleSongSearchSelect}
        onManualAdd={handleSongSearchManualAdd}
      />

      {/* Song edit modal */}
      <SongEditModal
        isOpen={openModal === "songEdit"}
        onClose={closeModal}
        song={(modalData.song as SongSection) ?? null}
        isNew={!modalData.song}
        prefill={modalData.prefill as { title?: string; artist?: string[]; links?: { niconicoLink?: string; youtubeLink?: string; spotifyLink?: string; applemusicLink?: string } } | undefined}
        allSongs={timelineSongs}
        currentTime={currentTime}
        maxDuration={duration}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        onSeek={handleSeek}
      />

      {/* Import setlist modal */}
      <ImportSetlistModal
        isOpen={openModal === "importSetlist"}
        onClose={closeModal}
        onImport={handleImportSetlist}
        prefillText={modalData.prefillText as string | undefined}
      />

      {/* Fixed player bar (hidden during live annotation) */}
      {!(liveMode && isEditMode) && (
        <FixedPlayerBar
          title={medley?.title}
          creator={medley?.creator}
        />
      )}

      {/* Live annotation bar */}
      {liveMode && isEditMode && (
        <LiveAnnotationBar
          onClose={() => usePlayerStore.getState().setLiveMode(false)}
        />
      )}
    </div>
  );
}
