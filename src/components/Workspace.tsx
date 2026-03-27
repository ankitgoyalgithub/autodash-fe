import { useState, useEffect, useRef, useCallback, Component } from 'react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, X, Send, AlertCircle, Loader2, ArrowLeft,
  Eye, EyeOff, Zap, Sparkles, Upload, LayoutGrid, LayoutList, Square,
  Palette, LayoutTemplate, Columns, MousePointer2, Move, Download, Plus, Filter,
  Brain, ChevronRight, Wand2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import logo from '../assets/logo.svg';
import type { Project, DashboardCard, HistoryEntry, UploadedFile, DashboardFilter } from '../App';
import { BASE, THEMES, FONTS, PALETTES, TEMPLATES, INFOGRAPHIC_TEMPLATES } from './constants';
import { InsightCard } from './InsightCard';

// ─── Draggable Cards Grid (default layout only) ───────────────────────────────
// This component is ONLY used for grid/masonry/single layout.
// Specialized layouts (exec, hub, split, etc.) use plain renderCards instead.

type LayoutMode = 'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation';

interface DraggableCardsGridProps {
  cards: DashboardCard[];
  layout: LayoutMode;
  editMode: boolean;
  font: string;
  colors: string[];
  posterTheme: string;
  globalFilters: Record<string, string | number | null>;
  dragEnabled: boolean;
  onUpdate: (card: DashboardCard, u: Partial<DashboardCard>) => void;
  onDrillDown: (card: DashboardCard, dim: string, val: string | number) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
}

function DraggableCardsGrid({ cards, layout, editMode, font, colors, posterTheme, globalFilters, dragEnabled, onUpdate, onDrillDown, onReorder }: DraggableCardsGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const metricCards = cards.filter(c => c.type === 'metric' || c.size === 's' || c.size === 'mini' || c.size === 'small');
  const chartCards = cards.filter(c => c.type !== 'metric' && c.size !== 's' && c.size !== 'mini' && c.size !== 'small');

  // Non-drag mode: original metrics-strip + charts-strip
  if (!dragEnabled) {
    return (
      <>
        {metricCards.length > 0 && (
          <div className="metrics-strip">
            {metricCards.map((card, i) => (
              <ChartErrorBoundary key={i} title={card.title}>
                <InsightCard index={i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} globalFilters={globalFilters}/>
              </ChartErrorBoundary>
            ))}
          </div>
        )}
        {chartCards.length > 0 && (
          <div className="charts-strip">
            {chartCards.map((card, i) => (
              <ChartErrorBoundary key={i} title={card.title}>
                <InsightCard index={metricCards.length + i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} globalFilters={globalFilters}/>
              </ChartErrorBoundary>
            ))}
          </div>
        )}
      </>
    );
  }

  // Drag mode: metrics stay fixed on top, only chart cards are sortable
  // chartCards indices in the original cards array
  const chartIndices = cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.type !== 'metric' && c.size !== 's' && c.size !== 'mini' && c.size !== 'small')
    .map(({ i }) => i);
  const chartIds = chartIndices.map(i => String(i));

  return (
    <>
      {/* Fixed non-draggable metrics strip */}
      {metricCards.length > 0 && (
        <div className="metrics-strip">
          {metricCards.map((card, i) => (
            <ChartErrorBoundary key={i} title={card.title}>
              <InsightCard index={i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} globalFilters={globalFilters} />
            </ChartErrorBoundary>
          ))}
        </div>
      )}
      {/* Sortable chart cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          // active.id and over.id are indices into the full cards array
          const oldIdx = parseInt(String(active.id));
          const newIdx = parseInt(String(over.id));
          if (!isNaN(oldIdx) && !isNaN(newIdx)) onReorder(oldIdx, newIdx);
        }}
      >
        <SortableContext items={chartIds} strategy={rectSortingStrategy}>
          <div className="drag-cards-flat-grid">
            {chartIndices.map((cardIdx) => {
              const card = cards[cardIdx];
              return (
                <SortableGridCard
                  key={String(cardIdx)}
                  id={String(cardIdx)}
                  card={card}
                  index={cardIdx}
                  layout={layout}
                  editMode={editMode}
                  font={font}
                  colors={colors}
                  posterTheme={posterTheme}
                  onUpdate={(u) => onUpdate(card, u)}
                  onDrillDown={(dim, val) => onDrillDown(card, dim, val)}
                  globalFilters={globalFilters}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

// Individual sortable card item — only used inside DraggableCardsGrid
function SortableGridCard({ id, card, index, layout, editMode, font, colors, posterTheme, onUpdate, onDrillDown, globalFilters }: {
  id: string; card: DashboardCard; index: number; layout: LayoutMode; editMode: boolean;
  font: string; colors: string[]; posterTheme: string;
  onUpdate: (u: Partial<DashboardCard>) => void;
  onDrillDown: (dim: string, val: string | number) => void;
  globalFilters: Record<string, string | number | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // Map card size to 12-column grid span — matches the CSS grid system
  const s = card.size || '';
  const t = card.type || '';
  const gridColumnSpan =
    s === 'full' || s === 'xxl' ? 'span 12' :
    s === 'wide' || s === 'xl' ? 'span 6' :
    s === 'l' || s === 'tall' ? 'span 6' :
    s === 'mini' || s === 's' || s === 'small' || t === 'metric' ? 'span 3' :
    'span 4'; // m / medium / default
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 9999 : 'auto',
    gridColumn: gridColumnSpan,
    cursor: isDragging ? 'grabbing' : 'grab',
    outline: isDragging ? '2px dashed rgba(99,102,241,0.55)' : undefined,
    borderRadius: isDragging ? '12px' : undefined,
    minHeight: 0,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ChartErrorBoundary title={card.title}>
        <InsightCard
          index={index} card={card} layout={layout} editMode={editMode} font={font}
          colors={colors} posterTheme={posterTheme} onUpdate={onUpdate}
          onDrillDown={onDrillDown} globalFilters={globalFilters}
        />
      </ChartErrorBoundary>
    </div>
  );
}

// ─── HITL Types ───────────────────────────────────────────────────────────────

interface HITLField {
  id: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
  default?: string;
  hint?: string;
}

interface HITLRequest {
  id: string;
  question: string;
  type: 'select' | 'number' | 'text' | 'form';
  options?: string[];
  default?: string;
  fields?: HITLField[];
  placeholder?: string;
}

// ─── HITL Card ────────────────────────────────────────────────────────────────

function HITLCard({ request, onAnswer, projectColor }: {
  request: HITLRequest;
  onAnswer: (questionId: string, answer: any) => void;
  projectColor: string;
}) {
  const [simpleAnswer, setSimpleAnswer] = useState<string>(
    request.default || request.options?.[0] || ''
  );
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (request.fields) {
      return Object.fromEntries(
        request.fields.map(f => [f.id, f.default || f.options?.[0] || ''])
      );
    }
    return {};
  });

  const handleSubmit = () => {
    if (request.type === 'form') {
      onAnswer(request.id, formValues);
    } else {
      onAnswer(request.id, simpleAnswer);
    }
  };

  return (
    <div className="hitl-card">
      <div className="hitl-header">
        <Brain size={14} className="hitl-brain-icon"/>
        <span className="hitl-label">Input Required</span>
      </div>
      <p className="hitl-question">{request.question}</p>

      {/* Simple select */}
      {request.type === 'select' && request.options && (
        <div className="hitl-options-grid">
          {request.options.map(opt => (
            <button
              key={opt}
              className={`hitl-option ${simpleAnswer === opt ? 'selected' : ''}`}
              style={simpleAnswer === opt ? { borderColor: projectColor, background: projectColor + '18', color: projectColor } : {}}
              onClick={() => setSimpleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Simple number */}
      {request.type === 'number' && (
        <input
          type="number"
          className="hitl-input"
          value={simpleAnswer}
          onChange={e => setSimpleAnswer(e.target.value)}
          placeholder={request.placeholder || 'Enter a number'}
        />
      )}

      {/* Simple text */}
      {request.type === 'text' && (
        <input
          type="text"
          className="hitl-input"
          value={simpleAnswer}
          onChange={e => setSimpleAnswer(e.target.value)}
          placeholder={request.placeholder || 'Type your answer…'}
        />
      )}

      {/* Form (compound fields) */}
      {request.type === 'form' && request.fields && (
        <div className="hitl-form">
          {request.fields.map(field => (
            <div key={field.id} className="hitl-field">
              <label className="hitl-field-label">
                {field.label}
                {field.hint && <span className="hitl-field-hint"> — {field.hint}</span>}
              </label>
              {field.type === 'select' && field.options ? (
                <div className="hitl-options-grid hitl-options-sm">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      className={`hitl-option ${formValues[field.id] === opt ? 'selected' : ''}`}
                      style={formValues[field.id] === opt ? { borderColor: projectColor, background: projectColor + '18', color: projectColor } : {}}
                      onClick={() => setFormValues(prev => ({ ...prev, [field.id]: opt }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="hitl-input"
                  value={formValues[field.id] || ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="hitl-submit-btn"
        style={{ background: projectColor }}
        onClick={handleSubmit}
      >
        Continue <ChevronRight size={13}/>
      </button>
    </div>
  );
}


function ThemePicker({ selected, onSelect }: { selected: any; onSelect: (t: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="theme-picker-wrap">
      <button className={`theme-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <Palette size={14}/>
        <span>{selected.name}</span>
      </button>
      {open && (
        <>
          <div className="theme-overlay" onClick={() => setOpen(false)} />
          <div className="theme-dropdown shadow-lg">
            {THEMES.map(t => (
              <button key={t.id} className={`theme-opt ${selected.id === t.id ? 'active' : ''}`} onClick={() => { onSelect(t); setOpen(false); }}>
                <div className="theme-swatch" style={{ background: t.color, border: t.id === 'light' ? '1px solid #ddd' : 'none' }}/>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const THEME_VISUALS: Record<string, { bg: string; sidebar: string; card: string; accent: string }> = {
  'light':         { bg: '#f5f7fa',  sidebar: '#ffffff',          card: '#ffffff',              accent: '#6366f1' },
  'dark-pro':      { bg: '#0f172a',  sidebar: '#1e293b',          card: '#1e293b',              accent: '#818cf8' },
  'midnight':      { bg: '#030712',  sidebar: '#111827',          card: '#111827',              accent: '#4f46e5' },
  'glassmorphism': { bg: '#dde1e7',  sidebar: 'rgba(255,255,255,0.55)', card: 'rgba(255,255,255,0.6)', accent: '#6366f1' },
  'corporate':     { bg: '#f1f5f9',  sidebar: '#0f172a',          card: '#ffffff',              accent: '#2563eb' },
  'sunset':        { bg: '#1a1020',  sidebar: '#231430',          card: '#2a1838',              accent: '#f97316' },
  'ocean':         { bg: '#0c1222',  sidebar: '#111d35',          card: '#152040',              accent: '#06b6d4' },
  'neon':          { bg: '#0a0a0a',  sidebar: '#121212',          card: '#1a1a1a',              accent: '#a855f7' },
  'canva':         { bg: '#f0edf9',  sidebar: '#ffffff',          card: '#ffffff',              accent: '#7d2ae8' },
};

// ─── Chart Error Boundary ─────────────────────────────────────────────────────
// Catches render errors in individual chart cards so one bad chart can't crash
// the entire dashboard and produce a white screen.
class ChartErrorBoundary extends Component<
  { children: ReactNode; title?: string },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('Chart render error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-card error" style={{ minHeight: 80, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <span style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
            {this.props.title ? `"${this.props.title}" could not render` : 'Chart could not render'}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Workspace({ project, onBack, initialThreadId }: {
  project: Project;
  onBack: () => void;
  initialThreadId?: number;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(initialThreadId || null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  const [layout, setLayout] = useState<'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation'>('grid');
  const [theme, setTheme] = useState(THEMES[0]);
  const [font, setFont] = useState(FONTS[0]);
  const [palette, setPalette] = useState(project.palette || 'vibrant');
  const [layoutMode, setLayoutMode] = useState<'dashboard' | 'infographic'>('dashboard');
  const [editMode, setEditMode] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'themes' | 'layouts' | null>(null);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [posterTheme, setPosterTheme] = useState<'light' | 'dark' | 'branded' | 'newspaper'>('light');
  const [infographicTemplate, setInfographicTemplate] = useState<string | null>(null);
  const [pendingTableRequest, setPendingTableRequest] = useState<string | null>(null);
  const [tableHints] = useState<string[]>([]);
  const [globalFilters, setGlobalFilters] = useState<Record<string, string | number | null>>({});
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilter[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  // HITL state
  const [pendingHITL, setPendingHITL] = useState<HITLRequest | null>(null);
  const [hitlResponses, setHitlResponses] = useState<Record<string, any>>({});
  const [hitlQueryRef, setHitlQueryRef] = useState<string>('');
  // Drag-and-drop + layout optimizer
  const [dragEnabled, setDragEnabled] = useState(true);
  const [layoutOptimizing, setLayoutOptimizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const fetchThreadHistory = useCallback(async (tId: number) => {
    try {
      const r = await axios.get(`${BASE}/threads/${tId}/`);
      const threadHistory = r.data.history;
      setHistory(threadHistory);
      if (threadHistory.length > 0) {
        setActiveEntry(threadHistory[threadHistory.length - 1]);
      }
    } catch {
      setError("Failed to load conversation history.");
    }
  }, []);

  // Sync only when the parent explicitly changes the thread selection.
  // Do NOT include currentThreadId in deps — that would reset the thread
  // every time a new thread is created mid-session by handleSubmit.
  useEffect(() => {
    setCurrentThreadId(initialThreadId !== undefined ? initialThreadId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  useEffect(() => {
    if (currentThreadId) {
      fetchThreadHistory(currentThreadId);
    } else {
      setHistory([]);
      setActiveEntry(null);
    }
    setGlobalFilters({});
    setDashboardFilters([]);
  }, [currentThreadId, fetchThreadHistory]);

  // Persist results_data to backend after any change (debounced 1.5s)
  useEffect(() => {
    if (!activeEntry) return;
    const timer = setTimeout(async () => {
      try {
        await axios.patch(`${BASE}/history/`, {
          id: activeEntry.id,
          results_data: activeEntry.results_data,
        });
      } catch (err) {
        console.error("Failed to persist dashboard:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeEntry?.results_data, activeEntry?.id]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading, optimisticPrompt]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      try {
        const fd = new FormData(); fd.append('file', f);
        const r = await axios.post(`${BASE}/upload/`, fd);
        setUploads(prev => [...prev, { ...r.data, preview: URL.createObjectURL(f) }]);
      } catch { alert('Upload failed: ' + f.name); }
    }
    setUploading(false);
  };

  const extractTableHints = (text: string): string[] => {
    // Extract snake_case / identifier-looking words that could be table names
    const words = text.match(/\b[a-z][a-z0-9_]{2,}\b/g) || [];
    const stopWords = new Set(['the','and','for','with','show','give','make','build','from','that','this','into','over','all','top','how','what','where','when','more','less','using','about','table','tables','chart','data','analyze','analysis','dashboard','insights','insight','use','please','want','need','can','you']);
    return [...new Set(words.filter(w => !stopWords.has(w) && w.length > 3))];
  };

  const handleSubmit = async (promptOverride?: string, hitlResponsesOverride?: Record<string, any>) => {
    if (!promptOverride && !query.trim() && uploads.length === 0) return;
    const promptText = promptOverride || query.trim() || 'Build dashboard from the uploaded reference images.';
    const imgContexts = uploads.map(u => u.image_context).filter(Boolean);
    const imgUrls = uploads.map(u => u.url);

    // If backend asked for table names, extract hints from this message
    const hints = pendingTableRequest ? extractTableHints(promptText) : tableHints;
    if (pendingTableRequest) setPendingTableRequest(null);

    // Use provided HITL responses or accumulated ones
    const currentHITLResponses = hitlResponsesOverride ?? hitlResponses;

    setOptimisticPrompt(promptText);
    setLoading(true); setError(''); setQuery(''); setUploads([]);

    try {
      const r = await axios.post(`${BASE}/query/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        image_contexts: imgContexts,
        reference_images: imgUrls,
        existing_charts: activeEntry?.results_data || [],
        table_hints: hints,
        hitl_responses: currentHITLResponses,
      });

      const newThreadId = r.data.thread_id;

      // Analytics agent (or other agent) needs human input
      if (r.data.action === 'hitl_required') {
        setPendingHITL(r.data.hitl_request);
        setHitlQueryRef(promptText);
        if (!currentThreadId && newThreadId) setCurrentThreadId(newThreadId);
        setOptimisticPrompt(null);
        setLoading(false);
        return;
      }

      // Backend couldn't find user tables — show inline prompt asking for table names
      if (r.data.action === 'request_table_names') {
        setPendingTableRequest(r.data.message);
        if (!currentThreadId && newThreadId) setCurrentThreadId(newThreadId);
        setOptimisticPrompt(null);
        return;
      }

      // Clarification needed — show as inline message
      if (r.data.action === 'clarification_needed') {
        setPendingTableRequest(r.data.question);  // reuse the same UI slot
        if (!currentThreadId && newThreadId) setCurrentThreadId(newThreadId);
        setOptimisticPrompt(null);
        setLoading(false);
        return;
      }

      // Clear HITL state on successful response
      setHitlResponses({});
      setPendingHITL(null);
      setHitlQueryRef('');

      // Capture filters now but apply them AFTER fetchThreadHistory to avoid
      // the currentThreadId useEffect wiping them when a new thread is created.
      const incomingFilters = r.data.dashboard_filters;

      const suggestedThemeId = r.data.suggested_theme;
      const suggestedLayout = r.data.suggested_layout;
      const suggestedFont = r.data.suggested_font;
      const suggestedPalette = r.data.suggested_palette;

      if (!currentThreadId && newThreadId) {
        setCurrentThreadId(newThreadId);
      }

      if (suggestedThemeId) {
        const found = THEMES.find(t => t.id === suggestedThemeId);
        if (found) setTheme(found);
      }

      if (suggestedLayout) {
        setLayout(suggestedLayout as any);
        setLayoutMode(suggestedLayout === 'poster' ? 'infographic' : 'dashboard');
      }

      if (suggestedFont) {
        const found = FONTS.find(f => f.value === suggestedFont || f.name === suggestedFont);
        if (found) setFont(found);
      }

      if (suggestedPalette) {
        setPalette(suggestedPalette.toLowerCase());
      }

      if (newThreadId) {
        await fetchThreadHistory(newThreadId);
      }

      // Apply filters after fetchThreadHistory so the currentThreadId useEffect
      // (which clears dashboardFilters on thread change) has already fired.
      if (incomingFilters?.length) {
        setDashboardFilters(incomingFilters);
        setGlobalFilters({});
      }

      setOptimisticPrompt(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
      setOptimisticPrompt(null);
    } finally { setLoading(false); }
  };

  const handleDeploy = async () => {
    if (!activeEntry) return;
    try {
      const r = await axios.post(`${BASE}/deploy/`, { dashboard_id: activeEntry.id });
      const publicUrl = window.location.origin + r.data.url;
      prompt("Dashboard deployed successfully! Copy the public link:", publicUrl);
      fetchThreadHistory(currentThreadId!);
    } catch { alert("Failed to deploy dashboard."); }
  };

  const handleUndeploy = async () => {
    if (!activeEntry || !activeEntry.is_deployed) return;
    if (!confirm("Are you sure you want to take this dashboard offline?")) return;
    try {
      await axios.delete(`${BASE}/deploy/?dashboard_id=${activeEntry.id}`);
      fetchThreadHistory(currentThreadId!);
    } catch { alert("Failed to undeploy."); }
  };

  const handleUpdateCard = (card: DashboardCard, updates: Partial<DashboardCard>) => {
    if (!activeEntry) return;
    const updatedResults = activeEntry.results_data.map(c =>
      c.title === card.title ? { ...c, ...updates } : c
    );
    setActiveEntry({ ...activeEntry, results_data: updatedResults });
  };

  const handleDownloadPNG = async () => {
    if (!posterRef.current) return;
    const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = `${activeEntry?.query || 'poster'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleAddTextBlock = () => {
    if (!activeEntry) return;
    const newCard: DashboardCard = {
      type: 'text',
      size: 'medium',
      title: 'Text Block',
      insight: 'Edit this text block to add notes, labels, or narrative context...',
      sql: '',
      data: [],
      chart_type: 'text',
      x: 40,
      y: 40,
      w: 340,
      h: 160,
    };
    setActiveEntry({ ...activeEntry, results_data: [...activeEntry.results_data, newCard] });
  };

  const handleDrillDown = (card: DashboardCard, dimension: string, value: string | number) => {
    const drillPrompt = `I want to drill down into "${value}" for the dimension "${dimension}" in the context of the "${card.title}" chart from the previous query "${activeEntry?.query}". Please show me more detailed insights for this specific slice.`;
    handleSubmit(drillPrompt);
  };

  const handleFilterChange = async (column: string, value: string | number | null) => {
    const newFilters = { ...globalFilters, [column]: value };
    if (value === null) delete newFilters[column];
    setGlobalFilters(newFilters);

    const activeFilters = Object.fromEntries(Object.entries(newFilters).filter(([, v]) => v !== null));
    if (!activeEntry || Object.keys(activeFilters).length === 0) return;

    // Re-run all chart SQLs with the active filters
    const charts = (activeEntry.results_data || [])
      .map((c, i) => ({ index: i, sql: c.sql }))
      .filter(c => c.sql);

    if (!charts.length) return;
    setFilterLoading(true);
    try {
      const r = await axios.post(`${BASE}/filter/`, {
        project_id: project.id,
        charts,
        filter_overrides: activeFilters,
      });
      const updatedResults = [...activeEntry.results_data];
      for (const res of r.data.results || []) {
        if (!res.error && res.data) {
          updatedResults[res.index] = { ...updatedResults[res.index], data: res.data };
        }
      }
      setActiveEntry({ ...activeEntry, results_data: updatedResults });
    } catch (e) {
      console.error('Filter API error:', e);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleHITLAnswer = async (questionId: string, answer: any) => {
    // Accumulate the answer and re-run the original query
    const newResponses = { ...hitlResponses, [questionId]: answer };
    setHitlResponses(newResponses);
    setPendingHITL(null);
    await handleSubmit(hitlQueryRef, newResponses);
  };

  const activeColors = PALETTES[palette as keyof typeof PALETTES];

  // ── Drag reorder callback (called by DraggableCardsGrid) ────────────────────
  const handleReorder = (oldIndex: number, newIndex: number) => {
    if (!activeEntry) return;
    const reordered = arrayMove([...activeEntry.results_data], oldIndex, newIndex);
    setActiveEntry({ ...activeEntry, results_data: reordered });
  };

  // ── AI Layout Optimizer ──────────────────────────────────────────────────────
  const handleOptimizeLayout = async () => {
    if (!activeEntry || layoutOptimizing) return;
    setLayoutOptimizing(true);
    try {
      const r = await axios.post(`${BASE}/layout-optimize/`, {
        dashboard_id: activeEntry.id,
        project_id: project.id,
        cards: activeEntry.results_data,
        query: activeEntry.query,
      });
      if (r.data.cards) {
        setActiveEntry({ ...activeEntry, results_data: r.data.cards });
      }
      if (r.data.layout && r.data.layout !== layout) {
        setLayout(r.data.layout);
      }
    } catch (e) {
      console.error('Layout optimization failed', e);
    } finally {
      setLayoutOptimizing(false);
    }
  };

  // ── Render cards: plain InsightCard array, used by all specialized layouts ───
  const renderCards = (cards: DashboardCard[]) => {
    const sorted = [...cards].sort((a, b) => {
      const aM = a.type === 'metric' || a.size === 's' || a.size === 'mini' || a.size === 'small' ? 0 : 1;
      const bM = b.type === 'metric' || b.size === 's' || b.size === 'mini' || b.size === 'small' ? 0 : 1;
      return aM - bM;
    });
    return sorted.map((card, i) => (
      <ChartErrorBoundary key={i} title={card.title}>
        <InsightCard
          index={i}
          card={card}
          layout={layout}
          editMode={editMode}
          font={font.value}
          colors={activeColors}
          posterTheme={posterTheme}
          onUpdate={(u) => handleUpdateCard(card, u)}
          onDrillDown={(dim, val) => handleDrillDown(card, dim, val)}
          globalFilters={globalFilters}
        />
      </ChartErrorBoundary>
    ));
  };

  return (
    <div className={`workspace ${theme.id === 'canva' ? 'theme-canva' : ''}`}>

      <div className="workspace-sidebar glass">
        <button className={activeSideTab === 'templates' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'templates' ? null : 'templates')} title="Templates"><LayoutTemplate size={20}/><small>Design</small></button>
        <button className={activeSideTab === 'themes' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'themes' ? null : 'themes')} title="Themes"><Palette size={20}/><small>Style</small></button>
        <button className={activeSideTab === 'layouts' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'layouts' ? null : 'layouts')} title="Layouts"><Columns size={20}/><small>Format</small></button>
      </div>

      {activeSideTab && (
        <div className="config-panel glass">
          <div className="config-panel-head">
            <h3>{activeSideTab.charAt(0).toUpperCase() + activeSideTab.slice(1)}</h3>
            <button className="icon-btn" onClick={() => setActiveSideTab(null)}><X size={16}/></button>
          </div>
          <div className="config-panel-body">
            {activeSideTab === 'templates' && (
              <div className="template-mini-grid">
                {TEMPLATES.map(t => (
                  <button key={t.id} className="template-mini-card" onClick={() => setQuery(t.prompt)}>
                    <span>{t.emoji}</span>
                    <small>{t.name}</small>
                  </button>
                ))}
              </div>
            )}
            {activeSideTab === 'themes' && (
              <div className="style-panel">

                {/* ── Dashboard Theme ── */}
                <div className="style-section">
                  <div className="style-section-label">Dashboard Theme</div>
                  <div className="theme-visual-grid">
                    {THEMES.map(t => {
                      const v = THEME_VISUALS[t.id];
                      return (
                        <button key={t.id} className={`theme-visual-card ${theme.id === t.id ? 'active' : ''}`} onClick={() => setTheme(t)}>
                          <div className="tvc-preview" style={{ background: v.bg }}>
                            <div className="tvc-sidebar" style={{ background: v.sidebar }} />
                            <div className="tvc-body">
                              <div className="tvc-topbar" style={{ background: v.accent, opacity: 0.85 }} />
                              <div className="tvc-cards">
                                <div className="tvc-card" style={{ background: v.card }} />
                                <div className="tvc-card" style={{ background: v.card }} />
                                <div className="tvc-card tvc-card-wide" style={{ background: v.card }} />
                              </div>
                            </div>
                          </div>
                          <span className="tvc-name">{t.name}</span>
                          {theme.id === t.id && <span className="tvc-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="style-divider" />

                {/* ── Chart Palette ── */}
                <div className="style-section">
                  <div className="style-section-label">Chart Palette</div>
                  <div className="palette-visual-grid">
                    {Object.entries(PALETTES).map(([p, colors]) => (
                      <button key={p} className={`palette-visual-card ${palette === p ? 'active' : ''}`} onClick={() => setPalette(p)}>
                        <div className="pvc-swatches">
                          {colors.slice(0, 6).map(c => (
                            <div key={c} className="pvc-dot" style={{ background: c }} />
                          ))}
                        </div>
                        <span className="pvc-name">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="style-divider" />

                {/* ── Typography ── */}
                <div className="style-section">
                  <div className="style-section-label">Typography</div>
                  <div className="font-visual-grid">
                    {FONTS.map(f => (
                      <button key={f.id} className={`font-visual-card ${font.id === f.id ? 'active' : ''}`} onClick={() => setFont(f)}>
                        <span className="fvc-sample" style={{ fontFamily: f.value }}>Aa</span>
                        <span className="fvc-name">{f.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
            {activeSideTab === 'layouts' && (
              <div className="layout-options">
                <button className={`layout-option ${layoutMode === 'dashboard' ? 'active' : ''}`} onClick={() => { setLayoutMode('dashboard'); if (layout === 'poster') setLayout('grid'); setInfographicTemplate(null); }}>
                  <LayoutGrid size={16}/>
                  <div><strong>Dashboard</strong><p>Classic grid for multi-chart reports</p></div>
                </button>
                <button className={`layout-option ${layoutMode === 'infographic' ? 'active' : ''}`} onClick={() => { setLayoutMode('infographic'); setLayout('poster'); }}>
                  <LayoutList size={16}/>
                  <div><strong>Poster / Infographic</strong><p>Rich, canvas-like narrative poster</p></div>
                </button>

                {/* ── Infographic Templates ── */}
                {layoutMode === 'infographic' && (
                  <div className="infographic-tpl-section">
                    <div className="style-section-label" style={{ marginBottom: 8 }}>Infographic Template</div>
                    <div className="infographic-tpl-list">
                      {INFOGRAPHIC_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          className={`infographic-tpl-card ${infographicTemplate === tpl.id ? 'active' : ''}`}
                          onClick={() => {
                            setInfographicTemplate(tpl.id);
                            setPosterTheme(tpl.posterTheme);
                          }}
                        >
                          <div className="itpl-preview">
                            <div className="itpl-prev-bg" style={{ background: tpl.preview[0] }}>
                              <div className="itpl-prev-card" style={{ background: tpl.preview[1] }} />
                              <div className="itpl-prev-card" style={{ background: tpl.preview[1] }} />
                            </div>
                            <div className="itpl-accent-bar" style={{ background: tpl.accent }} />
                          </div>
                          <div className="itpl-info">
                            <span className="itpl-icon">{tpl.icon}</span>
                            <div>
                              <div className="itpl-name">{tpl.name}</div>
                              <div className="itpl-desc">{tpl.desc}</div>
                            </div>
                          </div>
                          {infographicTemplate === tpl.id && <span className="itpl-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="config-divider" />
                <div className="layout-sub-options">
                  <header>View Mode</header>
                  <div className="layout-grid-select">
                    <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} title="Grid"><LayoutGrid size={14}/></button>
                    <button className={layout === 'exec' ? 'active' : ''} onClick={() => setLayout('exec')} title="Executive"><Columns size={14}/></button>
                    <button className={layout === 'hub' ? 'active' : ''} onClick={() => setLayout('hub')} title="Analytical Hub"><LayoutList size={14}/></button>
                    <button className={layout === 'split' ? 'active' : ''} onClick={() => setLayout('split')} title="Comparison Split"><Columns size={14} style={{transform:'rotate(90deg)'}}/></button>
                    <button className={layout === 'magazine' ? 'active' : ''} onClick={() => setLayout('magazine')} title="Magazine"><LayoutDashboard size={14}/></button>
                    <button className={layout === 'presentation' ? 'active' : ''} onClick={() => setLayout('presentation')} title="Presentation"><X size={14}/></button>
                    <button className={layout === 'single' ? 'active' : ''} onClick={() => setLayout('single')} title="Focus"><Square size={14}/></button>
                  </div>
                  <div className="config-divider"></div>
                  <div className="layout-sub-options">
                    <header>Canvas Settings</header>
                    <button
                      className={`btn-edit ${editMode ? 'active' : ''}`}
                      onClick={() => setEditMode(!editMode)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {editMode ? <MousePointer2 size={14}/> : <Move size={14}/>}
                      {editMode ? 'Stop Editing' : 'Edit Canvas'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEFT: Chat Panel ─────────────────────────────── */}
      <div
        className="chat-panel"
        onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        onDragOver={e => e.preventDefault()}
      >
        <div className="chat-header">
          <button className="back-link" onClick={onBack}><ArrowLeft size={14}/> Back</button>
          <div className="chat-header-project">
            <span className="chat-proj-emoji">{project.emoji}</span>
            <div>
              <strong>{project.name}</strong>
            </div>
          </div>
        </div>

        <div className="chat-messages premium-scrollbar">
          {history.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="chat-empty-icon" style={{ background: project.color + '18' }}>{project.emoji}</div>
              <p>How can I help you today?</p>
            </div>
          )}

          {[...history].reverse().map(entry => (
            <div key={entry.id} className="convo-block">
              <div className="user-msg">
                <div className="user-avatar" style={{ background: project.color }}>{project.emoji}</div>
                <div className="user-bubble">
                  <p>{entry.query}</p>
                </div>
              </div>

              <button
                className={`ai-msg ${activeEntry?.id === entry.id ? 'selected' : ''}`}
                onClick={() => setActiveEntry(entry)}
              >
                <div className="ai-avatar"><img src={logo} alt="AI"/></div>
                <div className="charts-wrap">
                  {entry.narrative && (
                    <p className="ai-narrative">{entry.narrative}</p>
                  )}
                  <div className="ai-intro">
                    <Sparkles size={14}/>
                    <span>{entry.results_data?.length || 0} charts · click to view</span>
                  </div>
                </div>
              </button>
            </div>
          ))}

          {pendingTableRequest && (
            <div className="convo-block">
              <div className="ai-msg">
                <div className="ai-avatar"><img src={logo} alt="AI"/></div>
                <div className="charts-wrap">
                  <div className="table-request-card">
                    <AlertCircle size={14} className="table-request-icon"/>
                    <p>{pendingTableRequest}</p>
                    <span className="table-request-hint">Type table names in the chat below, e.g. "analyze the orders and customers tables"</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {pendingHITL && (
            <div className="convo-block">
              <div className="ai-msg">
                <div className="ai-avatar"><img src={logo} alt="AI"/></div>
                <div className="charts-wrap">
                  <HITLCard
                    request={pendingHITL}
                    onAnswer={handleHITLAnswer}
                    projectColor={project.color}
                  />
                </div>
              </div>
            </div>
          )}

          {optimisticPrompt && (
            <div className="convo-block">
              <div className="user-msg">
                <div className="user-avatar" style={{ background: project.color }}>{project.emoji}</div>
                <div className="user-bubble"><p>{optimisticPrompt}</p></div>
              </div>
              <div className="thinking">
                <Loader2 size={13} className="spin"/>
                <span>AI is designing your dashboard…</span>
              </div>
            </div>
          )}

          {loading && !optimisticPrompt && (
            <div className="thinking">
              <Loader2 size={13} className="spin"/>
              <span>Analyzing data patterns…</span>
            </div>
          )}
          {error && <div className="error-bar"><AlertCircle size={13}/>{error}</div>}
          <div ref={chatBottomRef}/>
        </div>

        <div className="composer">
          {uploads.length > 0 && (
            <div className="upload-strip">
              {uploads.map((u, i) => (
                <div key={i} className="upload-chip">
                  <img src={u.preview} alt={u.filename}/>
                  <button onClick={() => setUploads(uploads.filter((_, j) => j !== i))}><X size={10}/></button>
                </div>
              ))}
              {uploading && <div className="upload-chip loading-chip"><Loader2 size={15} className="spin"/></div>}
            </div>
          )}
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              className="comp-textarea"
              placeholder="Ask AI to build charts, refine existing ones, or add new insights…"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              rows={1}
            />
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.csv" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)}/>
            <div className="composer-actions">
              <div className="composer-actions-left">
                <button className="comp-icon" onClick={() => fileRef.current?.click()} title="Attach file">
                  {uploading ? <Loader2 size={16} className="spin"/> : <Upload size={16}/>}
                </button>
              </div>
              <button className="comp-send" style={{ background: project.color }} onClick={() => handleSubmit()} disabled={loading || (!query.trim() && !uploads.length)}>
                {loading ? <Loader2 size={15} className="spin"/> : <Send size={15}/>}
              </button>
            </div>
          </div>
          <p className="comp-hint">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* ── RIGHT: Live Dashboard Panel ───────────────────── */}
      <div className={`dashboard-panel theme-${theme.id}`} data-theme={theme.id}>
        <div className="dp-header">
          {activeEntry ? (
            <div className="dp-header-main">
              <div className="dp-header-left">
                <div className="dp-title">
                  <LayoutDashboard size={15} className="dp-title-icon"/>
                  <span>{activeEntry.query}</span>
                </div>
                <div className="dp-meta">
                  <span>{new Date(activeEntry.created_at).toLocaleTimeString()}</span>
                  <span className="dp-badge">{activeEntry.results_data?.length || 0} insights</span>
                  {activeEntry.is_deployed && <span className="dp-deployed-badge"><Eye size={10}/> Public</span>}
                </div>
              </div>
              <div className="dp-header-right">
                <ThemePicker selected={theme} onSelect={setTheme} />
                <div className="layout-picker themed">
                  <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} title="Grid View"><LayoutGrid size={15}/></button>
                  <button className={layout === 'masonry' ? 'active' : ''} onClick={() => setLayout('masonry')} title="Masonry View"><LayoutList size={15}/></button>
                  <button className={layout === 'single' ? 'active' : ''} onClick={() => setLayout('single')} title="Focus View"><Square size={15}/></button>
                </div>
                <button
                  className={`dp-icon-btn ${dragEnabled ? 'dp-icon-btn--active' : ''}`}
                  onClick={() => setDragEnabled(v => !v)}
                  title={dragEnabled ? 'Disable drag to reorder' : 'Enable drag to reorder charts'}
                >
                  <Move size={14}/>
                </button>
                <button
                  className="dp-icon-btn dp-optimize-btn"
                  onClick={handleOptimizeLayout}
                  disabled={layoutOptimizing}
                  title="AI: Optimize layout"
                >
                  {layoutOptimizing ? <Loader2 size={14} className="spin"/> : <Wand2 size={14}/>}
                </button>
                {activeEntry.is_deployed ? (
                  <button className="undeploy-btn" onClick={handleUndeploy}><EyeOff size={14}/> Offline</button>
                ) : (
                  <button className="deploy-btn" onClick={handleDeploy}><Zap size={14}/> Deploy</button>
                )}
              </div>
            </div>
          ) : (
            <div className="dp-title dp-placeholder-title">
              <LayoutDashboard size={15} className="dp-title-icon"/>
              <span>Live Dashboard</span>
            </div>
          )}
        </div>

        <div className={`dp-content ${layoutMode}-mode ${layout === 'poster' ? 'poster-content' : ''}`}>
          {!activeEntry && !loading && (
            <div className="dp-empty">
              <div className="dp-empty-icon" style={{ background: project.color + '15', border: `1.5px dashed ${project.color}50` }}>
                <LayoutDashboard size={28} style={{ color: project.color, opacity: 0.7 }}/>
              </div>
              <h3>No dashboard selected</h3>
              <p>Send a prompt in the chat or click a previous response to view its charts here.</p>
            </div>
          )}

          {activeEntry && layout === 'poster' && (
            <div className="poster-toolbar">
              <div className="poster-scheme-picker">
                {([
                  { id: 'light', label: 'Clean White', swatch: '#ffffff' },
                  { id: 'dark', label: 'Dark Executive', swatch: '#0f172a' },
                  { id: 'branded', label: 'Brand Gradient', swatch: 'linear-gradient(135deg,#312e81,#4c1d95)' },
                  { id: 'newspaper', label: 'Newspaper', swatch: '#faf8f4' },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    className={`poster-scheme-btn ${posterTheme === t.id ? 'active' : ''}`}
                    onClick={() => setPosterTheme(t.id)}
                  >
                    <span className="poster-scheme-swatch" style={{ background: t.swatch }}/>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="poster-toolbar-divider"/>
              <button className="poster-toolbar-btn" onClick={handleAddTextBlock}>
                <Plus size={13}/> Add Text Block
              </button>
              <button className="poster-toolbar-btn accent" onClick={handleDownloadPNG}>
                <Download size={13}/> Download PNG
              </button>
            </div>
          )}

          {activeEntry && dashboardFilters.length > 0 && (
            <div className="global-filter-bar">
              <div className="gf-label">
                <Filter size={13}/>
                {filterLoading ? <Loader2 size={11} className="spin"/> : 'Filters'}
              </div>
              {dashboardFilters.map(f => (
                <div key={f.column} className="gf-group">
                  <span className="gf-col-name">{f.label || f.column.replace(/_/g, ' ')}</span>
                  {f.values.length > 8 ? (
                    <select
                      className="gf-select"
                      value={String(globalFilters[f.column] ?? '')}
                      onChange={e => handleFilterChange(f.column, e.target.value || null)}
                    >
                      <option value="">All</option>
                      {f.values.map(v => (
                        <option key={String(v)} value={String(v)}>{String(v)}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="gf-chips">
                      <button
                        className={`gf-chip ${!globalFilters[f.column] ? 'active' : ''}`}
                        onClick={() => handleFilterChange(f.column, null)}
                      >All</button>
                      {f.values.map(v => (
                        <button
                          key={String(v)}
                          className={`gf-chip ${globalFilters[f.column] === v ? 'active' : ''}`}
                          onClick={() => handleFilterChange(f.column, globalFilters[f.column] === v ? null : v)}
                        >{String(v)}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {Object.values(globalFilters).some(v => v !== null) && (
                <button className="gf-clear" onClick={() => { setGlobalFilters({}); }}>
                  Clear all
                </button>
              )}
            </div>
          )}

          {activeEntry && (
            <div className={`dp-charts layout-${layout} ${editMode ? 'edit-mode' : ''} ${theme.id === 'canva' ? 'canvas-mode' : ''}`}>
              {theme.id === 'canva' ? (
                <div className="canvas-container">
                  <div className="canvas-page">
                    <header className="canvas-header">
                      <h1 className="canvas-title">{activeEntry.query}</h1>
                      <p className="canvas-subtitle">{project.name} • {new Date(activeEntry.created_at).toLocaleDateString()} • {activeEntry.results_data?.length || 0} Insights</p>
                    </header>
                    <div className="dp-grid">
                      {renderCards(activeEntry.results_data)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dp-grid">
                  {(activeEntry.results_data || []).length === 0 ? (
                    <div className="dp-empty"><h3>No charts in this response</h3></div>
                  ) : layout === 'exec' ? (
                    <div className="exec-grid">
                      <div className="exec-metrics">
                        {renderCards(activeEntry.results_data.filter(c => c.size === 'small' || c.size === 'mini' || c.type === 'metric'))}
                      </div>
                      <div className="exec-charts">
                        {renderCards(activeEntry.results_data.filter(c => c.size !== 'small' && c.size !== 'mini' && c.type !== 'metric'))}
                      </div>
                    </div>
                  ) : layout === 'hub' ? (
                    <div className="hub-grid">
                      <div className="hub-main">
                        {renderCards(activeEntry.results_data.filter(c => (c.size === 'wide' || c.size === 'full') && c.type !== 'metric').slice(0, 1))}
                      </div>
                      <div className="hub-side">
                        {renderCards(activeEntry.results_data.filter((c, i) => (c.size !== 'wide' && c.size !== 'full') || i > 0))}
                      </div>
                    </div>
                  ) : layout === 'split' ? (
                    <div className="split-grid">
                      {renderCards(activeEntry.results_data.slice(0, 2))}
                    </div>
                  ) : layout === 'magazine' ? (
                    <div className="magazine-grid">
                      {renderCards(activeEntry.results_data)}
                    </div>
                  ) : layout === 'presentation' ? (
                    <div className="presentation-grid">
                      {renderCards(activeEntry.results_data)}
                    </div>
                  ) : layout === 'poster' ? (
                    <div ref={posterRef} className={`poster-canvas poster-theme-${posterTheme}${infographicTemplate ? ` infographic-tpl-${infographicTemplate}` : ''}`}>
                      {renderCards(activeEntry.results_data)}
                    </div>
                  ) : (
                    /* Default: grid / masonry / single — supports drag-and-drop */
                    <DraggableCardsGrid
                      cards={activeEntry.results_data}
                      layout={layout}
                      editMode={editMode}
                      font={font.value}
                      colors={activeColors}
                      posterTheme={posterTheme}
                      globalFilters={globalFilters}
                      dragEnabled={dragEnabled}
                      onUpdate={handleUpdateCard}
                      onDrillDown={(card, dim, val) => handleDrillDown(card, dim, val)}
                      onReorder={handleReorder}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
