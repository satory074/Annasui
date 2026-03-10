"use client";

import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { medleyKeys } from "../queries/keys";
import { fetchMedley, fetchMedleySongs, fetchEditHistory } from "../queries/functions";
import { useTimelineStore, useTimelineHistory } from "../store";
import { useUIStore } from "../store-ui";
import { usePlayerStore, useCurrentTime } from "@/features/player/store";
import { useAuth } from "@/features/auth/context";
import { useSaveSongs, useRestoreSnapshot } from "../hooks/useMedleyMutations";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { PlayerControls } from "@/features/player/components/PlayerControls";
import { RightSidebar } from "@/features/player/components/RightSidebar";
import { TimelineSection } from "./TimelineSection";
import { SongList } from "./SongList";
import { EditHistoryPanel } from "./EditHistoryPanel";
import { BpmSettings } from "./BpmSettings";
import { LoginModal } from "@/features/auth/components/LoginModal";
import { Button } from "@/components/ui/button";
import type { PlatformType, SongSection } from "../types";

interface MedleyViewProps {
  platform: string;
  videoId: string;
}

export function MedleyView({ platform, videoId }: MedleyViewProps) {
  const { isAuthenticated, nickname, loading: authLoading } = useAuth();
  const currentTime = useCurrentTime();
  const duration = usePlayerStore((s) => s.duration);

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
  const openModalWith = useUIStore((s) => s.openModalWith);
  const closeModal = useUIStore((s) => s.closeModal);

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
        <div className="pt-16">
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
                <div className="flex gap-2">
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
            </div>

            {/* Player controls */}
            <PlayerControls />

            {/* BPM settings */}
            <BpmSettings
              videoId={videoId}
              bpm={medley?.bpm}
              beatOffset={medley?.beatOffset}
              isAuthenticated={isAuthenticated}
            />

            {/* Timeline */}
            <TimelineSection
              songs={displaySongs}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
            />

            {/* Song list */}
            <SongList
              songs={displaySongs}
              currentTime={currentTime}
              isEditMode={isEditMode}
              onSeek={handleSeek}
              onEdit={isAuthenticated ? handleEditSong : undefined}
              onDelete={isAuthenticated ? handleDeleteSong : undefined}
            />

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
    </div>
  );
}
