import { useEffect, useState } from 'react';
import {
  Plus, Trash2, ExternalLink, LayoutTemplate, BarChart3,
  Image as ImageIcon, Presentation, FolderPlus, X, Loader,
} from 'lucide-react';
import { useDocuments, createDocument, deleteDocument } from '../hooks/useDocuments';
import type { Document, DocType } from '../types/document';
import { DOC_SIZES } from '../types/document';
import type { Project } from '../App';
import { EmptyState, Button, SkeletonCard, toast, confirmDialog } from './ui';

interface Props {
  projects: Project[];
  onOpen: (doc: Document) => void;
}

const DOC_TYPE_META: Record<DocType, { label: string; icon: React.ReactNode; color: string }> = {
  infographic: { label: 'Infographic', icon: <BarChart3 size={18} />,    color: '#6366f1' },
  poster:      { label: 'Poster',      icon: <ImageIcon size={18} />,    color: '#0891b2' },
  slide_deck:  { label: 'Slide Deck',  icon: <Presentation size={18} />, color: '#7c3aed' },
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
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to create document');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>New document</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>
        <div className="modal-body">

          {/* Project picker */}
          <div className="field full">
            <label>Project</label>
            <select
              value={projectId}
              onChange={e => setProjectId(Number(e.target.value))}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Doc type */}
          <div className="field full">
            <label>Document type</label>
            <div className="docs-type-grid">
              {(Object.keys(DOC_TYPE_META) as DocType[]).map(t => {
                const m = DOC_TYPE_META[t];
                const s = DOC_SIZES[t];
                const active = docType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocType(t)}
                    className={`docs-type-tile ${active ? 'is-selected' : ''}`}
                    style={{ '--tile-color': m.color } as React.CSSProperties}
                  >
                    <span className="docs-type-tile__icon">{m.icon}</span>
                    <span className="docs-type-tile__label">{m.label}</span>
                    <span className="docs-type-tile__dim">{s.width} × {s.height}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="field full">
            <label>Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Untitled ${DOC_TYPE_META[docType].label}`}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreate}
              disabled={busy || !projectId}
            >
              {busy ? <><Loader size={13} className="spin"/> Creating…</> : <><Plus size={13}/> Create document</>}
            </button>
          </div>
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
    if (!(await confirmDialog({
      title: 'Delete document?',
      message: <>This permanently deletes <strong>{doc.title}</strong>.</>,
      confirmLabel: 'Delete', danger: true,
    }))) return;
    setDeleting(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success(`Deleted "${doc.title}"`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleNewClick = () => {
    if (projects.length === 0) {
      toast.error('Create a project first — documents belong to a project.');
      return;
    }
    setShowNew(true);
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
        <button
          className="btn-primary"
          onClick={handleNewClick}
          disabled={projects.length === 0}
          title={projects.length === 0 ? 'Create a project first' : 'New document'}
        >
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
            {t === 'all' ? 'All' : DOC_TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="docs-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i}/>)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus size={26}/>}
          title="No projects yet"
          subtitle="Documents live inside a project. Create your first project to start building infographics, posters, and slide decks."
          actions={null}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate size={26}/>}
          title={filterType === 'all' ? 'No documents yet' : `No ${DOC_TYPE_META[filterType].label.toLowerCase()}s yet`}
          subtitle={filterType === 'all'
            ? 'Create an infographic, poster, or slide deck from your data.'
            : `You haven't created any ${DOC_TYPE_META[filterType].label.toLowerCase()}s in this workspace yet.`}
          actions={
            <Button onClick={handleNewClick} leading={<Plus size={14}/>}>
              {filterType === 'all' ? 'Create your first document' : `New ${DOC_TYPE_META[filterType].label.toLowerCase()}`}
            </Button>
          }
        />
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') onOpen(doc); }}
                >
                  {doc.thumbnail_url ? (
                    <img src={doc.thumbnail_url} alt={doc.title} />
                  ) : (
                    <div className="doc-card-thumb-placeholder">
                      <span className="doc-card-thumb-icon">{meta.icon}</span>
                      <span className="doc-card-thumb-dim">
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
                    aria-label={`Open ${doc.title}`}
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    className="doc-card-btn doc-card-btn-danger"
                    title="Delete"
                    disabled={deleting === doc.id}
                    onClick={() => handleDelete(doc)}
                    aria-label={`Delete ${doc.title}`}
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
