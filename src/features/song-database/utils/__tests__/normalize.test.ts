import { describe, it, expect } from "vitest";
import { normalizeSongInfo, levenshtein, similarity } from "../normalize";

describe("normalizeSongInfo", () => {
  it("produces consistent keys for identical songs", () => {
    const a = normalizeSongInfo("千本桜", "黒うさP");
    const b = normalizeSongInfo("千本桜", "黒うさP");
    expect(a).toBe(b);
  });

  it("normalizes katakana to hiragana", () => {
    const katakana = normalizeSongInfo("メルト", "supercell");
    const hiragana = normalizeSongInfo("めると", "supercell");
    expect(katakana).toBe(hiragana);
  });

  it("normalizes full-width to half-width", () => {
    const full = normalizeSongInfo("ＬＯＶＥ", "ＡＢＣ");
    const half = normalizeSongInfo("LOVE", "ABC");
    expect(full).toBe(half);
  });

  it("removes star symbols", () => {
    const withStar = normalizeSongInfo("千本桜★", "黒うさP♪");
    const without = normalizeSongInfo("千本桜", "黒うさP");
    expect(withStar).toBe(without);
  });

  it("normalizes music terms (feat/ft)", () => {
    const a = normalizeSongInfo("Song feat. Artist", "Band");
    const b = normalizeSongInfo("Song ft. Artist", "Band");
    expect(a).toBe(b);
  });

  it("normalizes music terms (remix/rmx)", () => {
    const a = normalizeSongInfo("Song Remix", "DJ");
    const b = normalizeSongInfo("Song rmx", "DJ");
    expect(a).toBe(b);
  });

  it("handles empty artist by using 'unknown'", () => {
    const a = normalizeSongInfo("Title", "");
    const b = normalizeSongInfo("Title", "unknown");
    expect(a).toBe(b);
  });

  it("ignores whitespace differences", () => {
    const a = normalizeSongInfo("千本 桜", "黒うさ P");
    const b = normalizeSongInfo("千本桜", "黒うさP");
    expect(a).toBe(b);
  });

  it("is case-insensitive", () => {
    const a = normalizeSongInfo("Love Song", "Artist");
    const b = normalizeSongInfo("love song", "artist");
    expect(a).toBe(b);
  });

  it("removes brackets of all types", () => {
    const a = normalizeSongInfo("Song(remix)", "Artist");
    const b = normalizeSongInfo("Song remix", "Artist");
    expect(a).toBe(b);
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "")).toBe(0);
  });

  it("returns string length for empty vs non-empty", () => {
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("returns correct distance for single edits", () => {
    expect(levenshtein("abc", "ab")).toBe(1); // deletion
    expect(levenshtein("abc", "abcd")).toBe(1); // insertion
    expect(levenshtein("abc", "adc")).toBe(1); // substitution
  });

  it("handles complex cases", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("returns 1 for two empty strings", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("returns 0 for completely different single-char strings", () => {
    expect(similarity("a", "b")).toBe(0);
  });

  it("returns correct ratio for partial matches", () => {
    const result = similarity("abcdef", "abcxyz");
    expect(result).toBeGreaterThan(0.4);
    expect(result).toBeLessThan(0.6);
  });

  it("returns higher similarity for more similar strings", () => {
    const close = similarity("千本桜", "千本桜remix");
    const far = similarity("千本桜", "completely different");
    expect(close).toBeGreaterThan(far);
  });
});
