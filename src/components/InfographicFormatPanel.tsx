/**
 * InfographicFormatPanel — Canva-style side drawer for restyling an already
 * rendered infographic without re-running SQL or an LLM call.
 *
 * The user picks a theme + tweaks accent / fonts / treatment toggles, hits
 * Apply, and the panel POSTs to /api/infographic/restyle/ which returns
 * fresh HTML for the same step. The viewer then swaps the iframe contents.
 *
 * Why a side drawer (not a modal):
 *   - The user is iterating on visuals — they want to see the infographic
 *     update next to the controls, not on top of it.
 *   - Drawer slides in from the right; the canvas reflows to make room.
 */

import { useState } from 'react';
import axios from 'axios';
import { Check, RotateCcw, X } from 'lucide-react';
import { BASE } from './constants';
import './InfographicFormatPanel.css';


export type ThemeOverrides = {
  accent?:              string;
  accent2?:             string;
  accent3?:             string;
  ink?:                 string;
  paper?:               string;
  family_display?:      string;
  family_body?:         string;
  hero_corner_glow?:    boolean;
  section_alternate_bg?: boolean;
  hook_bg_dark?:        boolean;
};

type ThemeId = 'brand' | 'editorial' | 'executive' | 'vivid' | 'mono' | 'night';

const THEMES: { id: ThemeId; label: string; swatches: [string, string, string] }[] = [
  { id: 'brand',     label: 'Brand Kit', swatches: ['#6366f1', '#ffffff', '#1e293b'] },
  { id: 'editorial', label: 'Editorial', swatches: ['#5b5bf0', '#f7f5f0', '#0e0e2e'] },
  { id: 'executive', label: 'Executive', swatches: ['#1e293b', '#ffffff', '#0f172a'] },
  { id: 'vivid',     label: 'Vivid',     swatches: ['#ec4899', '#fef7ff', '#1a0033'] },
  { id: 'mono',      label: 'Mono',      swatches: ['#0a0a0a', '#ffffff', '#0a0a0a'] },
  { id: 'night',     label: 'Night',     swatches: ['#818CF8', '#0B0B14', '#38BDF8'] },
];

// Curated accent palette — designer-picked, harmonize with each theme
const ACCENT_PALETTE = [
  '#5b5bf0', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#10b981',
  '#06b6d4', '#0ea5e9', '#1e293b', '#0a0a0a',
];

// Curated paper colors (page background)
const PAPER_PALETTE = [
  '#ffffff', '#fbfaf6', '#f7f5f0', '#fef7ff',
  '#f8fafc', '#fafaf9', '#fef3c7', '#e0f2fe',
];

const DISPLAY_FONTS = [
  'Fraunces', 'Playfair Display', 'Cormorant Garamond',
  'Inter', 'Space Grotesk', 'Manrope', 'Libre Franklin',
];

const BODY_FONTS = [
  'Inter', 'Work Sans', 'Manrope', 'Libre Franklin', 'Space Grotesk',
];


export function InfographicFormatPanel({
  open, stepId, currentTheme = 'editorial', onClose, onApplied,
}: {
  open: boolean;
  stepId: number;
  currentTheme?: ThemeId;
  onClose: () => void;
  onApplied: (newHtml: string, newTheme: string) => void;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(currentTheme);
  const [overrides, setOverrides] = useState<ThemeOverrides>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (delta: Partial<ThemeOverrides>) => setOverrides(o => ({ ...o, ...delta }));

  const reset = () => {
    setThemeId(currentTheme);
    setOverrides({});
    setError(null);
  };

  const apply = async () => {
    setSaving(true); setError(null);
    try {
      const r = await axios.post(`${BASE}/infographic/restyle/`, {
        step_id: stepId,
        theme_id: themeId,
        overrides,
      });
      onApplied(r.data.infographic_html, r.data.theme_id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to apply changes');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="ig-fmt-panel" aria-label="Format infographic">
      <header className="ig-fmt-panel__head">
        <h3>Format</h3>
        <button type="button" className="ig-fmt-panel__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className="ig-fmt-panel__body">

        {/* Theme presets */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Theme</div>
          <div className="ig-fmt-themes">
            {THEMES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`ig-fmt-theme ${themeId === t.id ? 'is-selected' : ''}`}
                onClick={() => setThemeId(t.id)}
                title={t.label}
              >
                <span className="ig-fmt-theme__swatches">
                  <span style={{ background: t.swatches[0] }} />
                  <span style={{ background: t.swatches[1] }} />
                  <span style={{ background: t.swatches[2] }} />
                </span>
                <span className="ig-fmt-theme__label">{t.label}</span>
                {themeId === t.id && <Check size={12} className="ig-fmt-theme__check" />}
              </button>
            ))}
          </div>
        </section>

        {/* Accent color */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Accent color</div>
          <div className="ig-fmt-swatch-row">
            {ACCENT_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                className={`ig-fmt-swatch ${overrides.accent === c ? 'is-selected' : ''}`}
                style={{ background: c }}
                onClick={() => patch({ accent: c })}
                title={c}
              />
            ))}
            <label className="ig-fmt-swatch ig-fmt-swatch--custom" title="Custom color">
              <input
                type="color"
                value={overrides.accent || '#5b5bf0'}
                onChange={e => patch({ accent: e.target.value })}
              />
            </label>
          </div>
        </section>

        {/* Page background */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Page background</div>
          <div className="ig-fmt-swatch-row">
            {PAPER_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                className={`ig-fmt-swatch ig-fmt-swatch--paper ${overrides.paper === c ? 'is-selected' : ''}`}
                style={{ background: c }}
                onClick={() => patch({ paper: c })}
                title={c}
              />
            ))}
            <label className="ig-fmt-swatch ig-fmt-swatch--custom" title="Custom color">
              <input
                type="color"
                value={overrides.paper || '#f7f5f0'}
                onChange={e => patch({ paper: e.target.value })}
              />
            </label>
          </div>
        </section>

        {/* Display font */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Display font (headlines)</div>
          <select
            className="ig-fmt-select"
            value={overrides.family_display || ''}
            onChange={e => patch({ family_display: e.target.value || undefined })}
          >
            <option value="">Theme default</option>
            {DISPLAY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </section>

        {/* Body font */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Body font</div>
          <select
            className="ig-fmt-select"
            value={overrides.family_body || ''}
            onChange={e => patch({ family_body: e.target.value || undefined })}
          >
            <option value="">Theme default</option>
            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </section>

        {/* Treatment toggles */}
        <section className="ig-fmt-sec">
          <div className="ig-fmt-sec__label">Treatment</div>
          <Toggle
            checked={overrides.hero_corner_glow ?? true}
            onChange={v => patch({ hero_corner_glow: v })}
            label="Hero corner glow"
          />
          <Toggle
            checked={overrides.section_alternate_bg ?? true}
            onChange={v => patch({ section_alternate_bg: v })}
            label="Alternate section backgrounds"
          />
          <Toggle
            checked={overrides.hook_bg_dark ?? true}
            onChange={v => patch({ hook_bg_dark: v })}
            label="Dark executive-summary panel"
          />
        </section>

        {error && <div className="ig-fmt-error">{error}</div>}
      </div>

      <footer className="ig-fmt-panel__foot">
        <button type="button" className="ig-fmt-btn ig-fmt-btn--ghost" onClick={reset} disabled={saving}>
          <RotateCcw size={13} /> Reset
        </button>
        <button type="button" className="ig-fmt-btn ig-fmt-btn--primary" onClick={apply} disabled={saving}>
          {saving ? 'Applying…' : 'Apply'}
        </button>
      </footer>
    </aside>
  );
}


function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="ig-fmt-toggle">
      <span className="ig-fmt-toggle__label">{label}</span>
      <span className={`ig-fmt-toggle__sw ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="ig-fmt-toggle__dot" />
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          tabIndex={-1}
        />
      </span>
    </label>
  );
}
