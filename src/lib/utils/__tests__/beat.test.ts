import { describe, it, expect } from "vitest";
import { beatToSeconds, secondsToBeat, hasBpm, snapToSixteenth } from "../beat";

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

describe("snapToSixteenth", () => {
  it("snaps 0.1s to 0.125s (BPM=120, offset=0)", () => {
    // 16th note duration = (60/120)/4 = 0.125s
    // nearest 16th to 0.1s: round(0.1/0.125) * 0.125 = round(0.8) * 0.125 = 1 * 0.125 = 0.125
    expect(snapToSixteenth(0.1, 120, 0)).toBeCloseTo(0.125);
  });

  it("keeps 0.0s at 0.0s (BPM=120, offset=0)", () => {
    expect(snapToSixteenth(0.0, 120, 0)).toBeCloseTo(0.0);
  });

  it("clamps result to 0 when offset pushes below zero", () => {
    // offset=1.0, seconds=0.9 → (0.9-1.0)/0.125 = -0.8 → round = -1 → -1*0.125+1=0.875
    // This should be >= 0 in all cases
    expect(snapToSixteenth(0.0, 120, 1.0)).toBeGreaterThanOrEqual(0);
  });

  it("snaps correctly with BPM=128, offset=1.0", () => {
    // 16th duration = (60/128)/4 = 0.1171875s
    // seconds=2.0: (2.0-1.0)/0.1171875 = 8.533... → round=9 → 9*0.1171875+1=2.0546875
    expect(snapToSixteenth(2.0, 128, 1.0)).toBeCloseTo(2.0546875);
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
