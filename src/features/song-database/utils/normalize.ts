/**
 * Song info normalization utilities for duplicate detection and search.
 * Ported from lib/utils/songDatabase.ts — standalone, no DB dependencies.
 */

function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (m) =>
    String.fromCharCode(m.charCodeAt(0) - 0x60)
  );
}

function toHalfWidth(text: string): string {
  return text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (m) =>
    String.fromCharCode(m.charCodeAt(0) - 0xfee0)
  );
}

function normalizeMusicTerms(text: string): string {
  return text
    .replace(/\b(?:feat\.?|featuring|ft\.?)\b/gi, "feat")
    .replace(/\b(?:vs\.?|versus)\b/gi, "vs")
    .replace(/\b(?:rmx|remix)\b/gi, "remix")
    .replace(/\b(?:カバー|cover)\b/gi, "cover")
    .replace(/\b(?:inst\.?|instrumental|インスト)\b/gi, "inst")
    .replace(/\b(?:acoustic|アコースティック)\b/gi, "acoustic");
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .replace(/[（）()［］\[\]｛｝{}「」『』]/g, "")
    .replace(/[～〜~]/g, "")
    .replace(/[！!？?]/g, "")
    .replace(/[＆&]/g, "and")
    .replace(/[＋+]/g, "plus")
    .replace(/[×x]/gi, "x")
    .replace(/[♪♫♬]/g, "")
    .replace(/[★☆]/g, "")
    .replace(/[♡♥]/g, "")
    .replace(/[※]/g, "")
    .replace(/[-－ー—–]/g, "")
    .replace(/[。、]/g, "");
}

/**
 * Produces a normalized dedup key from title + artist.
 * Used for duplicate detection in song_master.normalized_id.
 */
export function normalizeSongInfo(title: string, artist: string): string {
  const normalized = (s: string) =>
    normalizeText(normalizeMusicTerms(toHalfWidth(katakanaToHiragana(s))));

  const effectiveArtist = artist?.trim() || "unknown";
  return `${normalized(title)}_${normalized(effectiveArtist)}`;
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Similarity ratio (0–1) between two strings based on Levenshtein distance.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}
