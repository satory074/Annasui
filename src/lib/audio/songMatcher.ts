/**
 * CSIDE Stage 2: 楽曲マッチング (TypeScript移植)
 * 元実装: cside/segmentation/medley.py, cside/retrieval/index.py
 *
 * 各区間の平均プール埋め込みと song_master 埋め込みのコサイン類似度で楽曲を特定する。
 */

/** song_master エントリの埋め込みキャッシュ */
export interface SongEmbedding {
  /** song_master.id (UUID) */
  songId: string;
  /** L2正規化済み 1024次元埋め込み */
  embedding: Float32Array;
}

export interface MatchResult {
  songId: string;
  score: number;
  isUnknown: boolean;
  isMashup: boolean;
  /** マッシュアップ判定時の候補曲ID列 */
  mashupSongs: string[];
}

export interface SongMatcherOptions {
  /** Top-k検索数 (default: 5) */
  topK?: number;
  /** 不明楽曲判定: best_score 下限閾値 (default: 0.5) */
  unknownThreshold?: number;
  /** 不明楽曲判定: best/mean 比率下限閾値 (default: 1.2) */
  unknownRatioThreshold?: number;
  /** マッシュアップ判定: 2位スコアが1位の何倍以上なら (default: 0.85) */
  mashupRatio?: number;
}

/**
 * L2ノルムでベクトルを正規化する
 */
export function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return new Float32Array(vec.length);
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/**
 * コサイン類似度（L2正規化済みベクトルの内積）
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return Math.max(-1, Math.min(1, s)); // clamp to [-1, 1]
}

/**
 * 区間の平均プール埋め込みを計算する
 *
 * @param frameEmbeddings - フレーム埋め込み列（当該区間のフレームのみ）
 * @returns 平均プール後のL2正規化済みベクトル
 */
export function meanPoolEmbeddings(frameEmbeddings: Float32Array[]): Float32Array {
  if (frameEmbeddings.length === 0) return new Float32Array(1024);
  const D = frameEmbeddings[0].length;
  const mean = new Float32Array(D);
  for (const emb of frameEmbeddings) {
    for (let d = 0; d < D; d++) mean[d] += emb[d];
  }
  for (let d = 0; d < D; d++) mean[d] /= frameEmbeddings.length;
  return l2Normalize(mean);
}

/**
 * Top-k コサイン類似度検索
 *
 * @param query - L2正規化済みクエリベクトル
 * @param candidates - 検索対象の埋め込み一覧
 * @param k - 返す件数
 * @returns スコア降順の結果
 */
function topKSearch(
  query: Float32Array,
  candidates: SongEmbedding[],
  k: number
): Array<{ songId: string; score: number }> {
  const scores = candidates.map((c) => ({
    songId: c.songId,
    score: cosineSimilarity(query, c.embedding),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}

/**
 * 楽曲マッチング
 *
 * @param segEmbedding - 区間の平均プール済みL2正規化埋め込み
 * @param candidates - song_master 埋め込み一覧
 * @param options - ハイパーパラメータ
 * @returns マッチング結果
 */
export function matchSong(
  segEmbedding: Float32Array,
  candidates: SongEmbedding[],
  options: SongMatcherOptions = {}
): MatchResult {
  const {
    topK = 5,
    unknownThreshold = 0.5,
    unknownRatioThreshold = 1.2,
    mashupRatio = 0.85,
  } = options;

  if (candidates.length === 0) {
    return {
      songId: "",
      score: 0,
      isUnknown: true,
      isMashup: false,
      mashupSongs: [],
    };
  }

  const k = Math.min(topK, candidates.length);
  const topResults = topKSearch(segEmbedding, candidates, k);

  const best = topResults[0];
  const meanScore =
    topResults.reduce((s, r) => s + r.score, 0) / topResults.length;

  // 不明楽曲判定
  const isUnknown =
    best.score < unknownThreshold ||
    (meanScore > 0 && best.score / meanScore < unknownRatioThreshold);

  // マッシュアップ判定（2位以降が1位の mashupRatio 倍以上のスコア）
  let isMashup = false;
  const mashupSongs: string[] = [];
  if (!isUnknown && topResults.length >= 2) {
    const second = topResults[1];
    if (second.score >= best.score * mashupRatio) {
      isMashup = true;
      for (const r of topResults) {
        if (r.score >= best.score * mashupRatio) {
          mashupSongs.push(r.songId);
        }
      }
    }
  }

  return {
    songId: isUnknown ? "" : best.songId,
    score: best.score,
    isUnknown,
    isMashup,
    mashupSongs,
  };
}

/**
 * 区間フレームインデックスから平均プール埋め込みを計算してマッチング
 *
 * @param allEmbeddings - 全フレーム埋め込み列
 * @param startFrame - 区間開始フレーム（inclusive）
 * @param endFrame - 区間終了フレーム（exclusive）
 * @param candidates - song_master 埋め込み一覧
 * @param options - ハイパーパラメータ
 */
export function matchSegment(
  allEmbeddings: Float32Array[],
  startFrame: number,
  endFrame: number,
  candidates: SongEmbedding[],
  options: SongMatcherOptions = {}
): MatchResult {
  const segFrames = allEmbeddings.slice(startFrame, endFrame);
  const segEmbedding = meanPoolEmbeddings(segFrames);
  return matchSong(segEmbedding, candidates, options);
}
