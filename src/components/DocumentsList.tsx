import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, ExternalLink, LayoutTemplate } from 'lucide-react';
import { useDocuments, createDocument, deleteDocument } from '../hooks/useDocuments';
import type { Document, DocType } from '../types/document';
import { DOC_SIZES } from '../types/document';
import type { Project } from '../App';

interface Props {
  projects: Project[];
  onOpen: (doc: Document) => void;
}

const DOC_TYPE_META: Record<DocType, { label: string; emoji: string; color: string }> = {
  infographic: { label: 'Infographic', emoji: '📊', color: '#6366f1' },
  poster:      { label: 'Poster',      emoji: '🖼️',  color: '#0891b2' },
  slide_deck:  { label: 'Slide Deck',  emoji: '🎞️',  color: '#7c3aed' },
};

function NewDocModal({
  projects,
  onClose,
  onCreate,
}: {
  projects: Project[];
  onClose: () => void;
  onCreate: (doc: Document) => void;
}) {
  const [projectId, setProjectId] = useState<number>(projects[0]?.id ?? 0);
  const [docType,   setDocType]   = useState<DocType>('infographic');
  const [title,     setTitle]     = useState('');
  const [busy,      setBusy]      = useState(false);

  const handleCreate = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const doc = await createDocument(projectId, docType, title || `Untitled ${DOC_TYPE_META[docType].label}`);
      onCreate(doc);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Document</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Project picker */}
          <div className="form-group">
            <label className="form-label">Project</label>
            <select
              className="form-select"
              value={projectId}
              onChange={e => setProjectId(Number(e.target.value))}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          </div>

          {/* Doc type */}
          <div className="form-group">
            <label className="form-label">Document type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.keys(DOC_TYPE_META) as DocType[]).map(t => {
                const m = DOC_TYPE_META[t];
                const s = DOC_SIZES[t];
                const active = docType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setDocType(t)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                      border: active ? `2px solid ${m.color}` : '1px solid #e2e8f0',
                      background: active ? `${m.color}10` : '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{m.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: active ? m.color : '#475569', marginTop: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.width}×{s.height}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Untitled ${DOC_TYPE_META[docType].label}`}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={busy || !projectId}
            style={{ marginTop: 4 }}
          >
            {busy ? 'Creating…' : 'Create document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsList({ projects, onOpen }: Props) {
  const { docs, loading, fetch, setDocs } = useDocuments();
  const [showNew,    setShowNew]    = useState(false);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [filterType, setFilterType] = useState<DocType | 'all'>('all');

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    setDeleting(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filterType === 'all' ? docs : docs.filter(d => d.doc_type === filterType);

  return (
    <div className="docs-list-root">
      {/* Header */}
      <div className="docs-list-header">
        <div>
          <h1 className="docs-list-title">Documents</h1>
          <p className="docs-list-sub">Infographics, posters, and slide decks built from your data</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={15} /> New document
        </button>
      </div>

      {/* Filter tabs */}
      <div className="docs-filter-row">
        {(['all', 'infographic', 'poster', 'slide_deck'] as const).map(t => (
          <button
            key={t}
            className={`docs-filter-tab ${filterType === t ? 'active' : ''}`}
            onClick={() => setFilterType(t)}
          >
            {t === 'all' ? 'All' : `${DOC_TYPE_META[t].emoji} ${DOC_TYPE_META[t].label}`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="docs-empty"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="docs-empty">
          <LayoutTemplate size={40} color="#cbd5e1" />
          <p>No documents yet</p>
          <button className="btn-secondary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Create your first document
          </button>
        </div>
      ) : (
        <div className="docs-grid">
          {filtered.map(doc => {
            const meta = DOC_TYPE_META[doc.doc_type];
            const size = DOC_SIZES[doc.doc_type];
            const elCount = doc.canvas_json?.elements?.length ?? 0;
            return (
              <div key={doc.id} className="doc-card">
                {/* Thumbnail preview */}
                <div
                  className="doc-card-thumb"
                  style={{ '--doc-color': meta.color } as React.CSSProperties}
                  onClick={() => onOpen(doc)}
                >
                  {doc.thumbnail_url ? (
                    <img src={doc.thumbnail_url} alt={doc.title} />
                  ) : (
                    <div className="doc-card-thumb-placeholder">
                      <span style={{ fontSize: 32 }}>{meta.emoji}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                        {size.width} × {size.height}
                      </span>
                    </div>
                  )}
                  <div className="doc-card-type-badge" style={{ background: meta.color }}>
                    {meta.label}
                  </div>
                </div>

                {/* Info */}
                <div className="doc-card-info">
                  <div className="doc-card-title">{doc.title}</div>
                  <div className="doc-card-meta">
                    <span>{elCount} element{elCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="doc-card-actions">
                  <button
                    className="doc-card-btn"
                    title="Open editor"
                    onClick={() => onOpen(doc)}
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    className="doc-card-btn doc-card-btn-danger"
                    title="Delete"
                    disabled={deleting === doc.id}
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewDocModal
          projects={projects}
          onClose={() => setShowNew(false)}
          onCreate={doc => { setDocs(prev => [doc, ...prev]); setShowNew(false); onOpen(doc); }}
        />
      )}
    </div>
  );
}
