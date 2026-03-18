import { useState } from 'react';
import { X, Plus, Database, CheckCircle2, Clock, BarChart2, ChevronRight } from 'lucide-react';
import axios from 'axios';
import type { Datasource, Project } from '../App';
import { BASE, EMOJIS, PALETTES } from './constants';
import { DatasourceEditForm } from './DatasourcesManagement';

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

export function ProjectsHome({ projects, onOpen, onNewProject }: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onNewProject: () => void;
}) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Each project is a dashboard workspace connected to a datasource</p>
        </div>
        <button className="btn-primary" onClick={onNewProject}><Plus size={15}/> New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-art">📊</div>
          <h3>Create your first project</h3>
          <p>Connect a database, describe your goals, and AutoDashboard builds the charts.</p>
          <button className="btn-primary" onClick={onNewProject}><Plus size={15}/> New Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <button key={p.id} className="proj-card" onClick={() => onOpen(p)}>
              <div className="proj-card-emoji" style={{ background: p.color + '18', border: `1.5px solid ${p.color}30` }}>{p.emoji}</div>
              <div className="proj-card-body">
                <h3>{p.name}</h3>
                {p.description && <p>{p.description}</p>}
                <div className="proj-card-meta">
                  {p.datasource && <span><Database size={11}/>{p.datasource.database}</span>}
                  <span><BarChart2 size={11}/>{p.chart_count} charts</span>
                  <span><Clock size={11}/>{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="proj-card-arrow" style={{color: p.color}}><ChevronRight size={16}/></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
