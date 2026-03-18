import { useState } from 'react';
import { Database, Plus, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';
import axios from 'axios';
import type { Datasource } from '../App';
import { BASE } from './constants';

export function DatasourceEditForm({ initialData, onSave, testing, testResult, onTest }: {
  initialData: Datasource | { id: number; name: string; host: string; port: number; database: string; username: string; };
  onSave: (d: object) => void;
  testing: boolean;
  testResult: { ok: boolean; msg: string } | null;
  onTest: (cfg: object) => void;
}) {
  const [form, setForm] = useState({
    name: initialData.name,
    host: initialData.host,
    port: String(initialData.port),
    database: initialData.database,
    username: initialData.username,
    password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="ds-form">
      <div className="form-row"><div className="field full"><label>Connection Name</label><input placeholder="e.g. Production DB" value={form.name} onChange={u('name')} /></div></div>
      <div className="form-row">
        <div className="field"><label>Host</label><input placeholder="127.0.0.1" value={form.host} onChange={u('host')} /></div>
        <div className="field sm"><label>Port</label><input placeholder="5432" value={form.port} onChange={u('port')} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Database</label><input placeholder="my_database" value={form.database} onChange={u('database')} /></div>
        <div className="field"><label>Username</label><input placeholder="postgres" value={form.username} onChange={u('username')} /></div>
      </div>
      <div className="form-row">
        <div className="field full pw-field">
          <label>Password {initialData.id ? <span className="opt">(leave blank to keep current)</span> : ''}</label>
          <div className="pw-wrap">
            <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={u('password')} />
            <button className="pw-toggle" type="button" onClick={() => setShowPw(s => !s)}>{showPw ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
          </div>
        </div>
      </div>
      {testResult && <div className={`test-result ${testResult.ok ? 'ok' : 'err'}`}>{testResult.ok ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}{testResult.msg}</div>}
      <div className="ds-actions">
        <button className="btn-ghost-indigo" type="button" onClick={() => onTest(form)} disabled={testing}>
          {testing ? <Loader2 size={13} className="spin"/> : <Zap size={13}/>}Test Connection
        </button>
        <button className="btn-primary" type="button" onClick={() => {
          const cfg: any = { ...form, port: parseInt(form.port) };
          if (initialData.id && !form.password) delete cfg.password;
          onSave(cfg);
        }}>
          {initialData.id ? 'Save Changes' : 'Connect Source'}
        </button>
      </div>
    </div>
  );
}

export function DatasourcesManagement({ datasources, onRefresh }: { datasources: Datasource[]; onRefresh: () => void }) {
  const [editingDs, setEditingDs] = useState<Datasource | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this datasource? (This may affect associated projects)')) return;
    try {
      await axios.delete(`${BASE}/datasources/${id}/`);
      onRefresh();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete datasource.');
    }
  };

  const handleTest = async (cfg: object) => {
    setTesting(true); setTestResult(null);
    try {
      const r = await axios.post(`${BASE}/datasources/test/`, cfg);
      setTestResult({ ok: true, msg: r.data.message });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.response?.data?.message || 'Connection failed.' });
    } finally { setTesting(false); }
  };

  const handleSave = async (cfg: any) => {
    try {
      if (editingDs && editingDs.id !== 0) {
        await axios.patch(`${BASE}/datasources/${editingDs.id}/`, cfg);
      } else {
        await axios.post(`${BASE}/datasources/`, cfg);
      }
      setEditingDs(null);
      setTestResult(null);
      onRefresh();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save datasource.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Sources</h1>
          <p className="page-sub">Manage your database connections</p>
        </div>
        <button className="btn-primary" onClick={() => setEditingDs({ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' } as Datasource)}>
          <Plus size={15} /> Add New Source
        </button>
      </div>

      <div className="ds-grid">
        {datasources.length === 0 ? (
          <div className="empty">
            <div className="empty-art">🔌</div>
            <h3>No data sources yet</h3>
            <p>Connect your first database to start building dashboards.</p>
          </div>
        ) : (
          datasources.map(ds => (
            <div key={ds.id} className="ds-card">
              <div className="ds-card-icon"><Database size={24} /></div>
              <div className="ds-card-info">
                <h3>{ds.name}</h3>
                <code>{ds.host}:{ds.port}/{ds.database}</code>
                <p>User: {ds.username}</p>
              </div>
              <div className="ds-card-actions">
                <button className="btn-edit" onClick={() => setEditingDs(ds)}>Edit</button>
                <button className="btn-ghost-indigo" style={{ borderColor: '#fecaca', color: '#dc2626' }} onClick={() => handleDelete(ds.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingDs && (
        <div className="modal-overlay" onClick={() => { setEditingDs(null); setTestResult(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingDs.id ? 'Edit Data Source' : 'Add Data Source'}</h2>
              <button className="icon-btn" onClick={() => { setEditingDs(null); setTestResult(null); }}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <DatasourceEditForm
                initialData={editingDs}
                onSave={handleSave}
                testing={testing}
                testResult={testResult}
                onTest={handleTest}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
