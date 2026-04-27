/**
 * HubSpotConnectModal — three-step flow:
 *   1. Paste Private App access token
 *   2. Pick which CRM objects to sync
 *   3. Sync runs, shows progress + results
 *
 * Also handles the "already connected" case — shows current status and lets
 * the user re-sync, change selected objects, or disconnect.
 */

import { useState, useEffect } from 'react';
import {
  X, ExternalLink, AlertCircle, CheckCircle2, Loader2,
  RefreshCw, Trash2, ArrowRight, Database,
} from 'lucide-react';
import axios from 'axios';
import { BASE } from './constants';

interface HubSpotObject {
  id: string;
  label: string;
  description: string;
  emoji: string;
  available: boolean;
  n_properties: number;
  error?: string;
}

interface HubSpotStatus {
  connected:        boolean;
  portal_id?:       string;
  datasource_id?:   number;
  selected_objects?: string[];
  synced_objects?:  Record<string, { rows: number; columns: number; last_synced_at: string }>;
  last_sync_at?:    string | null;
  last_sync_status?: string;
  sync_error?:      string;
}

interface SyncResult {
  success: boolean;
  rows: number;
  columns: number;
  error?: string;
}

interface Props {
  onClose: () => void;
  onConnected?: () => void;
}

type Step = 'token' | 'objects' | 'syncing' | 'done' | 'manage';

export function HubSpotConnectModal({ onClose, onConnected }: Props) {
  const [step, setStep] = useState<Step>('token');
  const [status, setStatus] = useState<HubSpotStatus>({ connected: false });
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [objects, setObjects] = useState<HubSpotObject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  // Load existing connection status on mount
  useEffect(() => {
    axios.get(`${BASE}/hubspot/status/`)
      .then(r => {
        if (r.data?.connected) {
          setStatus(r.data);
          setStep('manage');
          // Pre-fill selected objects from prior sync
          setSelected(new Set(r.data.selected_objects || []));
        }
      })
      .catch(() => {});
  }, []);

  // ─── Step 1: Verify + save token ────────────────────────────────────────
  const handleConnect = async () => {
    setVerifying(true);
    setTokenError('');
    try {
      const r = await axios.post(`${BASE}/hubspot/connect/`, { access_token: token.trim() });
      setStatus(r.data);
      // Fetch available objects
      await loadObjects();
      setStep('objects');
    } catch (e: any) {
      setTokenError(e.response?.data?.error || 'Could not connect to HubSpot.');
    } finally {
      setVerifying(false);
    }
  };

  const loadObjects = async () => {
    try {
      const r = await axios.get(`${BASE}/hubspot/objects/`);
      setObjects(r.data.objects || []);
    } catch (e) {
      console.error('Failed to load HubSpot objects:', e);
    }
  };

  // ─── Step 2 → 3: Run sync ──────────────────────────────────────────────
  const handleSync = async () => {
    if (selected.size === 0) return;
    setStep('syncing');
    setSyncing(true);
    try {
      const r = await axios.post(`${BASE}/hubspot/sync/`, {
        objects: Array.from(selected),
      }, { timeout: 300000 }); // 5 min timeout for large portals
      setSyncResults(r.data.results || {});
      setStatus(r.data.connection || status);
      setStep('done');
      onConnected?.();
    } catch (e: any) {
      setTokenError(e.response?.data?.error || 'Sync failed. Try again.');
      setStep('objects');
    } finally {
      setSyncing(false);
    }
  };

  // ─── Disconnect ─────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm('Disconnect HubSpot? Your synced data will remain available unless you also remove the datasource.')) return;
    try {
      await axios.delete(`${BASE}/hubspot/disconnect/?purge=true`);
      onConnected?.();
      onClose();
    } catch (e) {
      alert('Failed to disconnect.');
    }
  };

  const toggleObj = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hs-modal" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="hs-modal-head">
          <div className="hs-modal-head-left">
            <div className="hs-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff7a59">
                <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.27-1.974v-.075a2.21 2.21 0 0 0-2.211-2.21h-.075a2.21 2.21 0 0 0-2.21 2.21v.075a2.198 2.198 0 0 0 1.27 1.974V7.93a6.261 6.261 0 0 0-2.973 1.31L4.989 3.108a2.49 2.49 0 1 0-1.193 1.605l7.81 6.082a6.314 6.314 0 0 0 .096 7.117L9.327 20.49a2.05 2.05 0 1 0 1.439 1.439l2.343-2.343a6.328 6.328 0 1 0 5.055-11.656zM17.186 17.66a3.231 3.231 0 1 1 0-6.462 3.231 3.231 0 0 1 0 6.462z"/>
              </svg>
            </div>
            <div>
              <h2>Connect HubSpot</h2>
              <p>Sync your CRM data for reporting and analysis</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>

        {/* ── Stepper ── */}
        {step !== 'manage' && (
          <div className="hs-stepper">
            <div className={`hs-step ${step === 'token' ? 'active' : ''} ${['objects','syncing','done'].includes(step) ? 'done' : ''}`}>
              <span>1</span> Authenticate
            </div>
            <div className="hs-step-line" />
            <div className={`hs-step ${step === 'objects' ? 'active' : ''} ${['syncing','done'].includes(step) ? 'done' : ''}`}>
              <span>2</span> Choose Objects
            </div>
            <div className="hs-step-line" />
            <div className={`hs-step ${['syncing','done'].includes(step) ? 'active' : ''}`}>
              <span>3</span> Sync
            </div>
          </div>
        )}

        {/* ── Step content ── */}
        <div className="hs-modal-body">
          {step === 'manage' && (
            <ManageView
              status={status}
              onResync={() => { loadObjects(); setStep('objects'); }}
              onDisconnect={handleDisconnect}
            />
          )}

          {step === 'token' && (
            <TokenStep
              token={token}
              setToken={setToken}
              error={tokenError}
              verifying={verifying}
              onConnect={handleConnect}
            />
          )}

          {step === 'objects' && (
            <ObjectsStep
              objects={objects}
              selected={selected}
              onToggle={toggleObj}
              onSync={handleSync}
              onBack={status.connected ? () => setStep('manage') : () => setStep('token')}
              error={tokenError}
            />
          )}

          {step === 'syncing' && (
            <div className="hs-syncing">
              <Loader2 size={36} className="spin" />
              <h3>Syncing your HubSpot data...</h3>
              <p>This may take 30-90 seconds depending on portal size. Please don't close this window.</p>
              <div className="hs-syncing-list">
                {Array.from(selected).map(id => {
                  const obj = objects.find(o => o.id === id);
                  return (
                    <div key={id} className="hs-syncing-item">
                      <Loader2 size={12} className="spin" />
                      <span>{obj?.emoji} {obj?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'done' && (
            <DoneStep
              results={syncResults}
              objects={objects}
              onClose={onClose}
              onResync={() => { setStep('objects'); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Token entry step ─────────────────────────────────────────────────────────

function TokenStep({ token, setToken, error, verifying, onConnect }: {
  token: string; setToken: (v: string) => void;
  error: string; verifying: boolean; onConnect: () => void;
}) {
  return (
    <div className="hs-step-pane">
      <div className="hs-info-box">
        <strong>Step 1: Create a Private App in HubSpot</strong>
        <ol>
          <li>Go to <strong>Settings → Integrations → Private Apps</strong> in HubSpot</li>
          <li>Click <strong>Create a private app</strong></li>
          <li>Under <strong>Scopes → CRM</strong>, enable <em>read</em> permissions for the objects you want to sync (contacts, companies, deals, etc.)</li>
          <li>Create the app and copy the <strong>access token</strong></li>
        </ol>
        <a href="https://developers.hubspot.com/docs/api/private-apps" target="_blank" rel="noreferrer" className="hs-info-link">
          HubSpot Private Apps documentation <ExternalLink size={11} />
        </a>
      </div>

      <div className="hs-field">
        <label>Private App Access Token</label>
        <input
          type="password"
          autoFocus
          placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={token}
          onChange={e => setToken(e.target.value)}
          className="hs-input"
        />
        <p className="hs-field-hint">Token is encrypted at rest. We never share it.</p>
      </div>

      {error && (
        <div className="hs-error"><AlertCircle size={14}/> {error}</div>
      )}

      <button className="hs-primary-btn" disabled={!token.trim() || verifying} onClick={onConnect}>
        {verifying ? <><Loader2 size={14} className="spin"/> Verifying...</> : <>Connect <ArrowRight size={14}/></>}
      </button>
    </div>
  );
}

// ─── Object selection step ────────────────────────────────────────────────────

function ObjectsStep({ objects, selected, onToggle, onSync, onBack, error }: {
  objects: HubSpotObject[]; selected: Set<string>;
  onToggle: (id: string) => void; onSync: () => void; onBack: () => void;
  error: string;
}) {
  const availableObjects = objects.filter(o => o.available);
  const unavailableObjects = objects.filter(o => !o.available);

  return (
    <div className="hs-step-pane">
      <div className="hs-objects-header">
        <h3>Pick objects to sync</h3>
        <p>Each selected object becomes a queryable table. Sync only what you need — you can always add more later.</p>
      </div>

      {availableObjects.length > 0 && (
        <div className="hs-objects-grid">
          {availableObjects.map(obj => {
            const checked = selected.has(obj.id);
            return (
              <button
                key={obj.id}
                className={`hs-obj-card ${checked ? 'sel' : ''}`}
                onClick={() => onToggle(obj.id)}
              >
                <div className="hs-obj-check">
                  {checked && <CheckCircle2 size={14} />}
                </div>
                <div className="hs-obj-emoji">{obj.emoji}</div>
                <div className="hs-obj-info">
                  <strong>{obj.label}</strong>
                  <span>{obj.description}</span>
                  <span className="hs-obj-props">{obj.n_properties} properties</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {unavailableObjects.length > 0 && (
        <div className="hs-unavailable">
          <div className="hs-unavailable-label">Not available with your current scopes:</div>
          <div className="hs-unavailable-list">
            {unavailableObjects.map(obj => (
              <span key={obj.id} className="hs-unavailable-chip" title={obj.error}>
                {obj.emoji} {obj.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="hs-error"><AlertCircle size={14}/> {error}</div>
      )}

      <div className="hs-actions">
        <button className="hs-secondary-btn" onClick={onBack}>← Back</button>
        <button
          className="hs-primary-btn"
          disabled={selected.size === 0}
          onClick={onSync}
        >
          Sync {selected.size} object{selected.size !== 1 ? 's' : ''} <ArrowRight size={14}/>
        </button>
      </div>
    </div>
  );
}

// ─── Sync results / done step ─────────────────────────────────────────────────

function DoneStep({ results, objects, onClose, onResync }: {
  results: Record<string, SyncResult>;
  objects: HubSpotObject[];
  onClose: () => void; onResync: () => void;
}) {
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalRows = Object.values(results).reduce((s, r) => s + (r.rows || 0), 0);

  return (
    <div className="hs-step-pane">
      <div className="hs-done-hero">
        <CheckCircle2 size={36} className="hs-done-icon" />
        <h3>Sync complete</h3>
        <p>{successCount} of {Object.keys(results).length} objects synced &middot; {totalRows.toLocaleString()} total rows</p>
      </div>

      <div className="hs-results-list">
        {Object.entries(results).map(([id, r]) => {
          const obj = objects.find(o => o.id === id);
          return (
            <div key={id} className={`hs-result ${r.success ? 'ok' : 'fail'}`}>
              <span className="hs-result-emoji">{obj?.emoji}</span>
              <span className="hs-result-label">{obj?.label || id}</span>
              {r.success ? (
                <span className="hs-result-meta">{r.rows.toLocaleString()} rows · {r.columns} columns</span>
              ) : (
                <span className="hs-result-error" title={r.error}>{r.error}</span>
              )}
              {r.success
                ? <CheckCircle2 size={14} style={{ color: '#10b981' }}/>
                : <AlertCircle size={14} style={{ color: '#ef4444' }}/>}
            </div>
          );
        })}
      </div>

      <div className="hs-info-box hs-info-box--success">
        <Database size={14} />
        <div>
          <strong>Your HubSpot data is ready.</strong>
          <p>Create a project and pick the <em>HubSpot</em> datasource — you'll be able to choose which objects this project can access.</p>
        </div>
      </div>

      <div className="hs-actions">
        <button className="hs-secondary-btn" onClick={onResync}>Sync more objects</button>
        <button className="hs-primary-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ─── "Already connected" management view ─────────────────────────────────────

function ManageView({ status, onResync, onDisconnect }: {
  status: HubSpotStatus; onResync: () => void; onDisconnect: () => void;
}) {
  const synced = status.synced_objects || {};
  const syncedKeys = Object.keys(synced);

  return (
    <div className="hs-step-pane">
      <div className="hs-connected-hero">
        <div className="hs-connected-pulse">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <strong>Connected to HubSpot</strong>
          <span>Portal: {status.portal_id || 'unknown'}</span>
        </div>
      </div>

      {syncedKeys.length > 0 ? (
        <>
          <div className="hs-synced-label">Last synced objects</div>
          <div className="hs-synced-list">
            {syncedKeys.map(k => (
              <div key={k} className="hs-synced-row">
                <strong>{k}</strong>
                <span>{(synced[k].rows || 0).toLocaleString()} rows</span>
              </div>
            ))}
          </div>
          {status.last_sync_at && (
            <p className="hs-synced-time">
              Last synced {new Date(status.last_sync_at).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <div className="hs-info-box">
          You're connected but haven't synced any objects yet. Pick what to sync below.
        </div>
      )}

      {status.sync_error && (
        <div className="hs-error">
          <AlertCircle size={14}/>
          <div style={{ whiteSpace: 'pre-wrap' }}>{status.sync_error}</div>
        </div>
      )}

      <div className="hs-actions">
        <button className="hs-secondary-btn" onClick={onDisconnect}>
          <Trash2 size={13}/> Disconnect
        </button>
        <button className="hs-primary-btn" onClick={onResync}>
          <RefreshCw size={13}/> Sync objects
        </button>
      </div>
    </div>
  );
}
