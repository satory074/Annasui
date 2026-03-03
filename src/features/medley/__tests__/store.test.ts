import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore, useTimelineHistory } from "../store";
import type { SongSection } from "../types";

const makeSong = (overrides: Partial<SongSection> = {}): SongSection => ({
  id: crypto.randomUUID(),
  orderIndex: 1,
  title: "Test Song",
  artist: ["Test Artist"],
  startTime: 0,
  endTime: 30,
  color: "#4299e1",
  ...overrides,
});

describe("useTimelineStore", () => {
  beforeEach(() => {
    useTimelineStore.setState({ songs: [], selectedSongId: null });
    // Clear temporal history
    useTimelineStore.temporal.getState().clear();
  });

  describe("setSongs", () => {
    it("replaces entire songs array", () => {
      const songs = [makeSong({ title: "A" }), makeSong({ title: "B" })];
      useTimelineStore.getState().setSongs(songs);
      expect(useTimelineStore.getState().songs).toHaveLength(2);
      expect(useTimelineStore.getState().songs[0].title).toBe("A");
    });
  });

  describe("addSong", () => {
    it("appends a song to the list", () => {
      const song = makeSong({ title: "New Song" });
      useTimelineStore.getState().addSong(song);
      expect(useTimelineStore.getState().songs).toHaveLength(1);
      expect(useTimelineStore.getState().songs[0].title).toBe("New Song");
    });

    it("preserves existing songs", () => {
      useTimelineStore.getState().setSongs([makeSong({ title: "Existing" })]);
      useTimelineStore.getState().addSong(makeSong({ title: "New" }));
      expect(useTimelineStore.getState().songs).toHaveLength(2);
    });
  });

  describe("updateSong", () => {
    it("updates song properties by id", () => {
      const song = makeSong({ title: "Original" });
      useTimelineStore.getState().setSongs([song]);
      useTimelineStore.getState().updateSong(song.id, { title: "Updated" });
      expect(useTimelineStore.getState().songs[0].title).toBe("Updated");
    });

    it("does nothing for non-existent id", () => {
      useTimelineStore.getState().setSongs([makeSong()]);
      useTimelineStore.getState().updateSong("non-existent", { title: "X" });
      expect(useTimelineStore.getState().songs).toHaveLength(1);
    });
  });

  describe("deleteSong", () => {
    it("removes a song by id", () => {
      const song = makeSong();
      useTimelineStore.getState().setSongs([song]);
      useTimelineStore.getState().deleteSong(song.id);
      expect(useTimelineStore.getState().songs).toHaveLength(0);
    });

    it("does not affect other songs", () => {
      const a = makeSong({ title: "A" });
      const b = makeSong({ title: "B" });
      useTimelineStore.getState().setSongs([a, b]);
      useTimelineStore.getState().deleteSong(a.id);
      expect(useTimelineStore.getState().songs).toHaveLength(1);
      expect(useTimelineStore.getState().songs[0].title).toBe("B");
    });
  });

  describe("selectSong", () => {
    it("sets selected song id", () => {
      useTimelineStore.getState().selectSong("song-123");
      expect(useTimelineStore.getState().selectedSongId).toBe("song-123");
    });

    it("clears selection with null", () => {
      useTimelineStore.getState().selectSong("song-123");
      useTimelineStore.getState().selectSong(null);
      expect(useTimelineStore.getState().selectedSongId).toBeNull();
    });
  });

  describe("reorderSongs", () => {
    it("reorders songs and updates orderIndex", () => {
      const a = makeSong({ title: "A", orderIndex: 1 });
      const b = makeSong({ title: "B", orderIndex: 2 });
      const c = makeSong({ title: "C", orderIndex: 3 });
      useTimelineStore.getState().setSongs([a, b, c]);

      useTimelineStore.getState().reorderSongs([c.id, a.id, b.id]);

      const songs = useTimelineStore.getState().songs;
      expect(songs[0].title).toBe("C");
      expect(songs[0].orderIndex).toBe(1);
      expect(songs[1].title).toBe("A");
      expect(songs[1].orderIndex).toBe(2);
      expect(songs[2].title).toBe("B");
      expect(songs[2].orderIndex).toBe(3);
    });
  });

  describe("undo/redo (zundo)", () => {
    it("undoes the last song mutation", () => {
      const song = makeSong({ title: "Original" });
      useTimelineStore.getState().setSongs([song]);
      useTimelineStore.getState().updateSong(song.id, { title: "Changed" });

      expect(useTimelineStore.getState().songs[0].title).toBe("Changed");

      useTimelineHistory().undo();
      expect(useTimelineStore.getState().songs[0].title).toBe("Original");
    });

    it("redoes after undo", () => {
      const song = makeSong({ title: "Original" });
      useTimelineStore.getState().setSongs([song]);
      useTimelineStore.getState().updateSong(song.id, { title: "Changed" });

      useTimelineHistory().undo();
      expect(useTimelineStore.getState().songs[0].title).toBe("Original");

      useTimelineHistory().redo();
      expect(useTimelineStore.getState().songs[0].title).toBe("Changed");
    });
  });
});
