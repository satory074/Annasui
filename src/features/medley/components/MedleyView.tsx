"use client";

import { useEffect, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { medleyKeys } from "../queries/keys";
import { fetchMedley, fetchMedleySongs, fetchEditHistory } from "../queries/functions-supabase";
import { useTimelineStore, useTimelineHistory } from "../store";
import { useUIStore } from "../store-ui";
import { usePlayerStore, useCurrentTime, useLiveMode } from "@/features/player/store";
import { useAuth } from "@/features/auth/context";
import { useSaveSongs, useRestoreSnapshot } from "../hooks/useMedleyMutations";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { PlayerControls } from "@/features/player/components/PlayerControls";
import { RightSidebar } from "@/features/player/components/RightSidebar";
import { TimelineSection } from "./TimelineSection";
import { SongList } from "./SongList";
import { EditHistoryPanel } from "./EditHistoryPanel";
import { LoginModal } from "@/features/auth/components/LoginModal";
import { SongEditModal } from "./SongEditModal";
import { SongSearchModal } from "@/features/song-database/components/SongSearchModal";
import { LiveAnnotationBar } from "./LiveAnnotationBar";
import ImportSetlistModal from "@/components/features/medley/ImportSetlistModal";
import { Button } from "@/components/ui/button";
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
    usePlayerStore.getState().setCurrentTime(time);
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

  const handleSongTimeChange = useCallback(
    (songId: string, startTime: number, endTime: number) => {
      useTimelineStore.getState().updateSong(songId, { startTime, endTime });
    },
    []
  );

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
        prefill: { title: song.title, artist: song.artist.map((a) => a.name) },
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
    <div className="flex max-w-[1920px] mx-auto">
      {/* Main content */}
      <div className="flex-1 bg-white shadow-lg">
        <div>
          {/* Video player */}
          <VideoPlayer
            platform={platform as PlatformType}
            videoId={videoId}
          />

          <div className="px-4 py-4 space-y-4">
            {/* Medley title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {medley?.title ?? "Loading..."}
                </h1>
                {medley?.creator && (
                  <p className="text-sm text-gray-500">{medley.creator}</p>
                )}
              </div>
              {!authLoading && (
                <div className="flex flex-wrap gap-2">
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

            {/* Player controls */}
            <PlayerControls />

            {/* Keyboard shortcuts help */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>
                <kbd className="px-1 bg-gray-100 border border-gray-300 rounded">←</kbd>{" "}
                <kbd className="px-1 bg-gray-100 border border-gray-300 rounded">→</kbd>{" "}
                シーク ±5秒
              </span>
              {isEditMode && (
                <>
                  <span>
                    <kbd className="px-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Z</kbd>{" "}
                    元に戻す
                  </span>
                  <span>
                    <kbd className="px-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Shift+Z</kbd>{" "}
                    やり直す
                  </span>
                  <span>
                    <kbd className="px-1 bg-gray-100 border border-gray-300 rounded">Ctrl+L</kbd>{" "}
                    ライブ入力
                  </span>
                </>
              )}
            </div>

            {/* Timeline */}
            <TimelineSection
              songs={displaySongs}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
              onSongTimeChange={isEditMode ? handleSongTimeChange : undefined}
            />

            {/* Song list */}
            <SongList
              songs={displaySongs}
              currentTime={currentTime}
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

            {/* Edit history */}
            <EditHistoryPanel
              entries={editHistory}
              onRestore={isAuthenticated ? handleRestore : undefined}
              isRestoring={restoreSnapshot.isPending}
            />
          </div>
        </div>
      </div>

      {/* Right sidebar (desktop) */}
      <div className="hidden lg:block">
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
        prefill={modalData.prefill as { title?: string; artist?: string[] } | undefined}
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

      {/* Live annotation bar */}
      {liveMode && isEditMode && (
        <LiveAnnotationBar
          onClose={() => usePlayerStore.getState().setLiveMode(false)}
        />
      )}
    </div>
  );
}
