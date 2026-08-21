import { useState, useEffect, useRef, useCallback, Component } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import type { ReactNode, CSSProperties } from 'react';
import {
  LayoutDashboard, X, Send, AlertCircle, Loader2, ArrowLeft,
  Eye, EyeOff, Zap, Sparkles, Upload, LayoutGrid, LayoutList, Square,
  Palette, LayoutTemplate, Columns, MousePointer2, Move, Download, Plus, Filter,
  Brain, ChevronRight, Wand2, Bot, RefreshCw, FileDown, Check,
  Library, Trash2, PlusCircle, BarChart2 as BarChartIcon, Users, AlertTriangle,
  FileText, Newspaper, Image as ImageIcon, Compass, Drama, MoreHorizontal, ShieldCheck,
  Undo2, Redo2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createDocumentFromThread } from '../hooks/useDocuments';
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
const logo = '/app-icon.png';
import type { Project, DashboardCard, HistoryEntry, UploadedFile, Entity360Payload } from '../App';
import { Entity360View } from './Entity360View';
import { BASE, THEMES, FONTS, PALETTES, TEMPLATES } from './constants';
import { ProjectLogo, ProjectLogoTile } from './projectLogos';
import { toast, confirmDialog, Modal, Button } from './ui';
import { TimeframeChip, DEFAULT_TIMEFRAME } from './TimeframeChip';
import type { TimeRangeValue } from './TimeframeChip';
import { ThemeChip, DEFAULT_THEME } from './ThemeChip';
import type { ThemeId } from './ThemeChip';
import { getBrandPaletteColors } from '../utils/brandPalette';
import { InsightCard } from './InsightCard';
import { ShareProjectModal } from './ShareProjectModal';
import { ProjectDataModelModal } from './ProjectDataModelModal';
import { DataQualityModal } from './DataQualityModal';
import ExportModal from './ExportModal';
import { CreditsWarningBanner } from './CreditsPanel';
import { RichInfographicViewer } from './RichInfographicViewer';
import { ReportViewer, type ReportData } from './ReportViewer';

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
  onDrill?: (card: DashboardCard, path: (string | number)[]) => Promise<any>;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDelete: (card: DashboardCard) => void;
  onSave: (card: DashboardCard) => void;
}

function DraggableCardsGrid({ cards, layout, editMode, font, colors, posterTheme, globalFilters, dragEnabled, onUpdate, onDrillDown, onDrill, onReorder, onDelete, onSave }: DraggableCardsGridProps) {
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
          <div className={`metrics-strip cols-${Math.min(metricCards.length, 4)}`}>
            {metricCards.map((card, i) => (
              <ChartErrorBoundary key={i} title={card.title}>
                <InsightCard index={i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} drillFetch={onDrill ? (path) => onDrill(card, path) : undefined} globalFilters={globalFilters} onDelete={() => onDelete(card)} onSave={() => onSave(card)}/>
              </ChartErrorBoundary>
            ))}
          </div>
        )}
        {chartCards.length > 0 && (
          <div className="charts-strip">
            {chartCards.map((card, i) => (
              <ChartErrorBoundary key={i} title={card.title}>
                <InsightCard index={metricCards.length + i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} drillFetch={onDrill ? (path) => onDrill(card, path) : undefined} globalFilters={globalFilters} onDelete={() => onDelete(card)} onSave={() => onSave(card)}/>
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
        <div className={`metrics-strip cols-${Math.min(metricCards.length, 4)}`}>
          {metricCards.map((card, i) => (
            <ChartErrorBoundary key={i} title={card.title}>
              <InsightCard index={i} card={card} layout={layout} editMode={editMode} font={font} colors={colors} posterTheme={posterTheme} onUpdate={(u) => onUpdate(card, u)} onDrillDown={(dim, val) => onDrillDown(card, dim, val)} drillFetch={onDrill ? (path) => onDrill(card, path) : undefined} globalFilters={globalFilters} onDelete={() => onDelete(card)} onSave={() => onSave(card)} />
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
                  drillFetch={onDrill ? (path) => onDrill(card, path) : undefined}
                  globalFilters={globalFilters}
                  onDelete={() => onDelete(card)}
                  onSave={() => onSave(card)}
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
function SortableGridCard({ id, card, index, layout, editMode, font, colors, posterTheme, onUpdate, onDrillDown, drillFetch, globalFilters, onDelete, onSave }: {
  id: string; card: DashboardCard; index: number; layout: LayoutMode; editMode: boolean;
  font: string; colors: string[]; posterTheme: string;
  onUpdate: (u: Partial<DashboardCard>) => void;
  onDrillDown: (dim: string, val: string | number) => void;
  drillFetch?: (path: (string | number)[]) => Promise<any>;
  globalFilters: Record<string, string | number | null>;
  onDelete: () => void;
  onSave: () => void;
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
          onDrillDown={onDrillDown} drillFetch={drillFetch} globalFilters={globalFilters}
          onDelete={onDelete} onSave={onSave}
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

// ─── Skeleton loading cards ───────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-metrics-row">
        {[0,1,2,3].map(i => (
          <div key={i} className="skeleton-card skeleton-metric">
            <div className="skeleton-line" style={{ width: '45%', height: 10, marginBottom: 10 }} />
            <div className="skeleton-line" style={{ width: '70%', height: 28 }} />
          </div>
        ))}
      </div>
      <div className="skeleton-charts-row">
        <div className="skeleton-card skeleton-chart-lg">
          <div className="skeleton-line" style={{ width: '35%', height: 12, marginBottom: 16 }} />
          <div className="skeleton-bars">
            {[55, 80, 45, 90, 65, 75, 50, 85].map((h, i) => (
              <div key={i} className="skeleton-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="skeleton-card skeleton-chart-sm">
          <div className="skeleton-line" style={{ width: '40%', height: 12, marginBottom: 16 }} />
          <div className="skeleton-pie">
            <div className="skeleton-circle" />
          </div>
        </div>
      </div>
      <div className="skeleton-charts-row">
        <div className="skeleton-card skeleton-chart-sm">
          <div className="skeleton-line" style={{ width: '50%', height: 12, marginBottom: 16 }} />
          <div className="skeleton-bars">
            {[60, 75, 55, 85, 70].map((h, i) => (
              <div key={i} className="skeleton-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="skeleton-card skeleton-chart-lg">
          <div className="skeleton-line" style={{ width: '30%', height: 12, marginBottom: 16 }} />
          <div className="skeleton-line-chart">
            <svg width="100%" height="80" viewBox="0 0 200 80" preserveAspectRatio="none">
              <polyline points="0,70 25,45 50,55 75,30 100,40 125,20 150,35 175,15 200,25" fill="none" stroke="var(--skeleton-shimmer,#e2e8f0)" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export all charts as individual CSV files (downloads them sequentially)
function exportAllChartsCSV(cards: any[], projectName: string) {
  const slug = (projectName || 'dashboard').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  cards.forEach((card, i) => {
    if (!card.data?.length) return;
    const cols = Object.keys(card.data[0]);
    const header = cols.join(',');
    const rows = card.data.map((row: any) =>
      cols.map((c: string) => {
        const v = row[c];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = (card.title || `chart_${i+1}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${slug}_${title}.csv`;
    setTimeout(() => { a.click(); URL.revokeObjectURL(url); }, i * 120);
  });
}

// ─── Workspace Agent Picker ───────────────────────────────────────────────────

const QUICK_AGENTS = [
  { id: 'customer-segmentation', name: 'Customer Segmentation', emoji: '🧩', color: '#ec4899', category: 'Marketing' },
  { id: 'cohort-analysis',       name: 'Cohort Analysis',       emoji: '🌊', color: '#8b5cf6', category: 'Marketing' },
  { id: 'financial-statement',   name: 'Financial Statement',   emoji: '📉', color: '#3b82f6', category: 'Finance'   },
  { id: 'cash-flow',             name: 'Cash Flow',             emoji: '🌊', color: '#06b6d4', category: 'Finance'   },
  { id: 'churn-analysis',        name: 'Churn Analysis',        emoji: '🩸', color: '#ef4444', category: 'Product'   },
  { id: 'feature-adoption',      name: 'Feature Adoption',      emoji: '🌱', color: '#a855f7', category: 'Product'   },
  { id: 'trend-analysis',        name: 'Trend Analysis',        emoji: '🔭', color: '#6366f1', category: 'Data'      },
  { id: 'data-quality',          name: 'Data Quality',          emoji: '🔬', color: '#f59e0b', category: 'Data'      },
  { id: 'sales-forecasting',     name: 'Sales Forecasting',     emoji: '📡', color: '#a855f7', category: 'RevOps'    },
  { id: 'pipeline-health',       name: 'Pipeline Health',       emoji: '🩺', color: '#14b8a6', category: 'RevOps'    },
  { id: 'win-loss-analysis',     name: 'Win/Loss Analysis',     emoji: '🏅', color: '#f59e0b', category: 'RevOps'    },
  { id: 'rep-productivity',      name: 'Rep Productivity',      emoji: '🥇', color: '#6366f1', category: 'RevOps'    },
];

function WorkspaceAgentPicker({
  anchorRef,
  selected,
  onToggle,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  selected: { id: string; name: string; emoji: string; color: string }[];
  onToggle: (a: { id: string; name: string; emoji: string; color: string }) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const selectedIds = new Set(selected.map(a => a.id));

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left });
    }
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.ws-agent-picker')) onClose();
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [onClose, anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      className="ws-agent-picker"
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
    >
      <div className="ws-agent-picker-header">
        Analysis Focus
        {selected.length > 0 && <span className="ws-agent-picker-count">{selected.length} selected</span>}
      </div>
      <div className="ws-agent-picker-list">
        {QUICK_AGENTS.map(a => {
          const isSelected = selectedIds.has(a.id);
          return (
            <button
              key={a.id}
              className={`ws-agent-picker-item${isSelected ? ' selected' : ''}`}
              style={isSelected ? { background: a.color + '12' } : {}}
              onClick={() => onToggle(a)}
            >
              <span className="ws-agent-picker-emoji">{a.emoji}</span>
              <div style={{ flex: 1 }}>
                <div className="ws-agent-picker-name">{a.name}</div>
                <div className="ws-agent-picker-cat" style={{ color: a.color }}>{a.category}</div>
              </div>
              {isSelected && (
                <div className="ws-agent-picker-check" style={{ color: a.color }}>
                  <Check size={13} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="ws-agent-picker-footer">
          <button className="ws-agent-picker-clear" onClick={() => { selected.forEach(a => onToggle(a)); }}>
            Clear all
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Infographic Editor ───────────────────────────────────────────────────────

const IG_ACCENT_COLORS = [
  { color: '#6366f1', name: 'Indigo' },
  { color: '#0ea5e9', name: 'Sky' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#ef4444', name: 'Rose' },
  { color: '#8b5cf6', name: 'Violet' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#14b8a6', name: 'Teal' },
];

const IG_HERO_STYLES: { name: string; css: (a: string) => string }[] = [
  { name: 'Space',   css: a => `linear-gradient(135deg, #0f0c29 0%, #302b63 60%, ${a} 100%)` },
  { name: 'Slate',   css: a => `linear-gradient(135deg, #0f172a 0%, #1e293b 60%, ${a} 100%)` },
  { name: 'Ocean',   css: a => `linear-gradient(135deg, #0c1445 0%, #1a3a6b 60%, ${a} 100%)` },
  { name: 'Forest',  css: a => `linear-gradient(135deg, #052e16 0%, #14532d 60%, ${a} 100%)` },
  { name: 'Sunset',  css: a => `linear-gradient(135deg, #1a0533 0%, #6b1a3a 60%, ${a} 100%)` },
  { name: 'Minimal', css: a => `linear-gradient(135deg, ${a}22 0%, ${a}44 100%)` },
];

type IgSection = {
  id: string;
  type: 'metric_row' | 'bar_chart' | 'line_chart' | 'table' | 'insight' | 'text' | 'image'
      | 'highlight_number' | 'stat_comparison' | 'key_takeaways' | 'data_story' | 'progress_bar';
  title: string;
  metrics?: { label: string; value: string; raw: any }[];
  data?: { label: string; value: number }[] | { x: string; y: number }[];
  value_label?: string;
  y_label?: string;
  headers?: string[];
  rows?: string[][];
  text?: string;
  style?: 'default' | 'quote' | 'callout';
  url?: string;
  caption?: string;
  // highlight_number
  value?: string;
  raw?: number;
  context?: string;
  // stat_comparison
  value_a?: string;
  value_b?: string;
  label_a?: string;
  label_b?: string;
  change_pct?: number;
  // key_takeaways
  bullets?: string[];
  // progress_bar
  current?: number;
  target?: number;
  pct?: number;
  current_fmt?: string;
  target_fmt?: string;
  unit?: string;
};

// ─── Section renderers ────────────────────────────────────────────────────────

function IgMetricRow({ section, accent }: { section: IgSection; accent: string }) {
  return (
    <div className="ig-metric-row">
      {(section.metrics || []).map((m, i) => (
        <div key={i} className="ig-metric-card" style={{ borderTopColor: accent }}>
          <div className="ig-metric-value" style={{ color: accent }}>{m.value}</div>
          <div className="ig-metric-label">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

function IgBarChart({ section, accent }: { section: IgSection; accent: string }) {
  const data = (section.data || []) as { label: string; value: number }[];
  const isHorizontal = data.length > 5;
  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)} debounce={1}>
        <BarChart data={data.map(d => ({ name: d.label, value: d.value }))} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), section.value_label || 'Value']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }} />
          <Bar dataKey="value" fill={accent} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220} debounce={1}>
      <BarChart data={data.map(d => ({ name: d.label, value: d.value }))} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} angle={data.length > 4 ? -30 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), section.value_label || 'Value']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }} />
        <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IgLineChart({ section, accent }: { section: IgSection; accent: string }) {
  const data = (section.data || []) as { x: string; y: number }[];
  return (
    <ResponsiveContainer width="100%" height={220} debounce={1}>
      <AreaChart data={data.map(d => ({ name: d.x, value: d.y }))} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
        <defs>
          <linearGradient id={`igGrad-${section.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.2} />
            <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), section.y_label || 'Value']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }} />
        <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} fill={`url(#igGrad-${section.id})`} dot={{ fill: accent, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function IgTable({ section }: { section: IgSection }) {
  return (
    <div className="ig-table-wrap">
      <table className="ig-table">
        <thead>
          <tr>{(section.headers || []).map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(section.rows || []).map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Text & Image section renderers ──────────────────────────────────────────

function IgTextSection({ section, accent, onChange }: { section: IgSection; accent: string; onChange: (val: string) => void }) {
  if (section.style === 'quote') {
    return (
      <div className="ig-quote-block" style={{ borderLeftColor: accent }}>
        <textarea className="ig-quote-textarea" value={section.text || ''} onChange={e => onChange(e.target.value)} placeholder="Enter quote or highlight text…" rows={3} />
      </div>
    );
  }
  if (section.style === 'callout') {
    return (
      <div className="ig-callout-block" style={{ background: accent + '12', borderColor: accent + '40' }}>
        <span className="ig-callout-icon" style={{ color: accent }}>💡</span>
        <textarea className="ig-callout-textarea" value={section.text || ''} onChange={e => onChange(e.target.value)} placeholder="Enter callout text…" rows={2} style={{ color: accent === '#f59e0b' ? '#92400e' : undefined }} />
      </div>
    );
  }
  return (
    <textarea className="ig-text-textarea" value={section.text || ''} onChange={e => onChange(e.target.value)} placeholder="Enter paragraph text…" rows={4} />
  );
}

function IgImageSection({ section, onCaptionChange, onUpload }: {
  section: IgSection;
  onCaptionChange: (val: string) => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="ig-image-section">
      {section.url ? (
        <>
          <div className="ig-image-wrap" onClick={() => fileRef.current?.click()} title="Click to replace image">
            <img src={section.url} alt={section.caption || section.title} className="ig-image" />
            <div className="ig-image-overlay"><Upload size={18}/><span>Replace</span></div>
          </div>
          <input
            className="ig-image-caption"
            value={section.caption || ''}
            onChange={e => onCaptionChange(e.target.value)}
            placeholder="Add a caption…"
          />
        </>
      ) : (
        <div className="ig-image-placeholder" onClick={() => fileRef.current?.click()}>
          <Upload size={28} />
          <p>Click to upload image</p>
          <span>PNG, JPG, GIF up to 10MB</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </div>
  );
}

// ─── New poster-grade section renderers ──────────────────────────────────────

function IgHighlightNumber({ section, accent }: { section: IgSection; accent: string }) {
  return (
    <div className="ig-highlight-number">
      <div className="ig-highlight-value" style={{ color: accent }}>{section.value}</div>
      {section.context && <div className="ig-highlight-context">{section.context}</div>}
    </div>
  );
}

function IgStatComparison({ section, accent }: { section: IgSection; accent: string }) {
  const isPositive = (section.change_pct ?? 0) >= 0;
  return (
    <div className="ig-stat-comparison">
      <div className="ig-stat-pair">
        <div className="ig-stat-box ig-stat-box--a" style={{ borderColor: accent }}>
          <div className="ig-stat-box-value" style={{ color: accent }}>{section.value_a}</div>
          <div className="ig-stat-box-label">{section.label_a}</div>
        </div>
        <div className="ig-stat-arrow">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14h16m0 0l-5-5m5 5l-5 5" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="ig-stat-box ig-stat-box--b" style={{ borderColor: accent + '60' }}>
          <div className="ig-stat-box-value">{section.value_b}</div>
          <div className="ig-stat-box-label">{section.label_b}</div>
        </div>
      </div>
      {section.change_pct !== undefined && (
        <div className={`ig-stat-change ${isPositive ? 'positive' : 'negative'}`}>
          <span>{isPositive ? '↑' : '↓'} {Math.abs(section.change_pct)}% change</span>
        </div>
      )}
    </div>
  );
}

function IgKeyTakeaways({ section, accent }: { section: IgSection; accent: string }) {
  return (
    <div className="ig-key-takeaways">
      {(section.bullets || []).map((b, i) => (
        <div key={i} className="ig-takeaway-item">
          <div className="ig-takeaway-num" style={{ background: accent }}>{i + 1}</div>
          <p className="ig-takeaway-text">{b}</p>
        </div>
      ))}
    </div>
  );
}

function IgDataStory({ section, accent }: { section: IgSection; accent: string }) {
  return (
    <div className="ig-data-story">
      <div className="ig-data-story-bar" style={{ background: accent }} />
      <p className="ig-data-story-text">{section.text}</p>
    </div>
  );
}

function IgProgressBar({ section, accent }: { section: IgSection; accent: string }) {
  const pct = Math.min(section.pct ?? 0, 100);
  return (
    <div className="ig-progress-section">
      <div className="ig-progress-header">
        <span className="ig-progress-current" style={{ color: accent }}>
          {section.unit}{section.current_fmt}
        </span>
        <span className="ig-progress-target">of {section.unit}{section.target_fmt}</span>
      </div>
      <div className="ig-progress-track">
        <div className="ig-progress-fill" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <div className="ig-progress-pct">{pct.toFixed(0)}% complete</div>
    </div>
  );
}

// ─── Sortable section card ────────────────────────────────────────────────────

function IgSectionCard({
  section, accent, onUpdate, onDelete,
}: {
  section: IgSection;
  accent: string;
  onUpdate: (id: string, patch: Partial<IgSection>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isWide = ['metric_row', 'table', 'image', 'text', 'key_takeaways', 'data_story', 'stat_comparison'].includes(section.type);

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await axios.post(`${BASE}/upload/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdate(section.id, { url: r.data.url });
    } catch { /* ignore */ } finally { setUploading(false); }
  };

  return (
    <div ref={setNodeRef} style={style} className={`ig-section-card${isWide ? ' ig-section-card--wide' : ''}`}>
      <div className="ig-section-drag" {...attributes} {...listeners}><Move size={13} /></div>
      <div className="ig-section-body">
        {/* Title row */}
        <div className="ig-section-header">
          {section.type !== 'metric_row' && (
            <input
              className="ig-section-title"
              value={section.title}
              onChange={e => onUpdate(section.id, { title: e.target.value })}
              style={{ '--ig-accent': accent } as any}
            />
          )}
          <button className="ig-section-delete" onClick={() => onDelete(section.id)} title="Remove section"><X size={12}/></button>
        </div>

        {/* Content */}
        {section.type === 'metric_row'       && <IgMetricRow section={section} accent={accent} />}
        {section.type === 'bar_chart'        && <IgBarChart section={section} accent={accent} />}
        {section.type === 'line_chart'       && <IgLineChart section={section} accent={accent} />}
        {section.type === 'table'            && <IgTable section={section} />}
        {section.type === 'highlight_number' && <IgHighlightNumber section={section} accent={accent} />}
        {section.type === 'stat_comparison'  && <IgStatComparison section={section} accent={accent} />}
        {section.type === 'key_takeaways'    && <IgKeyTakeaways section={section} accent={accent} />}
        {section.type === 'data_story'       && <IgDataStory section={section} accent={accent} />}
        {section.type === 'progress_bar'     && <IgProgressBar section={section} accent={accent} />}
        {section.type === 'insight'          && (
          <textarea className="ig-insight-textarea" value={section.text || ''} onChange={e => onUpdate(section.id, { text: e.target.value })} rows={3} style={{ borderLeftColor: accent }} />
        )}
        {section.type === 'text' && (
          <IgTextSection section={section} accent={accent} onChange={val => onUpdate(section.id, { text: val })} />
        )}
        {section.type === 'image' && (
          uploading
            ? <div className="ig-image-uploading"><Loader2 size={22} className="spin"/> Uploading…</div>
            : <IgImageSection section={section} onCaptionChange={val => onUpdate(section.id, { caption: val })} onUpload={handleImageUpload} />
        )}
      </div>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function IgToolbar({ accent, heroStyleIdx, onAccent, onHeroStyle, onAdd }: {
  accent: string;
  heroStyleIdx: number;
  onAccent: (c: string) => void;
  onHeroStyle: (i: number) => void;
  onAdd: (type: IgSection['type'], style?: IgSection['style']) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [, setThemeOpen] = useState(false);

  return (
    <div className="ig-toolbar">
      {/* Add section */}
      <div className="ig-toolbar-group" style={{ position: 'relative' }}>
        <button className="ig-tb-btn ig-tb-btn--primary" onClick={() => { setAddOpen(p => !p); setThemeOpen(false); }}>
          <Plus size={14}/> Add Section
        </button>
        {addOpen && (
          <div className="ig-dropdown" onMouseLeave={() => setAddOpen(false)}>
            <div className="ig-dropdown-section-label">Narrative</div>
            <button className="ig-dropdown-item" onClick={() => { onAdd('insight'); setAddOpen(false); }}>
              <Sparkles size={14}/> Key Insight
            </button>
            <button className="ig-dropdown-item" onClick={() => { onAdd('data_story'); setAddOpen(false); }}>
              <LayoutList size={14}/> Data Story
            </button>
            <button className="ig-dropdown-item" onClick={() => { onAdd('key_takeaways'); setAddOpen(false); }}>
              <Check size={14}/> Key Takeaways
            </button>
            <button className="ig-dropdown-item" onClick={() => { onAdd('text', 'quote'); setAddOpen(false); }}>
              <span className="ig-dropdown-icon">"</span> Pull Quote
            </button>
            <button className="ig-dropdown-item" onClick={() => { onAdd('text', 'callout'); setAddOpen(false); }}>
              <Zap size={14}/> Callout Box
            </button>
            <button className="ig-dropdown-item" onClick={() => { onAdd('text', 'default'); setAddOpen(false); }}>
              <LayoutList size={14}/> Text Block
            </button>
            <div className="ig-dropdown-section-label">Media</div>
            <button className="ig-dropdown-item" onClick={() => { onAdd('image'); setAddOpen(false); }}>
              <Upload size={14}/> Image
            </button>
          </div>
        )}
      </div>

      <div className="ig-toolbar-divider"/>

      {/* Accent color */}
      <div className="ig-toolbar-group">
        <span className="ig-tb-label">Color</span>
        <div className="ig-color-swatches">
          {IG_ACCENT_COLORS.map(({ color, name }) => (
            <button
              key={color}
              className={`ig-swatch${accent === color ? ' ig-swatch--active' : ''}`}
              style={{ background: color }}
              title={name}
              onClick={() => onAccent(color)}
            />
          ))}
        </div>
      </div>

      <div className="ig-toolbar-divider"/>

      {/* Hero style */}
      <div className="ig-toolbar-group" style={{ position: 'relative' }}>
        <span className="ig-tb-label">Background</span>
        <div className="ig-hero-style-pills">
          {IG_HERO_STYLES.map((s, i) => (
            <button
              key={s.name}
              className={`ig-style-pill${heroStyleIdx === i ? ' ig-style-pill--active' : ''}`}
              onClick={() => onHeroStyle(i)}
              style={heroStyleIdx === i ? { background: accent, color: '#fff', borderColor: accent } : {}}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Infographic Editor ─────────────────────────────────────────────────

function InfographicEditor({ entry, projectColor }: { entry: any; projectColor: string }) {
  const data = entry.infographic_data;

  const [headerTitle, setHeaderTitle] = useState(data?.title || entry.query || '');
  const [sections, setSections] = useState<IgSection[]>(data?.sections || []);
  const [accent, setAccent] = useState<string>(data?.accent || projectColor || '#6366f1');
  const [heroStyleIdx, setHeroStyleIdx] = useState<number>(data?.hero_style_idx || 0);

  // Skip persistence until the current entry has hydrated, so switching entries
  // (which resets all state below) doesn't immediately overwrite the server.
  const skipSaveRef = useRef(true);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setHeaderTitle(data?.title || entry.query || '');
    setSections(data?.sections || []);
    setAccent(data?.accent || projectColor || '#6366f1');
    setHeroStyleIdx(data?.hero_style_idx || 0);
    skipSaveRef.current = true;
  }, [entry.id]);

  // Debounced autosave — persist local edits back to the entry's infographic_data
  // so they survive a thread switch or reload (previously lost, all state was local).
  useEffect(() => {
    if (!data) return;
    if (skipSaveRef.current) { skipSaveRef.current = false; return; }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const payload = { ...data, title: headerTitle, accent, sections, hero_style_idx: heroStyleIdx };
      axios.patch(`${BASE}/history/`, { id: entry.id, infographic_data: payload })
        .then(() => { entry.infographic_data = payload; })
        .catch(() => {/* non-blocking; edits stay in local state */});
    }, 1000);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [headerTitle, sections, accent, heroStyleIdx]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(prev => arrayMove(prev, prev.findIndex(s => s.id === active.id), prev.findIndex(s => s.id === over.id)));
    }
  };

  const handleAdd = (type: IgSection['type'], style?: IgSection['style']) => {
    const id = `user-${Date.now()}`;
    const defaults: Record<string, Partial<IgSection>> = {
      insight: { title: 'Key Insight', text: '' },
      text: { title: 'Text Block', text: '', style: style || 'default' },
      image: { title: 'Image', url: '', caption: '' },
      data_story: { title: 'Data Story', text: 'Write your data narrative here...' },
      key_takeaways: { title: 'Key Takeaways', bullets: ['First takeaway', 'Second takeaway', 'Third takeaway'] },
    };
    setSections(prev => [...prev, { id, type, title: '', ...defaults[type] } as IgSection]);
  };

  const handleUpdate = (id: string, patch: Partial<IgSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const handleDelete = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const heroBg = IG_HERO_STYLES[heroStyleIdx].css(accent);

  if (!data) return <div className="ig-empty-state">Infographic data unavailable. Please regenerate.</div>;

  return (
    <div className="ig-editor">
      {/* Hero */}
      <div className="ig-hero" style={{ background: heroBg }}>
        <input className="ig-hero-title" value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} placeholder="Infographic title…" />
        <p className="ig-hero-sub">{data.project_name}</p>
      </div>

      {/* Toolbar */}
      <IgToolbar
        accent={accent}
        heroStyleIdx={heroStyleIdx}
        onAccent={setAccent}
        onHeroStyle={setHeroStyleIdx}
        onAdd={handleAdd}
      />

      {/* Canvas */}
      <div className="ig-canvas">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={rectSortingStrategy}>
            <div className="ig-sections-grid">
              {sections.map(s => (
                <IgSectionCard
                  key={s.id}
                  section={s}
                  accent={accent}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {sections.length === 0 && (
          <div className="ig-canvas-empty">
            <Sparkles size={32} style={{ color: accent, opacity: 0.4 }}/>
            <p>No sections yet — use the toolbar to add content</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Workspace({ project, onBack, initialThreadId, brandPalette, currentUser, onProjectUpdate, onNewThread, datasources }: {
  project: Project;
  onBack: () => void;
  initialThreadId?: number;
  brandPalette?: string[];
  currentUser?: any;
  onProjectUpdate?: (p: Project) => void;
  onNewThread?: (threadId: number) => void;
  /** Full datasource list for the Data Sources picker in Project Data Model modal. */
  datasources?: import('../App').Datasource[];
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(initialThreadId || null);
  const [threadType, setThreadType] = useState<'dashboard' | 'infographic' | 'report' | 'newsletter' | 'cartoon' | 'image_infographic' | 'entity360' | null>(null);
  const [pendingThreadType, setPendingThreadType] = useState<'dashboard' | 'infographic' | 'report' | 'newsletter' | 'cartoon' | 'image_infographic' | 'entity360' | null>(null);
  const [igStyle, setIgStyle] = useState<string>('executive');
  // Infographic timeframe — defaults to last 90 days so a user can press
  // Send and get something sensible without touching the chip. Persists
  // across the thread until they change it.
  const [igTimeframe, setIgTimeframe] = useState<TimeRangeValue>(DEFAULT_TIMEFRAME);
  // Infographic visual theme — defaults to 'brand' (uses the user's Brand
  // Kit colors/fonts when set, otherwise falls back server-side to editorial).
  const [igTheme, setIgTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [reportLength, setReportLength] = useState<'brief' | 'standard' | 'deep'>('standard');
  const [activeReport, setActiveReport] = useState<ReportData | null>(null);
  // Entity 360 — holds a disambiguation / not-found / error payload that isn't
  // persisted as a thread step (the 'ok' result renders from activeEntry).
  const [entity360Pending, setEntity360Pending] = useState<Entity360Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [isQueryEmpty, setIsQueryEmpty] = useState(true);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  // ── Zustand store — cards, layout, filters, edit/drag mode, undo/redo ──
  const {
    cards: storeCards, setCards,
    updateCard: storeUpdateCard, deleteCard: storeDeleteCard, reorderCards: storeReorderCards,
    layout, setLayout,
    editMode, setEditMode,
    dragEnabled, setDragEnabled,
    globalFilters, setGlobalFilter, clearGlobalFilters,
    dashboardFilters, setDashboardFilters,
    timeframeFilter, setTimeframeFilter,
    canUndo, canRedo, undo, redo,
  } = useDashboardStore();

  const [theme, setTheme] = useState(THEMES[0]);
  const [font, setFont] = useState(FONTS[0]);
  const [palette, setPalette] = useState(project.palette || 'vibrant');
  // Dashboard density — scales chart card padding + spacing. Persisted per
  // user across sessions; default 'default' so existing users see no change.
  type Density = 'compact' | 'default' | 'comfortable';
  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'default';
    const v = window.localStorage.getItem('workspace-density');
    return (v === 'compact' || v === 'comfortable' || v === 'default') ? v : 'default';
  });
  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try { window.localStorage.setItem('workspace-density', d); } catch {}
  }, []);
  const [layoutMode, setLayoutMode] = useState<'dashboard' | 'infographic'>('dashboard');
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'themes' | 'layouts' | 'library' | null>(null);
  const [libraryInsights, setLibraryInsights] = useState<{ id: number; card_data: any; saved_at: string }[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [posterTheme, setPosterTheme] = useState<'light' | 'dark' | 'branded' | 'newspaper'>('light');
  const [infographicTemplate] = useState<string | null>(null);
  const [activeAgents, setActiveAgents] = useState<{ id: string; name: string; emoji: string; color: string }[]>([]);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // HITL state
  const [pendingHITL, setPendingHITL] = useState<HITLRequest | null>(null);
  const [hitlResponses, setHitlResponses] = useState<Record<string, any>>({});
  // Persisted across queries so the same analytics questions aren't re-asked
  const persistedHitlResponses = useRef<Record<string, any>>({});
  const [hitlQueryRef, setHitlQueryRef] = useState<string>('');
  // Drag-and-drop + layout optimizer
  const [layoutOptimizing, setLayoutOptimizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const dashboardContentRef = useRef<HTMLDivElement>(null);
  const agentBtnRef = useRef<HTMLButtonElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [showDataModel, setShowDataModel] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [showToolMenu, setShowToolMenu] = useState(false);
  useEffect(() => {
    if (!showToolMenu) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.dp-more-wrap')) setShowToolMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showToolMenu]);
  const navigate = useNavigate();
  const [creditsWarning, setCreditsWarning] = useState<'near_limit' | 'at_limit' | null>(null);
  // Track previous thread so we only clear filters when SWITCHING threads,
  // not when a brand-new thread ID is first assigned (which would wipe filters
  // that were just returned in the same query response).
  const prevThreadIdRef = useRef<number | null>(initialThreadId || null);
  // Tracks the last entry id we synced into the store — avoids circular updates
  const lastSyncedEntryIdRef = useRef<number | null>(null);

  // ── Hydrate store when a new entry is loaded ─────────────────────────────────
  useEffect(() => {
    if (!activeEntry) { setCards([], undefined); lastSyncedEntryIdRef.current = null; return; }
    if (activeEntry.id === lastSyncedEntryIdRef.current) return; // cards came from store, not a new entry
    lastSyncedEntryIdRef.current = activeEntry.id;
    setCards(activeEntry.results_data ?? []);
  }, [activeEntry?.id, activeEntry?.results_data, setCards]);

  // ── Sync store cards back → activeEntry (for the persistence debounce) ────────
  useEffect(() => {
    if (!activeEntry || lastSyncedEntryIdRef.current !== activeEntry.id) return;
    // Only update if actually different (avoids infinite loop)
    if (storeCards === activeEntry.results_data) return;
    setActiveEntry(prev => prev ? { ...prev, results_data: storeCards } : prev);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeCards]);

  // ── Keyboard undo / redo ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't intercept text editing
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const fetchThreadHistory = useCallback(async (tId: number) => {
    try {
      const r = await axios.get(`${BASE}/threads/${tId}/`);
      const threadHistory = r.data.history;
      setHistory(threadHistory);
      setEntity360Pending(null);  // clear any stale disambiguation picker
      if (r.data.thread_type) setThreadType(r.data.thread_type);
      if (threadHistory.length > 0) {
        setActiveEntry(threadHistory[threadHistory.length - 1]);
      }

      // For long-form threads (report / newsletter / cartoon / image_infographic), fetch the latest report
      if (['report', 'newsletter', 'cartoon', 'image_infographic'].includes(r.data.thread_type)) {
        try {
          const reps = await axios.get(`${BASE}/reports/list/?project_id=${project.id}`);
          const matchingReport = (reps.data || []).find((rep: any) => rep.thread_id === tId);
          if (matchingReport) {
            const detail = await axios.get(`${BASE}/reports/${matchingReport.id}/`);
            setActiveReport(detail.data);
          }
        } catch (e) { console.warn('Could not load report/newsletter for thread:', e); }
      } else {
        setActiveReport(null);
      }

      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setError("Failed to load conversation history.");
    }
  }, [project.id]);

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
      // Only clear filters when explicitly switching from one thread to another.
      // Do NOT clear when prevThreadIdRef is null — that means this is the first
      // query creating a brand-new thread, and the filters from that query response
      // are already being set in handleSubmit. Clearing here would wipe them.
      if (prevThreadIdRef.current !== null && prevThreadIdRef.current !== currentThreadId) {
        setDashboardFilters([]);
      }
    } else {
      setHistory([]);
      setActiveEntry(null);
      setDashboardFilters([]);
      setThreadType(null);
      setPendingThreadType(null);
    }
    prevThreadIdRef.current = currentThreadId ?? null;
    clearGlobalFilters();
    setTimeframeFilter(null);
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

  // Persist palette choice back to the project (debounced)
  useEffect(() => {
    if (palette === (project.palette || 'vibrant')) return; // no change
    const timer = setTimeout(() => {
      axios.patch(`${BASE}/projects/${project.id}/`, { palette }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [palette, project.id, project.palette]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading, optimisticPrompt]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      try {
        const fd = new FormData(); fd.append('file', f);
        const r = await axios.post(`${BASE}/upload/`, fd);
        setUploads(prev => [...prev, { ...r.data, preview: URL.createObjectURL(f) }]);
      } catch { toast.error(`Upload failed: ${f.name}`); }
    }
    setUploading(false);
  };

  const handleSubmit = async (promptOverride?: string, hitlResponsesOverride?: Record<string, any>) => {
    const rawQuery = textareaRef.current?.value.trim() ?? '';
    if (!promptOverride && !rawQuery && uploads.length === 0) return;
    const promptText = promptOverride || rawQuery || 'Build dashboard from the uploaded reference images.';
    const imgContexts = uploads.map(u => u.image_context).filter(Boolean);
    const imgUrls = uploads.map(u => u.url);

    // Merge: persisted answers (from past queries) + current query's answers
    const currentHITLResponses = { ...persistedHitlResponses.current, ...(hitlResponsesOverride ?? hitlResponses) };

    setOptimisticPrompt(promptText);
    if (textareaRef.current) { textareaRef.current.value = ''; textareaRef.current.style.height = 'auto'; }
    setIsQueryEmpty(true);
    setLoading(true); setError(''); setUploads([]);

    try {
      const r = await axios.post(`${BASE}/query/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        image_contexts: imgContexts,
        reference_images: imgUrls,
        existing_charts: storeCards,
        hitl_responses: currentHITLResponses,
        specialist_agents: activeAgents.map(a => a.id),
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

      // Clarification needed — show as error bar message
      if (r.data.action === 'clarification_needed') {
        setError(r.data.question || 'Could you please clarify your request?');
        if (!currentThreadId && newThreadId) setCurrentThreadId(newThreadId);
        setOptimisticPrompt(null);
        setLoading(false);
        return;
      }

      // Persist HITL answers so the same questions aren't asked again this session
      if (Object.keys(currentHITLResponses).length > 0) {
        persistedHitlResponses.current = { ...persistedHitlResponses.current, ...currentHITLResponses };
      }
      // Clear per-query HITL state
      setHitlResponses({});
      setPendingHITL(null);
      setHitlQueryRef('');

      // Capture filters now but apply them AFTER fetchThreadHistory to avoid
      // the currentThreadId useEffect wiping them when a new thread is created.
      const incomingFilters = r.data.dashboard_filters;

      // Only apply layout suggestion — palette, theme, and font are user design
      // choices that the AI should not override.
      const suggestedLayout = r.data.suggested_layout;

      if (!currentThreadId && newThreadId) {
        setCurrentThreadId(newThreadId);
        onNewThread?.(newThreadId);
      }

      if (suggestedLayout) {
        setLayout(suggestedLayout as any);
        setLayoutMode(suggestedLayout === 'poster' ? 'infographic' : 'dashboard');
      }

      if (newThreadId) {
        await fetchThreadHistory(newThreadId);
      }

      // Apply filters after fetchThreadHistory so the currentThreadId useEffect
      // (which clears dashboardFilters on thread change) has already fired.
      if (incomingFilters?.length) {
        setDashboardFilters(incomingFilters);
        clearGlobalFilters();
      }

      // Credits warning
      if (r.data.credits_warning) setCreditsWarning(r.data.credits_warning);

      setOptimisticPrompt(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
      setOptimisticPrompt(null);
    } finally { setLoading(false); }
  };

  const handleInfographicSubmit = async (promptOverride?: string) => {
    const promptText = promptOverride || textareaRef.current?.value.trim() || '';
    if (!promptText) return;

    setOptimisticPrompt(promptText);
    if (textareaRef.current) { textareaRef.current.value = ''; textareaRef.current.style.height = 'auto'; }
    setIsQueryEmpty(true);
    setLoading(true); setError('');
    if (!threadType) setThreadType('infographic');

    try {
      const r = await axios.post(`${BASE}/infographic/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        style: igStyle,
        time_range: igTimeframe,
        theme_id: igTheme,
      });
      // Pick up the resolved theme — backend may have inferred a different
      // theme from a prompt like "make it darker" or fallen back to
      // 'editorial' when the user has no Brand Kit yet. Reflect that
      // server decision in the chip so the user sees what they've got.
      if (r.data.theme_id && r.data.theme_id !== igTheme) {
        setIgTheme(r.data.theme_id as ThemeId);
      }

      const newThreadId = r.data.thread_id;
      if (!currentThreadId && newThreadId) {
        setCurrentThreadId(newThreadId);
        // Notify parent so Sidebar refreshes its thread list
        onNewThread?.(newThreadId);
      }

      // Fetch the full thread history from the backend (mirrors handleSubmit flow).
      // This ensures the entry is properly loaded with all persisted fields.
      if (newThreadId) {
        await fetchThreadHistory(newThreadId);
      }

      if (r.data.credits_warning) setCreditsWarning(r.data.credits_warning);
      setOptimisticPrompt(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Infographic generation failed. Please try again.');
      setOptimisticPrompt(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Entity 360 submit ───────────────────────────────────────────────────
  const handleEntity360Submit = async (promptOverride?: string, entityRef?: any) => {
    const promptText = promptOverride ?? (textareaRef.current?.value.trim() || '');
    if (!promptText && !entityRef) return;

    if (promptText) setOptimisticPrompt(promptText);
    if (textareaRef.current) { textareaRef.current.value = ''; textareaRef.current.style.height = 'auto'; }
    setIsQueryEmpty(true);
    setLoading(true); setError('');
    setEntity360Pending(null);
    if (!threadType) setThreadType('entity360');

    try {
      const r = await axios.post(`${BASE}/entity360/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        entity_ref: entityRef,
      }, { timeout: 120000 });

      const newThreadId = r.data.thread_id;
      if (!currentThreadId && newThreadId) {
        setCurrentThreadId(newThreadId);
        onNewThread?.(newThreadId);
      }

      if (r.data.status === 'ok') {
        // Persisted as a step — render it from thread history (activeEntry).
        if (newThreadId) await fetchThreadHistory(newThreadId);
      } else {
        // disambiguation / not_found / error → render inline (no step saved).
        setEntity360Pending(r.data as Entity360Payload);
      }

      if (r.data.credits_warning) setCreditsWarning(r.data.credits_warning);
      setOptimisticPrompt(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not build the 360° view. Please try again.');
      setOptimisticPrompt(null);
    } finally {
      setLoading(false);
    }
  };

  // Re-submit pinned to a specific row chosen from the disambiguation list.
  const handleEntity360Pick = (pkValue: any) => {
    if (!entity360Pending) return;
    handleEntity360Submit('', {
      table: entity360Pending.entity_table,
      pk_column: entity360Pending.pk_column,
      display_column: entity360Pending.display_column,
      entity_type: entity360Pending.entity_type,
      pk_value: pkValue,
    });
  };

  // ── Report / Newsletter submit ──────────────────────────────────────────
  const handleReportSubmit = async (promptOverride?: string, formatOverride?: 'report' | 'newsletter' | 'cartoon' | 'image_infographic') => {
    const promptText = promptOverride || textareaRef.current?.value.trim() || '';
    if (!promptText) return;
    const fmt: 'report' | 'newsletter' | 'cartoon' | 'image_infographic' = formatOverride
      || (['newsletter', 'cartoon', 'image_infographic'].includes(effectiveThreadType as string)
        ? (effectiveThreadType as 'newsletter' | 'cartoon' | 'image_infographic')
        : 'report');

    setOptimisticPrompt(promptText);
    if (textareaRef.current) { textareaRef.current.value = ''; textareaRef.current.style.height = 'auto'; }
    setIsQueryEmpty(true);
    setLoading(true); setError('');
    if (!threadType) setThreadType(fmt);

    try {
      const r = await axios.post(`${BASE}/reports/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        format: fmt,
        length: reportLength,
      }, {
        timeout: 180000,
      });

      const newThreadId = r.data.thread_id;
      if (!currentThreadId && newThreadId) {
        setCurrentThreadId(newThreadId);
        onNewThread?.(newThreadId);
      }

      if (r.data.report) {
        setActiveReport(r.data.report);
      }

      if (r.data.credits_warning) setCreditsWarning(r.data.credits_warning);
      setOptimisticPrompt(null);

      // Generation now runs server-side in the background (HTTP 202). Poll the
      // report until it's ready/errored so the viewer can show live progress
      // without holding the request open for the whole multi-minute pipeline.
      const rid = r.data.report?.id;
      const startStatus = r.data.report?.status;
      if (rid && startStatus !== 'ready' && startStatus !== 'error') {
        for (let i = 0; i < 180; i++) {           // ~6 min at 2s intervals
          await new Promise(res => setTimeout(res, 2000));
          try {
            const pr = await axios.get(`${BASE}/reports/${rid}/`);
            setActiveReport(pr.data);
            if (pr.data.status === 'ready' || pr.data.status === 'error') {
              if (pr.data.status === 'error') {
                setError(pr.data.error || 'Report generation failed. Try simplifying your prompt.');
              }
              break;
            }
          } catch { /* transient poll failure — keep trying */ }
        }
      }

      if (newThreadId) {
        await fetchThreadHistory(newThreadId);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Report generation failed. Try simplifying your prompt.');
      setOptimisticPrompt(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!activeEntry) return;
    try {
      const r = await axios.post(`${BASE}/deploy/`, { dashboard_id: activeEntry.id });
      const publicUrl = window.location.origin + r.data.url;
      setDeployedUrl(publicUrl);
      fetchThreadHistory(currentThreadId!);
    } catch { toast.error('Failed to deploy dashboard.'); }
  };

  const handleOpenAsDocument = async () => {
    if (!activeEntry) return;
    const tid = toast.loading('Creating document…');
    try {
      const doc = await createDocumentFromThread(project.id, activeEntry.id, activeEntry.query);
      toast.dismiss(tid);
      toast.success('Opened as a document');
      navigate(`/documents/${doc.id}`);
    } catch (e: any) {
      toast.dismiss(tid);
      toast.error(e?.response?.data?.error || 'Could not create document');
    }
  };

  const handleUndeploy = async () => {
    if (!activeEntry || !activeEntry.is_deployed) return;
    if (!(await confirmDialog({
      title: 'Take dashboard offline?',
      message: 'The public link will stop working. You can re-deploy it anytime.',
      confirmLabel: 'Take offline', danger: true,
    }))) return;
    try {
      await axios.delete(`${BASE}/deploy/?dashboard_id=${activeEntry.id}`);
      fetchThreadHistory(currentThreadId!);
    } catch { toast.error('Failed to undeploy.'); }
  };

  const handleUpdateCard = (card: DashboardCard, updates: Partial<DashboardCard>) => {
    if (!activeEntry) return;
    const index = storeCards.findIndex(c => c === card || (c.title === card.title && c.sql === card.sql));
    if (index >= 0) storeUpdateCard(index, updates);
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
    setCards([...(storeCards), newCard], 'add text block');
  };

  const handleDeleteCard = (card: DashboardCard) => {
    if (!activeEntry) return;
    const index = storeCards.findIndex(c => c === card || (c.title === card.title && c.sql === card.sql));
    if (index >= 0) storeDeleteCard(index);
  };

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const r = await axios.get(`${BASE}/projects/${project.id}/insights/`);
      setLibraryInsights(r.data);
    } catch (e) {
      console.error('Library fetch failed:', e);
    } finally {
      setLibraryLoading(false);
    }
  }, [project.id]);

  const handleSaveToLibrary = async (card: DashboardCard) => {
    try {
      await axios.post(`${BASE}/projects/${project.id}/insights/`, { card_data: card });
      if (activeSideTab === 'library') fetchLibrary();
    } catch (e) {
      console.error('Save to library failed:', e);
    }
  };

  const handleDeleteFromLibrary = async (id: number) => {
    try {
      await axios.delete(`${BASE}/projects/${project.id}/insights/${id}/`);
      setLibraryInsights(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error('Delete from library failed:', e);
    }
  };

  const handlePullFromLibrary = (card: DashboardCard) => {
    if (!activeEntry) return;
    setCards([...storeCards, { ...card }], 'add from library');
  };

  const handleDrillDown = (_card: DashboardCard, dimension: string, value: string | number) => {
    // Fallback when a chart has no drill hierarchy: cross-filter the whole
    // dashboard to the clicked value (deterministic, no LLM). Toggle to clear.
    const isActive = globalFilters[dimension] === value;
    handleFilterChange(dimension, isActive ? null : value);
  };

  // OLAP drill-down: re-aggregate a chart one level deeper for `path` (the
  // ancestor values already clicked). No LLM at click time — the hierarchy is
  // planned + cached server-side. Returns the level rows + metadata, or null.
  const fetchDrill = async (sql: string, path: (string | number)[]) => {
    if (!sql) return null;
    try {
      const r = await axios.post(`${BASE}/drill/`, {
        sql,
        project_id: project.id,
        thread_id: currentThreadId,
        path,
      });
      return r.data;
    } catch (e) {
      console.warn('Drill error:', e);
      return null;
    }
  };

  const applyFilters = async (filterOverrides: Record<string, string | number | null>) => {
    if (!activeEntry) return;
    // Include each chart's x-axis column as `date_column` so the backend can
    // apply the `__timeframe` filter (last-N-days) against the right column.
    // Without this hint the backend can't tell which column is the date axis
    // for an arbitrary chart SQL.
    const charts = storeCards
      .map((c, i) => ({
        index: i,
        sql: c.sql,
        // x_key is only a *hint* — the backend validates it actually holds
        // dates before using it for the timeframe filter.
        date_column: c.chart_spec?.x_key || null,
        is_analytics: c.is_analytics || false,
      }))
      .filter(c => c.sql);
    if (!charts.length) return;

    setFilterLoading(true);
    try {
      // Pass empty {} to restore original data; backend returns full unfiltered rows.
      const r = await axios.post(`${BASE}/filter/`, {
        project_id: project.id,
        charts,
        filter_overrides: filterOverrides,
      });
      const updatedResults = [...storeCards];
      let errorCount = 0;
      for (const res of r.data.results || []) {
        if (res.error) {
          errorCount++;
          continue;
        }
        if (res.data) {
          updatedResults[res.index] = { ...updatedResults[res.index], data: res.data };
        }
      }
      setCards(updatedResults, 'apply filters');
      if (errorCount > 0) {
        // Surface instead of silently keeping stale data on the affected cards.
        console.warn(`Filter: ${errorCount} chart(s) could not be filtered and kept their previous data.`);
      }
    } catch (e) {
      console.error('Filter API error:', e);
    } finally {
      setFilterLoading(false);
    }
  };

  // Re-run every saved chart's SQL against the live datasource and persist the
  // fresh rows server-side. No LLM, no credit cost — distinct from the AI
  // regeneration flow. The backend returns the updated results_data.
  const handleRefresh = async () => {
    if (!activeEntry || refreshing) return;
    setRefreshing(true);
    try {
      const r = await axios.post(`${BASE}/history/${activeEntry.id}/refresh/`);
      const fresh = (r.data.results_data ?? []) as DashboardCard[];
      setCards(fresh, 'refresh data');
      setActiveEntry(prev => prev ? {
        ...prev,
        results_data: fresh,
        last_refreshed_at: r.data.last_refreshed_at,
      } : prev);
      if (r.data.error_count > 0) {
        console.warn(`Refresh: ${r.data.error_count} chart(s) could not be refreshed.`);
      }
    } catch (e) {
      console.error('Refresh API error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = async (column: string, value: string | number | null) => {
    setGlobalFilter(column, value);
    const newFilters = { ...globalFilters, [column]: value };
    if (value === null) delete newFilters[column];
    // Always call the API — when all filters cleared it returns unfiltered data
    await applyFilters(newFilters);
  };

  const handleClearAllFilters = async () => {
    clearGlobalFilters();
    setTimeframeFilter(null);
    await applyFilters({});
  };

  const handleTimeframeChange = async (days: number | null) => {
    setTimeframeFilter(days);
    setGlobalFilter('__timeframe', days);
    // Re-fetch chart data so the new timeframe actually takes effect.
    // Mirrors handleFilterChange — both should round-trip to /api/filter/.
    const newFilters: Record<string, string | number | null> = { ...globalFilters, __timeframe: days };
    if (days === null) delete newFilters['__timeframe'];
    await applyFilters(newFilters);
  };

  const handleHITLAnswer = async (questionId: string, answer: any) => {
    // Accumulate the answer, persist it, and re-run the original query
    const newResponses = { ...hitlResponses, [questionId]: answer };
    persistedHitlResponses.current = { ...persistedHitlResponses.current, [questionId]: answer };
    setHitlResponses(newResponses);
    setPendingHITL(null);
    await handleSubmit(hitlQueryRef, newResponses);
  };

  const activeColors = palette === 'brand'
    ? (brandPalette ?? getBrandPaletteColors())
    : (PALETTES[palette as keyof typeof PALETTES] ?? PALETTES.vibrant);

  // Effective thread type: set once the user picks, or once the thread is loaded
  const effectiveThreadType = threadType ?? pendingThreadType;

  // ── Drag reorder callback (called by DraggableCardsGrid) ────────────────────
  const handleReorder = (oldIndex: number, newIndex: number) => {
    if (!activeEntry) return;
    storeReorderCards(oldIndex, newIndex);
  };

  // ── AI Layout Optimizer ──────────────────────────────────────────────────────
  const handleOptimizeLayout = async () => {
    if (!activeEntry || layoutOptimizing) return;
    setLayoutOptimizing(true);
    try {
      const r = await axios.post(`${BASE}/layout-optimize/`, {
        dashboard_id: activeEntry.id,
        project_id: project.id,
        cards: storeCards,
        query: activeEntry.query,
      });
      if (r.data.cards) {
        setCards(r.data.cards, 'optimize layout');
      }
      if (r.data.layout && r.data.layout !== layout) {
        setLayout(r.data.layout as any);
      }
    } catch (e) {
      console.error('Layout optimization failed', e);
    } finally {
      setLayoutOptimizing(false);
    }
  };

  // ── Render cards: plain InsightCard array, used by all specialized layouts ───
  const renderCards = (cards: DashboardCard[] = storeCards) => {
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
          drillFetch={(path) => fetchDrill(card.sql, path)}
          globalFilters={globalFilters}
          onDelete={() => handleDeleteCard(card)}
          onSave={() => handleSaveToLibrary(card)}
        />
      </ChartErrorBoundary>
    ));
  };

  // Per-format metadata for the "chosen format" empty state — icon, accent tint,
  // a friendly title and a few one-click example prompts to get the user moving.
  const FORMAT_META: Record<string, { Icon: typeof LayoutDashboard; tint: string; label: string; title: string; examples: string[] }> = {
    dashboard:         { Icon: LayoutDashboard, tint: '#6366f1', label: 'Dashboard',        title: 'Build a dashboard',
      examples: ['Revenue trend over the last 12 months', 'Top 10 customers by total spend', 'Compare performance across regions'] },
    infographic:       { Icon: Palette,         tint: '#d946ef', label: 'Infographic',      title: 'Design an infographic',
      examples: ['Summarize this quarter’s highlights', 'Our growth story this year'] },
    report:            { Icon: FileText,        tint: '#0ea5e9', label: 'Report',           title: 'Write a report',
      examples: ['Analyze what’s driving churn', 'Quarterly business review'] },
    newsletter:        { Icon: Newspaper,       tint: '#f59e0b', label: 'Newsletter',       title: 'Draft a newsletter',
      examples: ['This month’s key metrics for the team', 'What changed since last month'] },
    cartoon:           { Icon: Drama,           tint: '#f43f5e', label: 'Cartoon Story',    title: 'Tell a cartoon story',
      examples: ['How we turned around Q3', 'The journey of a single order'] },
    image_infographic: { Icon: ImageIcon,       tint: '#14b8a6', label: 'Single-Image Poster', title: 'Make a shareable poster',
      examples: ['Top 5 stats from this year', 'Before vs. after the launch'] },
    entity360:         { Icon: Compass,         tint: '#10b981', label: 'Entity 360° View', title: 'Profile an entity',
      examples: ['A 360 view of customer Acme Corp', 'Everything about order 10248'] },
  };
  const fmtMeta = effectiveThreadType ? FORMAT_META[effectiveThreadType] : null;
  const fillPrompt = (text: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = text;
      textareaRef.current.focus();
      setIsQueryEmpty(!text.trim());
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className={`workspace ${theme.id === 'canva' ? 'theme-canva' : ''} ${history.length === 0 && !loading && effectiveThreadType === null ? 'ws-choosing' : ''}`} data-density={density}>

      <div className="workspace-sidebar glass">
        <button className={activeSideTab === 'templates' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'templates' ? null : 'templates')} title="Templates"><LayoutTemplate size={20}/><small>Design</small></button>
        <button className={activeSideTab === 'themes' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'themes' ? null : 'themes')} title="Themes"><Palette size={20}/><small>Style</small></button>
        <button className={activeSideTab === 'layouts' ? 'active' : ''} onClick={() => setActiveSideTab(s => s === 'layouts' ? null : 'layouts')} title="Layouts"><Columns size={20}/><small>Format</small></button>
        <button className={activeSideTab === 'library' ? 'active' : ''} onClick={() => { setActiveSideTab(s => { const next = s === 'library' ? null : 'library'; if (next === 'library') fetchLibrary(); return next; }); }} title="Insight Library"><Library size={20}/><small>Library</small></button>
      </div>

      {activeSideTab && (
        <div className="config-panel glass">
          <div className="config-panel-head">
            <h3>{activeSideTab === 'library' ? 'Insight Library' : activeSideTab.charAt(0).toUpperCase() + activeSideTab.slice(1)}</h3>
            <button className="icon-btn" onClick={() => setActiveSideTab(null)}><X size={16}/></button>
          </div>
          <div className="config-panel-body">
            {activeSideTab === 'templates' && (
              <div className="template-mini-grid">
                {TEMPLATES.map(t => (
                  <button key={t.id} className="template-mini-card" onClick={() => { if (textareaRef.current) { textareaRef.current.value = t.prompt; textareaRef.current.focus(); setIsQueryEmpty(!t.prompt.trim()); } }}>
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
                    {/* Brand palette — uses colours from the user's Brand Kit */}
                    <button
                      className={`palette-visual-card ${palette === 'brand' ? 'active' : ''}`}
                      onClick={() => setPalette('brand')}
                    >
                      <div className="pvc-swatches">
                        {(brandPalette ?? getBrandPaletteColors()).slice(0, 6).map((c, i) => (
                          <div key={i} className="pvc-dot" style={{ background: c }} />
                        ))}
                      </div>
                      <span className="pvc-name">Brand ✦</span>
                    </button>
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
            {activeSideTab === 'library' && (
              <div className="library-panel">
                <div className="library-panel-head">
                  <p className="library-hint">Save any chart to the project library and pull it back into any dashboard.</p>
                </div>
                {libraryLoading ? (
                  <div className="library-loading"><Loader2 size={18} className="spin"/></div>
                ) : libraryInsights.length === 0 ? (
                  <div className="library-empty">
                    <BarChartIcon size={28} style={{ opacity: 0.2 }}/>
                    <p>No saved insights yet.</p>
                    <small>Use the <strong>⋯ → Save to Library</strong> menu on any chart.</small>
                  </div>
                ) : (
                  <div className="library-list">
                    {libraryInsights.map(item => (
                      <div key={item.id} className="library-card">
                        <div className="library-card-info">
                          <span className="library-card-type">{item.card_data?.chart_type ?? 'chart'}</span>
                          <span className="library-card-title">{item.card_data?.title ?? 'Untitled'}</span>
                          {item.card_data?.insight && (
                            <span className="library-card-insight">{item.card_data.insight}</span>
                          )}
                        </div>
                        <div className="library-card-actions">
                          <button
                            className="library-pull-btn"
                            title="Add to current dashboard"
                            onClick={() => handlePullFromLibrary(item.card_data)}
                            disabled={!activeEntry}
                          >
                            <PlusCircle size={13}/> Pull
                          </button>
                          <button
                            className="library-del-btn"
                            title="Delete from library"
                            onClick={() => handleDeleteFromLibrary(item.id)}
                          >
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            <span className="chat-proj-emoji">
              <ProjectLogoTile id={project.emoji} emoji={project.emoji} size={32} accent={project.color} selected />
            </span>
            <div>
              <strong>{project.name}</strong>
            </div>
          </div>
        </div>

        <div className="chat-messages premium-scrollbar">
          {history.length === 0 && !loading && effectiveThreadType === null && (
            <div className="thread-type-picker">
              <div className="ttp-header">
                <div className="ttp-project-badge">
                  <ProjectLogoTile id={project.emoji} emoji={project.emoji} size={44} accent={project.color} selected />
                </div>
                <p className="ttp-eyebrow">{project.name}</p>
                <p className="ttp-title">What would you like to create?</p>
                <p className="ttp-sub">Pick a format for this conversation. It stays fixed once you send your first message — start a new conversation anytime to switch.</p>
              </div>
              <div className="ttp-options">
                {[
                  { type: 'dashboard',         Icon: LayoutDashboard, tint: '#6366f1', label: 'Dashboard',        featured: true,
                    desc: 'Interactive charts, filters and drill-downs in a live grid. Best for ongoing analysis.' },
                  { type: 'infographic',       Icon: Palette,         tint: '#d946ef', label: 'Infographic',
                    desc: 'A fully designed, shareable HTML poster generated from your data.' },
                  { type: 'report',            Icon: FileText,        tint: '#0ea5e9', label: 'Report',
                    desc: 'Long-form document with sections, exhibits and an executive summary.' },
                  { type: 'newsletter',        Icon: Newspaper,       tint: '#f59e0b', label: 'Newsletter',
                    desc: 'A sharp, conversational issue with a hook and a clear point of view.' },
                  { type: 'cartoon',           Icon: Drama,           tint: '#f43f5e', label: 'Cartoon Story',
                    desc: '4–8 panel comic that explains a finding through scenes and captions.' },
                  { type: 'image_infographic', Icon: ImageIcon,       tint: '#14b8a6', label: 'Single-Image Poster',
                    desc: 'Tall, social-style graphic with stacked stat blocks — one PNG.' },
                  { type: 'entity360',         Icon: Compass,         tint: '#10b981', label: 'Entity 360° View',
                    desc: 'A full profile of one record — attributes, KPIs, related tables and a timeline.' },
                ].map(({ type, Icon, tint, label, desc, featured }) => (
                  <button
                    key={type}
                    className={`ttp-option${featured ? ' ttp-option--featured' : ''}`}
                    onClick={() => setPendingThreadType(type as typeof pendingThreadType)}
                    style={{ '--ttp-tint': tint } as CSSProperties}
                  >
                    <span className="ttp-option-icon"><Icon size={20} strokeWidth={2}/></span>
                    <span className="ttp-option-body">
                      <strong>{label}</strong>
                      <span>{desc}</span>
                    </span>
                    <ChevronRight size={16} className="ttp-option-chevron"/>
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.length === 0 && !loading && effectiveThreadType !== null && (
            <div className="chat-empty">
              {/* Before the first message is sent the format isn't committed yet,
                  so allow going back to the picker instead of stranding the user. */}
              {pendingThreadType && !threadType && (
                <button className="chat-change-format" onClick={() => setPendingThreadType(null)}>
                  <ArrowLeft size={14}/> Change format
                </button>
              )}
              <div
                className="chat-empty-icon chat-empty-fmt-icon"
                style={fmtMeta ? ({ '--fmt-tint': fmtMeta.tint } as CSSProperties) : undefined}
              >
                {fmtMeta ? <fmtMeta.Icon size={26} strokeWidth={2}/> :
                  <ProjectLogoTile id={project.emoji} emoji={project.emoji} size={72} accent={project.color} selected />}
              </div>
              {fmtMeta && <div className="chat-empty-title">{fmtMeta.title}</div>}
              <p>
                {effectiveThreadType === 'infographic' ? 'Describe the infographic you want to generate.'
                  : effectiveThreadType === 'report' ? 'What would you like a report on? Be specific about the question or topic.'
                  : effectiveThreadType === 'newsletter' ? 'What should this newsletter issue cover? A specific topic or question works best.'
                  : effectiveThreadType === 'cartoon' ? 'What story should the cartoon tell? A finding, a problem, or a turnaround works best.'
                  : effectiveThreadType === 'image_infographic' ? 'What stats or comparisons should the infographic highlight?'
                  : effectiveThreadType === 'entity360' ? 'Name the entity to profile — e.g. "a 360 view of customer Acme Corp" or "everything about order 10248".'
                  : 'Describe what you want to see and I’ll build it. Try one of these to start:'}
              </p>
              {fmtMeta && fmtMeta.examples.length > 0 && (
                <div className="chat-empty-examples">
                  {fmtMeta.examples.map((ex) => (
                    <button key={ex} className="chat-example-chip" onClick={() => fillPrompt(ex)}>
                      <Sparkles size={13}/> <span>{ex}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Infographic style picker */}
              {effectiveThreadType === 'infographic' && (
                <div className="ig-style-picker">
                  <div className="ig-style-picker-label">Choose a visual style</div>
                  <div className="ig-style-picker-grid">
                    {([
                      { id: 'executive', emoji: '🏢', name: 'Executive', desc: 'Clean & professional', colors: ['#0f172a', '#1e293b', '#ffffff'] },
                      { id: 'vibrant',   emoji: '🎨', name: 'Vibrant',   desc: 'Bold with dot patterns', colors: ['#6366f1', '#8b5cf6', '#ffffff'] },
                      { id: 'dark',      emoji: '🌙', name: 'Dark Mode', desc: 'Dark with glow accents', colors: ['#0f172a', '#1e293b', '#6366f1'] },
                      { id: 'magazine',  emoji: '📰', name: 'Magazine',  desc: 'Editorial serif style', colors: ['#faf9f6', '#ffffff', '#1a1a2e'] },
                      { id: 'gradient',  emoji: '🌊', name: 'Gradient',  desc: 'Flowing glass cards', colors: ['#ffffff', '#6366f1', '#8b5cf6'] },
                    ] as const).map(s => (
                      <button
                        key={s.id}
                        className={`ig-style-card ${igStyle === s.id ? 'active' : ''}`}
                        onClick={() => setIgStyle(s.id)}
                        style={igStyle === s.id ? { borderColor: project.color } : {}}
                      >
                        <div className="ig-style-card-swatches">
                          {s.colors.map((c, i) => (
                            <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                          ))}
                        </div>
                        <span className="ig-style-card-emoji">{s.emoji}</span>
                        <strong>{s.name}</strong>
                        <span className="ig-style-card-desc">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Length picker for report & newsletter */}
              {(effectiveThreadType === 'report' || effectiveThreadType === 'newsletter' || effectiveThreadType === 'cartoon' || effectiveThreadType === 'image_infographic') && (
                <div className="ig-style-picker">
                  <div className="ig-style-picker-label">Length</div>
                  <div className="report-length-row">
                    {(effectiveThreadType === 'report' ? [
                      { id: 'brief',    label: 'Brief',    desc: '3 sections · ~3 min read'  },
                      { id: 'standard', label: 'Standard', desc: '5 sections · ~7 min read'  },
                      { id: 'deep',     label: 'Deep dive',desc: '7 sections · ~14 min read' },
                    ] : [
                      { id: 'brief',    label: 'Brief',    desc: '3 sections · ~1 min read' },
                      { id: 'standard', label: 'Standard', desc: '4 sections · ~3 min read' },
                      { id: 'deep',     label: 'Deep dive',desc: '5 sections · ~5 min read' },
                    ] as const).map(l => (
                      <button
                        key={l.id}
                        className={`report-length-btn ${reportLength === l.id ? 'active' : ''}`}
                        onClick={() => setReportLength(l.id as 'brief' | 'standard' | 'deep')}
                        style={reportLength === l.id ? { borderColor: project.color, background: project.color + '0d' } : {}}
                      >
                        <strong>{l.label}</strong>
                        <span>{l.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {history.map(entry => (
            <div key={entry.id} className="convo-block">
              <div className="user-msg">
                <div className="user-avatar" style={{ background: project.color, color: '#fff' }}>
                  <ProjectLogo id={project.emoji} emoji={project.emoji} size={18} color="#fff" />
                </div>
                <div className="user-bubble">
                  <p>{entry.query}</p>
                </div>
              </div>

              <button
                className={`ai-msg ${activeEntry?.id === entry.id ? 'selected' : ''}`}
                onClick={() => setActiveEntry(entry)}
              >
                <div className="ai-avatar"><img src={logo} alt="AI"/></div>
                <div className="ai-bubble">
                  {entry.narrative && (
                    <p className="ai-narrative">{entry.narrative}</p>
                  )}
                  <div className="ai-chart-badge">
                    <div className="ai-chart-badge-left">
                      <Sparkles size={13} className="ai-chart-badge-icon"/>
                      <div>
                        <div className="ai-chart-count">
                          {(() => {
                            if (effectiveThreadType === 'newsletter')        return 'Newsletter ready';
                            if (effectiveThreadType === 'report')             return 'Report ready';
                            if (effectiveThreadType === 'cartoon')            return 'Cartoon story ready';
                            if (effectiveThreadType === 'image_infographic')  return 'Infographic ready';
                            if (entry.infographic_html || entry.infographic_data) return 'Infographic ready';
                            const n = entry.results_data?.length || 0;
                            return `${n} chart${n !== 1 ? 's' : ''} ready`;
                          })()}
                        </div>
                        <div className="ai-chart-sub">Click to view in workspace</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="ai-chart-chevron"/>
                  </div>
                </div>
              </button>
            </div>
          ))}


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
                <div className="user-avatar" style={{ background: project.color, color: '#fff' }}>
                  <ProjectLogo id={project.emoji} emoji={project.emoji} size={18} color="#fff" />
                </div>
                <div className="user-bubble"><p>{optimisticPrompt}</p></div>
              </div>
              <div className="thinking">
                <div className="thinking-dots"><span/><span/><span/></div>
                <span>
                  {effectiveThreadType === 'infographic' ? 'Generating infographic from your data…'
                    : effectiveThreadType === 'report' ? 'Researching and writing your report (60-90s)…'
                    : effectiveThreadType === 'newsletter' ? 'Drafting your newsletter issue…'
                    : effectiveThreadType === 'cartoon' ? 'Storyboarding your cartoon panels…'
                    : effectiveThreadType === 'image_infographic' ? 'Composing your single-image infographic…'
                    : effectiveThreadType === 'entity360' ? 'Resolving the entity and assembling its 360° profile…'
                    : 'AI is analyzing your data and building charts…'}
                </span>
              </div>
            </div>
          )}

          {loading && !optimisticPrompt && (
            <div className="thinking">
              <div className="thinking-dots"><span/><span/><span/></div>
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
          {/* ── Agent Focus chips ── */}
          {activeAgents.length > 0 && (
            <div className="comp-agent-row">
              {activeAgents.map(a => (
                <div key={a.id} className="comp-agent-chip" style={{ borderColor: a.color + '60', background: a.color + '10' }}>
                  <span>{a.emoji}</span>
                  <span style={{ color: a.color, fontWeight: 600 }}>{a.name}</span>
                  <button onClick={() => setActiveAgents(prev => prev.filter(x => x.id !== a.id))} title="Remove focus">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-box" style={{ position: 'relative' }}>
            {/* Infographic-only Format row — sits ABOVE the textarea so the
                chips always have full width and don't clip in the 380px
                chat panel. Explicit "Format" label so users see these as
                visual / styling controls and not random metadata. */}
            {effectiveThreadType === 'infographic' && (
              <div className="composer-options-row">
                <span className="composer-options-label">Format</span>
                <ThemeChip
                  value={igTheme}
                  onChange={setIgTheme}
                  disabled={loading}
                />
                <TimeframeChip
                  value={igTimeframe}
                  onChange={setIgTimeframe}
                  disabled={loading}
                />
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="comp-textarea"
              placeholder="Ask AI to build charts, refine existing ones, or add new insights…"
              defaultValue=""
              onChange={e => {
                setIsQueryEmpty(!e.target.value.trim());
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (effectiveThreadType === 'infographic') handleInfographicSubmit();
                  else if (effectiveThreadType === 'entity360') handleEntity360Submit();
                  else if (effectiveThreadType === 'report' || effectiveThreadType === 'newsletter' || effectiveThreadType === 'cartoon' || effectiveThreadType === 'image_infographic') handleReportSubmit();
                  else handleSubmit();
                }
              }}
              rows={1}
            />
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.csv" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)}/>
            <div className="composer-actions">
              <div className="composer-actions-left">
                <button className="comp-icon" onClick={() => fileRef.current?.click()} title="Attach file">
                  {uploading ? <Loader2 size={16} className="spin"/> : <Upload size={16}/>}
                </button>
                {/* Agent picker button */}
                <button
                  ref={agentBtnRef}
                  className="comp-icon"
                  title="Set analysis focus agents"
                  onClick={() => setShowAgentPicker(p => !p)}
                  style={activeAgents.length > 0 ? { color: activeAgents[0].color } : {}}
                >
                  <Bot size={16} />
                  {activeAgents.length > 0 && <span className="comp-icon-badge">{activeAgents.length}</span>}
                </button>
                {showAgentPicker && (
                  <WorkspaceAgentPicker
                    anchorRef={agentBtnRef}
                    selected={activeAgents}
                    onToggle={a => setActiveAgents(prev =>
                      prev.some(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]
                    )}
                    onClose={() => setShowAgentPicker(false)}
                  />
                )}
              </div>
              <div className="composer-actions-right">
                <button className="comp-send" style={{ background: project.color }} onClick={() => {
                  if (effectiveThreadType === 'infographic') handleInfographicSubmit();
                  else if (effectiveThreadType === 'entity360') handleEntity360Submit();
                  else if (effectiveThreadType === 'report' || effectiveThreadType === 'newsletter' || effectiveThreadType === 'cartoon' || effectiveThreadType === 'image_infographic') handleReportSubmit();
                  else handleSubmit();
                }} disabled={loading || (isQueryEmpty && !uploads.length)}>
                  {loading ? <Loader2 size={15} className="spin"/> : <Send size={15}/>}
                </button>
              </div>
            </div>
          </div>
          <p className="comp-hint">
            Enter to send · Shift+Enter for new line
            {currentUser && !currentUser.prompts_unlimited && typeof currentUser.prompts_remaining === 'number' && (
              <span className={`comp-quota${currentUser.prompts_remaining <= 1 ? ' comp-quota--low' : ''}`}>
                {currentUser.prompts_remaining > 0
                  ? `· ${currentUser.prompts_remaining} free prompt${currentUser.prompts_remaining === 1 ? '' : 's'} left`
                  : '· Free prompts used'}
              </span>
            )}
          </p>
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
                  {activeEntry.last_refreshed_at && (
                    <span className="dp-refreshed" title={`Data last refreshed ${new Date(activeEntry.last_refreshed_at).toLocaleString()}`}>
                      <RefreshCw size={10}/> Refreshed {new Date(activeEntry.last_refreshed_at).toLocaleTimeString()}
                    </span>
                  )}
                  {activeEntry.infographic_html
                    ? <span className="dp-badge dp-badge--infographic">🎨 Infographic</span>
                    : <span className="dp-badge">{storeCards.length || 0} insights</span>
                  }
                  {activeEntry.is_deployed && <span className="dp-deployed-badge"><Eye size={10}/> Public</span>}
                </div>
              </div>
              <div className="dp-header-right">
                {effectiveThreadType !== 'infographic' && <ThemePicker selected={theme} onSelect={setTheme} />}
                {effectiveThreadType !== 'infographic' && (
                  <div className="layout-picker themed">
                    <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} title="Grid View"><LayoutGrid size={15}/></button>
                    <button className={layout === 'masonry' ? 'active' : ''} onClick={() => setLayout('masonry')} title="Masonry View"><LayoutList size={15}/></button>
                    <button className={layout === 'single' ? 'active' : ''} onClick={() => setLayout('single')} title="Focus View"><Square size={15}/></button>
                  </div>
                )}
                {effectiveThreadType !== 'infographic' && (
                  <div className="density-picker" role="group" aria-label="Card density">
                    <button className={density === 'compact'     ? 'active' : ''} onClick={() => setDensity('compact')}     title="Compact density">S</button>
                    <button className={density === 'default'     ? 'active' : ''} onClick={() => setDensity('default')}     title="Default density">M</button>
                    <button className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')} title="Comfortable density">L</button>
                  </div>
                )}
                <span className="dp-toolbar-divider" />

                {/* Frequently used, kept inline */}
                <button
                  className="dp-icon-btn"
                  onClick={handleRefresh}
                  disabled={refreshing || !activeEntry}
                  title="Refresh data — re-run every chart against the latest data (no AI, no credits)"
                >
                  <RefreshCw size={14} className={refreshing ? 'spin' : ''}/>
                </button>

                {/* Overflow menu — secondary actions grouped out of the row */}
                <div className="dp-more-wrap">
                  <button
                    className={`dp-icon-btn ${showToolMenu ? 'dp-icon-btn--active' : ''}`}
                    onClick={() => setShowToolMenu(v => !v)}
                    title="More actions"
                    aria-haspopup="menu"
                    aria-expanded={showToolMenu}
                  >
                    <MoreHorizontal size={16}/>
                  </button>
                  {showToolMenu && (
                    <div className="dp-more-menu" role="menu" onMouseLeave={() => setShowToolMenu(false)}>
                      <div className="dp-more-label">Layout</div>
                      {effectiveThreadType !== 'infographic' && (
                        <button className="dp-more-item" role="menuitem" onClick={() => { setDragEnabled(!dragEnabled); }}>
                          <Move size={15}/> {dragEnabled ? 'Disable drag-to-reorder' : 'Enable drag-to-reorder'}
                        </button>
                      )}
                      <button className="dp-more-item" role="menuitem" disabled={layoutOptimizing} onClick={() => { handleOptimizeLayout(); setShowToolMenu(false); }}>
                        {layoutOptimizing ? <Loader2 size={15} className="spin"/> : <Wand2 size={15}/>} Optimize layout (AI)
                      </button>

                      <div className="dp-more-label">Edit</div>
                      <button className="dp-more-item" role="menuitem" disabled={!canUndo} onClick={() => { undo(); }}>
                        <Undo2 size={15}/> Undo
                      </button>
                      <button className="dp-more-item" role="menuitem" disabled={!canRedo} onClick={() => { redo(); }}>
                        <Redo2 size={15}/> Redo
                      </button>

                      {(storeCards.length ?? 0) > 0 && (
                        <>
                          <div className="dp-more-label">Export</div>
                          <button className="dp-more-item" role="menuitem" onClick={() => { exportAllChartsCSV(storeCards, project.name); setShowToolMenu(false); }}>
                            <FileDown size={15}/> Export all charts (CSV)
                          </button>
                          <button className="dp-more-item" role="menuitem" onClick={() => { setShowExportModal(true); setShowToolMenu(false); }}>
                            <Download size={15}/> Export dashboard (PDF / PPTX / PNG)
                          </button>
                          <button className="dp-more-item" role="menuitem" onClick={() => { handleOpenAsDocument(); setShowToolMenu(false); }}>
                            <FileText size={15}/> Open as document
                          </button>
                        </>
                      )}

                      <div className="dp-more-label">Project</div>
                      <button className="dp-more-item" role="menuitem" onClick={() => { setShowDataModel(true); setShowToolMenu(false); }}>
                        <Filter size={15}/> Data model
                      </button>
                      <button className="dp-more-item" role="menuitem" onClick={() => { setShowDataQuality(true); setShowToolMenu(false); }}>
                        <ShieldCheck size={15}/> Data quality
                      </button>
                    </div>
                  )}
                </div>

                <span className="dp-toolbar-divider" />

                {/* Primary actions */}
                {activeEntry.is_deployed ? (
                  <button className="undeploy-btn" onClick={handleUndeploy}><EyeOff size={14}/> Offline</button>
                ) : (
                  <button className="deploy-btn" onClick={handleDeploy}><Zap size={14}/> Deploy</button>
                )}
                <button
                  className="dp-share-btn"
                  onClick={() => setShowShare(true)}
                  title="Share project / invite members"
                >
                  <Users size={13}/>
                  {(project.members?.length ?? 0) > 1 && (
                    <span className="dp-share-count">{project.members!.length}</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="dp-title dp-placeholder-title">
              <LayoutDashboard size={15} className="dp-title-icon"/>
              <span>Live Dashboard</span>
            </div>
          )}
        </div>

        {/* Credits warning banner */}
        <CreditsWarningBanner warning={creditsWarning} onDismiss={() => setCreditsWarning(null)} />

        {/* MySpace datasource owned by another user — queries will be blocked */}
        {project.datasource?.is_myspace && currentUser && project.owner?.id !== currentUser.id && (
          <div className="dp-myspace-warning">
            <AlertTriangle size={14}/>
            <span>
              This project uses <strong>{project.owner?.username || 'the owner'}'s</strong> personal My Space datasource.
              Only the owner can run queries on private data — ask them to connect a shared datasource.
            </span>
          </div>
        )}

        <div ref={dashboardContentRef} className={`dp-content ${layoutMode}-mode ${layout === 'poster' ? 'poster-content' : ''}`}>
          {!activeEntry && !loading && (
            <div className="dp-empty">
              <div className="dp-empty-icon dp-empty-icon--pulse" style={{ background: project.color + '15', border: `1.5px dashed ${project.color}50` }}>
                <LayoutDashboard size={28} style={{ color: project.color, opacity: 0.7 }}/>
              </div>
              <h3>{history.length === 0 ? 'Your ' + (fmtMeta?.label.toLowerCase() ?? 'dashboard') + ' will appear here' : 'No dashboard selected'}</h3>
              <p>{history.length === 0
                ? 'Send a prompt on the left and the live result renders here as it’s built.'
                : 'Send a prompt in the chat or click a previous response to view its charts here.'}</p>
            </div>
          )}
          {loading && !activeEntry && <DashboardSkeleton />}

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

          {activeEntry && (
            <div className="global-filter-bar">
              <div className="gf-label">
                <Filter size={13}/>
                {filterLoading ? <Loader2 size={11} className="spin"/> : 'Filters'}
              </div>
              {/* Always-visible timeframe filter */}
              <div className="gf-group">
                <span className="gf-col-name">Timeframe</span>
                <div className="gf-chips">
                  {([
                    { label: 'All', days: null },
                    { label: '7D', days: 7 },
                    { label: '30D', days: 30 },
                    { label: '90D', days: 90 },
                    { label: '6M', days: 180 },
                    { label: 'YTD', days: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) },
                    { label: '1Y', days: 365 },
                  ] as { label: string; days: number | null }[]).map(({ label, days }) => (
                    <button
                      key={label}
                      className={`gf-chip ${timeframeFilter === days ? 'active' : ''}`}
                      onClick={() => handleTimeframeChange(days)}
                    >{label}</button>
                  ))}
                </div>
              </div>
              {/* Dynamic dimension filters from backend */}
              {dashboardFilters.map(f => (
                <div key={f.column} className="gf-group">
                  <span className="gf-col-name">{f.label || f.column.replace(/_/g, ' ')}</span>
                  {(f.values ?? []).length > 8 ? (
                    <select
                      className="gf-select"
                      value={String(globalFilters[f.column] ?? '')}
                      onChange={e => handleFilterChange(f.column, e.target.value || null)}
                    >
                      <option value="">All</option>
                      {(f.values ?? []).map(v => (
                        <option key={String(v)} value={String(v)}>{String(v)}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="gf-chips">
                      <button
                        className={`gf-chip ${!globalFilters[f.column] ? 'active' : ''}`}
                        onClick={() => handleFilterChange(f.column, null)}
                      >All</button>
                      {(f.values ?? []).map(v => (
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
              {/* Active cross-filters from chart drill-downs (dimensions not in the
                  backend's suggested filter list) — shown so they're visible + clearable. */}
              {Object.entries(globalFilters)
                .filter(([k, v]) => k !== '__timeframe' && v !== null && v !== undefined
                  && !dashboardFilters.some(f => f.column === k))
                .map(([k, v]) => (
                  <div key={k} className="gf-group">
                    <span className="gf-col-name">{k.replace(/_/g, ' ')}</span>
                    <div className="gf-chips">
                      <button
                        className="gf-chip active"
                        title="Click to clear this drill-down filter"
                        onClick={() => handleFilterChange(k, null)}
                      >{String(v)} ✕</button>
                    </div>
                  </div>
                ))}
              {(timeframeFilter !== null || Object.entries(globalFilters).some(([k, v]) => k !== '__timeframe' && v !== null)) && (
                <button className="gf-clear" onClick={handleClearAllFilters}>
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Entity 360° view — pending (disambiguation/error) takes precedence, else the saved step */}
          {effectiveThreadType === 'entity360' && (
            entity360Pending
              ? <Entity360View payload={entity360Pending} colors={activeColors} onDisambiguate={handleEntity360Pick} />
              : (activeEntry?.infographic_data
                  ? <Entity360View payload={activeEntry.infographic_data as unknown as Entity360Payload} colors={activeColors} />
                  : null)
          )}

          {activeEntry && activeEntry.infographic_data && effectiveThreadType !== 'entity360' && (
            activeEntry.infographic_html
              ? <RichInfographicViewer
                  html={activeEntry.infographic_html}
                  title={activeEntry.query}
                  stepId={activeEntry.id}
                  currentTheme={igTheme as any}
                  onRestyled={(newHtml, newTheme) => {
                    // Push the restyled HTML through both `history` and
                    // `activeEntry` so the viewer immediately reflects the
                    // change and a tab refresh keeps the same look.
                    setHistory(prev => prev.map(h => h.id === activeEntry.id ? { ...h, infographic_html: newHtml } : h));
                    setActiveEntry(prev => prev && prev.id === activeEntry.id ? { ...prev, infographic_html: newHtml } : prev);
                    setIgTheme(newTheme as any);
                  }}
                />
              : <InfographicEditor entry={activeEntry} projectColor={project.color} />
          )}

          {/* Report / Newsletter viewer */}
          {(effectiveThreadType === 'report' || effectiveThreadType === 'newsletter' || effectiveThreadType === 'cartoon' || effectiveThreadType === 'image_infographic') && activeReport && (
            <ReportViewer report={activeReport} />
          )}

          {/* Loading message while report/newsletter is being generated */}
          {(effectiveThreadType === 'report' || effectiveThreadType === 'newsletter' || effectiveThreadType === 'cartoon' || effectiveThreadType === 'image_infographic') && !activeReport && loading && (
            <div className="report-loading-state">
              <Loader2 size={32} className="report-loading-icon spin" />
              <h3>
                {effectiveThreadType === 'newsletter' ? 'Drafting your newsletter issue...'
                  : effectiveThreadType === 'cartoon' ? 'Storyboarding your cartoon panels...'
                  : effectiveThreadType === 'image_infographic' ? 'Composing your single-image infographic...'
                  : 'Researching and writing your report...'}
              </h3>
              <p className="report-loading-hint">
                {effectiveThreadType === 'newsletter'
                  ? 'Newsletters take 30-60 seconds. We are pulling data, writing the hook, and drafting each section.'
                  : effectiveThreadType === 'cartoon'
                  ? 'Cartoons take 30-60 seconds. We are planning the story arc, fetching data, and rendering panels.'
                  : effectiveThreadType === 'image_infographic'
                  ? 'Single-image infographics take 30-60 seconds. We are assembling stat blocks into a vertical canvas.'
                  : 'Reports take 60-90 seconds. We are planning the outline, fetching data, writing each section, and assembling the document.'}
                {' '}Please don't close this tab.
              </p>
            </div>
          )}

          {activeEntry && !activeEntry.infographic_data && effectiveThreadType !== 'report' && effectiveThreadType !== 'newsletter' && effectiveThreadType !== 'cartoon' && effectiveThreadType !== 'image_infographic' && (
            <div key={activeEntry.id} className={`dp-charts layout-${layout} ${editMode ? 'edit-mode' : ''} ${theme.id === 'canva' ? 'canvas-mode' : ''} ${filterLoading ? 'is-filtering' : ''}`}>
              {theme.id === 'canva' ? (
                <div className="canvas-container">
                  <div className="canvas-page">
                    <header className="canvas-header">
                      <h1 className="canvas-title">{activeEntry.query}</h1>
                      <p className="canvas-subtitle">{project.name} • {new Date(activeEntry.created_at).toLocaleDateString()} • {storeCards.length} Insights</p>
                    </header>
                    <div className="dp-grid">
                      {renderCards()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dp-grid">
                  {storeCards.length === 0 ? (
                    <div className="dp-empty"><h3>No charts in this response</h3></div>
                  ) : layout === 'exec' ? (
                    <div className="exec-grid">
                      <div className="exec-metrics">
                        {renderCards(storeCards.filter(c => c.size === 'small' || c.size === 'mini' || c.type === 'metric'))}
                      </div>
                      <div className="exec-charts">
                        {renderCards(storeCards.filter(c => c.size !== 'small' && c.size !== 'mini' && c.type !== 'metric'))}
                      </div>
                    </div>
                  ) : layout === 'hub' ? (
                    <div className="hub-grid">
                      <div className="hub-main">
                        {renderCards(storeCards.filter(c => (c.size === 'wide' || c.size === 'full') && c.type !== 'metric').slice(0, 1))}
                      </div>
                      <div className="hub-side">
                        {renderCards(storeCards.filter((c, i) => (c.size !== 'wide' && c.size !== 'full') || i > 0))}
                      </div>
                    </div>
                  ) : layout === 'split' ? (
                    <div className="split-grid">
                      {renderCards(storeCards.slice(0, 2))}
                    </div>
                  ) : layout === 'magazine' ? (
                    <div className="magazine-grid">
                      {renderCards()}
                    </div>
                  ) : layout === 'presentation' ? (
                    <div className="presentation-grid">
                      {renderCards()}
                    </div>
                  ) : layout === 'poster' ? (
                    <div ref={posterRef} className={`poster-canvas poster-theme-${posterTheme}${infographicTemplate ? ` infographic-tpl-${infographicTemplate}` : ''}`}>
                      {renderCards()}
                    </div>
                  ) : (
                    /* Default: grid / masonry / single — supports drag-and-drop */
                    <DraggableCardsGrid
                      cards={storeCards}
                      layout={layout}
                      editMode={editMode}
                      font={font.value}
                      colors={activeColors}
                      posterTheme={posterTheme}
                      globalFilters={globalFilters}
                      dragEnabled={dragEnabled}
                      onUpdate={handleUpdateCard}
                      onDrillDown={(card, dim, val) => handleDrillDown(card, dim, val)}
                      onDrill={(card, path) => fetchDrill(card.sql, path)}
                      onReorder={handleReorder}
                      onDelete={handleDeleteCard}
                      onSave={handleSaveToLibrary}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showShare && currentUser && (
        <ShareProjectModal
          project={project}
          currentUser={currentUser}
          onClose={() => setShowShare(false)}
          onProjectUpdate={p => { onProjectUpdate?.(p); }}
        />
      )}

      {showDataModel && (
        <ProjectDataModelModal
          projectId={project.id}
          projectName={project.name}
          datasourceId={project.datasource?.id ?? null}
          availableDatasources={datasources}
          onClose={() => setShowDataModel(false)}
        />
      )}

      {showDataQuality && (
        <DataQualityModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowDataQuality(false)}
        />
      )}

      <Modal
        open={!!deployedUrl}
        onClose={() => setDeployedUrl(null)}
        size="sm"
        eyebrow="Published"
        title="Your dashboard is live"
        subtitle="Anyone with this link can view it — no account needed."
      >
        <Modal.Body>
          <div className="deploy-share-row">
            <input className="deploy-share-input" readOnly value={deployedUrl || ''}
              onFocus={e => e.currentTarget.select()} />
            <Button
              variant="secondary"
              onClick={() => {
                if (deployedUrl) {
                  navigator.clipboard?.writeText(deployedUrl)
                    .then(() => toast.success('Link copied'))
                    .catch(() => toast.error('Could not copy — select and copy manually'));
                }
              }}
            >Copy</Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setDeployedUrl(null)}>Done</Button>
          <Button as="a" href={deployedUrl || '#'} target="_blank" rel="noopener noreferrer">
            Open link
          </Button>
        </Modal.Footer>
      </Modal>

      {showExportModal && activeEntry && (
        <ExportModal
          dashboardId={activeEntry.id}
          projectId={project.id}
          title={activeEntry.query}
          palette={palette}
          theme={theme.id}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
