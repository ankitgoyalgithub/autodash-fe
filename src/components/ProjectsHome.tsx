import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { X, Plus, Database, CheckCircle2, Clock, BarChart2, Search, SlidersHorizontal, ChevronDown, Sparkles, MoreHorizontal, Pencil, Trash2, AlertTriangle, HardDrive, FolderPlus, SearchX } from 'lucide-react';
import axios from 'axios';
import type { Datasource, Project } from '../App';
import { BASE, EMOJIS, PALETTES } from './constants';
import { DatasourceEditForm } from './DatasourcesManagement';
import { DesignTemplates } from './DesignTemplates';
import { ProjectLogoTile, DEFAULT_LOGO_ID, logoColorFor } from './projectLogos';
import { toast, EmptyState, Button } from './ui';

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
        {[55, 75, 45, 85, 65, 75, 50].map((h, i) => (
          <div key={i} className="np-preview-bar"
            style={{ height: `${h}%`, background: i % 2 === 0 ? c0 : c1, opacity: 0.85 + (i % 3) * 0.05 }} />
        ))}
        {/* Trend line overlay. Points are kept ≥6 units from every viewBox edge
            so a round-cap stroke can't visually pop out past the rounded chart
            corners. `vector-effect="non-scaling-stroke"` keeps the line the
            same pixel-thickness regardless of how the SVG is stretched. */}
        <svg className="np-preview-line" viewBox="0 0 70 40" preserveAspectRatio="none">
          <polyline points="6,30 16,22 26,25 36,14 46,18 56,13 64,11"
            fill="none" stroke={c3 || c2} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
            vectorEffect="non-scaling-stroke" />
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
  const [emoji, setEmoji] = useState(DEFAULT_LOGO_ID);
  const [paletteId, setPaletteId] = useState('vibrant');
  const [selectedDs, setSelectedDs] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(datasources.length === 0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [savedDs, setSavedDs] = useState<string>('');
  // MySpace table picker state — only relevant when a MySpace datasource is selected
  const [msTables, setMsTables] = useState<{ id: number; name: string; table_name: string; row_count: number; columns: any[] }[]>([]);
  const [msLoading, setMsLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  const selectedDsObj = datasources.find(d => d.id === selectedDs) || null;
  const isMySpaceSelected = !!selectedDsObj?.is_myspace;
  const isHubSpotSelected = !!selectedDsObj?.is_hubspot;
  const showTablePicker = isMySpaceSelected || isHubSpotSelected;

  // Fetch tables based on datasource type
  useEffect(() => {
    if (!showTablePicker) { setMsTables([]); setSelectedTables(new Set()); return; }
    setMsLoading(true);
    if (isMySpaceSelected) {
      axios.get(`${BASE}/myspace/`)
        .then(r => {
          const tables = r.data?.tables ?? [];
          setMsTables(tables);
          setSelectedTables(new Set());
        })
        .catch(() => setMsTables([]))
        .finally(() => setMsLoading(false));
    } else if (isHubSpotSelected) {
      axios.get(`${BASE}/hubspot/status/`)
        .then(r => {
          const synced = r.data?.synced_objects || {};
          // Convert synced_objects map → table-list shape the picker expects
          const tables = Object.entries(synced).map(([objId, info]: [string, any], i) => ({
            id: i,
            name: objId.charAt(0).toUpperCase() + objId.slice(1),
            table_name: objId,
            row_count: info.rows || 0,
            columns: Array(info.columns || 0).fill({}),
          }));
          setMsTables(tables);
          setSelectedTables(new Set());
        })
        .catch(() => setMsTables([]))
        .finally(() => setMsLoading(false));
    }
  }, [showTablePicker, isMySpaceSelected, isHubSpotSelected]);

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName); else next.add(tableName);
      return next;
    });
  };
  const selectAllTables = () => setSelectedTables(new Set(msTables.map(t => t.table_name)));
  const clearAllTables = () => setSelectedTables(new Set());

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
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed to save datasource.'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`np-modal np-modal--v2 ${step === 1 ? 'np-modal--wide' : ''}`} onClick={e => e.stopPropagation()}>

        {/* ── Refined title bar ── */}
        <div className="np-titlebar">
          <div className="np-titlebar-text">
            <div className="np-titlebar-eyebrow">{step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}</div>
            <h2 className="np-titlebar-title">{step === 1 ? 'Project details' : 'Connect a data source'}</h2>
          </div>
          <button className="np-close-v2" onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>

        {/* ── Linear progress bar ── */}
        <div className="np-progress-track">
          <div className="np-progress-fill" style={{
            width: step === 1 ? '50%' : '100%',
            background: `linear-gradient(90deg, ${accent} 0%, ${colors[1]} 100%)`,
          }} />
        </div>

        {/* ── Step 1: Setup (two-column) ── */}
        {step === 1 && (
          <div className="np-step1">
            <div className="np-form-col">
              <div className="np-field">
                <label>Project name</label>
                <input autoFocus placeholder="e.g. Q4 Marketing Performance" value={name} onChange={e => setName(e.target.value)}
                  style={{ '--focus-ring': accent } as React.CSSProperties} className="np-input" />
              </div>
              <div className="np-field">
                <label>Description <span className="opt">Optional</span></label>
                <input placeholder="What does this track?" value={desc} onChange={e => setDesc(e.target.value)}
                  className="np-input" />
              </div>

              <div className="np-field">
                <label>Project icon</label>
                <div className="np-emoji-row">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" className={`np-emoji-btn ${emoji === e ? 'sel' : ''}`}
                      onClick={() => setEmoji(e)}>
                      <ProjectLogoTile id={e} size={42} selected={emoji === e} accent={accent} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="np-field">
                <label>Chart palette <Sparkles size={11} style={{ opacity: 0.5, verticalAlign: 'middle', marginLeft: 4 }} /></label>
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
            </div>

            {/* Live preview column — soft tinted backdrop so the white
                card pops without saturating the whole pane. */}
            <aside className="np-preview-col">
              {/* Soft accent wash in the corner — adds visual interest
                  without overwhelming the actual preview content */}
              <div
                className="np-preview-col__wash"
                aria-hidden="true"
                style={{
                  background: `radial-gradient(circle at 80% 0%, ${logoColorFor(emoji).bg} 0%, transparent 65%)`,
                }}
              />
              <div className="np-preview-label">Preview</div>
              <div className="np-preview-card">
                <div className="np-preview-card-head">
                  <ProjectLogoTile id={emoji} size={48} accent={accent} selected />
                  <div className="np-preview-card-text">
                    <div className="np-preview-card-name">{name || 'New project'}</div>
                    <div className="np-preview-card-desc">{desc || 'A short description appears here.'}</div>
                  </div>
                </div>
                <DashboardPreview paletteId={paletteId} />
              </div>
              <div className="np-preview-meta">
                <span className="np-preview-meta-dot" style={{ background: accent }} />
                <span>{PALETTE_META.find(p => p.id === paletteId)?.label || 'Vibrant'} palette</span>
              </div>
            </aside>
          </div>
        )}

        {/* ── Step 2: Data Source ── */}
        {step === 2 && (
          <div className="np-body">
            {datasources.length > 0 && !addingNew && (
              <>
                <div className="np-ds-header">
                  <div className="np-ds-header-title">Your Connections</div>
                  <div className="np-ds-header-sub">Select a datasource to power your dashboard</div>
                </div>
                <div className="np-ds-list">
                  {datasources.map(d => (
                    <button key={d.id} className={`np-ds-item ${selectedDs === d.id ? 'sel' : ''}`}
                      style={selectedDs === d.id ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}28` } : {}}
                      onClick={() => setSelectedDs(d.id)}>
                      <div className="np-ds-icon" style={
                        d.is_hubspot ? { background: '#fff5f1', color: '#ff7a59' } :
                        d.is_myspace ? { background: '#ede9fe', color: '#7c3aed' } :
                        selectedDs === d.id ? { background: accent + '22', color: accent } : {}
                      }>
                        {d.is_hubspot ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.27-1.974v-.075a2.21 2.21 0 0 0-2.211-2.21h-.075a2.21 2.21 0 0 0-2.21 2.21v.075a2.198 2.198 0 0 0 1.27 1.974V7.93a6.261 6.261 0 0 0-2.973 1.31L4.989 3.108a2.49 2.49 0 1 0-1.193 1.605l7.81 6.082a6.314 6.314 0 0 0 .096 7.117L9.327 20.49a2.05 2.05 0 1 0 1.439 1.439l2.343-2.343a6.328 6.328 0 1 0 5.055-11.656zM17.186 17.66a3.231 3.231 0 1 1 0-6.462 3.231 3.231 0 0 1 0 6.462z"/>
                          </svg>
                        ) : d.is_myspace ? <HardDrive size={18}/> : <Database size={18}/>}
                      </div>
                      <div className="np-ds-item-body">
                        <strong>
                          {d.name}
                          {d.is_myspace && <span className="np-ds-myspace-badge">My Space</span>}
                          {d.is_hubspot && <span className="np-ds-myspace-badge" style={{ background: '#fff5f1', color: '#ff7a59' }}>HubSpot</span>}
                        </strong>
                        <span>
                          {d.is_hubspot ? 'HubSpot CRM (synced)'
                            : d.is_myspace ? 'Personal CSV workspace'
                            : `${d.host}:${d.port}/${d.database}`}
                        </span>
                      </div>
                      {selectedDs === d.id && <CheckCircle2 size={16} style={{ color: accent, flexShrink: 0 }}/>}
                    </button>
                  ))}
                  <button className="np-ds-add-btn" onClick={() => setAddingNew(true)}>
                    <Plus size={15}/> Add new datasource
                  </button>
                </div>
              </>
            )}
            {addingNew && (
              <>
                {datasources.length > 0 && !savedDs && (
                  <button className="np-ds-back-link" onClick={() => setAddingNew(false)}>← Use existing connection</button>
                )}
                {savedDs ? (
                  <div className="np-saved-badge"><CheckCircle2 size={14}/> "{savedDs}" connected successfully</div>
                ) : (
                  <div className="np-ds-form-wrap">
                    <div className="np-ds-header">
                      <div className="np-ds-header-title">New Connection</div>
                      <div className="np-ds-header-sub">Enter your database credentials below</div>
                    </div>
                    <DatasourceEditForm
                      initialData={{ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' }}
                      onSave={handleSaveDs} testing={testing} testResult={testResult} onTest={handleTest}
                    />
                  </div>
                )}
              </>
            )}
            {/* Table picker — appears for MySpace and HubSpot datasources */}
            {showTablePicker && !addingNew && (
              <div className="np-ds-table-picker">
                <div className="np-ds-header" style={{ marginTop: 12 }}>
                  <div className="np-ds-header-title">
                    {isHubSpotSelected ? 'Select HubSpot objects for this project' : 'Select tables for this project'}
                  </div>
                  <div className="np-ds-header-sub">
                    {isHubSpotSelected
                      ? 'Pick which CRM objects this project can analyze. Leave empty to use all synced objects.'
                      : 'Pick which CSV tables this project can access. Leave empty to use all tables.'}
                  </div>
                </div>
                {msLoading ? (
                  <div className="np-tables-loading">Loading {isHubSpotSelected ? 'objects' : 'tables'}…</div>
                ) : msTables.length === 0 ? (
                  <div className="np-tables-empty">
                    {isHubSpotSelected
                      ? 'No HubSpot objects synced yet. Go to Data Sources → Manage HubSpot and run a sync first.'
                      : 'No tables in your My Space yet. Upload some CSVs first, or pick another datasource.'}
                  </div>
                ) : (
                  <>
                    <div className="np-tables-actions">
                      <button className="np-table-action" onClick={selectAllTables}>Select all</button>
                      <button className="np-table-action" onClick={clearAllTables}>Clear</button>
                      <span className="np-tables-counter">
                        {selectedTables.size === 0
                          ? `Will use all ${msTables.length} ${isHubSpotSelected ? 'objects' : 'tables'}`
                          : `${selectedTables.size} of ${msTables.length} selected`}
                      </span>
                    </div>
                    <div className="np-tables-grid">
                      {msTables.map(t => {
                        const checked = selectedTables.has(t.table_name);
                        return (
                          <button
                            key={t.id}
                            className={`np-table-card ${checked ? 'sel' : ''}`}
                            style={checked ? { borderColor: accent, background: accent + '0d' } : {}}
                            onClick={() => toggleTable(t.table_name)}
                          >
                            <div className="np-table-card-check"
                                 style={checked ? { background: accent, borderColor: accent } : {}}>
                              {checked && <CheckCircle2 size={11} style={{ color: '#fff' }}/>}
                            </div>
                            <div className="np-table-card-body">
                              <strong>{t.name}</strong>
                              <span>{t.row_count.toLocaleString()} rows · {t.columns.length} cols</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {/* ── Unified sticky footer ── */}
        <div className="np-footer-bar">
          {step === 2
            ? <button className="np-btn-ghost" onClick={() => setStep(1)}>← Back</button>
            : <button className="np-btn-ghost" onClick={onClose}>Cancel</button>
          }
          {step === 1 ? (
            <button className="np-btn-primary-v2" style={{ background: accent }}
              onClick={() => setStep(2)} disabled={!name.trim()}>
              Continue
            </button>
          ) : (
            <button className="np-btn-primary-v2" style={{ background: accent }}
              onClick={() => onCreate({
                name, description: desc, emoji, color: accent, palette: paletteId,
                datasource_id: selectedDs,
                allowed_tables: Array.from(selectedTables),
              })}>
              <Sparkles size={14}/> Create project
            </button>
          )}
        </div>
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

const ProjectThumbCard = memo(function ProjectThumbCard({ p, onOpen, onEdit, onDelete }: {
  p: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = p.color;
  const thumb = p.thumbnail_url;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="canva-proj-card-wrap">
      <button className="canva-proj-card" onClick={onOpen}>
        {/* Thumbnail preview — gradient tinted by the logo's category color */}
        <div
          className="canva-proj-thumb"
          style={thumb ? {} : {
            background: `linear-gradient(145deg, ${logoColorFor(p.emoji).bg} 0%, ${logoColorFor(p.emoji).bgEnd} 100%)`,
          }}
        >
          {thumb ? (
            <img src={thumb} alt={p.name} className="canva-proj-thumb-svg" draggable={false} />
          ) : (
            <div className="canva-proj-preview">
              <ThumbMiniLine color={logoColorFor(p.emoji).fg} />
              <ThumbMiniBar color={logoColorFor(p.emoji).fg} />
            </div>
          )}
          <div className="canva-proj-thumb-overlay" style={{ background: `linear-gradient(to top, ${c}1a 0%, transparent 60%)` }} />
          <span className="canva-proj-emoji-badge">
            <ProjectLogoTile id={p.emoji} emoji={p.emoji} size={32} />
          </span>
        </div>

        {/* Info area */}
        <div className="canva-proj-info">
          <div className="canva-proj-title">{p.name}</div>
          <div className="canva-proj-meta">
            <span className="canva-proj-date"><Clock size={10} /> {timeAgo(p.updated_at)}</span>
            {p.chart_count > 0 && (
              <span className="canva-proj-charts"><BarChart2 size={10} /> {p.chart_count}</span>
            )}
            {(p.members?.length ?? 0) > 1 && (
              <div className="proj-member-stack" title={`${p.members!.length} members`}>
                {p.members!.slice(0, 3).map(m => {
                  const hue = Array.from(m.username).reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
                  return (
                    <div key={m.id} className="proj-member-avatar"
                      style={{ background: `hsl(${hue},55%,52%)` }}
                      title={m.username}>
                      {m.username.slice(0,2).toUpperCase()}
                    </div>
                  );
                })}
                {p.members!.length > 3 && (
                  <div className="proj-member-more">+{p.members!.length - 3}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Three-dot menu */}
      <div className="proj-card-menu-wrap" ref={menuRef}>
        <button
          className="proj-card-menu-btn"
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          title="Options"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div className="proj-card-dropdown">
            <button onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={13} /> Rename
            </button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Edit Project Modal ───────────────────────────────────────────────────────

function EditProjectModal({ project, onClose, onSave }: {
  project: Project;
  onClose: () => void;
  onSave: (updates: { name: string; description: string; emoji: string }) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description || '');
  const [emoji, setEmoji] = useState(project.emoji);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: desc.trim(), emoji });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-proj-modal" onClick={e => e.stopPropagation()}>
        <div className="edit-proj-header">
          <h3>Rename project</h3>
          <button className="np-close-sm" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>
        <div className="edit-proj-body">
          <div className="np-field">
            <label>Icon</label>
            <div className="np-emoji-row">
              {EMOJIS.map(e => (
                <button key={e} type="button"
                  className={`np-emoji-btn ${emoji === e ? 'sel' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  <ProjectLogoTile id={e} size={42} selected={emoji === e} accent={project.color} />
                </button>
              ))}
            </div>
          </div>
          <div className="np-field">
            <label>Project name</label>
            <input
              autoFocus
              className="np-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ '--focus-ring': project.color } as React.CSSProperties}
            />
          </div>
          <div className="np-field">
            <label>Description <span className="opt">optional</span></label>
            <input
              className="np-input"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What are you tracking?"
            />
          </div>
        </div>
        <div className="edit-proj-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="np-btn-primary"
            style={{ background: project.color }}
            disabled={!name.trim() || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteProjectModal({ project, onClose, onConfirm }: {
  project: Project;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-proj-modal" onClick={e => e.stopPropagation()}>
        <div className="delete-proj-icon"><AlertTriangle size={22} /></div>
        <h3>Delete "{project.name}"?</h3>
        <p>This will permanently delete the project and all its dashboards, threads, and data. This cannot be undone.</p>
        <div className="delete-proj-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-danger" disabled={deleting} onClick={handleConfirm}>
            {deleting ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Stable-ref wrapper so memo on ProjectThumbCard is never broken by inline arrow functions in map
const MemoedCard = memo(function MemoedCard({ p, onOpen, onSetEdit, onSetDelete }: {
  p: Project;
  onOpen: (p: Project) => void;
  onSetEdit: (p: Project) => void;
  onSetDelete: (p: Project) => void;
}) {
  const handleOpen = useCallback(() => onOpen(p), [p, onOpen]);
  const handleEdit = useCallback(() => onSetEdit(p), [p, onSetEdit]);
  const handleDelete = useCallback(() => onSetDelete(p), [p, onSetDelete]);
  return <ProjectThumbCard p={p} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} />;
});

// ─── Projects Home ────────────────────────────────────────────────────────────

export function ProjectsHome({ projects, onOpen, onNewProject, datasources, onApplied, onDelete, onEdit }: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onNewProject: () => void;
  datasources: Datasource[];
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, suggestedTheme: string) => void;
  onDelete: (p: Project) => Promise<void>;
  onEdit: (p: Project, updates: { name: string; description: string; emoji: string }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'charts'>('recent');
  const [seeding, setSeeding] = useState(false);

  // One-click onboarding: load a bundled sample CSV into the user's private
  // workspace, spin up a project on it, and open it — so a brand-new user can
  // try the product without connecting a database first.
  const handleTrySampleData = async () => {
    setSeeding(true);
    const tid = toast.loading('Setting up your sample project…');
    try {
      const csv = await fetch('/sample-data.csv').then(r => {
        if (!r.ok) throw new Error('sample data unavailable');
        return r.blob();
      });
      const form = new FormData();
      form.append('file', new File([csv], 'sample_sales.csv', { type: 'text/csv' }));
      await axios.post(`${BASE}/myspace/upload/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const ds = await axios.get(`${BASE}/myspace/datasource/`);
      const proj = await axios.post(`${BASE}/projects/`, {
        name: 'Sample sales analysis',
        description: 'A demo project built from sample e-commerce data.',
        emoji: 'trend-line',
        palette: 'vibrant',
        datasource_id: ds.data.id,
      });
      toast.dismiss(tid);
      toast.success('Sample project ready — ask it anything!');
      onOpen(proj.data);
    } catch (e: any) {
      toast.dismiss(tid);
      toast.error(e?.response?.data?.error || 'Could not set up sample data');
    } finally {
      setSeeding(false);
    }
  };

  const searched = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const SORT_LABELS: Record<typeof sortBy, string> = {
    recent: 'Recently modified',
    name:   'Name (A–Z)',
    charts: 'Most charts',
  };
  const filtered = [...searched].sort((a, b) => {
    if (sortBy === 'name')   return a.name.localeCompare(b.name);
    if (sortBy === 'charts') return (b.chart_count || 0) - (a.chart_count || 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const recents = [...searched].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);

  return (
    <div className="canva-home">

      {/* ── Page hero header ── */}
      <div className="canva-home-hero">
        <h1 className="canva-home-title">All projects</h1>

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

        <div className="canva-filter-row">
          <label className="canva-sort">
            <span className="canva-sort-label">Sort</span>
            <select
              className="canva-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort projects"
            >
              {(Object.keys(SORT_LABELS) as (typeof sortBy)[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown size={13} className="canva-sort-chevron" />
          </label>
          <div style={{ flex: 1 }} />
          <button className="btn-primary canva-new-btn" onClick={onNewProject}>
            <Plus size={14} /> New project
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="canva-home-content">

        {!search && (
          <section className="canva-section">
            <DesignTemplates datasources={datasources} onApplied={onApplied} />
          </section>
        )}

        {recents.length > 0 && !search && (
          <section className="canva-section">
            <h2 className="canva-section-title">Recents</h2>
            <div className="canva-recents-row">
              {recents.map(p => (
                <MemoedCard key={p.id} p={p} onOpen={onOpen} onSetEdit={setEditingProject} onSetDelete={setDeletingProject} />
              ))}
            </div>
          </section>
        )}

        <section className="canva-section">
          <h2 className="canva-section-title">
            {search ? `Results for "${search}"` : 'Your Projects'}
          </h2>
          {filtered.length === 0 && !search ? (
            <EmptyState
              icon={<FolderPlus size={26}/>}
              title="No projects yet"
              subtitle="New here? Try it instantly with sample data — or connect your own and create a project."
              actions={
                <>
                  <Button onClick={handleTrySampleData} loading={seeding} leading={<Sparkles size={15}/>}>
                    Try with sample data
                  </Button>
                  <Button variant="secondary" onClick={onNewProject} leading={<Plus size={15}/>}>
                    New project
                  </Button>
                </>
              }
            />
          ) : filtered.length === 0 && search ? (
            <EmptyState
              compact
              icon={<SearchX size={22}/>}
              title="No projects match your search"
              subtitle={`Nothing matched "${search}". Try a different keyword.`}
            />
          ) : (
            <div className="canva-designs-grid">
              {!search && (
                <button className="canva-new-card" onClick={onNewProject}>
                  <div className="canva-new-card-icon"><Plus size={28} /></div>
                  <span>New project</span>
                </button>
              )}
              {filtered.map(p => (
                <MemoedCard key={p.id} p={p} onOpen={onOpen} onSetEdit={setEditingProject} onSetDelete={setDeletingProject} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ── */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async (updates) => {
            await onEdit(editingProject, updates);
            setEditingProject(null);
          }}
        />
      )}
      {deletingProject && (
        <DeleteProjectModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onConfirm={async () => {
            await onDelete(deletingProject);
            setDeletingProject(null);
          }}
        />
      )}
    </div>
  );
}
