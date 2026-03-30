import { useState, useEffect } from 'react';
import { Save, RotateCcw, Upload, Palette, Type, Maximize2, Layers } from 'lucide-react';
import type { BrandKit } from '../types/brandKit';
import { DEFAULT_BRAND_KIT, BRAND_FONTS, SHADOW_OPTIONS } from '../types/brandKit';
import { generatePalette } from '../utils/brandPalette';
import type { UseBrandKitResult } from '../hooks/useBrandKit';
import { BASE } from './constants';
import axios from 'axios';

// ── Colour swatch input ───────────────────────────────────────────────────────

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bk-color-field">
      <label className="bk-field-label">{label}</label>
      <div className="bk-color-row">
        <div className="bk-color-swatch-wrap">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bk-color-native"
          />
          <div className="bk-color-swatch" style={{ background: value }} />
        </div>
        <input
          type="text"
          className="bk-hex-input"
          value={value}
          maxLength={7}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}

// ── Palette preview strip ─────────────────────────────────────────────────────

function PalettePreview({ primary, secondary }: { primary: string; secondary: string }) {
  const colors = generatePalette(primary, secondary);
  return (
    <div className="bk-palette-preview">
      {colors.map((c, i) => (
        <div key={i} className="bk-palette-dot" style={{ background: c }} title={c} />
      ))}
    </div>
  );
}

// ── Live card preview ─────────────────────────────────────────────────────────

function LivePreview({ draft }: { draft: BrandKit }) {
  const palette = generatePalette(draft.primary_color, draft.secondary_color);
  const barData = [65, 82, 48, 91, 74, 60];
  const maxVal = Math.max(...barData);

  const shadows: Record<BrandKit['shadow_style'], string> = {
    none:     'none',
    subtle:   '0 1px 4px rgba(0,0,0,0.08)',
    elevated: '0 4px 16px rgba(0,0,0,0.14)',
  };

  return (
    <div
      className="bk-preview-card"
      style={{
        background:   draft.bg_color,
        color:        draft.text_color,
        borderRadius: draft.border_radius,
        boxShadow:    shadows[draft.shadow_style],
        fontFamily:   `'${draft.body_font}', sans-serif`,
        border:       `1px solid ${draft.text_color}18`,
      }}
    >
      {draft.logo_url && (
        <img src={draft.logo_url} alt="logo" className="bk-preview-logo" />
      )}
      <div
        className="bk-preview-title"
        style={{ fontFamily: `'${draft.heading_font}', sans-serif`, color: draft.text_color }}
      >
        Monthly Revenue
      </div>
      <div className="bk-preview-metric" style={{ color: draft.primary_color }}>
        $128,400
        <span className="bk-preview-badge" style={{ background: palette[1] + '22', color: palette[1] }}>
          ↑ 12%
        </span>
      </div>

      {/* Mini bar chart */}
      <div className="bk-preview-bars">
        {barData.map((v, i) => (
          <div key={i} className="bk-preview-bar-wrap">
            <div
              className="bk-preview-bar"
              style={{
                height:       `${(v / maxVal) * 100}%`,
                background:   palette[i % palette.length],
                borderRadius: `${Math.min(draft.border_radius, 4)}px ${Math.min(draft.border_radius, 4)}px 0 0`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="bk-preview-labels" style={{ color: draft.text_color + '80' }}>
        <span>Jan</span><span>Feb</span><span>Mar</span>
        <span>Apr</span><span>May</span><span>Jun</span>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bk-section">
      <div className="bk-section-header">
        <span className="bk-section-icon">{icon}</span>
        <span className="bk-section-title">{title}</span>
      </div>
      <div className="bk-section-body">{children}</div>
    </div>
  );
}

// ── Main BrandKitEditor ───────────────────────────────────────────────────────

export function BrandKitEditor({
  brandKit, saving, error, save,
}: Pick<UseBrandKitResult, 'brandKit' | 'saving' | 'error' | 'save'>) {
  const [draft, setDraft] = useState<BrandKit>(brandKit);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Sync draft when saved brandKit changes (e.g. on first load)
  useEffect(() => { setDraft(brandKit); }, [brandKit]);

  const update = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => {
    setSaved(false);
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await save(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setDraft(DEFAULT_BRAND_KIT);
    setSaved(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setLogoUploading(true);
    try {
      const r = await axios.post(`${BASE}/upload/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      update('logo_url', r.data.url);
    } catch {
      // silent — user can enter URL manually
    } finally {
      setLogoUploading(false);
    }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(brandKit);

  return (
    <div className="canva-home">
      {/* ── Hero ── */}
      <div className="canva-home-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="canva-home-title">Brand Kit</h1>
            <p style={{ fontSize: 14, color: '#6b6880', marginTop: 4, maxWidth: 520 }}>
              Define your design language once. It flows automatically into every chart, dashboard, and report.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="bk-btn-ghost" onClick={handleReset} title="Reset to defaults">
              <RotateCcw size={14} /> Reset
            </button>
            <button
              className={`bk-btn-save ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              <Save size={14} />
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Brand Kit'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bk-error">{error}</div>
      )}

      <div className="bk-layout">
        {/* ── Left: Controls ── */}
        <div className="bk-controls">

          {/* Colors */}
          <Section icon={<Palette size={15} />} title="Brand Colors">
            <div className="bk-color-grid">
              <ColorField label="Primary" value={draft.primary_color}   onChange={v => update('primary_color', v)} />
              <ColorField label="Secondary" value={draft.secondary_color} onChange={v => update('secondary_color', v)} />
              <ColorField label="Background" value={draft.bg_color}      onChange={v => update('bg_color', v)} />
              <ColorField label="Text"       value={draft.text_color}     onChange={v => update('text_color', v)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="bk-field-label" style={{ marginBottom: 6 }}>Generated Palette</div>
              <PalettePreview primary={draft.primary_color} secondary={draft.secondary_color} />
            </div>
          </Section>

          {/* Typography */}
          <Section icon={<Type size={15} />} title="Typography">
            <div className="bk-font-grid">
              <div>
                <div className="bk-field-label">Heading Font</div>
                <select
                  className="bk-select"
                  value={draft.heading_font}
                  onChange={e => update('heading_font', e.target.value)}
                >
                  {BRAND_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <div className="bk-font-sample" style={{ fontFamily: `'${draft.heading_font}', sans-serif` }}>
                  Dashboard Title
                </div>
              </div>
              <div>
                <div className="bk-field-label">Body Font</div>
                <select
                  className="bk-select"
                  value={draft.body_font}
                  onChange={e => update('body_font', e.target.value)}
                >
                  {BRAND_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <div className="bk-font-sample" style={{ fontFamily: `'${draft.body_font}', sans-serif`, fontSize: 12, fontWeight: 400 }}>
                  Axis labels, tooltips, numbers
                </div>
              </div>
            </div>
          </Section>

          {/* Shape */}
          <Section icon={<Maximize2 size={15} />} title="Shape & Shadow">
            <div>
              <div className="bk-field-label">Corner Radius — {draft.border_radius}px</div>
              <input
                type="range" min={0} max={24} value={draft.border_radius}
                className="bk-slider"
                onChange={e => update('border_radius', Number(e.target.value))}
              />
              <div className="bk-radius-previews">
                {[0, 6, 12, 20].map(r => (
                  <div
                    key={r}
                    className={`bk-radius-chip ${draft.border_radius === r ? 'active' : ''}`}
                    style={{ borderRadius: r, background: draft.primary_color }}
                    onClick={() => update('border_radius', r)}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="bk-field-label">Shadow</div>
              <div className="bk-shadow-options">
                {SHADOW_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`bk-shadow-btn ${draft.shadow_style === opt.value ? 'active' : ''}`}
                    style={draft.shadow_style === opt.value ? { borderColor: draft.primary_color, color: draft.primary_color } : {}}
                    onClick={() => update('shadow_style', opt.value)}
                  >
                    <div className="bk-shadow-swatch" style={{ boxShadow: opt.preview, borderRadius: draft.border_radius }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Logo */}
          <Section icon={<Layers size={15} />} title="Logo">
            <div className="bk-logo-area">
              {draft.logo_url ? (
                <div className="bk-logo-preview">
                  <img src={draft.logo_url} alt="Brand logo" />
                  <button className="bk-logo-remove" onClick={() => update('logo_url', '')}>×</button>
                </div>
              ) : (
                <label className="bk-logo-upload">
                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <Upload size={18} />
                  <span>{logoUploading ? 'Uploading…' : 'Upload logo'}</span>
                  <span className="bk-logo-hint">PNG, SVG, or WebP · max 2 MB</span>
                </label>
              )}
              <input
                type="text"
                className="bk-hex-input"
                style={{ marginTop: 8, width: '100%' }}
                placeholder="Or paste an image URL…"
                value={draft.logo_url}
                onChange={e => update('logo_url', e.target.value)}
              />
            </div>
          </Section>

        </div>

        {/* ── Right: Live Preview ── */}
        <div className="bk-preview-panel">
          <div className="bk-preview-label">Live Preview</div>
          <LivePreview draft={draft} />
          <p className="bk-preview-hint">
            This palette, font, and shape style applies to every chart and dashboard you create.
            Select <strong>Brand</strong> in the Workspace palette picker to activate it.
          </p>
        </div>
      </div>
    </div>
  );
}
