"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AdapterMethods {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleFullscreen: () => void;
}

interface PlayerStore {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  volume: number;
  liveMode: boolean;

  // Adapter dispatch (internal)
  _adapter: AdapterMethods | null;

  // State setters
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setLiveMode: (mode: boolean) => void;

  // Adapter registration
  registerAdapter: (fns: AdapterMethods) => void;
  unregisterAdapter: () => void;

  // Public dispatch methods (delegate to adapter)
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
}

export const usePlayerStore = create<PlayerStore>()(
  devtools(
    (set, get) => ({
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      volume: 1,
      liveMode: false,

      _adapter: null,

      setCurrentTime: (time) => set({ currentTime: time }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setDuration: (duration) => set({ duration: duration }),
      setVolume: (volume) => set({ volume: volume }),
      setLiveMode: (mode) => set({ liveMode: mode }),

      registerAdapter: (fns) => set({ _adapter: fns }),
      unregisterAdapter: () => set({ _adapter: null }),

      play: () => get()._adapter?.play(),
      pause: () => get()._adapter?.pause(),
      seek: (time) => {
        get()._adapter?.seek(time);
        set({ currentTime: time });
      },
      togglePlayPause: () => {
        const { isPlaying, _adapter } = get();
        if (isPlaying) {
          _adapter?.pause();
        } else {
          _adapter?.play();
        }
      },
      toggleFullscreen: () => get()._adapter?.toggleFullscreen(),
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
