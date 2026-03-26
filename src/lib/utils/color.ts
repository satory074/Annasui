/**
 * Color utilities for pastel color generation and conversion.
 */

/** Convert a hex color string (#RRGGBB) to HSL [h:0-360, s:0-100, l:0-100]. */
export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Convert HSL values to a hex color string (#RRGGBB). */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + hNorm * 12) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Clamp any hex color into the pastel range (S: 55-75%, L: 60-75%). */
export function toPastelHex(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const clampedS = Math.max(55, Math.min(75, s));
  const clampedL = Math.max(60, Math.min(75, l));
  return hslToHex(h, clampedS, clampedL);
}

/** Generate a random pastel color as a hex string (#RRGGBB). */
export function randomPastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const s = 55 + Math.floor(Math.random() * 20);
  const l = 60 + Math.floor(Math.random() * 15);
  return hslToHex(hue, s, l);
}
