import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatTimeSimple,
  formatDuration,
  parseTimeInput,
  normalizeTimeValue,
  validateAndClampTime,
  detectTimeCorruption,
} from "../time";

describe("parseTimeInput", () => {
  it("parses M:SS format", () => {
    expect(parseTimeInput("1:30")).toBe(90);
    expect(parseTimeInput("0:00")).toBe(0);
    expect(parseTimeInput("10:05")).toBe(605);
  });

  it("parses M:SS.s format with decimal seconds", () => {
    expect(parseTimeInput("1:30.5")).toBe(90.5);
    expect(parseTimeInput("0:00.1")).toBeCloseTo(0.1);
    expect(parseTimeInput("2:15.3")).toBeCloseTo(135.3);
  });

  it("parses raw number strings", () => {
    expect(parseTimeInput("90")).toBe(90);
    expect(parseTimeInput("0")).toBe(0);
    expect(parseTimeInput("90.5")).toBe(90.5);
  });

  it("returns 0 for invalid input", () => {
    expect(parseTimeInput("")).toBe(0);
    expect(parseTimeInput("abc")).toBe(0);
  });
});

describe("formatTime", () => {
  it("formats seconds to MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(605)).toBe("10:05");
  });

  it("formats decimal seconds to MM:SS.s", () => {
    expect(formatTime(90.5)).toBe("01:30.5");
    expect(formatTime(0.1)).toBe("00:00.1");
  });

  it("zero-pads minutes and seconds", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(65)).toBe("01:05");
  });
});

describe("formatTimeSimple", () => {
  it("formats without zero-padded minutes", () => {
    expect(formatTimeSimple(0)).toBe("0:00");
    expect(formatTimeSimple(90)).toBe("1:30");
    expect(formatTimeSimple(605)).toBe("10:05");
  });

  it("includes decimal when present", () => {
    expect(formatTimeSimple(90.5)).toBe("1:30.5");
  });
});

describe("formatDuration", () => {
  it("calculates and formats duration between two times", () => {
    expect(formatDuration(30, 120)).toBe("01:30");
    expect(formatDuration(0, 0)).toBe("00:00");
    expect(formatDuration(10, 70.5)).toBe("01:00.5");
  });
});

describe("normalizeTimeValue", () => {
  it("returns valid time values unchanged", () => {
    expect(normalizeTimeValue(90)).toBe(90);
    expect(normalizeTimeValue(0)).toBe(0);
    expect(normalizeTimeValue(0.5)).toBe(0.5);
  });

  it("returns 0 for NaN", () => {
    expect(normalizeTimeValue(NaN)).toBe(0);
  });

  it("returns 0 for negative values", () => {
    expect(normalizeTimeValue(-1)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(normalizeTimeValue(Infinity)).toBe(0);
  });
});

describe("validateAndClampTime", () => {
  it("returns currentTime when valid and within duration", () => {
    expect(validateAndClampTime(50, 100)).toBe(50);
  });

  it("clamps to duration when currentTime exceeds it", () => {
    expect(validateAndClampTime(150, 100)).toBe(100);
  });

  it("returns previousTime for NaN currentTime", () => {
    expect(validateAndClampTime(NaN, 100, 50)).toBe(50);
  });

  it("returns previousTime for negative currentTime", () => {
    expect(validateAndClampTime(-5, 100, 30)).toBe(30);
  });

  it("returns currentTime when duration is invalid", () => {
    expect(validateAndClampTime(50, 0)).toBe(50);
    expect(validateAndClampTime(50, -1)).toBe(50);
  });
});

describe("detectTimeCorruption", () => {
  it("returns false for normal values", () => {
    expect(detectTimeCorruption(50, 100)).toBe(false);
    expect(detectTimeCorruption(100, 100)).toBe(false);
    expect(detectTimeCorruption(150, 100)).toBe(false);
  });

  it("returns true when currentTime exceeds 2x duration", () => {
    expect(detectTimeCorruption(201, 100)).toBe(true);
    expect(detectTimeCorruption(1000, 100)).toBe(true);
  });

  it("returns false when duration is invalid", () => {
    expect(detectTimeCorruption(1000, 0)).toBe(false);
    expect(detectTimeCorruption(1000, -1)).toBe(false);
  });
});
