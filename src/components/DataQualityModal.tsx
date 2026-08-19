/**
 * DataQualityModal — surfaces source-data integrity findings for a project's
 * datasource: consistency, validity, completeness and integrity checks, each
 * with an affected-row count and expandable row-level evidence (the "exact
 * rows" behind every finding). Data comes from GET /api/data-quality/.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Loader2, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { BASE } from './constants';

interface Finding {
  name: string;
  table: string;
  category: string;
  severity: 'serious' | 'warning' | 'info';
  status: 'fail' | 'pass' | 'error';
  description: string;
  recommendation: string;
  affected_count: number | null;
  columns: string[];
  samples: Record<string, unknown>[];
  error: string | null;
}

interface Summary {
  total: number; failed: number; passed: number; errored: number;
  serious: number; warning: number; info: number;
}

interface Props {
  projectId: number;
  projectName: string;
  onClose: () => void;
}

const SEV_LABEL: Record<string, string> = { serious: 'Serious', warning: 'Warning', info: 'Info' };

function fmtCount(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : String(v);
  return String(v);
}

export function DataQualityModal({ projectId, projectName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const run = () => {
    setLoading(true); setError(null);
    axios.get(`${BASE}/data-quality/?project_id=${projectId}`)
      .then(r => { setSummary(r.data.summary); setFindings(r.data.findings || []); })
      .catch(e => setError(e.response?.data?.error || 'Failed to run data-quality checks.'))
      .finally(() => setLoading(false));
  };
  useEffect(run, [projectId]);

  return (
    <div className="dq-overlay" onClick={onClose}>
      <div className="dq-modal" onClick={e => e.stopPropagation()}>
        <div className="dq-head">
          <div className="dq-head-title">
            <ShieldCheck size={18} />
            <div>
              <h2>Data Quality</h2>
              <span className="dq-head-sub">{projectName} · source-data integrity</span>
            </div>
          </div>
          <div className="dq-head-actions">
            <button className="dq-icon-btn" onClick={run} disabled={loading} title="Re-run checks">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
            <button className="dq-icon-btn" onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        {loading && (
          <div className="dq-loading">
            <Loader2 size={26} className="spin" />
            <p>Running integrity checks across the full dataset…</p>
            <span>Grain, orphans, snapshot conflicts, value rules and completeness — this scans every row.</span>
          </div>
        )}

        {!loading && error && (
          <div className="dq-error"><AlertTriangle size={18} /> {error}</div>
        )}

        {!loading && !error && summary && (
          <>
            <div className="dq-summary">
              <div className={`dq-stat ${summary.serious ? 'is-serious' : 'is-clear'}`}>
                <span className="dq-stat-n">{summary.serious}</span><span className="dq-stat-l">Serious</span>
              </div>
              <div className={`dq-stat ${summary.warning ? 'is-warning' : 'is-clear'}`}>
                <span className="dq-stat-n">{summary.warning}</span><span className="dq-stat-l">Warnings</span>
              </div>
              <div className="dq-stat is-pass">
                <span className="dq-stat-n">{summary.passed}</span><span className="dq-stat-l">Passed</span>
              </div>
              <div className="dq-stat">
                <span className="dq-stat-n">{summary.total}</span><span className="dq-stat-l">Checks run</span>
              </div>
            </div>

            <div className="dq-list">
              {findings.map((f, i) => {
                const isOpen = !!expanded[i];
                const hasRows = f.status === 'fail' && f.samples.length > 0;
                return (
                  <div key={i} className={`dq-card dq-${f.status} dq-sev-${f.severity}`}>
                    <div
                      className={`dq-card-head ${hasRows ? 'clickable' : ''}`}
                      onClick={() => hasRows && setExpanded(p => ({ ...p, [i]: !p[i] }))}
                    >
                      <div className="dq-card-status">
                        {f.status === 'pass'
                          ? <ShieldCheck size={16} className="dq-ok" />
                          : f.status === 'error'
                            ? <AlertTriangle size={16} className="dq-warn" />
                            : <span className={`dq-badge dq-badge-${f.severity}`}>{SEV_LABEL[f.severity]}</span>}
                      </div>
                      <div className="dq-card-main">
                        <div className="dq-card-title">
                          {f.name}
                          {f.table && <span className="dq-card-table">{f.table}</span>}
                          <span className="dq-card-cat">{f.category}</span>
                        </div>
                        {f.description && <p className="dq-card-desc">{f.description}</p>}
                        {f.status === 'fail' && f.recommendation && (
                          <p className="dq-card-rec"><strong>Action:</strong> {f.recommendation}</p>
                        )}
                        {f.status === 'error' && <p className="dq-card-desc dq-err-text">Check errored: {f.error}</p>}
                      </div>
                      <div className="dq-card-right">
                        {f.status === 'pass'
                          ? <span className="dq-pass-tag">Clean</span>
                          : f.status === 'fail'
                            ? <span className="dq-count">{fmtCount(f.affected_count)}<small>rows</small></span>
                            : null}
                        {hasRows && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                      </div>
                    </div>

                    {isOpen && hasRows && (
                      <div className="dq-rows">
                        <div className="dq-rows-scroll">
                          <table>
                            <thead>
                              <tr>{f.columns.map(c => <th key={c}>{c}</th>)}</tr>
                            </thead>
                            <tbody>
                              {f.samples.map((row, ri) => (
                                <tr key={ri}>
                                  {f.columns.map(c => <td key={c}>{fmtCell(row[c])}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="dq-rows-foot">
                          Showing {f.samples.length} of {fmtCount(f.affected_count)} affected rows.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DataQualityModal;
