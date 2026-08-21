/**
 * DatasourceCurationModal — UI for marking tables irrelevant + adding
 * table descriptions for a datasource.
 *
 * Why it exists: warehouse-scale schemas (200+ tables) drown the planner in
 * irrelevant choices. Letting the user mark junk tables (logs, audit, sys.*)
 * + describe what each useful table contains dramatically improves table
 * selection and SQL quality.
 *
 * UX:
 *   - Top: ignored-tables picker. Multi-select chip list of every table in
 *     the datasource. Click to toggle ignore. Type to filter.
 *   - Bottom: table descriptions editor. Lightweight repeating row of
 *     {table, description} pairs.
 *   - Save persists everything in one PUT.
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, Loader2, Search, Trash2, Plus, Link2, ArrowRight } from 'lucide-react';
import { BASE } from './constants';
import { toast } from './ui';

interface Props {
  datasourceId: number;
  datasourceName: string;
  onClose: () => void;
}

interface CurationState {
  ignored_tables: string[];
  table_descriptions: Record<string, string>;
}

interface Relationship {
  id: number;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  source: 'declared' | 'inferred' | 'manual';
  confidence: number;
}

const REL_SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  declared: { label: 'foreign key', cls: 'dsrel-badge--fk' },
  inferred: { label: 'auto-detected', cls: 'dsrel-badge--auto' },
  manual:   { label: 'you defined', cls: 'dsrel-badge--you' },
};

export function DatasourceCurationModal({ datasourceId, datasourceName, onClose }: Props) {
  const [tables, setTables]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [curation, setCuration] = useState<CurationState>({ ignored_tables: [], table_descriptions: {} });
  const [filter, setFilter]     = useState('');
  // Local row-form for descriptions — keyed by index so blank rows are stable
  const [descRows, setDescRows] = useState<{ table: string; desc: string }[]>([]);
  // Relationships (separate resource — add/delete persist immediately)
  const [rels, setRels]           = useState<Relationship[]>([]);
  const [tableCols, setTableCols] = useState<Record<string, string[]>>({});
  const [newRel, setNewRel]       = useState({ from_table: '', from_column: '', to_table: '', to_column: '' });
  const [relBusy, setRelBusy]     = useState(false);

  // Load tables + existing curation + relationships in parallel
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tablesRes, curationRes, relRes] = await Promise.all([
          axios.get(`${BASE}/datasources/${datasourceId}/tables/`),
          axios.get(`${BASE}/datasources/${datasourceId}/curation/`),
          axios.get(`${BASE}/datasources/${datasourceId}/relationships/`),
        ]);
        if (!alive) return;
        setTables(tablesRes.data?.tables ?? []);
        const c: CurationState = {
          ignored_tables:     curationRes.data?.ignored_tables ?? [],
          table_descriptions: curationRes.data?.table_descriptions ?? {},
        };
        setCuration(c);
        setDescRows(
          Object.entries(c.table_descriptions).map(([table, desc]) => ({ table, desc: desc as string }))
        );
        setRels(relRes.data?.relationships ?? []);
        setTableCols(relRes.data?.tables ?? {});
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || 'Failed to load curation');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [datasourceId]);

  // Table list for relationship pickers — prefer the profiled set (has columns),
  // fall back to the plain table names.
  const relTables = useMemo(() => {
    const fromCols = Object.keys(tableCols);
    return fromCols.length ? fromCols.sort() : tables;
  }, [tableCols, tables]);

  const addRelationship = async () => {
    const { from_table, from_column, to_table, to_column } = newRel;
    if (!from_table || !from_column || !to_table || !to_column) return;
    if (from_table === to_table) { toast.error('Pick two different tables.'); return; }
    setRelBusy(true);
    try {
      const res = await axios.post(`${BASE}/datasources/${datasourceId}/relationships/`, newRel);
      const created: Relationship = res.data;
      setRels(prev => {
        const rest = prev.filter(r => r.id !== created.id);
        return [created, ...rest];
      });
      setNewRel({ from_table: '', from_column: '', to_table: '', to_column: '' });
      toast.success('Relationship added. The AI and dashboard filters can now join these tables.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to add relationship');
    } finally {
      setRelBusy(false);
    }
  };

  const deleteRelationship = async (id: number) => {
    setRelBusy(true);
    try {
      await axios.delete(`${BASE}/datasources/${datasourceId}/relationships/${id}/`);
      setRels(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to remove relationship');
    } finally {
      setRelBusy(false);
    }
  };

  const ignoredSet = useMemo(() => new Set(curation.ignored_tables), [curation.ignored_tables]);

  const toggleIgnored = (table: string) => {
    setCuration(c => {
      const next = new Set(c.ignored_tables);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return { ...c, ignored_tables: Array.from(next).sort() };
    });
  };

  const filteredTables = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, filter]);

  const updateDescRow = (idx: number, patch: Partial<{ table: string; desc: string }>) => {
    setDescRows(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const addDescRow = () => setDescRows(rows => [...rows, { table: '', desc: '' }]);
  const removeDescRow = (idx: number) => setDescRows(rows => rows.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      // Collapse desc rows into a dict (last write wins for dup table keys)
      const table_descriptions: Record<string, string> = {};
      for (const { table, desc } of descRows) {
        const t = table.trim();
        const d = desc.trim();
        if (t && d) table_descriptions[t] = d;
      }
      await axios.put(`${BASE}/datasources/${datasourceId}/curation/`, {
        ignored_tables:     curation.ignored_tables,
        table_descriptions,
      });
      toast.success('Curation saved. Next planner run will use it.');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 720, maxWidth: '94vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Curate data source</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              <strong>{datasourceName}</strong> — ignore junk tables, document the useful ones, and define table relationships.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', gap:8, color:'var(--text-tertiary)' }}>
              <Loader2 size={18} className="spin"/> Loading schema…
            </div>
          ) : (
            <>
              {/* Ignored tables section */}
              <section className="dscur-sec">
                <header className="dscur-sec__head">
                  <h3>Ignored tables</h3>
                  <span className="dscur-sec__count">
                    {curation.ignored_tables.length} of {tables.length} ignored
                  </span>
                </header>
                <p className="dscur-sec__hint">
                  Tables you toggle on here are dropped from the schema before retrieval, planning, or SQL generation. Use this for system tables, audit logs, sandbox copies — anything the AI should never consider.
                </p>

                <div className="dscur-search">
                  <Search size={13} />
                  <input
                    type="search"
                    placeholder={`Filter ${tables.length} tables…`}
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                </div>

                <div className="dscur-chips">
                  {filteredTables.length === 0 && (
                    <div className="dscur-empty">No tables match “{filter}”.</div>
                  )}
                  {filteredTables.map(t => {
                    const ignored = ignoredSet.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`dscur-chip ${ignored ? 'dscur-chip--ignored' : ''}`}
                        onClick={() => toggleIgnored(t)}
                        title={ignored ? 'Click to unignore' : 'Click to ignore'}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Table descriptions section */}
              <section className="dscur-sec">
                <header className="dscur-sec__head">
                  <h3>Table descriptions</h3>
                  <span className="dscur-sec__count">{descRows.filter(r => r.table.trim() && r.desc.trim()).length}</span>
                </header>
                <p className="dscur-sec__hint">
                  Optional 1-2 line summary per table. Surfaced to the planner LLM so it knows what each table is for, not just which columns exist.
                </p>

                <div className="dscur-desc-list">
                  {descRows.map((row, i) => (
                    <div key={i} className="dscur-desc-row">
                      <select
                        className="dscur-input dscur-input--table"
                        value={row.table}
                        onChange={e => updateDescRow(i, { table: e.target.value })}
                      >
                        <option value="">— pick a table —</option>
                        {tables.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        className="dscur-input dscur-input--desc"
                        placeholder="What this table contains, who owns it, etc."
                        value={row.desc}
                        onChange={e => updateDescRow(i, { desc: e.target.value })}
                      />
                      <button
                        type="button"
                        className="dscur-row-del"
                        onClick={() => removeDescRow(i)}
                        aria-label="Remove row"
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="dscur-add" onClick={addDescRow}>
                    <Plus size={13}/> Add description
                  </button>
                </div>
              </section>

              {/* Relationships section */}
              <section className="dscur-sec">
                <header className="dscur-sec__head">
                  <h3><Link2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }}/>Relationships</h3>
                  <span className="dscur-sec__count">{rels.length}</span>
                </header>
                <p className="dscur-sec__hint">
                  Define how tables join when it can’t be inferred from foreign keys or column names.
                  Relationships you add here let the AI join these tables and let dashboard filters
                  propagate across them — the way a Power BI model does.
                </p>

                <div className="dsrel-list">
                  {rels.map(r => {
                    const badge = REL_SOURCE_BADGE[r.source] ?? REL_SOURCE_BADGE.manual;
                    return (
                      <div key={r.id} className="dsrel-row">
                        <div className="dsrel-pair">
                          <code className="dsrel-col">{r.from_table}.{r.from_column}</code>
                          <ArrowRight size={13} className="dsrel-arrow"/>
                          <code className="dsrel-col">{r.to_table}.{r.to_column}</code>
                        </div>
                        <span className={`dsrel-badge ${badge.cls}`}>{badge.label}</span>
                        <button
                          type="button"
                          className="dscur-row-del"
                          onClick={() => deleteRelationship(r.id)}
                          disabled={relBusy}
                          aria-label="Remove relationship"
                        >
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    );
                  })}
                  {rels.length === 0 && (
                    <div className="dscur-empty">No relationships yet. Add one below.</div>
                  )}
                </div>

                {/* Add-relationship builder */}
                <div className="dsrel-builder">
                  <select
                    className="dscur-input"
                    value={newRel.from_table}
                    onChange={e => setNewRel(n => ({ ...n, from_table: e.target.value, from_column: '' }))}
                  >
                    <option value="">— table —</option>
                    {relTables.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    className="dscur-input"
                    value={newRel.from_column}
                    disabled={!newRel.from_table}
                    onChange={e => setNewRel(n => ({ ...n, from_column: e.target.value }))}
                  >
                    <option value="">— column —</option>
                    {(tableCols[newRel.from_table] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ArrowRight size={14} className="dsrel-arrow"/>
                  <select
                    className="dscur-input"
                    value={newRel.to_table}
                    onChange={e => setNewRel(n => ({ ...n, to_table: e.target.value, to_column: '' }))}
                  >
                    <option value="">— table —</option>
                    {relTables.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    className="dscur-input"
                    value={newRel.to_column}
                    disabled={!newRel.to_table}
                    onChange={e => setNewRel(n => ({ ...n, to_column: e.target.value }))}
                  >
                    <option value="">— column —</option>
                    {(tableCols[newRel.to_table] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn-primary dsrel-add"
                    onClick={addRelationship}
                    disabled={relBusy || !newRel.from_table || !newRel.from_column || !newRel.to_table || !newRel.to_column}
                  >
                    {relBusy ? <Loader2 size={13} className="spin"/> : <Plus size={13}/>} Add
                  </button>
                </div>
                {(!relTables.length) && (
                  <p className="dscur-sec__hint" style={{ marginTop: 8 }}>
                    Column lists appear once this data source has been profiled.
                  </p>
                )}
              </section>

              {error && <div className="dscur-error">{error}</div>}
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? <><Loader2 size={13} className="spin"/> Saving…</> : 'Save curation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
