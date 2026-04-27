import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import axios from 'axios';
import {
  ArrowLeft, Save, ZoomIn, ZoomOut, Type, Image, Square,
  Trash2, Lock, Unlock, Copy, ChevronLeft, ChevronRight,
  Plus, BarChart2, Loader,
} from 'lucide-react';
import { useDocument } from '../hooks/useDocuments';
import type {
  Document, CanvasJSON, CanvasElement, TextElement,
  ImageElement, ShapeElement, ChartElement, DocType,
} from '../types/document';
import { BASE } from './constants';
import type { DashboardCard } from '../App';

// ── Resolved chart cache (entry_id → card[]) ─────────────────────────────────

type ChartCache = Record<string, DashboardCard[]>;

// ── Drag / resize state ───────────────────────────────────────────────────────

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

interface DragState {
  elementId: string;
  handle:    Handle;
  startX:    number;
  startY:    number;
  origEl:    CanvasElement;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function applyDrag(el: CanvasElement, drag: DragState, dx: number, dy: number, scale: number): CanvasElement {
  const sdx = dx / scale;
  const sdy = dy / scale;
  const o = drag.origEl;
  switch (drag.handle) {
    case 'move': return { ...el, x: o.x + sdx, y: o.y + sdy };
    case 'se':   return { ...el, w: Math.max(80, o.w + sdx), h: Math.max(40, o.h + sdy) };
    case 'sw':   return { ...el, x: o.x + sdx, w: Math.max(80, o.w - sdx), h: Math.max(40, o.h + sdy) };
    case 'ne':   return { ...el, y: o.y + sdy, w: Math.max(80, o.w + sdx), h: Math.max(40, o.h - sdy) };
    case 'nw':   return { ...el, x: o.x + sdx, y: o.y + sdy, w: Math.max(80, o.w - sdx), h: Math.max(40, o.h - sdy) };
    case 'e':    return { ...el, w: Math.max(80, o.w + sdx) };
    case 'w':    return { ...el, x: o.x + sdx, w: Math.max(80, o.w - sdx) };
    case 's':    return { ...el, h: Math.max(40, o.h + sdy) };
    case 'n':    return { ...el, y: o.y + sdy, h: Math.max(40, o.h - sdy) };
    default:     return el;
  }
}

const HANDLES: { id: Handle; style: React.CSSProperties }[] = [
  { id: 'nw', style: { top: -4, left: -4, cursor: 'nw-resize' } },
  { id: 'n',  style: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { id: 'ne', style: { top: -4, right: -4, cursor: 'ne-resize' } },
  { id: 'e',  style: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { id: 'se', style: { bottom: -4, right: -4, cursor: 'se-resize' } },
  { id: 's',  style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { id: 'sw', style: { bottom: -4, left: -4, cursor: 'sw-resize' } },
  { id: 'w',  style: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'w-resize' } },
];

// ── Chart element renderer ────────────────────────────────────────────────────

function ChartElementView({ el, cache }: { el: ChartElement; cache: ChartCache }) {
  const [entryId, cardIdx] = el.chart_ref.split(':').map(Number);
  const cards = cache[String(entryId)];
  const card  = cards?.[cardIdx];

  if (!cards) return (
    <div className="doc-el-chart-loading">
      <Loader size={18} className="spin" />
      <span>Loading chart…</span>
    </div>
  );
  if (!card) return (
    <div className="doc-el-chart-loading">
      <BarChart2 size={18} color="#cbd5e1" />
      <span>Chart not found</span>
    </div>
  );

  // Lightweight chart preview — just show title + insight
  return (
    <div className="doc-el-chart-preview">
      <div className="doc-el-chart-title">{card.title}</div>
      {card.insight && <div className="doc-el-chart-insight">{card.insight}</div>}
      <div className="doc-el-chart-badge">{card.chart_type}</div>
    </div>
  );
}

// ── Single canvas element ─────────────────────────────────────────────────────

function CanvasElementView({
  el, selected, scale, cache,
  onSelect, onDragStart,
}: {
  el: CanvasElement;
  selected: boolean;
  scale: number;
  cache: ChartCache;
  onSelect:    (id: string) => void;
  onDragStart: (id: string, handle: Handle, e: React.MouseEvent) => void;
}) {
  const style: React.CSSProperties = {
    position:  'absolute',
    left:      el.x * scale,
    top:       el.y * scale,
    width:     el.w * scale,
    height:    el.h * scale,
    opacity:   el.opacity ?? 1,
    outline:   selected ? '2px solid #6366f1' : 'none',
    cursor:    el.locked ? 'default' : 'move',
    userSelect: 'none',
    boxSizing: 'border-box',
    overflow:  'hidden',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(el.id);
    if (!el.locked) onDragStart(el.id, 'move', e);
  };

  let inner: React.ReactNode;

  if (el.type === 'text') {
    const t = el as TextElement;
    inner = (
      <div style={{
        width: '100%', height: '100%', padding: '4px 6px',
        fontSize:   (t.style.fontSize ?? 16) * scale,
        fontWeight: t.style.fontWeight ?? '400',
        fontStyle:  t.style.fontStyle  ?? 'normal',
        color:      t.style.color      ?? '#0f172a',
        textAlign:  t.style.textAlign  ?? 'left',
        lineHeight: t.style.lineHeight ?? 1.4,
        fontFamily: t.style.fontFamily ?? 'inherit',
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}>
        {t.content || <span style={{ color: '#cbd5e1' }}>Double-click to edit…</span>}
      </div>
    );
  } else if (el.type === 'image') {
    const img = el as ImageElement;
    inner = (
      <img
        src={img.url}
        alt={img.alt ?? ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        draggable={false}
      />
    );
  } else if (el.type === 'shape') {
    const sh = el as ShapeElement;
    if (sh.shape === 'circle') {
      inner = (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse cx="50" cy="50" rx="50" ry="50"
            fill={sh.style.fill ?? '#e0e7ff'}
            stroke={sh.style.stroke ?? 'none'}
            strokeWidth={sh.style.strokeWidth ?? 0}
            opacity={sh.style.opacity ?? 1}
          />
        </svg>
      );
    } else {
      inner = (
        <div style={{
          width: '100%', height: '100%',
          background:   sh.style.fill        ?? '#e0e7ff',
          border:       sh.style.stroke      ? `${sh.style.strokeWidth ?? 1}px solid ${sh.style.stroke}` : 'none',
          borderRadius: sh.style.borderRadius ?? 0,
          opacity:      sh.style.opacity     ?? 1,
        }} />
      );
    }
  } else if (el.type === 'chart') {
    inner = <ChartElementView el={el as ChartElement} cache={cache} />;
  }

  return (
    <div style={style} onMouseDown={handleMouseDown}>
      {inner}

      {/* Resize handles (only when selected and not locked) */}
      {selected && !el.locked && HANDLES.map(h => (
        <div
          key={h.id}
          style={{
            position: 'absolute', width: 8, height: 8,
            background: '#6366f1', border: '2px solid #fff',
            borderRadius: 2, zIndex: 10, ...h.style,
          }}
          onMouseDown={e => { e.stopPropagation(); onDragStart(el.id, h.id, e); }}
        />
      ))}

      {/* Lock badge */}
      {el.locked && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: 'rgba(0,0,0,0.3)', borderRadius: 4,
          padding: '2px 4px', display: 'flex', alignItems: 'center',
        }}>
          <Lock size={10} color="#fff" />
        </div>
      )}
    </div>
  );
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  el, onChange, onDelete, onDuplicate,
}: {
  el: CanvasElement;
  onChange: (updated: CanvasElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const set = (patch: Partial<CanvasElement>) => onChange({ ...el, ...patch } as CanvasElement);

  return (
    <div className="doc-props">
      <div className="doc-props-title">
        <span style={{ textTransform: 'capitalize' }}>{el.type}</span>
        <span className="doc-props-id">#{el.id}</span>
      </div>

      {/* Position & size */}
      <div className="doc-props-group">
        <div className="doc-props-row">
          <label>X</label>
          <input type="number" value={Math.round(el.x)} onChange={e => set({ x: Number(e.target.value) })} />
          <label>Y</label>
          <input type="number" value={Math.round(el.y)} onChange={e => set({ y: Number(e.target.value) })} />
        </div>
        <div className="doc-props-row">
          <label>W</label>
          <input type="number" value={Math.round(el.w)} onChange={e => set({ w: Number(e.target.value) })} />
          <label>H</label>
          <input type="number" value={Math.round(el.h)} onChange={e => set({ h: Number(e.target.value) })} />
        </div>
        <div className="doc-props-row">
          <label>Opacity</label>
          <input type="range" min={0} max={1} step={0.05}
            value={el.opacity ?? 1}
            onChange={e => set({ opacity: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8', width: 32, textAlign: 'right' }}>
            {Math.round((el.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Text-specific */}
      {el.type === 'text' && (() => {
        const t = el as TextElement;
        const setStyle = (s: Partial<TextElement['style']>) =>
          onChange({ ...t, style: { ...t.style, ...s } });
        return (
          <div className="doc-props-group">
            <div className="doc-props-row">
              <label>Text</label>
              <textarea
                style={{ flex: 1, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                value={t.content}
                onChange={e => onChange({ ...t, content: e.target.value })}
              />
            </div>
            <div className="doc-props-row">
              <label>Size</label>
              <input type="number" value={t.style.fontSize ?? 16}
                onChange={e => setStyle({ fontSize: Number(e.target.value) })} />
              <label>Color</label>
              <input type="color" value={t.style.color ?? '#0f172a'}
                onChange={e => setStyle({ color: e.target.value })} />
            </div>
            <div className="doc-props-row">
              <label>Weight</label>
              <select value={t.style.fontWeight ?? '400'} onChange={e => setStyle({ fontWeight: e.target.value })}>
                {['400', '500', '600', '700', '800'].map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <label>Align</label>
              <select value={t.style.textAlign ?? 'left'} onChange={e => setStyle({ textAlign: e.target.value as any })}>
                {['left', 'center', 'right'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        );
      })()}

      {/* Shape-specific */}
      {el.type === 'shape' && (() => {
        const sh = el as ShapeElement;
        const setStyle = (s: Partial<ShapeElement['style']>) =>
          onChange({ ...sh, style: { ...sh.style, ...s } });
        return (
          <div className="doc-props-group">
            <div className="doc-props-row">
              <label>Shape</label>
              <select value={sh.shape} onChange={e => onChange({ ...sh, shape: e.target.value as any })}>
                {['rect', 'circle'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="doc-props-row">
              <label>Fill</label>
              <input type="color" value={sh.style.fill ?? '#e0e7ff'}
                onChange={e => setStyle({ fill: e.target.value })} />
              <label>Stroke</label>
              <input type="color" value={sh.style.stroke ?? '#6366f1'}
                onChange={e => setStyle({ stroke: e.target.value })} />
            </div>
            <div className="doc-props-row">
              <label>Radius</label>
              <input type="number" min={0} max={200}
                value={sh.style.borderRadius ?? 0}
                onChange={e => setStyle({ borderRadius: Number(e.target.value) })} />
            </div>
          </div>
        );
      })()}

      {/* Image-specific */}
      {el.type === 'image' && (() => {
        const img = el as ImageElement;
        return (
          <div className="doc-props-group">
            <div className="doc-props-row">
              <label>URL</label>
              <input style={{ flex: 1, fontSize: 11 }} value={img.url}
                onChange={e => onChange({ ...img, url: e.target.value })} />
            </div>
          </div>
        );
      })()}

      {/* Chart ref */}
      {el.type === 'chart' && (
        <div className="doc-props-group">
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <strong>Chart ref:</strong> {(el as ChartElement).chart_ref}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            Format: entry_id:card_index
          </div>
        </div>
      )}

      {/* Lock toggle */}
      <div className="doc-props-group">
        <button className="doc-props-btn" onClick={() => set({ locked: !el.locked })}>
          {el.locked ? <><Unlock size={13} /> Unlock element</> : <><Lock size={13} /> Lock element</>}
        </button>
      </div>

      {/* Actions */}
      <div className="doc-props-actions">
        <button className="doc-props-btn" onClick={onDuplicate}>
          <Copy size={13} /> Duplicate
        </button>
        <button className="doc-props-btn doc-props-btn-danger" onClick={onDelete}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

// ── Canvas background panel ────────────────────────────────────────────────────

function CanvasPropsPanel({
  canvas, onChange,
}: {
  canvas: CanvasJSON;
  onChange: (patch: Partial<CanvasJSON>) => void;
}) {
  return (
    <div className="doc-props">
      <div className="doc-props-title">Canvas</div>
      <div className="doc-props-group">
        <div className="doc-props-row">
          <label>W</label>
          <input type="number" value={canvas.width}  onChange={e => onChange({ width:  Number(e.target.value) })} />
          <label>H</label>
          <input type="number" value={canvas.height} onChange={e => onChange({ height: Number(e.target.value) })} />
        </div>
        <div className="doc-props-row">
          <label>Background</label>
          <input type="color" value={canvas.background}
            onChange={e => onChange({ background: e.target.value })} />
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>{canvas.background}</span>
        </div>
      </div>
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────

function Toolbar({
  doc, zoom, saving, activePage, totalPages,
  onZoomIn, onZoomOut, onAddText, onAddShape, onAddImage, onSave,
  onBack, onPageChange, onAddPage,
}: {
  doc: Document; zoom: number; saving: boolean;
  activePage: number; totalPages: number;
  onZoomIn: () => void; onZoomOut: () => void;
  onAddText: () => void; onAddShape: () => void; onAddImage: () => void;
  onSave: () => void; onBack: () => void;
  onPageChange: (n: number) => void; onAddPage: () => void;
}) {
  return (
    <div className="doc-toolbar">
      <div className="doc-toolbar-left">
        <button className="doc-toolbar-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <span className="doc-toolbar-title">{doc.title}</span>
      </div>

      <div className="doc-toolbar-center">
        <button className="doc-toolbar-btn" title="Add text" onClick={onAddText}>
          <Type size={15} />
        </button>
        <button className="doc-toolbar-btn" title="Add shape" onClick={onAddShape}>
          <Square size={15} />
        </button>
        <button className="doc-toolbar-btn" title="Add image" onClick={onAddImage}>
          <Image size={15} />
        </button>

        <div className="doc-toolbar-sep" />

        <button className="doc-toolbar-btn" onClick={onZoomOut}><ZoomOut size={15} /></button>
        <span className="doc-toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button className="doc-toolbar-btn" onClick={onZoomIn}><ZoomIn size={15} /></button>

        {/* Page controls for slide_deck */}
        {doc.doc_type === 'slide_deck' && (
          <>
            <div className="doc-toolbar-sep" />
            <button className="doc-toolbar-btn" onClick={() => onPageChange(activePage - 1)} disabled={activePage <= 1}>
              <ChevronLeft size={15} />
            </button>
            <span className="doc-toolbar-zoom">{activePage} / {totalPages}</span>
            <button className="doc-toolbar-btn" onClick={() => onPageChange(activePage + 1)} disabled={activePage >= totalPages}>
              <ChevronRight size={15} />
            </button>
            <button className="doc-toolbar-btn" title="Add page" onClick={onAddPage}>
              <Plus size={15} />
            </button>
          </>
        )}
      </div>

      <div className="doc-toolbar-right">
        <button className="doc-toolbar-save" onClick={onSave} disabled={saving}>
          {saving ? <><Loader size={13} className="spin" /> Saving…</> : <><Save size={13} /> Save</>}
        </button>
      </div>
    </div>
  );
}

// ── Main DocumentEditor ───────────────────────────────────────────────────────

interface Props {
  docId: number;
  onBack: () => void;
}

export function DocumentEditor({ docId, onBack }: Props) {
  const { doc, loading, saving, fetch, saveCanvas, savePage, addPage } = useDocument(docId);

  // Active page (1-indexed). For non-slide_deck, always 1.
  const [activePage, setActivePage] = useState(1);

  // Local working copy of the canvas for the active page
  const [canvas, setCanvas] = useState<CanvasJSON | null>(null);

  // Editor state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom]             = useState(0.5);
  const [drag, setDrag]             = useState<DragState | null>(null);
  const [chartCache, setChartCache] = useState<ChartCache>({});

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load document on mount
  useEffect(() => { fetch(); }, [fetch]);

  // Sync canvas from doc when doc or activePage changes
  useEffect(() => {
    if (!doc) return;
    if (doc.doc_type === 'slide_deck') {
      const page = doc.pages?.find(p => p.page_number === activePage);
      setCanvas(page ? { ...page.canvas_json } : null);
    } else {
      setCanvas({ ...doc.canvas_json });
    }
    setSelectedId(null);
  }, [doc, activePage]);

  // Fetch chart data for all chart_ref elements
  useEffect(() => {
    if (!canvas) return;
    const refs = canvas.elements
      .filter(el => el.type === 'chart')
      .map(el => (el as ChartElement).chart_ref.split(':')[0])
      .filter((id, i, arr) => arr.indexOf(id) === i && !chartCache[id]);

    refs.forEach(async entryId => {
      try {
        const r = await axios.get(`${BASE}/history/?entry_id=${entryId}`);
        const data = Array.isArray(r.data) ? r.data[0] : r.data;
        setChartCache(prev => ({ ...prev, [entryId]: data?.results_data ?? [] }));
      } catch { /* ignore */ }
    });
  }, [canvas]);

  // ── Drag handling ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback((elementId: string, handle: Handle, e: React.MouseEvent) => {
    if (!canvas) return;
    const el = canvas.elements.find(x => x.id === elementId);
    if (!el || el.locked) return;
    setDrag({ elementId, handle, startX: e.clientX, startY: e.clientY, origEl: { ...el } });
    e.preventDefault();
  }, [canvas]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setCanvas(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          elements: prev.elements.map(el =>
            el.id === drag.elementId ? applyDrag(el, drag, dx, dy, zoom) : el,
          ),
        };
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, zoom]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        setCanvas(prev => prev ? { ...prev, elements: prev.elements.filter(el => el.id !== selectedId) } : prev);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ── Element operations ──────────────────────────────────────────────────────

  const updateElement = useCallback((updated: CanvasElement) => {
    setCanvas(prev => prev ? {
      ...prev,
      elements: prev.elements.map(el => el.id === updated.id ? updated : el),
    } : prev);
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setCanvas(prev => prev ? { ...prev, elements: prev.elements.filter(el => el.id !== selectedId) } : prev);
    setSelectedId(null);
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || !canvas) return;
    const el = canvas.elements.find(x => x.id === selectedId);
    if (!el) return;
    const copy = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 };
    setCanvas(prev => prev ? { ...prev, elements: [...prev.elements, copy] } : prev);
    setSelectedId(copy.id);
  }, [selectedId, canvas]);

  const addText = useCallback(() => {
    const id = `el_${Date.now()}`;
    const el: TextElement = {
      id, type: 'text', x: 100, y: 100, w: 400, h: 60,
      content: 'New text',
      style: { fontSize: 24, fontWeight: '600', color: '#0f172a', textAlign: 'left' },
    };
    setCanvas(prev => prev ? { ...prev, elements: [...prev.elements, el] } : prev);
    setSelectedId(id);
  }, []);

  const addShape = useCallback(() => {
    const id = `el_${Date.now()}`;
    const el: ShapeElement = {
      id, type: 'shape', x: 100, y: 100, w: 200, h: 120,
      shape: 'rect',
      style: { fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, borderRadius: 8 },
    };
    setCanvas(prev => prev ? { ...prev, elements: [...prev.elements, el] } : prev);
    setSelectedId(id);
  }, []);

  const addImage = useCallback(() => {
    const url = prompt('Image URL:');
    if (!url) return;
    const id = `el_${Date.now()}`;
    const el: ImageElement = { id, type: 'image', x: 100, y: 100, w: 300, h: 200, url };
    setCanvas(prev => prev ? { ...prev, elements: [...prev.elements, el] } : prev);
    setSelectedId(id);
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!doc || !canvas) return;
    if (doc.doc_type === 'slide_deck') {
      await savePage(activePage, canvas);
    } else {
      await saveCanvas(canvas);
    }
  }, [doc, canvas, activePage, saveCanvas, savePage]);

  // ── Add page ────────────────────────────────────────────────────────────────

  const handleAddPage = useCallback(async () => {
    const page = await addPage();
    if (page) setActivePage(page.page_number);
  }, [addPage]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const selectedEl = useMemo(
    () => canvas?.elements.find(el => el.id === selectedId) ?? null,
    [canvas, selectedId],
  );

  const totalPages = doc?.pages?.length ?? 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading || !doc) {
    return (
      <div className="doc-editor-loading">
        <Loader size={24} className="spin" />
        <span>Loading document…</span>
      </div>
    );
  }

  if (!canvas) {
    return <div className="doc-editor-loading"><span>No canvas data</span></div>;
  }

  return (
    <div className="doc-editor-root">
      <Toolbar
        doc={doc} zoom={zoom} saving={saving}
        activePage={activePage} totalPages={totalPages}
        onZoomIn={() => setZoom(z => Math.min(2, z + 0.1))}
        onZoomOut={() => setZoom(z => Math.max(0.1, z - 0.1))}
        onAddText={addText} onAddShape={addShape} onAddImage={addImage}
        onSave={handleSave} onBack={onBack}
        onPageChange={n => setActivePage(clamp(n, 1, totalPages))}
        onAddPage={handleAddPage}
      />

      <div className="doc-editor-body">
        {/* Canvas area */}
        <div
          className="doc-editor-canvas-area"
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            className="doc-editor-canvas"
            style={{
              width:      canvas.width  * zoom,
              height:     canvas.height * zoom,
              background: canvas.background,
              position:   'relative',
              flexShrink: 0,
            }}
          >
            {canvas.elements.map(el => (
              <CanvasElementView
                key={el.id}
                el={el}
                selected={selectedId === el.id}
                scale={zoom}
                cache={chartCache}
                onSelect={setSelectedId}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>

        {/* Properties panel */}
        <div className="doc-editor-props-col">
          {selectedEl ? (
            <PropertiesPanel
              el={selectedEl}
              onChange={updateElement}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
            />
          ) : (
            <CanvasPropsPanel
              canvas={canvas}
              onChange={patch => setCanvas(prev => prev ? { ...prev, ...patch } : prev)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
