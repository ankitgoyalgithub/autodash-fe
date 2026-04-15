import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Trash2, Edit3, ChevronLeft, ChevronRight,
  Table2, FileSpreadsheet, Plus, Check, X, Loader2,
  Database, BarChart2, Info, RefreshCw, Search, Eye,
} from 'lucide-react';
import axios from 'axios';
import { BASE } from './constants';

interface MSColumn { name: string; pg_type: string; display_name: string; }
interface MSTable {
  id: number;
  name: string;
  table_name: string;
  columns: MSColumn[];
  row_count: number;
  file_name: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}
interface MSDataResponse {
  columns: string[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ onUpload, uploading }: { onUpload: (f: File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onUpload(files[0]);
  };

  return (
    <div
      className={`ms-upload-zone ${dragging ? 'drag' : ''} ${uploading ? 'uploading' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)} />
      {uploading ? (
        <><Loader2 size={28} className="spin ms-upload-icon" /><p>Importing CSV…</p></>
      ) : (
        <>
          <div className="ms-upload-icon-wrap"><FileSpreadsheet size={28} /></div>
          <p><strong>Drop a CSV file here</strong> or click to browse</p>
          <span>Max 50 MB · UTF-8 encoding recommended</span>
        </>
      )}
    </div>
  );
}

// ─── Table data viewer/editor ─────────────────────────────────────────────────

function TableViewer({ table, onClose, onDelete, onUseAsDatasource }: {
  table: MSTable;
  onClose: () => void;
  onDelete: () => void;
  onUseAsDatasource: () => void;
}) {
  const [data, setData] = useState<MSDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editCell, setEditCell] = useState<{ rowId: number; col: string; val: string } | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [deletingRow, setDeletingRow] = useState<number | null>(null);

  const fetchData = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const r = await axios.get(`${BASE}/myspace/${table.id}/data/?page=${p}&page_size=100`);
      setData(r.data);
    } catch { /* keep existing */ }
    finally { setLoading(false); }
  }, [table.id, page]);

  useEffect(() => { fetchData(page); }, [page]);

  const visibleRows = data?.rows.filter(row =>
    !search || Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  const handleSaveCell = async () => {
    if (!editCell) return;
    setSavingCell(true);
    try {
      await axios.patch(`${BASE}/myspace/${table.id}/rows/${editCell.rowId}/`, { [editCell.col]: editCell.val });
      setData(prev => prev ? {
        ...prev,
        rows: prev.rows.map(r => r._ms_id === editCell.rowId ? { ...r, [editCell.col]: editCell.val } : r)
      } : prev);
    } catch (e: any) { alert(e.response?.data?.error || 'Save failed'); }
    finally { setSavingCell(false); setEditCell(null); }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!confirm('Delete this row?')) return;
    setDeletingRow(rowId);
    try {
      await axios.delete(`${BASE}/myspace/${table.id}/rows/${rowId}/`);
      setData(prev => prev ? { ...prev, rows: prev.rows.filter(r => r._ms_id !== rowId), total: prev.total - 1 } : prev);
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
    finally { setDeletingRow(null); }
  };

  const displayCols = data?.columns.filter(c => c !== '_ms_id') ?? [];

  return (
    <div className="ms-viewer">
      <div className="ms-viewer-header">
        <button className="ms-back-btn" onClick={onClose}><ChevronLeft size={16}/> All Tables</button>
        <div className="ms-viewer-title">
          <Table2 size={16} style={{ color: '#6366f1' }}/>
          <span>{table.name}</span>
          <span className="ms-badge ms-badge--blue">{table.row_count.toLocaleString()} rows</span>
          <span className="ms-badge ms-badge--gray">{table.columns.length} cols</span>
        </div>
        <div className="ms-viewer-actions">
          <button className="ms-btn ms-btn--use" onClick={onUseAsDatasource} title="Use My Space as datasource for projects">
            <Database size={14}/> Use as Datasource
          </button>
          <button className="ms-btn ms-btn--danger" onClick={onDelete}><Trash2 size={14}/> Delete Table</button>
        </div>
      </div>

      <div className="ms-viewer-toolbar">
        <div className="ms-search-wrap">
          <Search size={14} className="ms-search-icon"/>
          <input className="ms-search" placeholder="Filter rows…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="ms-icon-btn" onClick={() => fetchData(page)} title="Refresh"><RefreshCw size={14}/></button>
        {data && (
          <div className="ms-pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14}/></button>
            <span>Page {data.page} of {data.total_pages}</span>
            <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14}/></button>
          </div>
        )}
      </div>

      <div className="ms-table-wrap">
        {loading ? (
          <div className="ms-loading"><Loader2 size={22} className="spin"/></div>
        ) : (
          <table className="ms-table">
            <thead>
              <tr>
                {displayCols.map(c => (
                  <th key={c}>{table.columns.find(col => col.name === c)?.display_name ?? c}</th>
                ))}
                <th className="ms-th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row._ms_id}>
                  {displayCols.map(col => {
                    const isEditing = editCell?.rowId === row._ms_id && editCell?.col === col;
                    return (
                      <td key={col} onDoubleClick={() => setEditCell({ rowId: row._ms_id, col, val: String(row[col] ?? '') })}>
                        {isEditing ? (
                          <div className="ms-cell-edit">
                            <input autoFocus value={editCell!.val}
                              onChange={e => setEditCell(prev => prev ? { ...prev, val: e.target.value } : prev)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCell(); if (e.key === 'Escape') setEditCell(null); }}
                            />
                            {savingCell ? <Loader2 size={12} className="spin"/> : (
                              <><button onClick={handleSaveCell}><Check size={12}/></button>
                              <button onClick={() => setEditCell(null)}><X size={12}/></button></>
                            )}
                          </div>
                        ) : (
                          <span title="Double-click to edit">{row[col] === null || row[col] === undefined ? <span className="ms-null">null</span> : String(row[col])}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="ms-td-actions">
                    {deletingRow === row._ms_id ? <Loader2 size={12} className="spin"/> : (
                      <button className="ms-row-del" onClick={() => handleDeleteRow(row._ms_id)}><Trash2 size={12}/></button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={displayCols.length + 1} className="ms-empty-row">No rows match the filter.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Data Preview Panel (slide-over, shows first rows without leaving page) ───

function DataPreviewPanel({ table, onClose, onOpenFull }: {
  table: MSTable;
  onClose: () => void;
  onOpenFull: () => void;
}) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${BASE}/myspace/${table.id}/data/?page=1&page_size=10`)
      .then(r => {
        setCols(r.data.columns.filter((c: string) => c !== '_ms_id'));
        setRows(r.data.rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [table.id]);

  return (
    <div className="ms-preview-overlay" onClick={onClose}>
      <div className="ms-preview-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ms-preview-header">
          <div className="ms-preview-title">
            <FileSpreadsheet size={16} style={{ color: '#7c3aed' }} />
            <span>{table.name}</span>
          </div>
          <div className="ms-preview-meta">
            <span className="ms-badge ms-badge--blue">{table.row_count.toLocaleString()} rows</span>
            <span className="ms-badge ms-badge--gray">{table.columns.length} cols</span>
            <span className="ms-badge ms-badge--gray">{fmtSize(table.size_bytes)}</span>
          </div>
          <div className="ms-preview-actions">
            <button className="ms-btn ms-btn--use" onClick={onOpenFull}>
              <Table2 size={13} /> Open full view
            </button>
            <button className="ms-icon-btn" onClick={onClose} title="Close"><X size={15}/></button>
          </div>
        </div>

        {/* Columns overview */}
        <div className="ms-preview-cols">
          {table.columns.map(col => (
            <div key={col.name} className="ms-preview-col-chip">
              <span className="ms-preview-col-name">{col.display_name}</span>
              <span className="ms-preview-col-type">{col.pg_type}</span>
            </div>
          ))}
        </div>

        {/* Data sample */}
        <div className="ms-preview-label">Preview · first 10 rows</div>
        <div className="ms-preview-table-wrap">
          {loading ? (
            <div className="ms-loading"><Loader2 size={20} className="spin" /></div>
          ) : (
            <table className="ms-table ms-preview-table">
              <thead>
                <tr>
                  {cols.map(c => (
                    <th key={c}>{table.columns.find(col => col.name === c)?.display_name ?? c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {cols.map(c => (
                      <td key={c}>
                        {row[c] === null || row[c] === undefined
                          ? <span className="ms-null">null</span>
                          : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && table.row_count > 10 && (
          <div className="ms-preview-footer">
            Showing 10 of {table.row_count.toLocaleString()} rows ·{' '}
            <button className="ms-preview-footer-link" onClick={onOpenFull}>Open full table →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Table card ───────────────────────────────────────────────────────────────

const TableCard = memo(function TableCard({ table, onView, onPreview, onDelete, onRename }: {
  table: MSTable;
  onView: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(table.name);

  const saveRename = () => {
    if (nameVal.trim() && nameVal !== table.name) onRename(nameVal.trim());
    setEditing(false);
  };

  return (
    <div className="ms-card" onClick={!editing ? onView : undefined}>
      <div className="ms-card-icon"><FileSpreadsheet size={20}/></div>
      <div className="ms-card-body">
        {editing ? (
          <div className="ms-card-rename" onClick={e => e.stopPropagation()}>
            <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setEditing(false); setNameVal(table.name); } }}
            />
            <button onClick={saveRename}><Check size={13}/></button>
            <button onClick={() => { setEditing(false); setNameVal(table.name); }}><X size={13}/></button>
          </div>
        ) : (
          <div className="ms-card-name">{table.name}</div>
        )}
        <div className="ms-card-meta">
          <span>{table.row_count.toLocaleString()} rows</span>
          <span>·</span>
          <span>{table.columns.length} columns</span>
          <span>·</span>
          <span>{fmtSize(table.size_bytes)}</span>
        </div>
        <div className="ms-card-file">{table.file_name} · {fmtDate(table.created_at)}</div>
      </div>
      <div className="ms-card-actions" onClick={e => e.stopPropagation()}>
        <button className="ms-icon-btn" onClick={onPreview} title="Quick preview"><Eye size={14}/></button>
        <button className="ms-icon-btn" onClick={() => setEditing(true)} title="Rename"><Edit3 size={14}/></button>
        <button className="ms-icon-btn ms-icon-btn--danger" onClick={onDelete} title="Delete table"><Trash2 size={14}/></button>
      </div>
    </div>
  );
});

// ─── Main MySpace page ────────────────────────────────────────────────────────

export function MySpace({ onNavigateToProjects }: { onNavigateToProjects?: () => void }) {
  const [tables, setTables] = useState<MSTable[]>([]);
  const [datasourceId, setDatasourceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeTable, setActiveTable] = useState<MSTable | null>(null);
  const [previewTable, setPreviewTable] = useState<MSTable | null>(null);

  const fetchAll = async () => {
    try {
      const r = await axios.get(`${BASE}/myspace/`);
      setTables(r.data.tables);
      setDatasourceId(r.data.datasource_id);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await axios.post(`${BASE}/myspace/upload/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTables(prev => [r.data, ...prev]);
      // Refresh datasource id
      const ds = await axios.get(`${BASE}/myspace/datasource/`);
      setDatasourceId(ds.data.id);
    } catch (e: any) {
      setUploadError(e.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (table: MSTable) => {
    if (!confirm(`Delete table "${table.name}" and all its data? This cannot be undone.`)) return;
    try {
      await axios.delete(`${BASE}/myspace/${table.id}/`);
      setTables(prev => prev.filter(t => t.id !== table.id));
      if (activeTable?.id === table.id) setActiveTable(null);
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  const handleRename = async (table: MSTable, name: string) => {
    try {
      await axios.patch(`${BASE}/myspace/${table.id}/`, { name });
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, name } : t));
      if (activeTable?.id === table.id) setActiveTable(prev => prev ? { ...prev, name } : prev);
    } catch (e: any) { alert(e.response?.data?.error || 'Rename failed'); }
  };

  const handleUseAsDatasource = async () => {
    let dsId = datasourceId;
    if (!dsId) {
      try {
        const r = await axios.get(`${BASE}/myspace/datasource/`);
        dsId = r.data.id;
        setDatasourceId(dsId);
      } catch { return; }
    }
    // Navigate to Projects and open new project modal
    onNavigateToProjects?.();
  };

  if (activeTable) {
    return (
      <div className="ms-page">
        <TableViewer
          table={activeTable}
          onClose={() => setActiveTable(null)}
          onDelete={() => handleDelete(activeTable)}
          onUseAsDatasource={handleUseAsDatasource}
        />
      </div>
    );
  }

  return (
    <div className="ms-page">
      {/* Header */}
      <div className="ms-header">
        <div className="ms-header-left">
          <div className="ms-header-icon"><Database size={20}/></div>
          <div>
            <h1>My Space</h1>
            <p>Upload CSV files and use them as datasources for your dashboards</p>
          </div>
        </div>
        {datasourceId && (
          <div className="ms-datasource-badge" title="My Space is ready to use as a project datasource">
            <div className="ms-ds-dot"/>
            <span>Connected as datasource</span>
          </div>
        )}
      </div>

      {/* Info banner (first-time) */}
      {tables.length === 0 && !loading && (
        <div className="ms-info-banner">
          <Info size={15}/>
          <span>Upload your first CSV to get started. Each file becomes a queryable table you can use with AI dashboarding.</span>
        </div>
      )}

      {/* Upload zone */}
      <UploadZone onUpload={handleUpload} uploading={uploading} />
      {uploadError && <div className="ms-error">{uploadError}</div>}

      {/* Tables */}
      {loading ? (
        <div className="ms-loading-full"><Loader2 size={24} className="spin"/></div>
      ) : tables.length > 0 ? (
        <div className="ms-tables-section">
          <div className="ms-section-header">
            <div className="ms-section-title">
              <BarChart2 size={15}/>
              <span>{tables.length} table{tables.length !== 1 ? 's' : ''}</span>
            </div>
            {datasourceId && (
              <button className="ms-btn ms-btn--use" onClick={handleUseAsDatasource}>
                <Plus size={14}/> Use in New Project
              </button>
            )}
          </div>
          <div className="ms-cards">
            {tables.map(t => (
              <TableCard
                key={t.id}
                table={t}
                onView={() => setActiveTable(t)}
                onPreview={() => setPreviewTable(t)}
                onDelete={() => handleDelete(t)}
                onRename={(name) => handleRename(t, name)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {previewTable && (
        <DataPreviewPanel
          table={previewTable}
          onClose={() => setPreviewTable(null)}
          onOpenFull={() => { setActiveTable(previewTable); setPreviewTable(null); }}
        />
      )}
    </div>
  );
}
