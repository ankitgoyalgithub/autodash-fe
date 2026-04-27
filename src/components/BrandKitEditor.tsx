import { useState, useEffect, useRef } from 'react';
import {
  Save, RotateCcw, Upload, Palette, Type, Maximize2, Layers,
  Sun, Moon, Monitor, Download, Upload as UploadIcon, ChevronDown,
  Building2, Paintbrush, BarChart3, Layout, Sparkles, Plus, X, GripVertical, Copy, Check,
} from 'lucide-react';
import type { BrandKit } from '../types/brandKit';
import {
  DEFAULT_BRAND_KIT, BRAND_FONTS, SHADOW_OPTIONS,
  CARD_STYLE_OPTIONS, DENSITY_OPTIONS, THEME_MODE_OPTIONS,
  BRAND_PRESETS,
} from '../types/brandKit';
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

// ── Chart Series Palette Editor ──────────────────────────────────────────────

function ChartPaletteEditor({ colors, onChange }: { colors: string[]; onChange: (c: string[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const handleColorChange = (idx: number, val: string) => {
    const next = [...colors];
    next[idx] = val;
    onChange(next);
  };

  const handleAdd = () => {
    const hue = (colors.length * 47) % 360;
    const newColor = `hsl(${hue}, 65%, 55%)`;
    // Convert hsl to hex approximation
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = newColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    onChange([...colors, hex]);
  };

  const handleRemove = (idx: number) => {
    if (colors.length <= 2) return;
    onChange(colors.filter((_, i) => i !== idx));
  };

  return (
    <div className="bk-chart-palette">
      <div className="bk-chart-palette-swatches">
        {colors.map((c, i) => (
          <div key={i} className="bk-chart-swatch-item">
            <div className="bk-chart-swatch-wrap">
              <input
                type="color"
                value={c}
                className="bk-color-native"
                onChange={e => handleColorChange(i, e.target.value)}
                onFocus={() => setEditIdx(i)}
                onBlur={() => setEditIdx(null)}
              />
              <div
                className={`bk-chart-swatch ${editIdx === i ? 'editing' : ''}`}
                style={{ background: c }}
              />
            </div>
            {colors.length > 2 && (
              <button className="bk-chart-swatch-remove" onClick={() => handleRemove(i)} title="Remove">
                <X size={8} />
              </button>
            )}
            <span className="bk-chart-swatch-label">{i + 1}</span>
          </div>
        ))}
        {colors.length < 12 && (
          <button className="bk-chart-swatch-add" onClick={handleAdd} title="Add color">
            <Plus size={12} />
          </button>
        )}
      </div>
      <p className="bk-field-hint">Charts use these colors in order for data series. Minimum 2, maximum 12.</p>
    </div>
  );
}

// ── Custom CSS Editor ────────────────────────────────────────────────────────

function CustomCSSEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="bk-css-editor">
      <textarea
        className="bk-css-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`/* Custom CSS overrides */\n.chart-card { border-left: 3px solid var(--brand-primary); }\n.dp-header { background: var(--brand-surface); }`}
        rows={6}
        spellCheck={false}
      />
      <p className="bk-field-hint">CSS custom properties like <code>--brand-primary</code> are available. Changes apply globally.</p>
    </div>
  );
}

// ── Brand Presets ────────────────────────────────────────────────────────────

function PresetSelector({ onApply }: { onApply: (preset: Partial<BrandKit>) => void }) {
  return (
    <div className="bk-presets-grid">
      {BRAND_PRESETS.map(p => (
        <button key={p.id} className="bk-preset-card" onClick={() => onApply(p.kit)}>
          <div className="bk-preset-swatches">
            <div style={{ background: p.kit.primary_color, width: 24, height: 24, borderRadius: 6 }} />
            <div style={{ background: p.kit.secondary_color, width: 24, height: 24, borderRadius: 6 }} />
            <div style={{ background: p.kit.accent_color, width: 24, height: 24, borderRadius: 6 }} />
            <div style={{ background: p.kit.bg_color, width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0' }} />
          </div>
          <div className="bk-preset-name">{p.name}</div>
          <div className="bk-preset-desc">{p.desc}</div>
        </button>
      ))}
    </div>
  );
}

// ── Live Preview (enhanced) ──────────────────────────────────────────────────

function LivePreview({ draft }: { draft: BrandKit }) {
  const palette = generatePalette(draft.primary_color, draft.secondary_color);
  const chartColors = draft.chart_colors?.length >= 2 ? draft.chart_colors : palette;
  const barData = [65, 82, 48, 91, 74, 60];
  const maxVal = Math.max(...barData);

  const shadows: Record<string, string> = {
    none:     'none',
    subtle:   '0 1px 4px rgba(0,0,0,0.08)',
    medium:   '0 2px 8px rgba(0,0,0,0.1)',
    elevated: '0 4px 16px rgba(0,0,0,0.14)',
  };

  const cardBorder = draft.card_style === 'bordered'
    ? `1px solid ${draft.border_color}`
    : draft.card_style === 'glass'
      ? `1px solid ${draft.primary_color}25`
      : `1px solid ${draft.border_color}40`;

  const cardBg = draft.card_style === 'glass'
    ? `${draft.surface_color}cc`
    : draft.surface_color;

  return (
    <div className="bk-preview-container" style={{ background: draft.bg_color }}>
      {/* Header bar */}
      <div className="bk-preview-header" style={{ background: draft.surface_color, borderBottom: `1px solid ${draft.border_color}` }}>
        {draft.logo_url && <img src={draft.logo_url} alt="" className="bk-preview-header-logo" />}
        <span style={{ fontFamily: `'${draft.heading_font}', sans-serif`, fontWeight: 700, fontSize: 13, color: draft.text_color }}>
          {draft.company_name || 'Dashboard'}
        </span>
      </div>

      {/* Metric cards */}
      <div className="bk-preview-metrics">
        {[
          { label: 'Revenue', value: '$128.4K', change: '+12.3%', positive: true },
          { label: 'Users', value: '2,847', change: '+8.1%', positive: true },
          { label: 'Churn', value: '3.2%', change: '-0.4%', positive: false },
        ].map((m, i) => (
          <div
            key={i}
            className="bk-preview-metric-card"
            style={{
              background: cardBg,
              borderRadius: draft.border_radius,
              boxShadow: shadows[draft.shadow_style],
              border: cardBorder,
              fontFamily: `'${draft.body_font}', sans-serif`,
              backdropFilter: draft.card_style === 'glass' ? 'blur(12px)' : undefined,
            }}
          >
            <div style={{ fontSize: 10, color: draft.text_secondary, fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: draft.text_color, fontFamily: `'${draft.heading_font}', sans-serif` }}>{m.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: m.positive ? draft.success_color : draft.danger_color }}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div
        className="bk-preview-chart-card"
        style={{
          background: cardBg,
          borderRadius: draft.border_radius,
          boxShadow: shadows[draft.shadow_style],
          border: cardBorder,
          fontFamily: `'${draft.body_font}', sans-serif`,
          backdropFilter: draft.card_style === 'glass' ? 'blur(12px)' : undefined,
        }}
      >
        <div
          style={{ fontFamily: `'${draft.heading_font}', sans-serif`, fontWeight: 600, fontSize: 12, color: draft.text_color, marginBottom: 12 }}
        >
          Monthly Revenue
        </div>
        <div className="bk-preview-bars">
          {barData.map((v, i) => (
            <div key={i} className="bk-preview-bar-wrap">
              <div
                className="bk-preview-bar"
                style={{
                  height:       `${(v / maxVal) * 100}%`,
                  background:   chartColors[i % chartColors.length],
                  borderRadius: `${Math.min(draft.border_radius, 4)}px ${Math.min(draft.border_radius, 4)}px 0 0`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="bk-preview-labels" style={{ color: draft.text_secondary }}>
          <span>Jan</span><span>Feb</span><span>Mar</span>
          <span>Apr</span><span>May</span><span>Jun</span>
        </div>
      </div>

      {/* Semantic color badges */}
      <div className="bk-preview-badges">
        <span style={{ background: draft.success_color + '20', color: draft.success_color, borderRadius: draft.border_radius / 2, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Success</span>
        <span style={{ background: draft.warning_color + '20', color: draft.warning_color, borderRadius: draft.border_radius / 2, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Warning</span>
        <span style={{ background: draft.danger_color + '20', color: draft.danger_color, borderRadius: draft.border_radius / 2, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Error</span>
        <span style={{ background: draft.info_color + '20', color: draft.info_color, borderRadius: draft.border_radius / 2, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Info</span>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bk-section ${open ? '' : 'bk-section--collapsed'}`}>
      <button className="bk-section-header" onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="bk-section-icon">{icon}</span>
          <span className="bk-section-title">{title}</span>
        </div>
        <ChevronDown size={14} className={`bk-section-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <div className="bk-section-body">{children}</div>}
    </div>
  );
}

// ── Segmented Control ────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options, value, onChange, accentColor,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accentColor?: string;
}) {
  return (
    <div className="bk-segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`bk-seg-btn ${value === opt.value ? 'active' : ''}`}
          style={value === opt.value ? { background: accentColor || '#6366f1', color: '#fff' } : {}}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
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
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'presets'>('editor');
  const [copied, setCopied] = useState(false);

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

  const handleApplyPreset = (preset: Partial<BrandKit>) => {
    setDraft(prev => ({ ...prev, ...preset }));
    setSaved(false);
    setActiveTab('editor');
  };

  const handleFileUpload = async (
    file: File,
    field: 'logo_url' | 'favicon_url',
    setUploading: (v: boolean) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const r = await axios.post(`${BASE}/upload/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      update(field, r.data.url);
    } catch {
      // silent — user can enter URL manually
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-kit-${draft.company_name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        setDraft(prev => ({ ...prev, ...parsed }));
        setSaved(false);
      } catch {
        alert('Invalid brand kit JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyVars = () => {
    const vars = Object.entries({
      '--brand-primary':       draft.primary_color,
      '--brand-secondary':     draft.secondary_color,
      '--brand-accent':        draft.accent_color,
      '--brand-bg':            draft.bg_color,
      '--brand-surface':       draft.surface_color,
      '--brand-text':          draft.text_color,
      '--brand-text-secondary': draft.text_secondary,
      '--brand-border':        draft.border_color,
      '--brand-success':       draft.success_color,
      '--brand-warning':       draft.warning_color,
      '--brand-danger':        draft.danger_color,
      '--brand-info':          draft.info_color,
      '--brand-radius':        `${draft.border_radius}px`,
      '--brand-font-heading':  `'${draft.heading_font}', sans-serif`,
      '--brand-font-body':     `'${draft.body_font}', sans-serif`,
    }).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    navigator.clipboard.writeText(`:root {\n${vars}\n}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(brandKit);
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className="canva-home">
      {/* ── Hero ── */}
      <div className="canva-home-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="canva-home-title">Brand Kit</h1>
            <p style={{ fontSize: 14, color: '#6b6880', marginTop: 4, maxWidth: 580 }}>
              Your enterprise design system. Colors, typography, chart palette, and styling flow into every dashboard, report, and export.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Import / Export */}
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            <button className="bk-btn-ghost" onClick={() => importRef.current?.click()} title="Import brand kit JSON">
              <UploadIcon size={13} /> Import
            </button>
            <button className="bk-btn-ghost" onClick={handleExport} title="Export brand kit as JSON">
              <Download size={13} /> Export
            </button>
            <button className="bk-btn-ghost" onClick={handleCopyVars} title="Copy CSS variables to clipboard">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy CSS'}
            </button>
            <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
            <button className="bk-btn-ghost" onClick={handleReset} title="Reset to defaults">
              <RotateCcw size={13} /> Reset
            </button>
            <button
              className={`bk-btn-save ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              <Save size={14} />
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Brand Kit'}
            </button>
          </div>
        </div>

        {/* Editor / Presets tabs */}
        <div className="bk-tabs">
          <button className={`bk-tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
            <Paintbrush size={13} /> Editor
          </button>
          <button className={`bk-tab ${activeTab === 'presets' ? 'active' : ''}`} onClick={() => setActiveTab('presets')}>
            <Sparkles size={13} /> Presets
          </button>
        </div>
      </div>

      {error && <div className="bk-error">{error}</div>}

      {activeTab === 'presets' ? (
        <div style={{ padding: '24px 32px', maxWidth: 900 }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Choose a starting point. You can customize everything after applying.
          </p>
          <PresetSelector onApply={handleApplyPreset} />
        </div>
      ) : (
        <div className="bk-layout">
          {/* ── Left: Controls ── */}
          <div className="bk-controls">

            {/* Identity */}
            <Section icon={<Building2 size={15} />} title="Company Identity">
              <div className="bk-identity-row">
                <div style={{ flex: 1 }}>
                  <div className="bk-field-label">Company Name</div>
                  <input
                    type="text"
                    className="bk-text-input"
                    value={draft.company_name}
                    onChange={e => update('company_name', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              <div className="bk-identity-logos">
                <div className="bk-logo-col">
                  <div className="bk-field-label">Logo</div>
                  <div className="bk-logo-area">
                    {draft.logo_url ? (
                      <div className="bk-logo-preview">
                        <img src={draft.logo_url} alt="Brand logo" />
                        <button className="bk-logo-remove" onClick={() => update('logo_url', '')}>
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="bk-logo-upload">
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo_url', setLogoUploading)} />
                        <Upload size={16} />
                        <span>{logoUploading ? 'Uploading...' : 'Upload'}</span>
                      </label>
                    )}
                    <input type="text" className="bk-hex-input" style={{ marginTop: 6, width: '100%', fontSize: 11 }} placeholder="or paste URL" value={draft.logo_url} onChange={e => update('logo_url', e.target.value)} />
                  </div>
                </div>
                <div className="bk-logo-col">
                  <div className="bk-field-label">Favicon</div>
                  <div className="bk-logo-area">
                    {draft.favicon_url ? (
                      <div className="bk-logo-preview bk-favicon-preview">
                        <img src={draft.favicon_url} alt="Favicon" />
                        <button className="bk-logo-remove" onClick={() => update('favicon_url', '')}>
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="bk-logo-upload bk-favicon-upload">
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'favicon_url', setFaviconUploading)} />
                        <Upload size={14} />
                        <span>{faviconUploading ? '...' : 'Upload'}</span>
                      </label>
                    )}
                    <input type="text" className="bk-hex-input" style={{ marginTop: 6, width: '100%', fontSize: 11 }} placeholder="or paste URL" value={draft.favicon_url} onChange={e => update('favicon_url', e.target.value)} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Core Colors */}
            <Section icon={<Palette size={15} />} title="Brand Colors">
              <div className="bk-color-grid">
                <ColorField label="Primary" value={draft.primary_color}     onChange={v => update('primary_color', v)} />
                <ColorField label="Secondary" value={draft.secondary_color} onChange={v => update('secondary_color', v)} />
                <ColorField label="Accent" value={draft.accent_color}       onChange={v => update('accent_color', v)} />
                <ColorField label="Background" value={draft.bg_color}       onChange={v => update('bg_color', v)} />
                <ColorField label="Surface" value={draft.surface_color}     onChange={v => update('surface_color', v)} />
                <ColorField label="Text" value={draft.text_color}           onChange={v => update('text_color', v)} />
                <ColorField label="Text Secondary" value={draft.text_secondary} onChange={v => update('text_secondary', v)} />
                <ColorField label="Border" value={draft.border_color}       onChange={v => update('border_color', v)} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="bk-field-label" style={{ marginBottom: 6 }}>Auto-generated Palette</div>
                <PalettePreview primary={draft.primary_color} secondary={draft.secondary_color} />
              </div>
            </Section>

            {/* Semantic Colors */}
            <Section icon={<Sparkles size={15} />} title="Semantic Colors" defaultOpen={false}>
              <p className="bk-field-hint" style={{ marginBottom: 10 }}>Used for status badges, alerts, and data annotations.</p>
              <div className="bk-color-grid">
                <ColorField label="Success" value={draft.success_color}  onChange={v => update('success_color', v)} />
                <ColorField label="Warning" value={draft.warning_color}  onChange={v => update('warning_color', v)} />
                <ColorField label="Danger" value={draft.danger_color}    onChange={v => update('danger_color', v)} />
                <ColorField label="Info" value={draft.info_color}        onChange={v => update('info_color', v)} />
              </div>
            </Section>

            {/* Chart Series Palette */}
            <Section icon={<BarChart3 size={15} />} title="Chart Series Colors">
              <ChartPaletteEditor
                colors={draft.chart_colors}
                onChange={c => update('chart_colors', c)}
              />
            </Section>

            {/* Typography */}
            <Section icon={<Type size={15} />} title="Typography">
              <div className="bk-font-grid">
                <div>
                  <div className="bk-field-label">Heading Font</div>
                  <select className="bk-select" value={draft.heading_font} onChange={e => update('heading_font', e.target.value)}>
                    {BRAND_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="bk-font-sample" style={{ fontFamily: `'${draft.heading_font}', sans-serif` }}>
                    Dashboard Title
                  </div>
                </div>
                <div>
                  <div className="bk-field-label">Body Font</div>
                  <select className="bk-select" value={draft.body_font} onChange={e => update('body_font', e.target.value)}>
                    {BRAND_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="bk-font-sample" style={{ fontFamily: `'${draft.body_font}', sans-serif`, fontSize: 12, fontWeight: 400 }}>
                    Axis labels, tooltips, numbers
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="bk-field-label">Base Font Size — {draft.base_font_size}px</div>
                <input
                  type="range" min={10} max={18} step={1}
                  value={draft.base_font_size}
                  className="bk-slider"
                  onChange={e => update('base_font_size', Number(e.target.value))}
                />
              </div>
            </Section>

            {/* Shape & Style */}
            <Section icon={<Maximize2 size={15} />} title="Shape & Style">
              <div>
                <div className="bk-field-label">Corner Radius — {draft.border_radius}px</div>
                <input
                  type="range" min={0} max={24} value={draft.border_radius}
                  className="bk-slider"
                  onChange={e => update('border_radius', Number(e.target.value))}
                />
                <div className="bk-radius-previews">
                  {[0, 4, 8, 12, 20].map(r => (
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

              <div style={{ marginTop: 16 }}>
                <div className="bk-field-label">Card Style</div>
                <SegmentedControl
                  options={CARD_STYLE_OPTIONS}
                  value={draft.card_style}
                  onChange={v => update('card_style', v)}
                  accentColor={draft.primary_color}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="bk-field-label">Layout Density</div>
                <SegmentedControl
                  options={DENSITY_OPTIONS}
                  value={draft.layout_density}
                  onChange={v => update('layout_density', v)}
                  accentColor={draft.primary_color}
                />
              </div>
            </Section>

            {/* Theme */}
            <Section icon={<Sun size={15} />} title="Theme Mode" defaultOpen={false}>
              <div className="bk-theme-options">
                {THEME_MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`bk-theme-btn ${draft.theme_mode === opt.value ? 'active' : ''}`}
                    style={draft.theme_mode === opt.value ? { borderColor: draft.primary_color } : {}}
                    onClick={() => update('theme_mode', opt.value)}
                  >
                    {opt.value === 'light' && <Sun size={16} />}
                    {opt.value === 'dark' && <Moon size={16} />}
                    {opt.value === 'auto' && <Monitor size={16} />}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Custom CSS */}
            <Section icon={<Layout size={15} />} title="Custom CSS" defaultOpen={false}>
              <CustomCSSEditor value={draft.custom_css} onChange={v => update('custom_css', v)} />
            </Section>

          </div>

          {/* ── Right: Live Preview ── */}
          <div className="bk-preview-panel">
            <div className="bk-preview-label">Live Preview</div>
            <LivePreview draft={draft} />
            <p className="bk-preview-hint">
              Select <strong>Brand</strong> in the Workspace palette picker to activate this kit.
              Export as JSON to share across your team.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
