import { describe, it, expect } from "vitest";
import { detectBoundaries, computeNovelty } from "../boundaryDetector";

/**
 * 合成埋め込みでアルゴリズムをテスト。
 * 実際の MuQ 埋め込みは使用しない（Python 不要）。
 */

function makeEmbedding(dim: number, ...values: number[]): Float32Array {
  const arr = new Float32Array(dim).fill(0);
  for (let i = 0; i < Math.min(values.length, dim); i++) arr[i] = values[i];
  return arr;
}

function makeUniformEmbeddings(T: number, dim: number): Float32Array[] {
  // 全フレームが同じ方向のベクトル → 変化なし → 境界なし
  return Array.from({ length: T }, () => makeEmbedding(dim, 1, 0, 0, 0));
}

function makeStepEmbeddings(dim: number, ...segmentLengths: number[]): Float32Array[] {
  const embeddings: Float32Array[] = [];
  for (let s = 0; s < segmentLengths.length; s++) {
    const len = segmentLengths[s];
    // 区間ごとに異なる単位ベクトル（次元 s に 1、他は 0）
    for (let i = 0; i < len; i++) {
      const arr = new Float32Array(dim).fill(0);
      arr[s % dim] = 1;
      embeddings.push(arr);
    }
  }
  return embeddings;
}

describe("detectBoundaries", () => {
  it("均一な埋め込みでは境界を検出しない", () => {
    const embeddings = makeUniformEmbeddings(50, 32);
    const boundaries = detectBoundaries(embeddings, 1.0);
    expect(boundaries.length).toBe(0);
  });

  it("3区間の埋め込みで2境界を検出する（概算）", () => {
    // 各区間 20フレーム、hop=1sec
    const embeddings = makeStepEmbeddings(32, 20, 20, 20);
    const boundaries = detectBoundaries(embeddings, 1.0, {
      contextFrames: 4,
      sigma: 1,
      percentile: 60,
      minIntervalSec: 3,
    });
    // 境界は 20±数フレームあたりと 40±数フレームあたりに検出されるはず
    expect(boundaries.length).toBeGreaterThanOrEqual(1);
    expect(boundaries.length).toBeLessThanOrEqual(4);
  });

  it("T < 3 では空配列を返す", () => {
    const embeddings = makeUniformEmbeddings(2, 32);
    expect(detectBoundaries(embeddings, 1.0)).toEqual([]);
  });

  it("返される境界は秒単位で hopSec の倍数", () => {
    const embeddings = makeStepEmbeddings(32, 15, 15, 15);
    const hopSec = 0.5;
    const boundaries = detectBoundaries(embeddings, hopSec, {
      contextFrames: 3,
      sigma: 1,
      percentile: 50,
      minIntervalSec: 2,
    });
    for (const t of boundaries) {
      // 0.5秒の倍数 (浮動小数点誤差 0.01 以内)
      expect(t % hopSec).toBeCloseTo(0, 2);
    }
  });
});

describe("computeNovelty", () => {
  it("均一埋め込みのノベルティはほぼ 0", () => {
    const embeddings = makeUniformEmbeddings(20, 32);
    const novelty = computeNovelty(embeddings, 2, 4);
    const max = Math.max(...novelty);
    expect(max).toBeLessThan(0.01);
  });

  it("変化のある埋め込みでは境界付近のノベルティが高い", () => {
    const embeddings = makeStepEmbeddings(32, 10, 10);
    const novelty = computeNovelty(embeddings, 1, 3);
    const maxIdx = novelty.indexOf(Math.max(...novelty));
    // 境界 (フレーム 10) 付近に最大値
    expect(Math.abs(maxIdx - 10)).toBeLessThanOrEqual(4);
  });

  it("T < 3 では全 0 のノベルティを返す", () => {
    const embeddings = makeUniformEmbeddings(2, 32);
    const novelty = computeNovelty(embeddings);
    expect(novelty.every((v) => v === 0)).toBe(true);
  });
});
