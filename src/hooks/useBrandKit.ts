import { useState, useEffect } from 'react';
import axios from 'axios';
import type { BrandKit } from '../types/brandKit';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { brandChartColors, darken, tint, rgba } from '../utils/brandPalette';
import { BASE } from '../components/constants';

// ── CSS injection ─────────────────────────────────────────────────────────────

const SHADOW_VALUES: Record<string, string> = {
  none:     'none',
  subtle:   '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  medium:   '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
  elevated: '0 4px 16px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const isHex = (v: string) => HEX_RE.test((v || '').trim());

/** Set or clear an element-level custom property. */
function setVar(style: CSSStyleDeclaration, name: string, value: string | null): void {
  if (value) style.setProperty(name, value);
  else style.removeProperty(name);
}

/** Load the chosen heading/body fonts from Google Fonts (idempotent). */
function loadBrandFonts(kit: BrandKit): void {
  const families = Array.from(new Set([kit.heading_font, kit.body_font].filter(Boolean)));
  if (!families.length) return;
  const spec = families
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${spec}&display=swap`;
  let link = document.getElementById('brand-kit-fonts') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'brand-kit-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Inject brand-kit values as CSS custom properties on <html>.
 *
 * Two channels, deliberately:
 *   1. Inline vars on documentElement — apply in BOTH light & dark. These are
 *      the safe, hue-only overrides: the accent colour, semantic feedback
 *      colours, fonts, and the raw --brand-* vars.
 *   2. A dark-gated <style> block — the surface/text/border overrides that only
 *      make sense against a light canvas. Scoping to :root:not([data-theme=dark])
 *      means the app's tuned dark palette always wins in dark mode, so a
 *      light-oriented brand kit can never wreck the dark theme.
 */
export function applyBrandKitCSS(kit: BrandKit): void {
  const root = document.documentElement.style;
  const primary   = isHex(kit.primary_color)   ? kit.primary_color   : DEFAULT_BRAND_KIT.primary_color;
  const secondary = isHex(kit.secondary_color) ? kit.secondary_color : DEFAULT_BRAND_KIT.secondary_color;

  // ── Raw --brand-* vars (kept for compat + JS readers) ──────────────────────
  root.setProperty('--brand-primary',        primary);
  root.setProperty('--brand-secondary',      secondary);
  root.setProperty('--brand-accent',         kit.accent_color);
  root.setProperty('--brand-bg',             kit.bg_color);
  root.setProperty('--brand-surface',        kit.surface_color);
  root.setProperty('--brand-text',           kit.text_color);
  root.setProperty('--brand-text-secondary', kit.text_secondary);
  root.setProperty('--brand-border',         kit.border_color);
  root.setProperty('--brand-success',  kit.success_color);
  root.setProperty('--brand-warning',  kit.warning_color);
  root.setProperty('--brand-danger',   kit.danger_color);
  root.setProperty('--brand-info',     kit.info_color);
  root.setProperty('--brand-font-heading', `'${kit.heading_font}', sans-serif`);
  root.setProperty('--brand-font-body',    `'${kit.body_font}', sans-serif`);
  root.setProperty('--brand-font-size',    `${kit.base_font_size}px`);
  root.setProperty('--brand-radius', `${kit.border_radius}px`);
  root.setProperty('--brand-shadow', SHADOW_VALUES[kit.shadow_style] || SHADOW_VALUES.subtle);

  // ── Channel 1: accent + semantics + fonts (both modes) ─────────────────────
  // The single highest-impact bridge: the app's accent token consumed ~150×.
  root.setProperty('--theme-accent', primary);
  root.setProperty('--accent-default', primary);
  root.setProperty('--accent-strong', darken(primary, 12));
  // Semantic feedback colours actually consumed by tokens.css.
  if (isHex(kit.success_color)) root.setProperty('--color-success-default', kit.success_color);
  if (isHex(kit.warning_color)) root.setProperty('--color-warning-default', kit.warning_color);
  if (isHex(kit.danger_color))  root.setProperty('--color-danger-default',  kit.danger_color);
  if (isHex(kit.info_color))    root.setProperty('--color-info-default',    kit.info_color);
  // Typography — override the primary UI font stack + load the webfonts.
  setVar(root, '--font-ui', kit.body_font ? `'${kit.body_font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` : null);
  loadBrandFonts(kit);

  // ── Chart series palette (honors curated chart_colors) ─────────────────────
  brandChartColors(kit).forEach((color, i) => root.setProperty(`--brand-palette-${i}`, color));
  (kit.chart_colors || []).forEach((color, i) => root.setProperty(`--brand-chart-${i}`, color));

  // ── Channel 2: light-mode surface/text/border theming (dark-gated) ─────────
  const bg      = isHex(kit.bg_color)      ? kit.bg_color      : null;
  const surface = isHex(kit.surface_color) ? kit.surface_color : null;
  const text    = isHex(kit.text_color)    ? kit.text_color    : null;
  const textSec = isHex(kit.text_secondary)? kit.text_secondary: null;
  const border  = isHex(kit.border_color)  ? kit.border_color  : null;
  const lightRules = [
    bg      && `--theme-bg-app: ${bg};`,
    bg      && `--bg-canvas: ${bg};`,
    surface && `--theme-bg-card: ${surface};`,
    surface && `--theme-bg-sidebar: ${surface};`,
    surface && `--theme-bg-header: ${surface};`,
    surface && `--bg-surface: ${surface};`,
    surface && `--bg-elevated: ${surface};`,
    text    && `--theme-text-main: ${text};`,
    text    && `--text-primary: ${text};`,
    textSec && `--theme-text-secondary: ${textSec};`,
    border  && `--theme-border: ${border};`,
    border  && `--border-default: ${border};`,
    `--theme-accent-hover: ${darken(primary, 8)};`,
    `--theme-accent-light: ${tint(primary)};`,
    `--accent-subtle: ${tint(primary)};`,
    `--ring-default: 0 0 0 3px ${rgba(primary, 0.22)};`,
  ].filter(Boolean).join(' ');
  upsertStyle('brand-kit-tokens', `:root:not([data-theme="dark"]) { ${lightRules} }`);

  // ── Custom CSS (idempotent) ────────────────────────────────────────────────
  if (kit.custom_css) upsertStyle('brand-kit-custom-css', kit.custom_css);
  else document.getElementById('brand-kit-custom-css')?.remove();
}

/** Create/update a <style> element by id (idempotent). */
function upsertStyle(id: string, css: string): void {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/**
 * Set the app's light/dark mode from the brand kit's theme_mode — but only when
 * the visitor hasn't made their own explicit choice (no 'lr_theme' in storage),
 * so a user's manual toggle always wins over the org default.
 */
export function applyBrandThemeMode(kit: BrandKit): void {
  try {
    if (localStorage.getItem('lr_theme')) return; // user already chose
  } catch { /* ignore */ }
  let mode: 'light' | 'dark';
  if (kit.theme_mode === 'dark') mode = 'dark';
  else if (kit.theme_mode === 'auto') {
    mode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else mode = 'light';
  document.documentElement.setAttribute('data-theme', mode);
}

/** Point the browser favicon at the brand kit's favicon, if set. */
export function applyBrandFavicon(kit: BrandKit): void {
  if (!kit.favicon_url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (link.href !== kit.favicon_url) link.href = kit.favicon_url;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseBrandKitResult {
  brandKit: BrandKit;
  loading:  boolean;
  saving:   boolean;
  error:    string | null;
  save:     (kit: BrandKit) => Promise<void>;
}

/** Merge fetched data over defaults so new fields always have a value. */
function mergeWithDefaults(data: Partial<BrandKit>): BrandKit {
  return { ...DEFAULT_BRAND_KIT, ...data };
}

export function useBrandKit(): UseBrandKitResult {
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${BASE}/brand-kit/`)
      .then(r => {
        const kit = mergeWithDefaults(r.data);
        setBrandKit(kit);
        applyBrandKitCSS(kit);
        applyBrandThemeMode(kit);
        applyBrandFavicon(kit);
      })
      .catch(() => {
        applyBrandKitCSS(DEFAULT_BRAND_KIT);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (kit: BrandKit): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const r = await axios.put(`${BASE}/brand-kit/`, kit);
      const saved = mergeWithDefaults(r.data);
      setBrandKit(saved);
      applyBrandKitCSS(saved);
      applyBrandFavicon(saved);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return { brandKit, loading, saving, error, save };
}
