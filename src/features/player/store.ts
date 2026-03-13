"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PlayerStore {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  volume: number;
  liveMode: boolean;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setLiveMode: (mode: boolean) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  devtools(
    (set) => ({
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      volume: 1,
      liveMode: false,

      setCurrentTime: (time) => set({ currentTime: time }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setDuration: (duration) => set({ duration: duration }),
      setVolume: (volume) => set({ volume: volume }),
      setLiveMode: (mode) => set({ liveMode: mode }),
    }),
    { name: "player-store" }
  )
);

// Fine-grained selectors to minimize re-renders
export const useCurrentTime = () => usePlayerStore((s) => s.currentTime);
export const useIsPlaying = () => usePlayerStore((s) => s.isPlaying);
export const useDuration = () => usePlayerStore((s) => s.duration);
export const useVolume = () => usePlayerStore((s) => s.volume);
export const useLiveMode = () => usePlayerStore((s) => s.liveMode);
