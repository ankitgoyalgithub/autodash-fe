import { useState } from 'react';
import { X, Plus, Database, CheckCircle2, Clock, BarChart2, Search, SlidersHorizontal, ChevronDown, Sparkles } from 'lucide-react';
import axios from 'axios';
import type { Datasource, Project } from '../App';
import { BASE, EMOJIS, PALETTES } from './constants';
import { DatasourceEditForm } from './DatasourcesManagement';
import { DesignTemplates } from './DesignTemplates';

// ─── Palette metadata for the picker ─────────────────────────────────────────

const PALETTE_META: { id: string; label: string; desc: string }[] = [
  { id: 'vibrant',   label: 'Vibrant',    desc: 'Bold & energetic' },
  { id: 'pastel',    label: 'Pastel',     desc: 'Soft & readable' },
  { id: 'neon',      label: 'Neon',       desc: 'Dark-theme ready' },
  { id: 'corporate', label: 'Corporate',  desc: 'Professional & serious' },
  { id: 'emerald',   label: 'Emerald',    desc: 'Nature-inspired greens' },
  { id: 'royal',     label: 'Royal',      desc: 'Navy & violet executive' },
  { id: 'cyberpunk', label: 'Cyberpunk',  desc: 'High-energy tech' },
];

// Derive a representative accent color from a palette (first swatch)
function paletteAccent(paletteId: string): string {
  return (PALETTES[paletteId as keyof typeof PALETTES] || PALETTES.vibrant)[0];
}

// ─── Mini dashboard preview (live-colored with palette) ───────────────────────

function DashboardPreview({ paletteId }: { paletteId: string }) {
  const colors = PALETTES[paletteId as keyof typeof PALETTES] || PALETTES.vibrant;
  const [c0, c1, c2, c3] = colors;
  return (
    <div className="np-preview">
      {/* Metric chips */}
      <div className="np-preview-metrics">
        {[c0, c1, c2].map((c, i) => (
          <div key={i} className="np-preview-metric" style={{ borderTopColor: c }}>
            <div className="np-preview-metric-val" style={{ background: c + '22' }} />
            <div className="np-preview-metric-lbl" />
          </div>
        ))}
      </div>
      {/* Mini bar chart */}
      <div className="np-preview-chart">
        {[55, 80, 45, 95, 65, 75, 50].map((h, i) => (
          <div key={i} className="np-preview-bar"
            style={{ height: `${h}%`, background: i % 2 === 0 ? c0 : c1, opacity: 0.85 + (i % 3) * 0.05 }} />
        ))}
        {/* Trend line overlay */}
        <svg className="np-preview-line" viewBox="0 0 70 40" preserveAspectRatio="none">
          <polyline points="5,28 15,18 25,22 35,8 45,14 55,10 65,6"
            fill="none" stroke={c3 || c2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      </div>
    </div>
  );
}

// ─── New Project Modal ────────────────────────────────────────────────────────

export function NewProjectModal({ datasources, onClose, onCreate }: {
  datasources: Datasource[];
  onClose: () => void;
  onCreate: (d: object) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [emoji, setEmoji] = useState('📊');
  const [paletteId, setPaletteId] = useState('vibrant');
  const [selectedDs, setSelectedDs] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(datasources.length === 0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [savedDs, setSavedDs] = useState<string>('');

  const accent = paletteAccent(paletteId);
  const colors = PALETTES[paletteId as keyof typeof PALETTES] || PALETTES.vibrant;

  const handleTest = async (cfg: object) => {
    setTesting(true); setTestResult(null);
    try { const r = await axios.post(`${BASE}/datasources/test/`, cfg); setTestResult({ ok: true, msg: r.data.message }); }
    catch (e: any) { setTestResult({ ok: false, msg: e.response?.data?.message || 'Connection failed.' }); }
    finally { setTesting(false); }
  };

  const handleSaveDs = async (cfg: object) => {
    try { const r = await axios.post(`${BASE}/datasources/`, cfg); setSelectedDs(r.data.id); setSavedDs(r.data.name); setAddingNew(false); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to save datasource.'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="np-modal" onClick={e => e.stopPropagation()}>

        {/* ── Colorful hero header ── */}
        <div className="np-hero" style={{ background: `linear-gradient(135deg, ${accent}22 0%, ${colors[1]}18 50%, ${colors[2]}14 100%)` }}>
          <div className="np-hero-inner">
            <div className="np-hero-emoji">{emoji}</div>
            <div className="np-hero-text">
              <div className="np-hero-title">{name || 'New Project'}</div>
              <div className="np-hero-sub">{desc || 'Your next great dashboard'}</div>
            </div>
          </div>
          <DashboardPreview paletteId={paletteId} />
          <button className="np-close" onClick={onClose}><X size={16}/></button>
        </div>

        {/* ── Step pills ── */}
        <div className="np-steps">
          <div className={`np-step ${step >= 1 ? 'active' : ''}`} onClick={() => step > 1 && setStep(1)}>
            <span style={step >= 1 ? { background: accent } : {}}>1</span>Setup
          </div>
          <div className="np-step-line" style={{ background: step >= 2 ? accent + '60' : undefined }} />
          <div className={`np-step ${step >= 2 ? 'active' : ''}`}>
            <span style={step >= 2 ? { background: accent } : {}}>2</span>Data Source
          </div>
        </div>

        {/* ── Step 1: Setup ── */}
        {step === 1 && (
          <div className="np-body">
            {/* Name & description */}
            <div className="np-field">
              <label>Project name</label>
              <input autoFocus placeholder="e.g. Sales Analytics 2024" value={name} onChange={e => setName(e.target.value)}
                style={{ '--focus-ring': accent } as React.CSSProperties} className="np-input" />
            </div>
            <div className="np-field">
              <label>Description <span className="opt">optional</span></label>
              <input placeholder="What are you tracking?" value={desc} onChange={e => setDesc(e.target.value)}
                className="np-input" />
            </div>

            {/* Icon picker */}
            <div className="np-field">
              <label>Icon</label>
              <div className="np-emoji-row">
                {EMOJIS.map(e => (
                  <button key={e} className={`np-emoji-btn ${emoji === e ? 'sel' : ''}`}
                    style={emoji === e ? { borderColor: accent, background: accent + '18' } : {}}
                    onClick={() => setEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>

            {/* Color palette picker */}
            <div className="np-field">
              <label>Chart palette <Sparkles size={12} style={{ opacity: 0.5, verticalAlign: 'middle', marginLeft: 4 }} /></label>
              <div className="np-palette-grid">
                {PALETTE_META.map(p => (
                  <button key={p.id}
                    className={`np-palette-card ${paletteId === p.id ? 'sel' : ''}`}
                    style={paletteId === p.id ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}28` } : {}}
                    onClick={() => setPaletteId(p.id)}>
                    <div className="np-palette-swatches">
                      {(PALETTES[p.id as keyof typeof PALETTES] || []).slice(0, 5).map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </div>
                    <div className="np-palette-name">{p.label}</div>
                    <div className="np-palette-desc">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="np-footer">
              <button className="np-btn-primary" style={{ background: accent }}
                onClick={() => setStep(2)} disabled={!name.trim()}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Data Source ── */}
        {step === 2 && (
          <div className="np-body">
            {datasources.length > 0 && !addingNew && (
              <>
                <div className="ds-list">
                  {datasources.map(d => (
                    <button key={d.id} className={`ds-item ${selectedDs === d.id ? 'sel' : ''}`}
                      style={selectedDs === d.id ? { borderColor: accent, background: accent + '10' } : {}}
                      onClick={() => setSelectedDs(d.id)}>
                      <div className="ds-icon" style={selectedDs === d.id ? { background: accent + '20', color: accent } : {}}>
                        <Database size={16}/>
                      </div>
                      <div><strong>{d.name}</strong><span>{d.host}:{d.port}/{d.database}</span></div>
                      {selectedDs === d.id && <CheckCircle2 size={16} style={{ color: accent, flexShrink: 0 }}/>}
                    </button>
                  ))}
                </div>
                <button className="btn-link" onClick={() => setAddingNew(true)}><Plus size={13}/>Add new datasource</button>
              </>
            )}
            {addingNew && (
              <>
                {savedDs && <div className="saved-badge"><CheckCircle2 size={13}/> "{savedDs}" connected</div>}
                {!savedDs && (
                  <DatasourceEditForm
                    initialData={{ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' }}
                    onSave={handleSaveDs} testing={testing} testResult={testResult} onTest={handleTest}
                  />
                )}
                {datasources.length > 0 && !savedDs && <button className="btn-link" onClick={() => setAddingNew(false)}>← Use existing</button>}
              </>
            )}
            <div className="np-footer">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="np-btn-primary" style={{ background: accent }}
                onClick={() => onCreate({ name, description: desc, emoji, color: accent, palette: paletteId, datasource_id: selectedDs })}>
                <Sparkles size={14}/> Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project thumbnail card ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Mini chart shapes for project thumbnail previews
function ThumbMiniBar({ color }: { color: string }) {
  const heights = ['38%', '62%', '82%', '55%', '72%'];
  return (
    <div className="thumb-mini-bar">
      {heights.map((h, i) => (
        <span key={i} style={{ height: h, background: i === 2 ? color : color + '70' }} />
      ))}
    </div>
  );
}

function ThumbMiniLine({ color }: { color: string }) {
  return (
    <div className="thumb-mini-line">
      <svg viewBox="0 0 56 32" preserveAspectRatio="none" width="100%" height="100%">
        <polygon points="0,32 0,24 10,18 22,22 32,10 44,14 56,4 56,32"
          fill={color + '28'} />
        <polyline points="0,24 10,18 22,22 32,10 44,14 56,4"
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ProjectThumbCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const c = p.color;
  return (
    <button className="canva-proj-card" onClick={onOpen}>
      {/* Thumbnail preview */}
      <div className="canva-proj-thumb" style={{ background: `linear-gradient(145deg, ${c}18 0%, ${c}08 100%)` }}>
        {/* Mini chart mockups */}
        <div className="canva-proj-preview">
          <ThumbMiniLine color={c} />
          <ThumbMiniBar color={c} />
        </div>
        {/* Emoji badge — small, bottom-left */}
        <span className="canva-proj-emoji-badge">{p.emoji}</span>
      </div>

      {/* Info area */}
      <div className="canva-proj-info">
        <div className="canva-proj-title">{p.name}</div>
        <div className="canva-proj-meta">
          <span className="canva-proj-date">
            <Clock size={10} /> {timeAgo(p.updated_at)}
          </span>
          {p.chart_count > 0 && (
            <span className="canva-proj-charts">
              <BarChart2 size={10} /> {p.chart_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Projects Home ────────────────────────────────────────────────────────────

export function ProjectsHome({ projects, onOpen, onNewProject, datasources, onApplied }: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onNewProject: () => void;
  datasources: Datasource[];
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, suggestedTheme: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Split into recents (last 4 updated) and all
  const recents = [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);

  return (
    <div className="canva-home">

      {/* ── Page hero header ── */}
      <div className="canva-home-hero">
        <h1 className="canva-home-title">All projects</h1>

        {/* Search bar */}
        <div className="canva-search-wrap">
          <Search size={16} className="canva-search-icon" />
          <input
            className="canva-search-input"
            placeholder="Search across all content"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <SlidersHorizontal size={15} className="canva-search-filter-icon" />
        </div>

        {/* Filter chips */}
        <div className="canva-filter-row">
          {['Type', 'Category', 'Owner', 'Date modified'].map(f => (
            <button key={f} className="canva-filter-chip">
              {f} <ChevronDown size={12} />
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn-primary canva-new-btn" onClick={onNewProject}>
            <Plus size={14} /> New project
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="canva-home-content">

        {/* Templates section — always shown */}
        {!search && (
          <section className="canva-section">
            <DesignTemplates datasources={datasources} onApplied={onApplied} />
          </section>
        )}

        {/* Recents section */}
        {recents.length > 0 && !search && (
          <section className="canva-section">
            <h2 className="canva-section-title">Recents</h2>
            <div className="canva-recents-row">
              {recents.map(p => (
                <ProjectThumbCard key={p.id} p={p} onOpen={() => onOpen(p)} />
              ))}
            </div>
          </section>
        )}

        {/* Your Projects section */}
        <section className="canva-section">
          <h2 className="canva-section-title">
            {search ? `Results for "${search}"` : 'Your Projects'}
          </h2>
          {filtered.length === 0 && !search ? (
            <div className="canva-empty" style={{ padding: '32px 0' }}>
              <div className="canva-empty-art">📊</div>
              <h3>No projects yet</h3>
              <p>Pick a template above or create a blank project to get started.</p>
              <button className="btn-primary" onClick={onNewProject}><Plus size={15} /> New project</button>
            </div>
          ) : filtered.length === 0 && search ? (
            <p className="canva-no-results">No projects match your search.</p>
          ) : (
            <div className="canva-designs-grid">
              {/* New project card */}
              {!search && (
                <button className="canva-new-card" onClick={onNewProject}>
                  <div className="canva-new-card-icon"><Plus size={28} /></div>
                  <span>New project</span>
                </button>
              )}
              {filtered.map(p => (
                <ProjectThumbCard key={p.id} p={p} onOpen={() => onOpen(p)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
