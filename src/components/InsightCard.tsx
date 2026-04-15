import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, X, FileText, AlertCircle, Sparkles, TrendingUp,
  BarChart2, LineChart, PieChart as PieIcon, AreaChart as AreaIcon, Layers, LayoutList,
  DollarSign, ShoppingCart, Users, Package, Percent,
  CreditCard, FlaskConical, AlignLeft, ScatterChart as ScatterIcon,
  Download, Maximize2, Minimize2, Pencil, Check, Box, MoreHorizontal, ChevronDown,
  Table2, RotateCcw, Trash2, Bookmark,
} from 'lucide-react';
import type { DashboardCard } from '../App';
import { COLORS } from './constants';
import { ChartRenderer } from '../renderers/ChartRenderer';
import { formatCompact, isCurrencyKey, sortByDateLabel, deriveKeys } from '../renderers/utils';


// ── DataTableDrawer ───────────────────────────────────────────────────────────
export function DataTableDrawer({ title, data, onClose }: { title: string; data: any[]; onClose: () => void }) {
  if (!data?.length) return null;
  const cols = Object.keys(data[0]);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="data-drawer">
        <div className="drawer-header">
          <div className="drawer-title">
            <FileText size={16} />
            <span>{title}</span>
          </div>
          <div className="drawer-meta">{data.length} rows</div>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="drawer-body">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>{cols.map(col => <td key={col}>{String(row[col] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Local helpers (card-level, not chart rendering) ───────────────────────────

function exportToCSV(data: any[], title: string) {
  if (!data?.length) return;
  const cols = Object.keys(data[0]);
  const header = cols.join(',');
  const rows = data.map(row =>
    cols.map(c => {
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
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


function getMetricMeta(title: string): { Icon: any; color: string } {
  const t = (title || '').toLowerCase();
  if (/revenue|earning|income|profit|gmv|arr|mrr/.test(t)) return { Icon: DollarSign, color: '#10b981' };
  if (/sale/.test(t)) return { Icon: ShoppingCart, color: '#06b6d4' };
  if (/order|purchase|transaction/.test(t)) return { Icon: Package, color: '#6366f1' };
  if (/customer|user|visitor|client|contact/.test(t)) return { Icon: Users, color: '#06b6d4' };
  if (/cost|expense|spend|budget/.test(t)) return { Icon: CreditCard, color: '#f59e0b' };
  if (/rate|ratio|percent|pct|margin/.test(t)) return { Icon: Percent, color: '#8b5cf6' };
  if (/trend|growth|change/.test(t)) return { Icon: TrendingUp, color: '#10b981' };
  return { Icon: BarChart2, color: '#06b6d4' };
}


function InsightCardInner({ card, layout, onUpdate, editMode, font, colors, posterTheme, onDrillDown, globalFilters, index, onDelete, onSave }: {
  card: DashboardCard;
  layout?: 'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation';
  onUpdate?: (updates: Partial<DashboardCard>) => void;
  onDrillDown?: (dimension: string, value: string | number) => void;
  editMode?: boolean;
  font?: string;
  colors?: string[];
  posterTheme?: string;
  globalFilters?: Record<string, string | number | null>;
  index?: number;
  onDelete?: () => void;
  onSave?: () => void;
}) {
  const [chartType, setChartType] = useState(card.chart_type);
  const [showSql, setShowSql] = useState(false);
  const [showData, setShowData] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{column: string, value: string | number} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [gridResizeH, setGridResizeH] = useState<number | null>(null);
  const gridResizeRef = useRef<{ startY: number; startH: number } | null>(null);
  const gridResizeCurH = useRef<number>(0);

  const filteredData = useMemo(() => {
    let data: Record<string, any>[] = card.data || [];
    if (activeFilter) {
      data = data.filter(row => row[activeFilter.column] === activeFilter.value);
    }
    if (globalFilters && !card.is_analytics) {
      // Handle __timeframe special key: filter by date range on the first date-like column
      const timeframeDays = globalFilters['__timeframe'];
      if (timeframeDays !== null && timeframeDays !== undefined) {
        const days = Number(timeframeDays);
        if (days > 0 && data.length > 0) {
          // Detect a date column: first col where >50% of values parse as valid dates
          const cols = Object.keys(data[0]);
          const dateCols = cols.filter(col => {
            const sample = data.slice(0, Math.min(10, data.length));
            const parseable = sample.filter(r => {
              const v = r[col];
              if (!v || typeof v === 'number') return false;
              const ts = Date.parse(String(v));
              return !isNaN(ts) && ts > Date.parse('1970-01-02');
            });
            return parseable.length >= Math.ceil(sample.length * 0.5);
          });
          if (dateCols.length > 0) {
            const dateCol = dateCols[0];
            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
            data = data.filter(row => {
              const ts = Date.parse(String(row[dateCol]));
              return !isNaN(ts) && ts >= cutoff;
            });
          }
        }
      }
      // Standard column=value filters (skip __timeframe)
      for (const [col, val] of Object.entries(globalFilters)) {
        if (col === '__timeframe') continue;
        if (val !== null && val !== undefined && data.some(r => col in r)) {
          data = data.filter(row => String(row[col]) === String(val));
        }
      }
    }
    return data;
  }, [card.data, activeFilter, globalFilters, card.is_analytics]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editMode || layout !== 'poster') return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    setIsDragging(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPoster) {
      if (!editMode) return;
      setIsResizing(true);
    } else {
      // Grid mode: drag to resize height → snap to size class on release
      const currentH = cardRef.current?.getBoundingClientRect().height ?? 280;
      gridResizeRef.current = { startY: e.clientY, startH: currentH };
      gridResizeCurH.current = currentH;
      setGridResizeH(currentH);

      const onMove = (me: MouseEvent) => {
        if (!gridResizeRef.current) return;
        const newH = Math.max(100, gridResizeRef.current.startH + (me.clientY - gridResizeRef.current.startY));
        gridResizeCurH.current = newH;
        setGridResizeH(newH);
      };
      const onUp = () => {
        const h = gridResizeCurH.current;
        const newSize = h < 160 ? 's' : h < 240 ? 'm' : h < 310 ? 'l' : h < 360 ? 'xl' : 'xxl';
        onUpdate?.({ size: newSize });
        setGridResizeH(null);
        gridResizeRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const parent = cardRef.current?.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const nextX = e.clientX - parentRect.left - dragOffset.x;
          const nextY = e.clientY - parentRect.top - dragOffset.y;
          onUpdate?.({ x: nextX, y: nextY });
        }
      } else if (isResizing) {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
          const nextW = e.clientX - rect.left;
          const nextH = e.clientY - rect.top;
          onUpdate?.({ w: Math.max(200, nextW), h: Math.max(100, nextH) });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, onUpdate]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select();
  }, [editingTitle]);

  useEffect(() => {
    if (!showTypeMenu && !showActionsMenu) return;
    const handler = (e: MouseEvent) => {
      if (showTypeMenu && typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) setShowTypeMenu(false);
      if (showActionsMenu && actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTypeMenu, showActionsMenu]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== card.title) onUpdate?.({ title: t });
    else setTitleDraft(card.title);
    setEditingTitle(false);
  };

  const isPoster = layout === 'poster';
  const posX = card.x ?? 0;
  const posY = card.y ?? 0;
  const accentColor = (colors || COLORS)[0];

  const posterBg =
    posterTheme === 'dark' ? 'rgba(15,23,42,0.85)' :
    posterTheme === 'newspaper' ? '#faf8f4' :
    '#ffffff';

  const cardStyle: React.CSSProperties = {
    fontFamily: font || 'inherit',
    ['--card-accent' as any]: accentColor,
    ...(isPoster ? {
      position: 'absolute',
      left: posX,
      top: posY,
      width: card.w || 380,
      height: card.h || (card.type === 'metric' ? 140 : 340),
      zIndex: isDragging ? 1000 : 1,
      cursor: editMode ? 'move' : 'default',
      // Premium poster visual overrides
      border: 'none',
      borderTop: `4px solid ${accentColor}`,
      borderRadius: 16,
      padding: 28,
      boxShadow: posterTheme === 'newspaper' ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
      background: posterBg,
      overflow: 'hidden',
    } : {}),
  };

  if (card.error) return (
    <div className={`chart-card error size-${card.size || 'medium'}`}>
      <AlertCircle size={16} className="error-icon" />
      <p>{card.error}</p>
    </div>
  );

  if (!card.data) return (
    <div className={`chart-card error size-${card.size || 'medium'}`}>
      <AlertCircle size={16} className="error-icon" />
      <p>No data returned for this chart.</p>
    </div>
  );

  const activeColors = colors || COLORS;

  // Normalize legacy size names to new taxonomy
  const _sizeNorm: Record<string, string> = { mini: 's', small: 's', medium: 'm', large: 'l', tall: 'l', wide: 'xl', full: 'xxl', 'ultra-wide': 'xxl' };
  const type = card.type || (card.data?.length === 1 && Object.keys(card.data?.[0] || {}).length <= 2 ? 'metric' : 'chart');
  const rawSize = card.size ? (_sizeNorm[card.size] || card.size) : (type === 'metric' ? 's' : type === 'text' ? 'xxl' : 'l');
  const size = rawSize;

  const renderContent = (heightOverride?: number) => {
    let resolvedType = card.type;
    if (!resolvedType && card.data?.length === 1 && card.data[0] && Object.keys(card.data[0]).length <= 2) {
      resolvedType = 'metric';
    } else if (!resolvedType) {
      resolvedType = 'chart';
    }

    // ── Empty-chart guard: all numeric values are 0 or null → graceful placeholder ──
    if (resolvedType === 'chart' && card.data?.length && chartType !== 'table' && chartType !== 'timeline') {
      const hasAnyValue = card.data.some(row =>
        Object.values(row).some(v => typeof v === 'number' && v !== 0)
      );
      if (!hasAnyValue) {
        return (
          <div className="chart-no-data">
            <div className="chart-no-data-icon">📭</div>
            <div className="chart-no-data-title">No data to visualize</div>
            <div className="chart-no-data-sub">All values returned are zero or null. Try broadening the date range or filters.</div>
          </div>
        );
      }
    }

    if (resolvedType === 'metric') {
      // Find the best value to display: prefer the first numeric column,
      // skip string labels like dates ("Apr 2023") that land in col 0
      let valueKey = '';
      let val: string | number = 'N/A';
      if (card.data?.[0]) {
        const entries = Object.entries(card.data[0]);
        // First pass: find first numeric value
        for (const [k, v] of entries) {
          if (typeof v === 'number') { valueKey = k; val = v; break; }
          if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
            valueKey = k; val = Number(v); break;
          }
        }
        // Fallback: use last entry (usually the measure, not the date label)
        if (val === 'N/A' && entries.length > 0) {
          const [k, v] = entries[entries.length - 1];
          valueKey = k; val = v as string | number;
        }
      }
      const isCurr = isCurrencyKey(valueKey || card.title);
      const formatted = typeof val === 'number'
        ? (isCurr ? '$' : '') + formatCompact(val)
        : String(val ?? 'N/A');
      const s = card.stats;
      const trendDir = s?.trend;
      const trendPct = s?.trend_pct ?? s?.total_change_pct;
      const { Icon: MetricIcon, color: iconColor } = getMetricMeta(card.title);

      if (isPoster) {
        const textColor = posterTheme === 'dark' ? '#f8fafc' : '#0f172a';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, color: textColor, fontFamily: font || 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatted}
            </div>
          </div>
        );
      }

      const isUp = trendDir === 'upward';
      const isDown = trendDir === 'downward';
      const trendColor = isUp ? '#10b981' : isDown ? '#ef4444' : '#64748b';
      const trendBg = isUp ? 'rgba(16,185,129,0.12)' : isDown ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.1)';

      const sparklinePoints = (() => {
        // Build a tiny sparkline path from trend direction + pct if available
        if (trendDir === 'upward') return '0,20 12,18 24,14 36,10 48,6';
        if (trendDir === 'downward') return '0,6 12,10 24,14 36,18 48,20';
        return '0,13 12,11 24,13 36,12 48,13';
      })();

      return (
        <div className="kpi-card-body">
          <div className="kpi-accent-bar" style={{ background: iconColor }} />
          <div className="kpi-top-row">
            <span className="kpi-label">{card.title}</span>
            <div className="kpi-icon-wrap" style={{ background: iconColor + '15', border: `1px solid ${iconColor}25` }}>
              <MetricIcon size={15} color={iconColor} strokeWidth={2} />
            </div>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatted}</div>
            {trendPct !== undefined && (
              <div className="kpi-sparkline">
                <svg viewBox="0 0 48 26" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`sg-${index ?? 0}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={trendColor} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={trendColor} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={`0,26 ${sparklinePoints} 48,26`} fill={`url(#sg-${index ?? 0})`}/>
                  <polyline points={sparklinePoints} fill="none" stroke={trendColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          <div className="kpi-footer-row">
            {trendPct !== undefined ? (
              <span className="kpi-trend-badge" style={{ background: trendBg, color: trendColor }}>
                {isDown ? '↓' : isUp ? '↑' : '→'}{' '}{isUp ? '+' : isDown ? '-' : ''}{Math.abs(trendPct).toFixed(1)}%
              </span>
            ) : <span />}
            <span className="kpi-period-label">vs prior period</span>
          </div>
        </div>
      );
    }

    if (resolvedType === 'text') {
      return (
        <div className="text-content">
          <p>{card.insight}</p>
          {card.data?.length > 0 && (
            <div className="text-data-table">
              <table>
                <thead><tr>{Object.keys(card.data[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>{card.data.slice(0, 5).map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (!filteredData?.length || !filteredData[0]) return <div className="dp-empty">No data</div>;
    const { xKey, dataKeys } = deriveKeys(filteredData);

    const displayData = sortByDateLabel(filteredData, xKey);
    const chartHeight = heightOverride ?? (
      size === 's' ? 120 : size === 'm' ? 220 : size === 'l' ? 280
      : size === 'xl' ? 320 : size === 'xxl' ? 360
      : layout === 'single' ? 400 : 280
    );

    return (
      <ChartRenderer
        spec={{
          chart_type: chartType,
          data: displayData,
          xKey,
          dataKeys,
          colors: activeColors,
          height: chartHeight,
          index,
          isPoster,
          gridStroke: isPoster ? 'transparent' : '#f1f5f9',
          gridDash: isPoster ? '0' : '3 3',
          hiddenSeries,
          onToggleSeries: toggleSeries,
          onDrillDown,
          anomaly_info: card.anomaly_info,
          matrix_config: card.matrix_config,
          _ts_config: (card as any)._ts_config,
          _pareto_config: (card as any)._pareto_config,
        }}
      />
    );
  };

  return (
    <motion.div
      ref={cardRef}
      className={`chart-card type-${type} size-${size} ${layout || 'grid'} ${editMode ? 'edit-mode' : ''}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: (index || 0) * 0.055, ease: [0.16, 1, 0.3, 1] }}
    >
      {type === 'metric' && !isPoster ? null : <div className="chart-card-head">
        {isPoster ? (
          <div className="poster-card-label" style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: accentColor, marginBottom: 4,
          }}>
            {card.title}
          </div>
        ) : (
          <>
            <div className="chart-title-row">
              {editingTitle ? (
                <div className="chart-title-edit">
                  <input
                    ref={titleInputRef}
                    className="chart-title-input"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitleDraft(card.title); setEditingTitle(false); } }}
                  />
                  <button className="title-edit-confirm" onClick={commitTitle} title="Save"><Check size={12} /></button>
                </div>
              ) : (
                <h4 onDoubleClick={() => setEditingTitle(true)} title="Double-click to rename">{card.title}</h4>
              )}
              {card.is_analytics && (
                <span className="analytics-badge" title="Advanced Analytics">
                  <FlaskConical size={9}/> AI
                </span>
              )}
            </div>
            <div className={`chart-controls ${type === 'metric' ? 'metric-controls' : ''}`}>

              {/* ── Chart-type picker (single button + popover) ── */}
              {type !== 'metric' && (card.type === 'chart' || !card.type) && (() => {
                const CHART_TYPES_2D = [
                  { key: 'bar', icon: <BarChart2 size={13}/>, label: 'Bar' },
                  { key: 'horizontal_bar', icon: <AlignLeft size={13}/>, label: 'H-Bar' },
                  { key: 'stacked_bar', icon: <Layers size={13}/>, label: 'Stack' },
                  { key: 'area', icon: <AreaIcon size={13}/>, label: 'Area' },
                  { key: 'line', icon: <LineChart size={13}/>, label: 'Line' },
                  { key: 'pie', icon: <PieIcon size={13}/>, label: 'Pie' },
                  { key: 'scatter', icon: <ScatterIcon size={13}/>, label: 'Scatter' },
                  { key: 'timeline', icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>TL</span>, label: 'Timeline' },
                  { key: 'table', icon: <Table2 size={13}/>, label: 'Table' },
                ] as const;
                const CHART_TYPES_3D = [
                  { key: 'bar3d', icon: <Box size={12}/>, label: '3D Bar' },
                  { key: 'pie3d', icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>🥧</span>, label: '3D Pie' },
                  { key: 'scatter3d', icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>✦</span>, label: '3D Scatter' },
                ] as const;
                const CHART_TYPES_D3 = [
                  { key: 'treemap',  icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>▦</span>, label: 'Treemap' },
                  { key: 'sunburst', icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>☀</span>, label: 'Sunburst' },
                  { key: 'sankey',   icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>⇉</span>, label: 'Sankey' },
                  { key: 'bump',     icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>↕</span>, label: 'Ranking' },
                  { key: 'force',    icon: <span style={{fontSize:9,fontWeight:800,lineHeight:1}}>⬡</span>, label: 'Network' },
                ] as const;
                const allTypes = [...CHART_TYPES_2D, ...CHART_TYPES_3D, ...CHART_TYPES_D3];
                const current = allTypes.find(t => t.key === chartType) ?? { icon: <BarChart2 size={13}/>, label: 'Chart' };
                const isModified = chartType !== card.chart_type;
                return (
                  <div className="chart-type-picker" ref={typeMenuRef}>
                    <button
                      className={`chart-type-btn ${showTypeMenu ? 'active' : ''}`}
                      onClick={() => setShowTypeMenu(s => !s)}
                      title="Change chart type"
                    >
                      {current.icon}
                      <span className="chart-type-label">{current.label}</span>
                      <ChevronDown size={10} style={{ opacity: 0.6, marginLeft: 1 }}/>
                    </button>
                    {showTypeMenu && (
                      <div className="chart-type-menu">
                        {isModified && (
                          <button
                            className="ctm-reset"
                            onClick={() => { setChartType(card.chart_type as any); onUpdate?.({ chart_type: card.chart_type }); setShowTypeMenu(false); }}
                          >
                            <RotateCcw size={11}/> Reset to original
                          </button>
                        )}
                        <div className="ctm-section-label">2D</div>
                        <div className="ctm-grid">
                          {CHART_TYPES_2D.map(t => (
                            <button
                              key={t.key}
                              className={`ctm-item ${chartType === t.key ? 'active' : ''}`}
                              onClick={() => { setChartType(t.key); onUpdate?.({ chart_type: t.key }); setShowTypeMenu(false); }}
                              title={t.label}
                            >
                              <span className="ctm-icon">{t.icon}</span>
                              <span className="ctm-label">{t.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="ctm-section-label ctm-section-3d">3D</div>
                        <div className="ctm-grid">
                          {CHART_TYPES_3D.map(t => (
                            <button
                              key={t.key}
                              className={`ctm-item ${chartType === t.key ? 'active' : ''}`}
                              onClick={() => { setChartType(t.key); onUpdate?.({ chart_type: t.key }); setShowTypeMenu(false); }}
                              title={t.label}
                            >
                              <span className="ctm-icon">{t.icon}</span>
                              <span className="ctm-label">{t.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="ctm-section-label" style={{ color: '#10b981' }}>D3</div>
                        <div className="ctm-grid">
                          {CHART_TYPES_D3.map(t => (
                            <button
                              key={t.key}
                              className={`ctm-item ${chartType === t.key ? 'active' : ''}`}
                              onClick={() => { setChartType(t.key); onUpdate?.({ chart_type: t.key }); setShowTypeMenu(false); }}
                              title={t.label}
                            >
                              <span className="ctm-icon">{t.icon}</span>
                              <span className="ctm-label">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── SQL toggle ── */}
              <button className={`sql-btn ${showSql ? 'active' : ''}`} onClick={() => setShowSql(s => !s)}>
                {showSql ? <EyeOff size={12} /> : <Eye size={12} />} SQL
              </button>

              {/* ── Fullscreen ── */}
              {type !== 'metric' && (
                <button className="ctrl-icon-btn" onClick={() => setIsFullscreen(true)} title="Fullscreen">
                  <Maximize2 size={13} />
                </button>
              )}

              {/* ── Filter dropdown (only when filters exist) ── */}
              {type !== 'metric' && card.filters && card.filters.length > 0 && (
                <div className="filter-dropdown-wrap">
                  <select
                    className="card-filter-select"
                    value={activeFilter ? `${activeFilter.column}:${activeFilter.value}` : ''}
                    onChange={(e) => {
                      if (!e.target.value) setActiveFilter(null);
                      else {
                        const [col, val] = e.target.value.split(':');
                        setActiveFilter({ column: col, value: val });
                      }
                    }}
                  >
                    <option value="">Filter…</option>
                    {card.filters.map(f => (
                      <optgroup key={f.column} label={f.column}>
                        {f.options.map(opt => <option key={opt} value={`${f.column}:${opt}`}>{opt}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {/* ── More (⋯) menu: Data, CSV, Rename ── */}
              <div className="chart-actions-menu" ref={actionsMenuRef}>
                <button
                  className={`ctrl-icon-btn ${showActionsMenu ? 'active' : ''}`}
                  onClick={() => setShowActionsMenu(s => !s)}
                  title="More options"
                >
                  <MoreHorizontal size={14} />
                </button>
                {showActionsMenu && (
                  <div className="chart-actions-dropdown">
                    {type !== 'metric' && (
                      <button className="cad-item" onClick={() => { setShowData(true); setShowActionsMenu(false); }}>
                        <LayoutList size={13} /> View Data
                      </button>
                    )}
                    {card.data?.length > 0 && (
                      <button className="cad-item" onClick={() => { exportToCSV(card.data, card.title); setShowActionsMenu(false); }}>
                        <Download size={13} /> Export CSV
                      </button>
                    )}
                    {!editingTitle && (
                      <button className="cad-item" onClick={() => { setEditingTitle(true); setShowActionsMenu(false); }}>
                        <Pencil size={13} /> Rename
                      </button>
                    )}
                    {onSave && (
                      <button className="cad-item" onClick={() => { onSave(); setShowActionsMenu(false); }}>
                        <Bookmark size={13} /> Save to Library
                      </button>
                    )}
                    {onDelete && (
                      <button className="cad-item cad-danger" onClick={() => { onDelete(); setShowActionsMenu(false); }}>
                        <Trash2 size={13} /> Delete chart
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>}
      <div className={type === 'metric' && !isPoster ? '' : 'chart-body'}>
        {isFullscreen ? <div style={{ height: chartType === 'table' ? 200 : (size === 's' ? 120 : 200), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}><Maximize2 size={20} style={{ opacity: 0.3 }}/></div> : renderContent(gridResizeH ?? undefined)}
      </div>
      {showData && <DataTableDrawer title={card.title} data={card.data} onClose={() => setShowData(false)} />}
      {(type === 'chart') && card.insight && (
        isPoster ? (
          <div style={{
            borderLeft: `3px solid ${accentColor}`, paddingLeft: 12,
            fontStyle: 'italic', fontSize: 13,
            color: posterTheme === 'dark' ? '#94a3b8' : '#64748b',
            marginTop: 12,
          }}>
            {card.insight}
          </div>
        ) : (
          <div className="insight-row">
            <Sparkles size={11} className="insight-icon" />
            <p>{card.insight}</p>
          </div>
        )
      )}
      {!isPoster && type !== 'metric' && chartType !== 'timeline' && card.stats && (() => {
        const s = card.stats;
        const badges: { label: string; className: string }[] = [];
        if (s.trend) {
          const arrow = s.trend === 'upward' ? '↑' : s.trend === 'downward' ? '↓' : '→';
          const pct = s.trend_pct !== undefined ? ` ${s.trend_pct > 0 ? '+' : ''}${s.trend_pct.toFixed(1)}%` : '';
          badges.push({ label: `${arrow}${pct}`, className: `stat-badge trend-${s.trend}` });
        }
        if (s.total_change_pct !== undefined) {
          const arrow = s.total_change_pct >= 0 ? '↑' : '↓';
          badges.push({ label: `${arrow} ${Math.abs(s.total_change_pct).toFixed(1)}% overall`, className: 'stat-badge trend-neutral' });
        }
        if (s.top_pct !== undefined) {
          badges.push({ label: `Top = ${s.top_pct}%`, className: 'stat-badge stat-concentration' });
        }
        if (s.pareto_pct !== undefined && s.pareto_pct >= 70) {
          badges.push({ label: `Pareto ${s.pareto_pct}%`, className: 'stat-badge stat-pareto' });
        }
        if (s.outliers && s.outliers.length > 0) {
          badges.push({ label: `⚠ ${s.outliers.length} outlier${s.outliers.length > 1 ? 's' : ''}`, className: 'stat-badge stat-outlier' });
        }
        if (!badges.length) return null;
        return (
          <div className="stat-badges-row">
            {badges.map((b, i) => <span key={i} className={b.className}>{b.label}</span>)}
          </div>
        );
      })()}
      {showSql && card.sql && <pre className="sql-pre">{card.sql}</pre>}

      {editMode && layout === 'poster' ? (
        <div
          className="resize-handle"
          onMouseDown={handleResizeDown}
          style={{
            position: 'absolute', bottom: 0, right: 0, width: 22, height: 22,
            cursor: 'nwse-resize', background: 'var(--theme-accent)',
            borderRadius: '50% 0 0 0', opacity: 0.8, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: 4, height: 4, borderRight: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'translate(-2px, -2px)' }} />
        </div>
      ) : !isPoster && type === 'chart' ? (
        /* Grid/masonry/single: drag resize handle visible on card hover */
        <div className="card-resize-handle" onMouseDown={handleResizeDown} title="Drag to resize">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 8L8 2M5 8L8 5M8 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      ) : null}
      {isFullscreen && createPortal(
        <div className="chart-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          {/* Inherit theme CSS vars from the dashboard panel */}
          <div
            className={`chart-fullscreen-inner ${document.querySelector('.dashboard-panel')?.className.match(/theme-[\w-]+/)?.[0] || 'theme-light'}`}
            data-theme={document.querySelector('[data-theme]')?.getAttribute('data-theme') || 'light'}
            onClick={e => e.stopPropagation()}
          >
            <div className="chart-fullscreen-header">
              <h3>{card.title}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {card.data?.length > 0 && (
                  <button className="fs-action-btn" onClick={() => exportToCSV(card.data, card.title)}>
                    <Download size={14} /> Export CSV
                  </button>
                )}
                <button className="fs-close-btn" onClick={() => setIsFullscreen(false)}>
                  <Minimize2 size={15} /> Close
                </button>
              </div>
            </div>
            <div className="chart-fullscreen-body">
              {renderContent(460)}
            </div>
            {card.insight && (
              <div className="chart-fullscreen-insight">
                <Sparkles size={12} />
                <p>{card.insight}</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}

// ── Lazy-render wrapper: mounts the chart only when it scrolls into view ──────
function useLazyVisible(rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [rootMargin]);
  return { ref, visible };
}

export const InsightCard = memo(function InsightCard(props: Parameters<typeof InsightCardInner>[0]) {
  const { ref, visible } = useLazyVisible();
  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : 120 }}>
      {visible && <InsightCardInner {...props} />}
    </div>
  );
});
