import { useState } from 'react';
import { X, Plus, Database, CheckCircle2, Clock, BarChart2, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import axios from 'axios';
import type { Datasource, Project } from '../App';
import { BASE, EMOJIS, PALETTES } from './constants';
import { DatasourceEditForm } from './DatasourcesManagement';
import { DesignTemplates } from './DesignTemplates';

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
  const [color, setColor] = useState('#6366f1');
  const [selectedDs, setSelectedDs] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(datasources.length === 0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [savedDs, setSavedDs] = useState<string>('');

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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h2>New Project</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
        <div className="steps-bar">
          <div className={`step ${step >= 1 ? 'active' : ''}`}><span>1</span>Setup</div>
          <div className="step-line"/>
          <div className={`step ${step >= 2 ? 'active' : ''}`}><span>2</span>Data Source</div>
        </div>

        {step === 1 && (
          <div className="modal-body">
            <div className="field full"><label>Project name</label><input autoFocus placeholder="e.g. Sales Analytics 2024" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field full"><label>Description <span className="opt">(optional)</span></label><input placeholder="What are you tracking?" value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <div className="field full"><label>Icon</label><div className="emoji-grid">{EMOJIS.map(e => <button key={e} className={`emoji-pick ${emoji === e ? 'sel' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
            <div className="field full"><label>Color theme</label><div className="palette">{PALETTES.vibrant.map(c => <button key={c} className={`pal-dot ${color === c ? 'sel' : ''}`} style={{background:c}} onClick={() => setColor(c)}/>)}</div></div>
            <div className="modal-footer"><button className="btn-primary" onClick={() => setStep(2)} disabled={!name.trim()}>Continue →</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="modal-body">
            {datasources.length > 0 && !addingNew && (
              <>
                <div className="ds-list">{datasources.map(d => (
                  <button key={d.id} className={`ds-item ${selectedDs === d.id ? 'sel' : ''}`} onClick={() => setSelectedDs(d.id)}>
                    <div className="ds-icon"><Database size={16}/></div>
                    <div><strong>{d.name}</strong><span>{d.host}:{d.port}/{d.database}</span></div>
                    {selectedDs === d.id && <CheckCircle2 size={16} className="check"/>}
                  </button>
                ))}</div>
                <button className="btn-link" onClick={() => setAddingNew(true)}><Plus size={13}/>Add new datasource</button>
              </>
            )}
            {addingNew && (
              <>
                {savedDs && <div className="saved-badge"><CheckCircle2 size={13}/> "{savedDs}" connected</div>}
                {!savedDs && (
                  <DatasourceEditForm
                    initialData={{ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' }}
                    onSave={handleSaveDs}
                    testing={testing}
                    testResult={testResult}
                    onTest={handleTest}
                  />
                )}
                {datasources.length > 0 && !savedDs && <button className="btn-link" onClick={() => setAddingNew(false)}>← Use existing</button>}
              </>
            )}
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => onCreate({ name, description: desc, emoji, color, datasource_id: selectedDs })}>Create Project ✨</button>
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

function ProjectThumbCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  // Build a subtle dual-tone gradient from the project color
  const c = p.color;
  const thumbStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${c}55 0%, ${c}22 60%, ${c}0d 100%)`,
  };

  return (
    <button className="canva-proj-card" onClick={onOpen}>
      {/* Thumbnail preview area */}
      <div className="canva-proj-thumb" style={thumbStyle}>
        <span className="canva-proj-emoji">{p.emoji}</span>
        {/* Decorative blobs */}
        <div className="canva-proj-blob blob-1" style={{ background: c + '30' }} />
        <div className="canva-proj-blob blob-2" style={{ background: c + '20' }} />
      </div>

      {/* Info area */}
      <div className="canva-proj-info">
        <div className="canva-proj-title">{p.name}</div>
        <div className="canva-proj-meta">
          <div className="canva-proj-avatar" style={{ background: c }}>{p.emoji}</div>
          <span className="canva-proj-date">
            <Clock size={10} /> Edited {timeAgo(p.updated_at)}
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
