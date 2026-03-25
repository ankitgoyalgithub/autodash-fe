import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, X, FileText, AlertCircle, Sparkles, TrendingUp,
  BarChart2, LineChart, PieChart as PieIcon, AreaChart as AreaIcon, Layers, LayoutList,
  DollarSign, ShoppingCart, Users, Package, Percent,
  CreditCard, FlaskConical,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import type { DashboardCard } from '../App';
import { COLORS } from './constants';

function parseDateLabelToMs(label: string): number | null {
  const s = String(label).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01`).getTime();
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-01`).getTime();
  const monYear = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monYear) { const t = new Date(`${monYear[1]} 1, ${monYear[2]}`).getTime(); if (!isNaN(t)) return t; }
  const quarter = s.match(/^Q(\d)\s+(\d{4})$/i);
  if (quarter) return new Date(`${quarter[2]}-${String((+quarter[1] - 1) * 3 + 1).padStart(2, '0')}-01`).getTime();
  return null;
}

function sortByDateLabel(data: any[], xKey: string): any[] {
  if (data.length < 2) return data;
  const samples = data.slice(0, Math.min(5, data.length));
  const parseable = samples.filter(r => parseDateLabelToMs(String(r[xKey] ?? '')) !== null).length;
  if (parseable < Math.ceil(samples.length / 2)) return data;
  return [...data].sort((a, b) => {
    const ta = parseDateLabelToMs(String(a[xKey] ?? '')) ?? 0;
    const tb = parseDateLabelToMs(String(b[xKey] ?? '')) ?? 0;
    return ta - tb;
  });
}

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

function formatCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return parseFloat(v.toFixed(2)).toLocaleString();
}

function isCurrencyKey(key: string): boolean {
  return /revenue|sales|profit|cost|price|amount|budget|spend|earning|income|value|gmv|arr|mrr|ltv|cac|fee|payment|invoice/i.test(key);
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

function formatAxisTick(val: any, dataKey?: string): string {
  if (typeof val !== 'number') return String(val ?? '');
  const prefix = dataKey && isCurrencyKey(dataKey) ? '$' : '';
  return prefix + formatCompact(val);
}

function formatTooltipValue(val: any, name: string | number | undefined): [string, string] {
  const nameStr = String(name ?? '');
  if (typeof val !== 'number') return [String(val ?? ''), nameStr];
  const prefix = isCurrencyKey(nameStr) ? '$' : '';
  return [prefix + formatCompact(val), nameStr];
}

function prettifyCol(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== null && p.value !== undefined && p.type !== 'none');
  if (!visible.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== '' && (
        <div className="ct-label">{String(label)}</div>
      )}
      {visible.map((p: any, i: number) => {
        const name = prettifyCol(String(p.name ?? p.dataKey ?? ''));
        const [fmtVal] = formatTooltipValue(p.value, p.name ?? p.dataKey);
        return (
          <div key={i} className="ct-row">
            <span className="ct-dot" style={{ background: p.color || p.fill }} />
            <span className="ct-name">{name}</span>
            <span className="ct-value">{fmtVal}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Custom Anomaly Tooltip (adds ⚠ flag) ─────────────────────────────────────
function AnomalyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (!p) return null;
  const isAnomaly = p.payload?.is_anomaly;
  const [fmtVal] = formatTooltipValue(p.value, p.name ?? p.dataKey);
  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== '' && (
        <div className="ct-label">{String(label)}</div>
      )}
      <div className="ct-row">
        <span className="ct-dot" style={{ background: isAnomaly ? '#ef4444' : p.color }} />
        <span className="ct-name">{prettifyCol(String(p.name ?? p.dataKey ?? ''))}</span>
        <span className="ct-value">
          {fmtVal}
          {isAnomaly && <span className="ct-anomaly-flag">⚠ Anomaly</span>}
        </span>
      </div>
    </div>
  );
}

// ── Custom Legend ─────────────────────────────────────────────────────────────
function ChartLegend({ payload }: any) {
  if (!payload?.length) return null;
  const visible = payload.filter((p: any) => p.type !== 'none');
  if (!visible.length) return null;
  return (
    <div className="chart-legend">
      {visible.map((p: any, i: number) => (
        <div key={i} className="cl-item">
          <span className="cl-dot" style={{ background: p.color }} />
          <span className="cl-name">{prettifyCol(String(p.value ?? ''))}</span>
        </div>
      ))}
    </div>
  );
}

function formatCellValue(val: any, col: string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (isCurrencyKey(col)) return '$' + formatCompact(val);
    if (Number.isInteger(val)) return val.toLocaleString();
    return parseFloat(val.toFixed(2)).toLocaleString();
  }
  return String(val);
}

function TableInsight({ data, colors }: { data: any[]; colors: string[] }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!data?.length) return null;
  const cols = Object.keys(data[0]);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const isNumeric = (col: string) => data.slice(0, 5).some(r => typeof r[col] === 'number');
  const accentColor = colors[0] || '#6366f1';

  return (
    <div className="insight-table-wrap">
      <table className="insight-table">
        <thead>
          <tr>
            {cols.map((col, i) => (
              <th
                key={col}
                className={`${isNumeric(col) ? 'num' : ''} ${sortCol === col ? 'sorted' : ''}`}
                onClick={() => handleSort(col)}
                style={sortCol === col ? { color: accentColor } : undefined}
              >
                <span className="th-inner">
                  {prettifyCol(col)}
                  <span className="sort-icon">
                    {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                  </span>
                </span>
                {i === 0 && <div className="th-accent" style={{ background: accentColor }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri}>
              {cols.map((col, ci) => {
                const val = row[col];
                const numeric = typeof val === 'number';
                return (
                  <td key={col} className={numeric ? 'num' : ''}>
                    {ci === 0 && (
                      <span className="row-rank" style={{ background: accentColor + '18', color: accentColor }}>
                        {ri + 1}
                      </span>
                    )}
                    {numeric && isCurrencyKey(col) ? (
                      <span className="cell-currency">{formatCellValue(val, col)}</span>
                    ) : numeric ? (
                      <span className="cell-num">{formatCellValue(val, col)}</span>
                    ) : (
                      <span className="cell-text">{formatCellValue(val, col)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InsightCard({ card, layout, onUpdate, editMode, font, colors, posterTheme, onDrillDown, globalFilters, index }: {
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
}) {
  const [chartType, setChartType] = useState(card.chart_type);
  const [showSql, setShowSql] = useState(false);
  const [showData, setShowData] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{column: string, value: string | number} | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const filteredData = useMemo(() => {
    let data = card.data;
    if (activeFilter) {
      data = data.filter(row => row[activeFilter.column] === activeFilter.value);
    }
    if (globalFilters && !card.is_analytics) {
      for (const [col, val] of Object.entries(globalFilters)) {
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

  const handleResizeDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setIsResizing(true);
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

  const activeColors = colors || COLORS;

  const formatXAxis = (val: any) => {
    if (!val) return val;
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str);
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return str;
  };

  // Normalize legacy size names to new taxonomy
  const _sizeNorm: Record<string, string> = { mini: 's', small: 's', medium: 'm', large: 'l', tall: 'l', wide: 'xl', full: 'xxl', 'ultra-wide': 'xxl' };
  const type = card.type || (card.data?.length === 1 && Object.keys(card.data?.[0] || {}).length <= 2 ? 'metric' : 'chart');
  const rawSize = card.size ? (_sizeNorm[card.size] || card.size) : (type === 'metric' ? 's' : type === 'text' ? 'xxl' : 'l');
  const size = rawSize;

  const renderContent = () => {
    let resolvedType = card.type;
    if (!resolvedType && card.data?.length === 1 && Object.keys(card.data[0]).length <= 2) {
      resolvedType = 'metric';
    } else if (!resolvedType) {
      resolvedType = 'chart';
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

      return (
        <div className="kpi-card-body">
          <div className="kpi-top-row">
            <span className="kpi-title">{card.title}</span>
            <div className="kpi-icon-wrap" style={{ background: iconColor + '1a', border: `1px solid ${iconColor}30` }}>
              <MetricIcon size={16} color={iconColor} strokeWidth={2} />
            </div>
          </div>
          <div className="kpi-value">{formatted}</div>
          {trendPct !== undefined ? (
            <div className="kpi-trend-row">
              <span className="kpi-trend-badge" style={{ background: trendBg, color: trendColor }}>
                {isDown ? '↓' : isUp ? '↑' : '→'}{' '}
                {isUp ? '+' : isDown ? '-' : ''}{Math.abs(trendPct).toFixed(1)}%
              </span>
              <span className="kpi-trend-label">vs prior period</span>
            </div>
          ) : (
            <div className="kpi-spacer" />
          )}
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

    if (!filteredData?.length) return <div className="dp-empty">No data</div>;
    const keys = Object.keys(filteredData[0]);
    const xKey = keys[0];
    const dataKeys = keys.slice(1);
    const displayData = sortByDateLabel(filteredData, xKey);
    const chartHeight = size === 's' ? 120
      : size === 'm' ? 220
      : size === 'l' ? 280
      : size === 'xl' ? 320
      : size === 'xxl' ? 360
      : layout === 'single' ? 400 : 280;
    // Poster mode: clean charts with no grid lines
    const gridStroke = isPoster ? 'transparent' : '#f1f5f9';
    const gridDash = isPoster ? '0' : '3 3';
    const tickColor = 'var(--chart-tick-color, #64748b)';

    const onChartClick = (state: any) => {
      if (state && state.activeLabel !== undefined && onDrillDown) {
        onDrillDown(xKey, state.activeLabel);
      }
    };

    switch (chartType) {
      case 'line': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ReLineChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            {dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[i % activeColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />)}
          </ReLineChart>
        </ResponsiveContainer>
      );
      case 'pie': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            <Pie
              data={displayData}
              cx="50%" cy="50%"
              innerRadius={size === 'small' ? 40 : 60}
              outerRadius={size === 'small' ? 60 : 80}
              dataKey={dataKeys[0]}
              nameKey={xKey}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
              onClick={(data: any) => onDrillDown && data?.name !== undefined && onDrillDown(xKey, data.name as string | number)}
            >
              {displayData.map((_: any, i: number) => <Cell key={i} fill={activeColors[i % activeColors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
      case 'area': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <defs>
              {dataKeys.map((k, i) => (
                <linearGradient key={k} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColors[i % activeColors.length]} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={activeColors[i % activeColors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            {dataKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={activeColors[i % activeColors.length]} fillOpacity={1} fill={`url(#grad-${i})`} strokeWidth={3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
      case 'stacked_bar': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            {dataKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={activeColors[i % activeColors.length]} radius={i === dataKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      );
      case 'combo_bar_line': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            <Bar dataKey={dataKeys[0]} fill={activeColors[0]} radius={[6, 6, 0, 0]} barSize={40} />
            {dataKeys.slice(1).map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[(i + 1) % activeColors.length]} strokeWidth={3} dot={{ r: 4, fill: '#fff' }} />)}
          </ComposedChart>
        </ResponsiveContainer>
      );
      // ── Analytics: Forecast ──────────────────────────────────────────────────
      case 'forecast': {
        const valKey = dataKeys[0] || '';
        const transformed = displayData.map(r => ({
          ...r,
          actual:   r.is_forecast ? null : r[valKey],
          forecast: r.is_forecast ? r[valKey] : null,
          upper:    r[`${valKey}_upper`] ?? null,
          lower:    r[`${valKey}_lower`] ?? null,
        }));
        const boundaryLabel = transformed.filter(r => !r.is_forecast).slice(-1)[0]?.[xKey];
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={transformed} margin={{ top: 8, right: 24, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="ci-band" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={activeColors[0]} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={activeColors[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => formatAxisTick(v, valKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
              <RTooltip content={ChartTooltip} />
              <Legend content={ChartLegend} />
              {/* Confidence band */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ci-band)" legendType="none" name="Upper bound"/>
              {/* Actual line — solid */}
              <Line type="monotone" dataKey="actual" stroke={activeColors[0]} strokeWidth={3} dot={{ r: 3, fill: activeColors[0] }} name={valKey} connectNulls={false}/>
              {/* Forecast line — dashed */}
              <Line type="monotone" dataKey="forecast" stroke={activeColors[0]} strokeWidth={2} strokeDasharray="7 4" dot={{ r: 4, fill: '#fff', stroke: activeColors[0], strokeWidth: 2 }} name="Forecast" connectNulls={false}/>
              {boundaryLabel !== undefined && (
                <ReferenceLine x={String(boundaryLabel)} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '▶ Forecast', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}/>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      // ── Analytics: Priority Matrix ────────────────────────────────────────────
      case 'priority_matrix': {
        const cols = displayData[0] ? Object.keys(displayData[0]) : [];
        const xColKey = card.matrix_config?.x_col
          || cols.find(c => !['quadrant','priority_rank'].includes(c) && typeof displayData[0][c] === 'number') || '';
        const yColKey = card.matrix_config?.y_col
          || cols.filter(c => !['quadrant','priority_rank'].includes(c) && typeof displayData[0][c] === 'number')[1] || '';
        const labelKey = card.matrix_config?.label_col
          || cols.find(c => typeof displayData[0][c] === 'string' && c !== 'quadrant') || '';
        if (!xColKey || !yColKey) return <div className="dp-empty">Priority matrix data unavailable</div>;

        const xVals = displayData.map(r => Number(r[xColKey]));
        const yVals = displayData.map(r => Number(r[yColKey]));
        const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
        const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;

        const QUAD_COLORS: Record<string, string> = {
          'Quick Win':     '#10b981',
          'Major Project': '#6366f1',
          'Fill-In':       '#f59e0b',
          'Avoid':         '#ef4444',
        };
        const QUAD_BG: Record<string, string> = {
          'Quick Win':     '#10b98110',
          'Major Project': '#6366f110',
          'Fill-In':       '#f59e0b10',
          'Avoid':         '#ef444410',
        };

        return (
          <div style={{ position: 'relative', width: '100%', height: chartHeight, userSelect: 'none' }}>
            {/* Quadrant backgrounds */}
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}>
              {[
                { label: '⚡ Quick Win',      color: '#10b981', bg: QUAD_BG['Quick Win'] },
                { label: '🚀 Major Project',  color: '#6366f1', bg: QUAD_BG['Major Project'] },
                { label: '📋 Fill-In',        color: '#f59e0b', bg: QUAD_BG['Fill-In'] },
                { label: '✗ Avoid',           color: '#ef4444', bg: QUAD_BG['Avoid'] },
              ].map(q => (
                <div key={q.label} style={{ background: q.bg, border: `1.5px solid ${q.color}30`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: q.color, opacity: 0.9 }}>
                  {q.label}
                </div>
              ))}
            </div>
            {/* Dots SVG */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              {displayData.map((row, i) => {
                const px = ((Number(row[xColKey]) - xMin) / xRange) * 88 + 6;
                const py = 100 - (((Number(row[yColKey]) - yMin) / yRange) * 88 + 6);
                const qColor = QUAD_COLORS[String(row.quadrant)] || activeColors[0];
                const lbl = String(row[labelKey] || '').slice(0, 14);
                return (
                  <g key={i}>
                    <circle cx={`${px}%`} cy={`${py}%`} r={8} fill={qColor} fillOpacity={0.85}/>
                    <text x={`${px}%`} y={`${py}%`} dy={-12} textAnchor="middle" fontSize={9} fill="#334155" fontWeight={600}>{lbl}</text>
                  </g>
                );
              })}
            </svg>
            {/* Axis labels */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#94a3b8', pointerEvents: 'none' }}>
              ← {xColKey} (effort) →
            </div>
            <div style={{ position: 'absolute', top: '50%', left: 0, fontSize: 10, color: '#94a3b8', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center', pointerEvents: 'none' }}>
              ↑ {yColKey}
            </div>
          </div>
        );
      }

      // ── Analytics: Trend Decomposition ────────────────────────────────────────
      case 'trend': {
        const trendKeys = Object.keys(displayData[0] || {}).filter(k =>
          k !== xKey && !['is_forecast', 'momentum_pct', 'is_anomaly', 'deviation_factor'].includes(k)
        );
        const origKey = trendKeys[0] || '';
        const maKeys  = trendKeys.filter(k => k.startsWith('ma_'));
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
              <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => formatAxisTick(v, origKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
              <RTooltip content={ChartTooltip} />
              <Legend content={ChartLegend} />
              <Bar dataKey={origKey} fill={`${activeColors[0]}55`} radius={[3,3,0,0]} name={origKey}/>
              {maKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={activeColors[i + 1] || '#f59e0b'} strokeWidth={2.5} dot={false} name={k.replace('_', ' ')}/>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      // ── Analytics: Pareto ──────────────────────────────────────────────────────
      case 'pareto': {
        const catKey  = xKey;
        const valKey2 = dataKeys[0] || '';
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={displayData} margin={{ top: 5, right: 40, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
              <XAxis dataKey={catKey} tick={{ fontSize: 10, fill: tickColor }} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: tickColor }} tickFormatter={v => formatAxisTick(v, valKey2)} axisLine={false} tickLine={false} width={56}/>
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36}/>
              <RTooltip content={ChartTooltip} />
              <Legend content={ChartLegend} />
              <Bar yAxisId="left" dataKey={valKey2} radius={[6,6,0,0]} name={valKey2}>
                {displayData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.is_vital_few ? activeColors[0] : '#cbd5e1'}/>
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="Cumulative %"/>
              <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 3" label={{ value: '80%', position: 'insideRight', fontSize: 10, fill: '#ef4444' }}/>
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      // ── Analytics: Heatmap (Correlation) ─────────────────────────────────────
      case 'heatmap': {
        const allCols2 = [...new Set(displayData.flatMap(r => [String(r.col_a), String(r.col_b)]))];
        const corrMap: Record<string, number> = {};
        displayData.forEach(r => { corrMap[`${r.col_a}|${r.col_b}`] = Number(r.correlation); });

        const corrColor = (v: number): string => {
          if (v >  0.7) return '#1d4ed8';
          if (v >  0.4) return '#3b82f6';
          if (v >  0.1) return '#93c5fd';
          if (v >= -0.1) return '#f8fafc';
          if (v >= -0.4) return '#fca5a5';
          if (v >= -0.7) return '#f87171';
          return '#dc2626';
        };
        const textOnCorr = (v: number): string => Math.abs(v) > 0.4 ? '#fff' : '#334155';
        const cSize = Math.max(36, Math.min(80, 300 / Math.max(allCols2.length, 1)));

        return (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: chartHeight + 40, padding: '4px 0' }}>
            <div style={{ display: 'inline-grid', gridTemplateColumns: `80px ${allCols2.map(() => `${cSize}px`).join(' ')}`, gap: 3 }}>
              {/* Header */}
              <div/>
              {allCols2.map(c => (
                <div key={c} title={c} style={{ width: cSize, fontSize: 9, textAlign: 'center', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px', fontWeight: 600 }}>
                  {c.slice(0, 8)}
                </div>
              ))}
              {/* Rows */}
              {allCols2.map(rowCol => (
                <>
                  <div key={`lbl-${rowCol}`} title={rowCol} style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                    {rowCol.slice(0, 12)}
                  </div>
                  {allCols2.map(colCol => {
                    const v = corrMap[`${rowCol}|${colCol}`] ?? 1;
                    return (
                      <div key={`${rowCol}|${colCol}`} title={`${rowCol} × ${colCol}: ${v.toFixed(2)}`} style={{ width: cSize, height: cSize, background: corrColor(v), borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: textOnCorr(v) }}>
                        {v.toFixed(2)}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        );
      }

      // ── Analytics: Anomaly Detection ──────────────────────────────────────────
      case 'anomaly': {
        const aInfo = (card as any).anomaly_info;
        const valKey3 = dataKeys[0] || '';
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={displayData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
              <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => formatAxisTick(v, valKey3)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
              <RTooltip content={AnomalyTooltip} />
              <Legend content={ChartLegend} />
              {aInfo?.normal_range && (
                <ReferenceArea y1={aInfo.normal_range[0]} y2={aInfo.normal_range[1]} fill="#10b98108" stroke="#10b98140" strokeDasharray="4 4" label={{ value: 'Normal range', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }}/>
              )}
              <Bar dataKey={valKey3} name={valKey3} radius={[4,4,0,0]}>
                {displayData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.is_anomaly ? '#ef4444' : activeColors[0]}/>
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      case 'timeline': {
        const TL_COLORS = ['#374f6e', '#e6a817', '#c0395a', '#1b6ca8', '#2abaab', '#6366f1', '#10b981'];
        return (
          <div style={{ position: 'relative', padding: '20px 0 8px', width: '100%' }}>
            {/* Vertical spine */}
            <div style={{
              position: 'absolute', left: '50%', top: 0, bottom: 0,
              width: 2, background: 'var(--gray-200, #e2e8f0)', transform: 'translateX(-50%)',
            }} />
            {displayData.map((row, idx) => {
              const label     = String(row[xKey] ?? '');
              const titleVal  = dataKeys[0] ? String(row[dataKeys[0]] ?? '') : '';
              const descVal   = dataKeys[1] ? String(row[dataKeys[1]] ?? '') : '';
              const isLeft    = idx % 2 === 0;
              const color     = TL_COLORS[idx % TL_COLORS.length];

              const banner = (
                <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                  {/* Left-pointing arrow for right-side entries */}
                  {!isLeft && (
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderRight: `13px solid ${color}`,
                    }} />
                  )}
                  <div style={{
                    background: color, color: '#fff',
                    padding: '10px 20px',
                    borderRadius: isLeft ? '6px 0 0 6px' : '0 6px 6px 0',
                    fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}>{label}</div>
                  {/* Right-pointing arrow for left-side entries */}
                  {isLeft && (
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: `13px solid ${color}`,
                    }} />
                  )}
                </div>
              );

              const card = (titleVal || descVal) ? (
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--gray-200, #e2e8f0)',
                  borderRadius: 10, padding: '12px 16px', marginTop: 10,
                }}>
                  {titleVal && (
                    <div style={{
                      fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700, #344054)',
                      marginBottom: descVal ? 5 : 0,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{titleVal}</div>
                  )}
                  {descVal && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-500, #667085)', lineHeight: 1.55 }}>
                      {descVal}
                    </div>
                  )}
                </div>
              ) : null;

              return (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 40px 1fr',
                  alignItems: 'start', marginBottom: 28,
                }}>
                  {/* Left column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 20 }}>
                    {isLeft && <>{banner}{card}</>}
                  </div>
                  {/* Dot on spine */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 13, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: `3px solid ${color}`, background: 'var(--theme-bg-card, #fff)',
                      flexShrink: 0,
                    }} />
                  </div>
                  {/* Right column */}
                  <div style={{ paddingLeft: 20 }}>
                    {!isLeft && <>{banner}{card}</>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
      case 'table': {
        return <TableInsight data={displayData} colors={activeColors} />;
      }
      default: return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
            <RTooltip content={ChartTooltip} />
            <Legend content={ChartLegend} />
            {dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={activeColors[i % activeColors.length]} radius={[6, 6, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      );
    }
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
              {type === 'text' ? <FileText size={15} className="chart-title-icon" /> : <TrendingUp size={15} className="chart-title-icon" />}
              <h4>{card.title}</h4>
              {card.is_analytics && (
                <span className="analytics-badge" title="Generated by Advanced Analytics Engine">
                  <FlaskConical size={10}/> Analytics
                </span>
              )}
            </div>
            <div className={`chart-controls ${type === 'metric' ? 'metric-controls' : ''}`}>
              {type !== 'metric' && (card.type === 'chart' || !card.type) && (
                <div className="type-toggle">
                  <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')} title="Bar chart"><BarChart2 size={13} /></button>
                  <button className={chartType === 'stacked_bar' ? 'active' : ''} onClick={() => setChartType('stacked_bar')} title="Stacked Bar"><Layers size={13} /></button>
                  <button className={chartType === 'area' ? 'active' : ''} onClick={() => setChartType('area')} title="Area chart"><AreaIcon size={13} /></button>
                  <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')} title="Line chart"><LineChart size={13} /></button>
                  <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')} title="Pie chart"><PieIcon size={13} /></button>
                  <button className={chartType === 'timeline' ? 'active' : ''} onClick={() => setChartType('timeline')} title="Timeline"><span style={{fontSize:9,fontWeight:800}}>TL</span></button>
                </div>
              )}
              <button className={`sql-btn ${showSql ? 'active' : ''}`} onClick={() => setShowSql(s => !s)}>
                {showSql ? <EyeOff size={12} /> : <Eye size={12} />} SQL
              </button>
              {type !== 'metric' && (
                <button className="view-data-btn" onClick={() => setShowData(true)}>
                  <LayoutList size={12} /> Data
                </button>
              )}
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
                    <option value="">No Filter</option>
                    {card.filters.map(f => (
                      <optgroup key={f.column} label={f.column}>
                        {f.options.map(opt => <option key={opt} value={`${f.column}:${opt}`}>{opt}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
      </div>}
      <div className={type === 'metric' && !isPoster ? '' : 'chart-body'}>{renderContent()}</div>
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
            <Sparkles size={13} className="insight-icon" />
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

      {editMode && layout === 'poster' && (
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
      )}
    </motion.div>
  );
}
