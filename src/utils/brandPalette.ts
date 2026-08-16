// ── Pure HSL color math — no external dependencies ────────────────────────────

/** Convert #rrggbb hex to [h(0–360), s(0–100), l(0–100)]. */
export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function _hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Convert [h(0–360), s(0–100), l(0–100)] to #rrggbb. */
export function hslToHex(h: number, s: number, l: number): string {
  const hN = h / 360, sN = s / 100, lN = l / 100;
  let r: number, g: number, b: number;
  if (sN === 0) {
    r = g = b = lN;
  } else {
    const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
    const p = 2 * lN - q;
    r = _hue2rgb(p, q, hN + 1 / 3);
    g = _hue2rgb(p, q, hN);
    b = _hue2rgb(p, q, hN - 1 / 3);
  }
  return (
    '#' +
    [r, g, b]
      .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Generate a 10-colour harmonious palette anchored on two brand colours.
 *
 * Strategy:
 *   0 – primary (exact)
 *   1 – secondary (exact)
 *   2 – primary +30° hue (analogous warm)
 *   3 – primary +60° hue (split-complementary)
 *   4 – primary +180° hue (complementary)
 *   5 – primary +210° (complementary-warm)
 *   6 – primary, lightened  20 pts (tint)
 *   7 – primary +150°, darkened 10 pts (cool accent)
 *   8 – primary +90°  (triadic)
 *   9 – primary +270° (triadic complement)
 */
export function generatePalette(primary: string, secondary: string): string[] {
  const [h, s, l] = hexToHsl(primary);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const rot = (deg: number) => (h + deg) % 360;

  return [
    primary,
    secondary,
    hslToHex(rot(30),  s,                        l),
    hslToHex(rot(60),  clamp(s + 10, 20, 95),    l),
    hslToHex(rot(180), s,                        l),
    hslToHex(rot(210), clamp(s - 10, 20, 95),    clamp(l + 5, 20, 80)),
    hslToHex(h,        clamp(s - 20, 20, 95),    clamp(l + 20, 30, 82)),
    hslToHex(rot(150), s,                        clamp(l - 10, 20, 80)),
    hslToHex(rot(90),  clamp(s - 15, 20, 95),    l),
    hslToHex(rot(270), clamp(s + 5,  20, 95),    l),
  ];
}

/**
 * The chart series palette for a brand kit.
 *
 * Honors the user's explicitly curated `chart_colors` when they've set at
 * least three; otherwise falls back to the harmonious auto-generated palette.
 * Always returns 10 colours (cycling the source list) so every chart slot and
 * `--brand-palette-{0..9}` var is populated.
 */
export function brandChartColors(kit: {
  chart_colors?: string[];
  primary_color: string;
  secondary_color: string;
}): string[] {
  const base =
    kit.chart_colors && kit.chart_colors.length >= 3
      ? kit.chart_colors
      : generatePalette(kit.primary_color, kit.secondary_color);
  return Array.from({ length: 10 }, (_, i) => base[i % base.length]);
}

/** [h,s,l] → adjust lightness by `d` points, clamped. */
function shiftL(hex: string, d: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, Math.max(0, l + d)));
}

/** Darken a hex colour by `pts` lightness points. */
export function darken(hex: string, pts: number): string { return shiftL(hex, -pts); }
/** Lighten a hex colour by `pts` lightness points. */
export function lighten(hex: string, pts: number): string { return shiftL(hex, pts); }

/** A very light, low-chroma tint of a colour — for subtle accent backgrounds. */
export function tint(hex: string): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, 72), 95);
}

/** rgba() string from a hex colour + alpha. */
export function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Read the brand palette that was injected into CSS custom properties by
 * applyBrandKitCSS().  Falls back to indigo if a var is missing.
 */
export function getBrandPaletteColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return Array.from({ length: 10 }, (_, i) => {
    const v = style.getPropertyValue(`--brand-palette-${i}`).trim();
    return v || '#6366f1';
  });
}
