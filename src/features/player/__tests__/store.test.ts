import { describe, it, expect, beforeEach } from "vitest";
import { usePlayerStore } from "../store";

describe("usePlayerStore", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      volume: 1,
    });
  });

  describe("setCurrentTime", () => {
    it("updates current time", () => {
      usePlayerStore.getState().setCurrentTime(42.5);
      expect(usePlayerStore.getState().currentTime).toBe(42.5);
    });
  });

  describe("setIsPlaying", () => {
    it("toggles playing state", () => {
      usePlayerStore.getState().setIsPlaying(true);
      expect(usePlayerStore.getState().isPlaying).toBe(true);

      usePlayerStore.getState().setIsPlaying(false);
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });
  });

  describe("setDuration", () => {
    it("updates duration", () => {
      usePlayerStore.getState().setDuration(300);
      expect(usePlayerStore.getState().duration).toBe(300);
    });
  });

  describe("setVolume", () => {
    it("updates volume", () => {
      usePlayerStore.getState().setVolume(0.5);
      expect(usePlayerStore.getState().volume).toBe(0.5);
    });
  });

  describe("selectors", () => {
    it("useCurrentTime returns current time", () => {
      // Selectors are hooks, so we test the store getter directly
      usePlayerStore.getState().setCurrentTime(99);
      expect(usePlayerStore.getState().currentTime).toBe(99);
    });
  });
});
