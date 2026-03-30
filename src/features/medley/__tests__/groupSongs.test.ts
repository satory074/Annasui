import { describe, it, expect } from "vitest";
import {
  groupSongSections,
  findNearestSection,
  flattenRowsToSections,
  type SongListRow,
} from "../utils/groupSongs";
import type { SongSection } from "../types";

function makeSong(overrides: Partial<SongSection> = {}): SongSection {
  return {
    id: crypto.randomUUID(),
    orderIndex: 0,
    title: "Test Song",
    artist: ["Artist"],
    startTime: 0,
    endTime: 10,
    color: "#ff0000",
    ...overrides,
  };
}

describe("groupSongSections", () => {
  it("空配列 → 空配列", () => {
    expect(groupSongSections([])).toEqual([]);
  });

  it("songId なしの曲 → 全て SingleSongRow", () => {
    const songs = [makeSong({ title: "A" }), makeSong({ title: "B" })];
    const rows = groupSongSections(songs);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.type === "single")).toBe(true);
  });

  it("同じ songId の2曲 → 1つの GroupedSongRow", () => {
    const songId = "shared-id";
    const songs = [
      makeSong({ songId, title: "A", startTime: 0, endTime: 10 }),
      makeSong({ songId, title: "A", startTime: 50, endTime: 60 }),
    ];
    const rows = groupSongSections(songs);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("grouped");
    if (rows[0].type === "grouped") {
      expect(rows[0].sections).toHaveLength(2);
      expect(rows[0].songId).toBe(songId);
      expect(rows[0].sections[0].startTime).toBe(0);
      expect(rows[0].sections[1].startTime).toBe(50);
    }
  });

  it("songId が1つだけの曲 → SingleSongRow（グループ化しない）", () => {
    const songs = [makeSong({ songId: "unique-id", title: "A" })];
    const rows = groupSongSections(songs);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("single");
  });

  it("混合: songId あり/なし → 正しい出力順序", () => {
    const sharedId = "shared";
    const songs = [
      makeSong({ title: "First", startTime: 0, endTime: 10 }),
      makeSong({ songId: sharedId, title: "Shared", startTime: 10, endTime: 20 }),
      makeSong({ title: "Middle", startTime: 20, endTime: 30 }),
      makeSong({ songId: sharedId, title: "Shared", startTime: 30, endTime: 40 }),
      makeSong({ title: "Last", startTime: 40, endTime: 50 }),
    ];
    const rows = groupSongSections(songs);
    expect(rows).toHaveLength(4); // First, Shared(grouped), Middle, Last

    expect(rows[0].type).toBe("single");
    expect(rows[1].type).toBe("grouped");
    expect(rows[2].type).toBe("single");
    expect(rows[3].type).toBe("single");

    if (rows[1].type === "grouped") {
      expect(rows[1].sections).toHaveLength(2);
    }
  });

  it("異なる songId は別グループ", () => {
    const songs = [
      makeSong({ songId: "a", title: "A", startTime: 0, endTime: 10 }),
      makeSong({ songId: "b", title: "B", startTime: 10, endTime: 20 }),
      makeSong({ songId: "a", title: "A", startTime: 20, endTime: 30 }),
      makeSong({ songId: "b", title: "B", startTime: 30, endTime: 40 }),
    ];
    const rows = groupSongSections(songs);
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe("grouped");
    expect(rows[1].type).toBe("grouped");
  });
});

describe("flattenRowsToSections", () => {
  it("空配列 → 空配列", () => {
    expect(flattenRowsToSections([])).toEqual([]);
  });

  it("SingleSongRow のみ → そのまま展開", () => {
    const songs = [makeSong({ title: "A" }), makeSong({ title: "B" })];
    const rows = songs.map((s) => ({ type: "single" as const, section: s }));
    const result = flattenRowsToSections(rows);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("A");
    expect(result[1].title).toBe("B");
  });

  it("GroupedSongRow → 区間を展開", () => {
    const s1 = makeSong({ title: "A", startTime: 0, endTime: 10 });
    const s2 = makeSong({ title: "A", startTime: 50, endTime: 60 });
    const rows: SongListRow[] = [
      {
        type: "grouped",
        songId: "shared",
        sections: [s1, s2],
        displayTitle: "A",
        displayArtist: ["Artist"],
        displayColor: "#ff0000",
      },
    ];
    const result = flattenRowsToSections(rows);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(s1);
    expect(result[1]).toBe(s2);
  });

  it("混合: Single + Grouped → 正しい順序で展開", () => {
    const s1 = makeSong({ title: "First" });
    const s2 = makeSong({ title: "G1", startTime: 10, endTime: 20 });
    const s3 = makeSong({ title: "G1", startTime: 30, endTime: 40 });
    const s4 = makeSong({ title: "Last" });
    const rows: SongListRow[] = [
      { type: "single", section: s1 },
      {
        type: "grouped",
        songId: "g",
        sections: [s2, s3],
        displayTitle: "G1",
        displayArtist: ["Artist"],
        displayColor: "#ff0000",
      },
      { type: "single", section: s4 },
    ];
    const result = flattenRowsToSections(rows);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.title)).toEqual(["First", "G1", "G1", "Last"]);
  });
});

describe("findNearestSection", () => {
  const sections = [
    makeSong({ startTime: 10, endTime: 20 }),
    makeSong({ startTime: 40, endTime: 50 }),
    makeSong({ startTime: 70, endTime: 80 }),
  ];

  it("区間内 → その区間を返す", () => {
    const result = findNearestSection(sections, 15);
    expect(result.startTime).toBe(10);
  });

  it("区間内（2番目）→ その区間を返す", () => {
    const result = findNearestSection(sections, 45);
    expect(result.startTime).toBe(40);
  });

  it("区間の間 → 次の区間を返す", () => {
    const result = findNearestSection(sections, 30);
    expect(result.startTime).toBe(40);
  });

  it("全区間の前 → 最初の区間を返す", () => {
    const result = findNearestSection(sections, 5);
    expect(result.startTime).toBe(10);
  });

  it("全区間の後 → 最後の区間を返す", () => {
    const result = findNearestSection(sections, 90);
    expect(result.startTime).toBe(70);
  });
});
