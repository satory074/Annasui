import { describe, it, expect } from "vitest";
import { randomPastelColor, toPastelHex, hexToHsl, hslToHex } from "../color";

describe("randomPastelColor", () => {
  it("returns a valid hex color string", () => {
    const color = randomPastelColor();
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns a color in the pastel range", () => {
    for (let i = 0; i < 20; i++) {
      const color = randomPastelColor();
      const [, s, l] = hexToHsl(color);
      expect(s).toBeGreaterThanOrEqual(54); // allow rounding
      expect(s).toBeLessThanOrEqual(76);
      expect(l).toBeGreaterThanOrEqual(59);
      expect(l).toBeLessThanOrEqual(76);
    }
  });
});

describe("toPastelHex", () => {
  it("clamps a dark color to pastel range", () => {
    const result = toPastelHex("#1a1a2e"); // very dark
    const [, s, l] = hexToHsl(result);
    expect(s).toBeGreaterThanOrEqual(55);
    expect(l).toBeGreaterThanOrEqual(60);
    expect(l).toBeLessThanOrEqual(75);
  });

  it("clamps a highly saturated color", () => {
    const result = toPastelHex("#ff0000"); // pure red
    const [, s, l] = hexToHsl(result);
    expect(s).toBeLessThanOrEqual(75);
    expect(l).toBeGreaterThanOrEqual(60);
  });

  it("keeps a color already in pastel range", () => {
    // A pastel-ish color (H≈200, S≈65, L≈70)
    const pastel = hslToHex(200, 65, 70);
    const result = toPastelHex(pastel);
    const [, s, l] = hexToHsl(result);
    expect(s).toBeGreaterThanOrEqual(55);
    expect(s).toBeLessThanOrEqual(75);
    expect(l).toBeGreaterThanOrEqual(60);
    expect(l).toBeLessThanOrEqual(75);
  });
});

describe("hexToHsl / hslToHex round-trip", () => {
  it("round-trips for pure red", () => {
    const [h, s, l] = hexToHsl("#ff0000");
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
    const hex = hslToHex(h, s, l);
    expect(hex).toBe("#ff0000");
  });

  it("round-trips for a mid-tone color", () => {
    const original = hslToHex(180, 60, 65);
    const [h, s, l] = hexToHsl(original);
    const result = hslToHex(h, s, l);
    // Allow ±1 difference due to rounding
    const diff = (a: string, b: string) =>
      Math.abs(parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16));
    expect(diff(original, result)).toBeLessThanOrEqual(0x010101);
  });

  it("handles black correctly", () => {
    const [h, s, l] = hexToHsl("#000000");
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it("handles white correctly", () => {
    const [h, s, l] = hexToHsl("#ffffff");
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBe(100);
  });
});
