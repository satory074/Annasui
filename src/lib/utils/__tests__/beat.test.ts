import { describe, it, expect } from "vitest";
import { beatToSeconds, secondsToBeat, hasBpm } from "../beat";

describe("beatToSeconds", () => {
  it("converts beat 1 to offset", () => {
    expect(beatToSeconds(1, 128, 1.0)).toBeCloseTo(1.0);
  });

  it("converts beat 9 correctly (BPM=128, offset=1.0)", () => {
    // (9 - 1) * (60 / 128) + 1.0 = 8 * 0.46875 + 1.0 = 4.75
    expect(beatToSeconds(9, 128, 1.0)).toBeCloseTo(4.75);
  });

  it("works with zero offset", () => {
    // beat 2 at BPM=120: (2-1) * (60/120) + 0 = 0.5s
    expect(beatToSeconds(2, 120, 0)).toBeCloseTo(0.5);
  });
});

describe("secondsToBeat", () => {
  it("converts offset seconds to beat 1", () => {
    expect(secondsToBeat(1.0, 128, 1.0)).toBe(1);
  });

  it("converts 4.75s to beat 9 (BPM=128, offset=1.0)", () => {
    expect(secondsToBeat(4.75, 128, 1.0)).toBe(9);
  });

  it("rounds to nearest beat", () => {
    // BPM=120: beat interval = 0.5s. Beat 1=0s, beat 2=0.5s, beat 3=1.0s
    // 0.2s → (0.2/0.5)+1=1.4 → beat 1
    expect(secondsToBeat(0.2, 120, 0)).toBe(1);
    // 0.7s → (0.7/0.5)+1=2.4 → beat 2
    expect(secondsToBeat(0.7, 120, 0)).toBe(2);
  });
});

describe("hasBpm", () => {
  it("returns true for positive number", () => {
    expect(hasBpm(128)).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(hasBpm(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasBpm(null)).toBe(false);
  });

  it("returns false for zero", () => {
    expect(hasBpm(0)).toBe(false);
  });

  it("returns false for negative", () => {
    expect(hasBpm(-1)).toBe(false);
  });
});
