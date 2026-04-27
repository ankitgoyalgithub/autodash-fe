import { useState, useEffect } from 'react';
import axios from 'axios';
import type { BrandKit } from '../types/brandKit';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { generatePalette } from '../utils/brandPalette';
import { BASE } from '../components/constants';

// ── CSS injection ─────────────────────────────────────────────────────────────

const SHADOW_VALUES: Record<string, string> = {
  none:     'none',
  subtle:   '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  medium:   '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
  elevated: '0 4px 16px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
};

/**
 * Inject brand-kit values as CSS custom properties on <html>.
 * Every chart, card, and infographic that references --brand-* picks these up
 * automatically without any prop drilling.
 */
export function applyBrandKitCSS(kit: BrandKit): void {
  const root = document.documentElement.style;

  // Core palette
  root.setProperty('--brand-primary',        kit.primary_color);
  root.setProperty('--brand-secondary',      kit.secondary_color);
  root.setProperty('--brand-accent',         kit.accent_color);
  root.setProperty('--brand-bg',             kit.bg_color);
  root.setProperty('--brand-surface',        kit.surface_color);
  root.setProperty('--brand-text',           kit.text_color);
  root.setProperty('--brand-text-secondary', kit.text_secondary);
  root.setProperty('--brand-border',         kit.border_color);

  // Semantic
  root.setProperty('--brand-success',  kit.success_color);
  root.setProperty('--brand-warning',  kit.warning_color);
  root.setProperty('--brand-danger',   kit.danger_color);
  root.setProperty('--brand-info',     kit.info_color);

  // Typography
  root.setProperty('--brand-font-heading', `'${kit.heading_font}', sans-serif`);
  root.setProperty('--brand-font-body',    `'${kit.body_font}', sans-serif`);
  root.setProperty('--brand-font-size',    `${kit.base_font_size}px`);

  // Style
  root.setProperty('--brand-radius', `${kit.border_radius}px`);
  root.setProperty('--brand-shadow', SHADOW_VALUES[kit.shadow_style] || SHADOW_VALUES.subtle);

  // Auto-generated palette
  const palette = generatePalette(kit.primary_color, kit.secondary_color);
  palette.forEach((color, i) => root.setProperty(`--brand-palette-${i}`, color));

  // Chart series colors
  (kit.chart_colors || []).forEach((color, i) =>
    root.setProperty(`--brand-chart-${i}`, color)
  );

  // Inject custom CSS (idempotent)
  if (kit.custom_css) {
    let styleEl = document.getElementById('brand-kit-custom-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'brand-kit-custom-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = kit.custom_css;
  } else {
    document.getElementById('brand-kit-custom-css')?.remove();
  }
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
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return { brandKit, loading, saving, error, save };
}
