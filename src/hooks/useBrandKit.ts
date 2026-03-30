import { useState, useEffect } from 'react';
import axios from 'axios';
import type { BrandKit } from '../types/brandKit';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { generatePalette } from '../utils/brandPalette';
import { BASE } from '../components/constants';

// ── CSS injection ─────────────────────────────────────────────────────────────

const SHADOW_VALUES: Record<BrandKit['shadow_style'], string> = {
  none:     'none',
  subtle:   '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  elevated: '0 4px 16px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
};

/**
 * Inject brand-kit values as CSS custom properties on <html>.
 * Every chart, card, and infographic that references --brand-* picks these up
 * automatically without any prop drilling.
 */
export function applyBrandKitCSS(kit: BrandKit): void {
  const root = document.documentElement.style;
  root.setProperty('--brand-primary',      kit.primary_color);
  root.setProperty('--brand-secondary',    kit.secondary_color);
  root.setProperty('--brand-bg',           kit.bg_color);
  root.setProperty('--brand-text',         kit.text_color);
  root.setProperty('--brand-font-heading', `'${kit.heading_font}', sans-serif`);
  root.setProperty('--brand-font-body',    `'${kit.body_font}', sans-serif`);
  root.setProperty('--brand-radius',       `${kit.border_radius}px`);
  root.setProperty('--brand-shadow',       SHADOW_VALUES[kit.shadow_style]);

  const palette = generatePalette(kit.primary_color, kit.secondary_color);
  palette.forEach((color, i) => root.setProperty(`--brand-palette-${i}`, color));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseBrandKitResult {
  brandKit: BrandKit;
  loading:  boolean;
  saving:   boolean;
  error:    string | null;
  save:     (kit: BrandKit) => Promise<void>;
}

export function useBrandKit(): UseBrandKitResult {
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<BrandKit>(`${BASE}/brand-kit/`)
      .then(r => {
        setBrandKit(r.data);
        applyBrandKitCSS(r.data);
      })
      .catch(() => {
        // Unauthenticated or network error — apply defaults so CSS vars are set
        applyBrandKitCSS(DEFAULT_BRAND_KIT);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (kit: BrandKit): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const r = await axios.put<BrandKit>(`${BASE}/brand-kit/`, kit);
      setBrandKit(r.data);
      applyBrandKitCSS(r.data);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return { brandKit, loading, saving, error, save };
}
