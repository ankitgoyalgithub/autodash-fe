import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Eye, EyeOff, X, FileText, AlertCircle, Sparkles, Activity, TrendingUp,
  BarChart2, LineChart, PieChart as PieIcon, AreaChart as AreaIcon, Layers, LayoutList,
  DollarSign, ShoppingCart, Users, Hash, ArrowUpRight, ArrowDownRight, Package, Percent,
  CreditCard, TrendingDown, Activity as ActivityIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
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

function formatTooltipValue(val: any, name: string): [string, string] {
  if (typeof val !== 'number') return [String(val ?? ''), name];
  const prefix = isCurrencyKey(name) ? '$' : '';
  return [prefix + formatCompact(val), name];
}

export function InsightCard({ card, layout, onUpdate, editMode, font, colors, posterTheme, onDrillDown, globalFilters }: {
  card: DashboardCard;
  layout?: 'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation';
  onUpdate?: (updates: Partial<DashboardCard>) => void;
  onDrillDown?: (dimension: string, value: string | number) => void;
  editMode?: boolean;
  font?: string;
  colors?: string[];
  posterTheme?: string;
  globalFilters?: Record<string, string | number | null>;
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
    if (globalFilters) {
      for (const [col, val] of Object.entries(globalFilters)) {
        if (val !== null && val !== undefined && data.some(r => col in r)) {
          data = data.filter(row => row[col] === val);
        }
      }
    }
    return data;
  }, [card.data, activeFilter, globalFilters]);

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
      const trendColor = isUp ? '#16a34a' : isDown ? '#dc2626' : '#64748b';
      const trendBg = isUp ? '#dcfce7' : isDown ? '#fee2e2' : '#f1f5f9';

      return (
        <div className="kpi-card-body">
          <div className="kpi-top-row">
            <span className="kpi-title">{card.title}</span>
            <div className="kpi-icon-circle" style={{ background: iconColor }}>
              <MetricIcon size={18} color="#fff" strokeWidth={2} />
            </div>
          </div>
          <div className="kpi-value">{formatted}</div>
          {trendPct !== undefined && (
            <div className="kpi-trend-row">
              <div className="kpi-arrow-circle" style={{ background: trendBg }}>
                {isDown
                  ? <ArrowDownRight size={13} color={trendColor} strokeWidth={2.5} />
                  : <ArrowUpRight size={13} color={trendColor} strokeWidth={2.5} />}
              </div>
              <span className="kpi-trend-pct" style={{ color: trendColor }}>
                {isUp ? '+' : isDown ? '-' : ''}{Math.abs(trendPct).toFixed(1)}%
              </span>
              <span className="kpi-trend-label">vs prior period</span>
            </div>
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
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[i % activeColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />)}
          </ReLineChart>
        </ResponsiveContainer>
      );
      case 'pie': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
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
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
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
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={activeColors[i % activeColors.length]} radius={i === dataKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      );
      case 'combo_bar_line': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            <Bar dataKey={dataKeys[0]} fill={activeColors[0]} radius={[6, 6, 0, 0]} barSize={40} />
            {dataKeys.slice(1).map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[(i + 1) % activeColors.length]} strokeWidth={3} dot={{ r: 4, fill: '#fff' }} />)}
          </ComposedChart>
        </ResponsiveContainer>
      );
      default: return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
            <RTooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={activeColors[i % activeColors.length]} radius={[6, 6, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div
      ref={cardRef}
      className={`chart-card type-${type} size-${size} ${layout || 'grid'} ${editMode ? 'edit-mode' : ''}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
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
            </div>
            <div className={`chart-controls ${type === 'metric' ? 'metric-controls' : ''}`}>
              {type !== 'metric' && (card.type === 'chart' || !card.type) && (
                <div className="type-toggle">
                  <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')} title="Bar chart"><BarChart2 size={13} /></button>
                  <button className={chartType === 'stacked_bar' ? 'active' : ''} onClick={() => setChartType('stacked_bar')} title="Stacked Bar"><Layers size={13} /></button>
                  <button className={chartType === 'area' ? 'active' : ''} onClick={() => setChartType('area')} title="Area chart"><AreaIcon size={13} /></button>
                  <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')} title="Line chart"><LineChart size={13} /></button>
                  <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')} title="Pie chart"><PieIcon size={13} /></button>
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
      {!isPoster && type !== 'metric' && card.stats && (() => {
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
    </div>
  );
}
