import { describe, it, expect } from "vitest";
import {
  l2Normalize,
  cosineSimilarity,
  meanPoolEmbeddings,
  matchSong,
  matchSegment,
} from "../songMatcher";
import type { SongEmbedding } from "../songMatcher";

// ── ヘルパー ──────────────────────────────────────────────────────────────────

function makeVec(dim: number, val: number[]): Float32Array {
  const arr = new Float32Array(dim).fill(0);
  for (let i = 0; i < Math.min(val.length, dim); i++) arr[i] = val[i];
  return arr;
}

function makeUnitVec(dim: number, axis: number): Float32Array {
  const arr = new Float32Array(dim).fill(0);
  arr[axis % dim] = 1;
  return arr;
}

// ── l2Normalize ───────────────────────────────────────────────────────────────

describe("l2Normalize", () => {
  it("正規化後のノルムが 1 に近い", () => {
    const v = makeVec(4, [3, 4, 0, 0]);
    const n = l2Normalize(v);
    let norm = 0;
    for (let i = 0; i < n.length; i++) norm += n[i] * n[i];
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);
  });

  it("ゼロベクトルはゼロベクトルを返す", () => {
    const v = new Float32Array(4).fill(0);
    const n = l2Normalize(v);
    expect(Array.from(n)).toEqual([0, 0, 0, 0]);
  });
});

// ── cosineSimilarity ──────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("同じ単位ベクトルのコサイン類似度は 1", () => {
    const v = makeUnitVec(8, 0);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("直交ベクトルのコサイン類似度は 0", () => {
    const a = makeUnitVec(8, 0);
    const b = makeUnitVec(8, 1);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("逆方向ベクトルのコサイン類似度は -1", () => {
    const a = makeVec(4, [1, 0, 0, 0]);
    const b = makeVec(4, [-1, 0, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });
});

// ── meanPoolEmbeddings ────────────────────────────────────────────────────────

describe("meanPoolEmbeddings", () => {
  it("1つのフレームのみ: 正規化済みそのまま", () => {
    const v = makeUnitVec(4, 0);
    const result = meanPoolEmbeddings([v]);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(0, 5);
  });

  it("2つの同方向フレーム: 平均は元と同方向", () => {
    const v = makeUnitVec(4, 2);
    const result = meanPoolEmbeddings([v, v]);
    expect(result[2]).toBeCloseTo(1, 5);
  });

  it("空配列はゼロベクトル (1024次元) を返す", () => {
    const result = meanPoolEmbeddings([]);
    expect(result.length).toBe(1024);
    expect(result[0]).toBe(0);
  });
});

// ── matchSong ─────────────────────────────────────────────────────────────────

describe("matchSong", () => {
  const dim = 8;

  function makeCandidates(): SongEmbedding[] {
    return [
      { songId: "song-A", embedding: makeUnitVec(dim, 0) },
      { songId: "song-B", embedding: makeUnitVec(dim, 1) },
      { songId: "song-C", embedding: makeUnitVec(dim, 2) },
    ];
  }

  it("クエリが song-A 方向なら song-A を返す", () => {
    const candidates = makeCandidates();
    const query = makeUnitVec(dim, 0); // song-A と同一方向
    const result = matchSong(query, candidates, {
      topK: 3,
      unknownThreshold: 0.3,
    });
    expect(result.songId).toBe("song-A");
    expect(result.score).toBeCloseTo(1, 5);
    expect(result.isUnknown).toBe(false);
  });

  it("スコアが低い場合は isUnknown=true", () => {
    const candidates = makeCandidates();
    // dim=8 の対角方向 → 全候補と低類似度
    const query = l2Normalize(makeVec(dim, [1, 1, 1, 1, 1, 1, 1, 1]));
    const result = matchSong(query, candidates, {
      topK: 3,
      unknownThreshold: 0.9, // 高い閾値
    });
    expect(result.isUnknown).toBe(true);
  });

  it("候補が空の場合は isUnknown=true, songId=空文字列", () => {
    const query = makeUnitVec(dim, 0);
    const result = matchSong(query, []);
    expect(result.isUnknown).toBe(true);
    expect(result.songId).toBe("");
  });

  it("2曲が同スコアの場合 isMashup=true", () => {
    // song-AB は song-A と song-B を等分
    const songAB = l2Normalize(makeVec(dim, [1, 1, 0, 0, 0, 0, 0, 0]));
    const candidates = makeCandidates();
    const result = matchSong(songAB, candidates, {
      topK: 3,
      unknownThreshold: 0.3,
      mashupRatio: 0.85,
    });
    expect(result.isMashup).toBe(true);
    expect(result.mashupSongs.length).toBeGreaterThanOrEqual(2);
  });
});

// ── matchSegment ──────────────────────────────────────────────────────────────

describe("matchSegment", () => {
  const dim = 8;

  it("指定フレーム範囲を平均プールしてマッチング", () => {
    const allEmbeddings = [
      makeUnitVec(dim, 0), // frame 0: song-A
      makeUnitVec(dim, 0), // frame 1: song-A
      makeUnitVec(dim, 1), // frame 2: song-B
      makeUnitVec(dim, 1), // frame 3: song-B
    ];
    const candidates: SongEmbedding[] = [
      { songId: "song-A", embedding: makeUnitVec(dim, 0) },
      { songId: "song-B", embedding: makeUnitVec(dim, 1) },
    ];

    // frames 0-1: song-A
    const resultA = matchSegment(allEmbeddings, 0, 2, candidates, {
      unknownThreshold: 0.5,
    });
    expect(resultA.songId).toBe("song-A");

    // frames 2-3: song-B
    const resultB = matchSegment(allEmbeddings, 2, 4, candidates, {
      unknownThreshold: 0.5,
    });
    expect(resultB.songId).toBe("song-B");
  });
});
