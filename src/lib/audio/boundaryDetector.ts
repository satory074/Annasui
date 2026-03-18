/**
 * CSIDE Stage 1: 境界検出 (TypeScript移植)
 * 元実装: cside/segmentation/boundary.py
 *
 * 音声フレーム埋め込み列からコサイン類似度ノベルティカーブを計算し、
 * 楽曲境界タイムスタンプを検出する。
 */

export interface BoundaryDetectorOptions {
  /** 前後コンテキストフレーム数 (default: 8) */
  contextFrames?: number;
  /** ガウスフィルタのσ (default: 2) */
  sigma?: number;
  /** ピーク検出パーセンタイル閾値 (default: 75) */
  percentile?: number;
  /** 最小境界間隔（秒）(default: 4) */
  minIntervalSec?: number;
}

/**
 * L2ノルムでベクトルを正規化する
 */
function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return new Float32Array(vec.length);
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/**
 * 2ベクトルのコサイン類似度（L2正規化済みを前提）
 */
function dotProduct(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * 累積和を用いた効率的なコンテキストベクトル計算
 * context[t] = Σ_{i=max(0,t-k)}^{min(T-1,t+k)} emb[i]  (k=contextFrames)
 *
 * O(T×D) — O(k×D) per frame を回避
 */
function buildContextVectors(
  embeddings: Float32Array[],
  contextFrames: number
): Float32Array[] {
  const T = embeddings.length;
  if (T === 0) return [];
  const D = embeddings[0].length;

  // 累積和
  const cumsum: Float32Array[] = [new Float32Array(D)];
  for (let t = 0; t < T; t++) {
    const cs = new Float32Array(D);
    for (let d = 0; d < D; d++) cs[d] = cumsum[t][d] + embeddings[t][d];
    cumsum.push(cs);
  }

  const contexts: Float32Array[] = [];
  for (let t = 0; t < T; t++) {
    const lo = Math.max(0, t - contextFrames);
    const hi = Math.min(T - 1, t + contextFrames);
    const ctx = new Float32Array(D);
    for (let d = 0; d < D; d++) ctx[d] = cumsum[hi + 1][d] - cumsum[lo][d];
    contexts.push(ctx);
  }
  return contexts;
}

/**
 * 1D ガウスフィルタ（畳み込み、境界はゼロパディング）
 */
function gaussianFilter1D(signal: number[], sigma: number): number[] {
  const radius = Math.ceil(3 * sigma);
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const N = signal.length;
  const out = new Array<number>(N).fill(0);
  for (let t = 0; t < N; t++) {
    let val = 0;
    for (let ki = 0; ki < kernel.length; ki++) {
      const idx = t + ki - radius;
      if (idx >= 0 && idx < N) val += kernel[ki] * signal[idx];
    }
    out[t] = val;
  }
  return out;
}

/**
 * percentile値を計算（ソートベース）
 */
function percentileValue(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

/**
 * 局所最大値ピーク検出
 * - 閾値以上
 * - 前後フレームより大きい（局所最大）
 * - 最小距離制約（minDistance フレーム）
 */
function findPeaks(
  signal: number[],
  threshold: number,
  minDistance: number
): number[] {
  const N = signal.length;
  const candidates: { idx: number; val: number }[] = [];

  for (let i = 1; i < N - 1; i++) {
    if (
      signal[i] > threshold &&
      signal[i] > signal[i - 1] &&
      signal[i] > signal[i + 1]
    ) {
      candidates.push({ idx: i, val: signal[i] });
    }
  }

  // 最小距離制約（greedy: 値が高い順に確定し、近傍を除去）
  candidates.sort((a, b) => b.val - a.val);
  const accepted: number[] = [];
  const suppressed = new Set<number>();

  for (const c of candidates) {
    if (suppressed.has(c.idx)) continue;
    accepted.push(c.idx);
    for (let j = c.idx - minDistance; j <= c.idx + minDistance; j++) {
      suppressed.add(j);
    }
  }

  return accepted.sort((a, b) => a - b);
}

/**
 * 境界検出メイン関数
 *
 * @param embeddings - L2正規化済みフレーム埋め込み列 (T × D)
 * @param hopSec - 1フレームの時間長（秒、default: 1.0）
 * @param options - ハイパーパラメータ
 * @returns 境界タイムスタンプ列（秒）
 */
export function detectBoundaries(
  embeddings: Float32Array[],
  hopSec = 1.0,
  options: BoundaryDetectorOptions = {}
): number[] {
  const {
    contextFrames = 8,
    sigma = 2,
    percentile = 75,
    minIntervalSec = 4,
  } = options;

  const T = embeddings.length;
  if (T < 3) return [];

  // L2正規化
  const normed = embeddings.map(l2Normalize);

  // コンテキストベクトル構築
  const contexts = buildContextVectors(normed, contextFrames);

  // コンテキストベクトルをL2正規化
  const normedContexts = contexts.map(l2Normalize);

  // ノベルティカーブ計算（隣接コンテキスト間のコサイン距離）
  const novelty: number[] = new Array(T).fill(0);
  for (let t = 1; t < T - 1; t++) {
    const sim = dotProduct(normedContexts[t - 1], normedContexts[t + 1]);
    novelty[t] = 1 - sim; // コサイン距離
  }

  // ガウスフィルタ平滑化
  const smoothed = gaussianFilter1D(novelty, sigma);

  // ピーク検出
  const threshold = percentileValue(
    smoothed.filter((v) => v > 0),
    percentile
  );
  const minDistFrames = Math.ceil(minIntervalSec / hopSec);
  const peakIndices = findPeaks(smoothed, threshold, minDistFrames);

  // フレームインデックス → タイムスタンプ（秒）
  return peakIndices.map((idx) => idx * hopSec);
}

/**
 * ノベルティカーブを返す（デバッグ・可視化用）
 */
export function computeNovelty(
  embeddings: Float32Array[],
  sigma = 2,
  contextFrames = 8
): number[] {
  const T = embeddings.length;
  if (T < 3) return new Array(T).fill(0);

  const normed = embeddings.map(l2Normalize);
  const contexts = buildContextVectors(normed, contextFrames);
  const normedContexts = contexts.map(l2Normalize);

  const novelty: number[] = new Array(T).fill(0);
  for (let t = 1; t < T - 1; t++) {
    const sim = dotProduct(normedContexts[t - 1], normedContexts[t + 1]);
    novelty[t] = 1 - sim;
  }

  return gaussianFilter1D(novelty, sigma);
}
