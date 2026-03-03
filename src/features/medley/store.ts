"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type { SongSection } from "./types";

interface TimelineStore {
  songs: SongSection[];
  selectedSongId: string | null;

  setSongs: (songs: SongSection[]) => void;
  addSong: (song: SongSection) => void;
  updateSong: (id: string, updates: Partial<SongSection>) => void;
  deleteSong: (id: string) => void;
  selectSong: (id: string | null) => void;
  reorderSongs: (songIds: string[]) => void;
}

export const useTimelineStore = create<TimelineStore>()(
  devtools(
    temporal(
      immer((set) => ({
        songs: [],
        selectedSongId: null,

        setSongs: (songs) =>
          set((state) => {
            state.songs = songs;
          }),

        addSong: (song) =>
          set((state) => {
            state.songs.push(song);
          }),

        updateSong: (id, updates) =>
          set((state) => {
            const idx = state.songs.findIndex((s) => s.id === id);
            if (idx !== -1) {
              Object.assign(state.songs[idx], updates);
            }
          }),

        deleteSong: (id) =>
          set((state) => {
            state.songs = state.songs.filter((s) => s.id !== id);
          }),

        selectSong: (id) =>
          set((state) => {
            state.selectedSongId = id;
          }),

        reorderSongs: (songIds) =>
          set((state) => {
            const songMap = new Map(state.songs.map((s) => [s.id, s]));
            state.songs = songIds
              .map((id, index) => {
                const song = songMap.get(id);
                if (song) {
                  song.orderIndex = index + 1;
                  return song;
                }
                return null;
              })
              .filter((s): s is SongSection => s !== null);
          }),
      })),
      {
        limit: 50,
        // Only track song changes for undo/redo (not selection)
        partialize: (state) => ({ songs: state.songs }),
      }
    ),
    { name: "timeline-store" }
  )
);

// Expose undo/redo from temporal middleware
export const useTimelineHistory = () => useTimelineStore.temporal.getState();
