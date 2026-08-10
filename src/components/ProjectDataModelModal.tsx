/**
 * ProjectDataModelModal — UI for editing a project's data-model curation:
 *   - Pinned tables: ALWAYS available to the planner, regardless of retrieval score.
 *   - Glossary: business-term → schema mapping. The planner uses these to resolve
 *     ambiguous user terms ("revenue" → orders.total, NOT invoices.gross).
 *   - Metric definitions: canonical SQL formulas for KPIs. The planner prefers
 *     these over re-deriving the formula from scratch.
 *
 * Three tabs in one modal so the user can flip between concerns without
 * leaving the project context.
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, Loader2, Search, Trash2, Plus, Pin, BookOpen, Calculator, Database, Star } from 'lucide-react';
import { BASE } from './constants';
import { toast, confirmDialog } from './ui';
import type { Datasource } from '../App';

interface Props {
  projectId: number;
  projectName: string;
  datasourceId?: number | null;
  /** All datasources the user can pick from when linking an extra source. */
  availableDatasources?: Datasource[];
  onClose: () => void;
}

interface GlossaryEntry {
  term: string;
  definition: string;
  tables?: string[];
  columns?: string[];
}

interface MetricEntry {
  name: string;
  sql: string;
  description?: string;
  unit?: string;
}

interface SourceLink {
  link_id:         number;
  datasource_id:   number;
  datasource_name: string;
  kind:            string;
  alias:           string;
  is_primary:      boolean;
  sort_order:      number;
}

type Tab = 'sources' | 'pinned' | 'glossary' | 'metrics';


export function ProjectDataModelModal({ projectId, projectName, datasourceId, availableDatasources, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('sources');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [links, setLinks] = useState<SourceLink[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);

  const [tables, setTables]   = useState<string[]>([]);
  const [pinned, setPinned]   = useState<string[]>([]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [metrics, setMetrics]   = useState<MetricEntry[]>([]);
  const [pinFilter, setPinFilter] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dmRes, tablesRes, linksRes] = await Promise.all([
          axios.get(`${BASE}/projects/${projectId}/data-model/`),
          datasourceId
            ? axios.get(`${BASE}/datasources/${datasourceId}/tables/`)
            : Promise.resolve({ data: { tables: [] } }),
          axios.get(`${BASE}/projects/${projectId}/datasources/`),
        ]);
        if (!alive) return;
        setPinned(dmRes.data?.pinned_tables ?? []);
        setGlossary(dmRes.data?.glossary ?? []);
        setMetrics(dmRes.data?.metric_definitions ?? []);
        setTables(tablesRes.data?.tables ?? []);
        setLinks(linksRes.data?.sources ?? []);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || 'Failed to load data model');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId, datasourceId]);

  // ── Source link handlers ────────────────────────────────────────────
  const refreshLinks = async () => {
    const r = await axios.get(`${BASE}/projects/${projectId}/datasources/`);
    setLinks(r.data?.sources ?? []);
  };

  const addSourceLink = async (dsId: number) => {
    setLinkBusy(true);
    try {
      await axios.post(`${BASE}/projects/${projectId}/datasources/`, { datasource_id: dsId });
      await refreshLinks();
      toast.success('Datasource linked. Next planner run will see both sources.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to link datasource');
    } finally {
      setLinkBusy(false);
    }
  };

  const removeSourceLink = async (linkId: number) => {
    if (!(await confirmDialog({
      title: 'Unlink datasource?',
      message: 'Existing dashboards keep working, but new charts will no longer target this source.',
      confirmLabel: 'Unlink', danger: true,
    }))) return;
    setLinkBusy(true);
    try {
      await axios.delete(`${BASE}/projects/${projectId}/datasources/${linkId}/`);
      await refreshLinks();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to unlink');
    } finally {
      setLinkBusy(false);
    }
  };

  const promotePrimary = async (linkId: number) => {
    setLinkBusy(true);
    try {
      await axios.patch(`${BASE}/projects/${projectId}/datasources/${linkId}/`, { is_primary: true });
      await refreshLinks();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to set primary');
    } finally {
      setLinkBusy(false);
    }
  };

  const renameAlias = async (linkId: number, alias: string) => {
    setLinkBusy(true);
    try {
      await axios.patch(`${BASE}/projects/${projectId}/datasources/${linkId}/`, { alias });
      await refreshLinks();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to rename alias');
    } finally {
      setLinkBusy(false);
    }
  };

  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const filteredTables = useMemo(() => {
    const q = pinFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, pinFilter]);

  const togglePinned = (table: string) => {
    setPinned(p => {
      const s = new Set(p);
      if (s.has(table)) s.delete(table);
      else s.add(table);
      return Array.from(s).sort();
    });
  };

  // Glossary handlers
  const addGlossary = () => setGlossary(g => [...g, { term: '', definition: '', tables: [], columns: [] }]);
  const updateGlossary = (i: number, patch: Partial<GlossaryEntry>) =>
    setGlossary(g => g.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeGlossary = (i: number) => setGlossary(g => g.filter((_, idx) => idx !== i));

  // Metric handlers
  const addMetric = () => setMetrics(m => [...m, { name: '', sql: '', description: '', unit: '' }]);
  const updateMetric = (i: number, patch: Partial<MetricEntry>) =>
    setMetrics(m => m.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeMetric = (i: number) => setMetrics(m => m.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await axios.put(`${BASE}/projects/${projectId}/data-model/`, {
        pinned_tables:      pinned,
        glossary:           glossary
          .map(g => ({
            term: g.term.trim(),
            definition: g.definition.trim(),
            tables: (g.tables || []).filter(Boolean),
            columns: (g.columns || []).filter(Boolean),
          }))
          .filter(g => g.term && g.definition),
        metric_definitions: metrics
          .map(m => ({
            name: m.name.trim(),
            sql:  m.sql.trim(),
            description: (m.description || '').trim(),
            unit: (m.unit || '').trim(),
          }))
          .filter(m => m.name && m.sql),
      });
      toast.success('Data model saved. Next planner run will use it.');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 760, maxWidth: '94vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Project data model</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              <strong>{projectName}</strong> — tell the planner what your terms mean and which tables are core.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>

        <div className="pdm-tabs">
          <button
            className={`pdm-tab ${tab === 'sources' ? 'is-active' : ''}`}
            onClick={() => setTab('sources')}
          >
            <Database size={13}/> Data sources
            <span className="pdm-tab__count">{links.length}</span>
          </button>
          <button
            className={`pdm-tab ${tab === 'pinned' ? 'is-active' : ''}`}
            onClick={() => setTab('pinned')}
          >
            <Pin size={13}/> Pinned tables
            <span className="pdm-tab__count">{pinned.length}</span>
          </button>
          <button
            className={`pdm-tab ${tab === 'glossary' ? 'is-active' : ''}`}
            onClick={() => setTab('glossary')}
          >
            <BookOpen size={13}/> Glossary
            <span className="pdm-tab__count">{glossary.filter(g => g.term && g.definition).length}</span>
          </button>
          <button
            className={`pdm-tab ${tab === 'metrics' ? 'is-active' : ''}`}
            onClick={() => setTab('metrics')}
          >
            <Calculator size={13}/> Metrics
            <span className="pdm-tab__count">{metrics.filter(m => m.name && m.sql).length}</span>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', gap:8, color:'var(--text-tertiary)' }}>
              <Loader2 size={18} className="spin"/> Loading…
            </div>
          ) : (
            <>
              {tab === 'sources' && (
                <section className="dscur-sec" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <p className="dscur-sec__hint">
                    Link additional datasources for side-by-side analytics. Each chart targets ONE source — the planner picks based on the question. <strong>Cross-source JOINs are not supported.</strong>
                  </p>

                  <div className="pdm-list">
                    {links.map(lk => (
                      <div key={lk.link_id} className="pdm-card">
                        <div className="pdm-card__row">
                          <div style={{ display:'flex', alignItems:'center', gap:8, flex: 1 }}>
                            <Database size={14} style={{ color: lk.is_primary ? 'var(--accent-strong)' : 'var(--text-tertiary)' }}/>
                            <strong style={{ fontSize: 14 }}>{lk.datasource_name}</strong>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{lk.kind}</span>
                            {lk.is_primary && (
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:3,
                                background: 'var(--accent-subtle)', color: 'var(--accent-strong)',
                                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                                padding: '2px 7px', borderRadius: 999,
                              }}>
                                <Star size={10}/> primary
                              </span>
                            )}
                          </div>
                          <div style={{ display:'flex', gap: 6, alignItems: 'center' }}>
                            {!lk.is_primary && (
                              <button
                                type="button"
                                className="dscur-add"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                onClick={() => promotePrimary(lk.link_id)}
                                disabled={linkBusy}
                                title="Make this the primary datasource"
                              >
                                Set primary
                              </button>
                            )}
                            <button
                              type="button"
                              className="dscur-row-del"
                              onClick={() => removeSourceLink(lk.link_id)}
                              disabled={linkBusy || lk.is_primary}
                              title={lk.is_primary ? 'Promote another link first' : 'Unlink datasource'}
                              aria-label="Unlink"
                            >
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                        <div className="pdm-card__row pdm-card__row--sub">
                          <label className="pdm-card__label">Alias</label>
                          <input
                            className="dscur-input"
                            style={{ flex: '0 0 200px', fontFamily: 'var(--font-mono, monospace)' }}
                            value={lk.alias}
                            onChange={e => setLinks(prev => prev.map(l => l.link_id === lk.link_id ? { ...l, alias: e.target.value } : l))}
                            onBlur={e => {
                              const next = e.target.value.trim();
                              if (next && next !== lk.alias) renameAlias(lk.link_id, next);
                            }}
                            title="Short label the planner uses to route SQL to this source (e.g. crm, warehouse)"
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            Planner references tables here as <code>[source={lk.alias}]</code>
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Add-source picker */}
                    {availableDatasources && availableDatasources.length > 0 && (() => {
                      const linkedIds = new Set(links.map(l => l.datasource_id));
                      const candidates = availableDatasources.filter(d => !linkedIds.has(d.id) && !d.is_myspace && !d.is_hubspot);
                      if (candidates.length === 0) return null;
                      return (
                        <div className="pdm-card" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                          <div className="pdm-card__row" style={{ alignItems: 'center' }}>
                            <Plus size={13} style={{ color: 'var(--text-tertiary)' }}/>
                            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Link another datasource:</span>
                            <select
                              className="dscur-input"
                              style={{ flex: 1 }}
                              defaultValue=""
                              onChange={e => {
                                const id = parseInt(e.target.value, 10);
                                if (id) {
                                  addSourceLink(id);
                                  e.target.value = '';
                                }
                              }}
                              disabled={linkBusy}
                            >
                              <option value="">— pick a datasource —</option>
                              {candidates.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.kind || 'postgresql'})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {tab === 'pinned' && (
                <section className="dscur-sec" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <p className="dscur-sec__hint">
                    Pinned tables are <strong>always</strong> included as candidates for the planner, even if semantic retrieval would have dropped them. Use sparingly — 3-8 core tables for this project's domain.
                  </p>

                  {tables.length === 0 ? (
                    <div className="dscur-empty" style={{ padding: 24 }}>
                      No tables fetched yet for this datasource. Open the dashboard once to populate the schema cache.
                    </div>
                  ) : (
                    <>
                      <div className="dscur-search">
                        <Search size={13}/>
                        <input
                          type="search"
                          placeholder={`Filter ${tables.length} tables…`}
                          value={pinFilter}
                          onChange={e => setPinFilter(e.target.value)}
                        />
                      </div>
                      <div className="dscur-chips">
                        {filteredTables.map(t => {
                          const isPinned = pinnedSet.has(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              className={`dscur-chip ${isPinned ? 'dscur-chip--pinned' : ''}`}
                              onClick={() => togglePinned(t)}
                              title={isPinned ? 'Click to unpin' : 'Click to pin'}
                            >
                              {isPinned && <Pin size={10} style={{ marginRight: 4, verticalAlign: '-1px' }}/>}
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>
              )}

              {tab === 'glossary' && (
                <section className="dscur-sec" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <p className="dscur-sec__hint">
                    Map business terms to schema. When a user query says <em>"revenue"</em>, the planner will use the term's definition instead of guessing column names.
                  </p>

                  <div className="pdm-list">
                    {glossary.map((g, i) => (
                      <div key={i} className="pdm-card">
                        <div className="pdm-card__row">
                          <input
                            className="dscur-input"
                            style={{ flex: '0 0 180px' }}
                            placeholder="Term (e.g. revenue)"
                            value={g.term}
                            onChange={e => updateGlossary(i, { term: e.target.value })}
                          />
                          <input
                            className="dscur-input"
                            style={{ flex: 1 }}
                            placeholder="Definition (e.g. sum of orders.total where status=completed)"
                            value={g.definition}
                            onChange={e => updateGlossary(i, { definition: e.target.value })}
                          />
                          <button type="button" className="dscur-row-del" onClick={() => removeGlossary(i)} aria-label="Remove">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                        <div className="pdm-card__row pdm-card__row--sub">
                          <label className="pdm-card__label">Tables</label>
                          <input
                            className="dscur-input"
                            style={{ flex: 1 }}
                            placeholder="Comma-separated (e.g. orders, invoices)"
                            value={(g.tables || []).join(', ')}
                            onChange={e => updateGlossary(i, { tables: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          />
                          <label className="pdm-card__label">Columns</label>
                          <input
                            className="dscur-input"
                            style={{ flex: 1 }}
                            placeholder="e.g. orders.total_amount"
                            value={(g.columns || []).join(', ')}
                            onChange={e => updateGlossary(i, { columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" className="dscur-add" onClick={addGlossary}>
                      <Plus size={13}/> Add glossary term
                    </button>
                  </div>
                </section>
              )}

              {tab === 'metrics' && (
                <section className="dscur-sec" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <p className="dscur-sec__hint">
                    Canonical KPI formulas. The planner prefers these SQL fragments over re-deriving the calculation. Use for metrics with non-obvious definitions (MAU, retention, NRR, etc.).
                  </p>

                  <div className="pdm-list">
                    {metrics.map((m, i) => (
                      <div key={i} className="pdm-card">
                        <div className="pdm-card__row">
                          <input
                            className="dscur-input"
                            style={{ flex: '0 0 140px' }}
                            placeholder="Metric name (e.g. MAU)"
                            value={m.name}
                            onChange={e => updateMetric(i, { name: e.target.value })}
                          />
                          <input
                            className="dscur-input"
                            style={{ flex: '0 0 100px' }}
                            placeholder="Unit (e.g. users)"
                            value={m.unit || ''}
                            onChange={e => updateMetric(i, { unit: e.target.value })}
                          />
                          <input
                            className="dscur-input"
                            style={{ flex: 1 }}
                            placeholder="Short description"
                            value={m.description || ''}
                            onChange={e => updateMetric(i, { description: e.target.value })}
                          />
                          <button type="button" className="dscur-row-del" onClick={() => removeMetric(i)} aria-label="Remove">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                        <div className="pdm-card__row pdm-card__row--sub">
                          <label className="pdm-card__label" style={{ alignSelf: 'flex-start', paddingTop: 8 }}>SQL</label>
                          <textarea
                            className="dscur-input"
                            style={{ flex: 1, minHeight: 80, fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}
                            placeholder="COUNT(DISTINCT user_id) WHERE last_login_at >= NOW() - INTERVAL '30 days'"
                            value={m.sql}
                            onChange={e => updateMetric(i, { sql: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" className="dscur-add" onClick={addMetric}>
                      <Plus size={13}/> Add metric
                    </button>
                  </div>
                </section>
              )}

              {error && <div className="dscur-error">{error}</div>}
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? <><Loader2 size={13} className="spin"/> Saving…</> : 'Save data model'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
