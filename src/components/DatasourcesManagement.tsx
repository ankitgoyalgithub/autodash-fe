import { useState } from 'react';
import { Database, Plus, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Zap, DatabaseZap, Filter } from 'lucide-react';
import axios from 'axios';
import type { Datasource } from '../App';
import { BASE } from './constants';
import { HubSpotConnectModal } from './HubSpotConnectModal';
import { DatasourceCurationModal } from './DatasourceCurationModal';
import { toast, EmptyState, Button } from './ui';

// Per-engine defaults — single source of truth for the kind picker and the
// port/username placeholders so adding a new engine is one new row.
type DSKind = 'postgresql' | 'mssql' | 'clickhouse';
const DS_KIND_META: Record<DSKind, {
  label: string; emoji: string; defaultPort: string; userPlaceholder: string;
}> = {
  postgresql: { label: 'PostgreSQL', emoji: '🐘', defaultPort: '5432', userPlaceholder: 'postgres' },
  mssql:      { label: 'SQL Server', emoji: '🪟', defaultPort: '1433', userPlaceholder: 'sa' },
  clickhouse: { label: 'ClickHouse', emoji: '⚡', defaultPort: '8123', userPlaceholder: 'default' },
};
const DS_KIND_ORDER: DSKind[] = ['postgresql', 'mssql', 'clickhouse'];
const DS_DEFAULT_PORTS = new Set(Object.values(DS_KIND_META).map(m => m.defaultPort));

export function DatasourceEditForm({ initialData, onSave, testing, testResult, onTest }: {
  initialData: Datasource | { id: number; name: string; kind?: DSKind; host: string; port: number; database: string; username: string; };
  onSave: (d: object) => void;
  testing: boolean;
  testResult: { ok: boolean; msg: string } | null;
  onTest: (cfg: object) => void;
}) {
  const initialKind = ((initialData as any).kind || 'postgresql') as DSKind;
  const [form, setForm] = useState({
    name: initialData.name,
    kind: initialKind,
    host: initialData.host,
    port: String(initialData.port),
    database: initialData.database,
    username: initialData.username,
    password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setKind = (kind: DSKind) => setForm(f => {
    // Bump the port to the new engine's default IF the current port is ANY
    // other engine's default — otherwise leave the user's custom value alone.
    const nextDefault = DS_KIND_META[kind].defaultPort;
    const wasSomeDefault = DS_DEFAULT_PORTS.has(f.port) && f.port !== nextDefault;
    return { ...f, kind, port: wasSomeDefault ? nextDefault : f.port };
  });

  const kindMeta = DS_KIND_META[form.kind];

  return (
    <div className="ds-form">
      <div className="form-row"><div className="field full"><label>Connection Name</label><input placeholder="e.g. Production DB" value={form.name} onChange={u('name')} /></div></div>

      <div className="form-row">
        <div className="field full">
          <label>Database Type</label>
          <div className="ds-kind-row">
            {DS_KIND_ORDER.map(k => {
              const m = DS_KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  className={`ds-kind-card ${form.kind === k ? 'sel' : ''}`}
                  onClick={() => setKind(k)}
                >
                  <span className="ds-kind-emoji">{m.emoji}</span>
                  <strong>{m.label}</strong>
                  <small>Default port {m.defaultPort}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label>Host</label><input placeholder="127.0.0.1" value={form.host} onChange={u('host')} /></div>
        <div className="field sm"><label>Port</label><input placeholder={kindMeta.defaultPort} value={form.port} onChange={u('port')} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Database</label><input placeholder={form.kind === 'clickhouse' ? 'default' : 'my_database'} value={form.database} onChange={u('database')} /></div>
        <div className="field"><label>Username</label><input placeholder={kindMeta.userPlaceholder} value={form.username} onChange={u('username')} /></div>
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
  const [curatingDs, setCuratingDs] = useState<Datasource | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showHubSpot, setShowHubSpot] = useState(false);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this datasource? (This may affect associated projects)')) return;
    try {
      await axios.delete(`${BASE}/datasources/${id}/`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete datasource.');
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
      toast.error(e.response?.data?.error || 'Failed to save datasource.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Sources</h1>
          <p className="page-sub">Manage your database connections and integrations</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary hs-connect-btn" onClick={() => setShowHubSpot(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff7a59">
              <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.27-1.974v-.075a2.21 2.21 0 0 0-2.211-2.21h-.075a2.21 2.21 0 0 0-2.21 2.21v.075a2.198 2.198 0 0 0 1.27 1.974V7.93a6.261 6.261 0 0 0-2.973 1.31L4.989 3.108a2.49 2.49 0 1 0-1.193 1.605l7.81 6.082a6.314 6.314 0 0 0 .096 7.117L9.327 20.49a2.05 2.05 0 1 0 1.439 1.439l2.343-2.343a6.328 6.328 0 1 0 5.055-11.656zM17.186 17.66a3.231 3.231 0 1 1 0-6.462 3.231 3.231 0 0 1 0 6.462z"/>
            </svg>
            Connect HubSpot
          </button>
          <button className="btn-primary" onClick={() => setEditingDs({ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' } as Datasource)}>
            <Plus size={15} /> Add New Source
          </button>
        </div>
      </div>

      <div className="ds-grid">
        {datasources.length === 0 ? (
          <EmptyState
            icon={<DatabaseZap size={26}/>}
            title="No data sources yet"
            subtitle="Connect your first database to start building dashboards from live data."
            actions={
              <Button
                onClick={() => setEditingDs({ id: 0, name: '', host: '127.0.0.1', port: 5432, database: '', username: '' } as Datasource)}
                leading={<Plus size={14}/>}
              >
                Connect a database
              </Button>
            }
          />
        ) : (
          datasources.map(ds => {
            const isHubSpot = (ds as any).is_hubspot;
            const isMySpace = (ds as any).is_myspace;
            return (
              <div key={ds.id} className="ds-card">
                <div className="ds-card-icon" style={
                  isHubSpot ? { background: '#fff5f1', color: '#ff7a59' } :
                  isMySpace ? { background: '#ede9fe', color: '#7c3aed' } : {}
                }>
                  {isHubSpot ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.27-1.974v-.075a2.21 2.21 0 0 0-2.211-2.21h-.075a2.21 2.21 0 0 0-2.21 2.21v.075a2.198 2.198 0 0 0 1.27 1.974V7.93a6.261 6.261 0 0 0-2.973 1.31L4.989 3.108a2.49 2.49 0 1 0-1.193 1.605l7.81 6.082a6.314 6.314 0 0 0 .096 7.117L9.327 20.49a2.05 2.05 0 1 0 1.439 1.439l2.343-2.343a6.328 6.328 0 1 0 5.055-11.656zM17.186 17.66a3.231 3.231 0 1 1 0-6.462 3.231 3.231 0 0 1 0 6.462z"/>
                    </svg>
                  ) : <Database size={24} />}
                </div>
                <div className="ds-card-info">
                  <h3>
                    {ds.name}
                    {isHubSpot && <span className="ds-badge ds-badge--hs">HubSpot</span>}
                    {isMySpace && <span className="ds-badge ds-badge--ms">My Space</span>}
                  </h3>
                  {isHubSpot
                    ? <code>HubSpot CRM &middot; auto-synced</code>
                    : <code>{ds.host}:{ds.port}/{ds.database}</code>}
                  {!isHubSpot && <p>User: {ds.username}</p>}
                </div>
                <div className="ds-card-actions">
                  {isHubSpot ? (
                    <button className="btn-edit" onClick={() => setShowHubSpot(true)}>Manage</button>
                  ) : (
                    <>
                      <button className="btn-edit" onClick={() => setEditingDs(ds)}>Edit</button>
                      {!isMySpace && (
                        <button
                          className="btn-edit"
                          onClick={() => setCuratingDs(ds)}
                          title="Mark junk tables to ignore + describe useful ones. Improves planner accuracy on large schemas."
                        >
                          <Filter size={13} style={{ marginRight: 4, verticalAlign: '-2px' }}/>
                          Curate
                        </button>
                      )}
                    </>
                  )}
                  {!isMySpace && !isHubSpot && (
                    <button className="btn-ghost-indigo" style={{ borderColor: '#fecaca', color: '#dc2626' }} onClick={() => handleDelete(ds.id)}>Delete</button>
                  )}
                </div>
              </div>
            );
          })
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

      {showHubSpot && (
        <HubSpotConnectModal
          onClose={() => setShowHubSpot(false)}
          onConnected={onRefresh}
        />
      )}

      {curatingDs && (
        <DatasourceCurationModal
          datasourceId={curatingDs.id}
          datasourceName={curatingDs.name}
          onClose={() => setCuratingDs(null)}
        />
      )}
    </div>
  );
}
