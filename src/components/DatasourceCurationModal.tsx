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
import { X, Loader2, Search, Trash2, Plus } from 'lucide-react';
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

export function DatasourceCurationModal({ datasourceId, datasourceName, onClose }: Props) {
  const [tables, setTables]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [curation, setCuration] = useState<CurationState>({ ignored_tables: [], table_descriptions: {} });
  const [filter, setFilter]     = useState('');
  // Local row-form for descriptions — keyed by index so blank rows are stable
  const [descRows, setDescRows] = useState<{ table: string; desc: string }[]>([]);

  // Load tables + existing curation in parallel
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tablesRes, curationRes] = await Promise.all([
          axios.get(`${BASE}/datasources/${datasourceId}/tables/`),
          axios.get(`${BASE}/datasources/${datasourceId}/curation/`),
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
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || 'Failed to load curation');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [datasourceId]);

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
              <strong>{datasourceName}</strong> — mark junk tables to ignore and document the useful ones.
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
