import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Eye, EyeOff, X, FileText, AlertCircle, Sparkles, Activity, TrendingUp,
  BarChart2, LineChart, PieChart as PieIcon, AreaChart as AreaIcon, Layers, LayoutList,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
} from 'recharts';
import type { DashboardCard } from '../App';
import { COLORS } from './constants';

export function DataTableModal({ title, data, onClose }: { title: string; data: any[]; onClose: () => void }) {
  if (!data?.length) return null;
  const cols = Object.keys(data[0]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title-combined">
            <FileText size={18} />
            <h2>Source Data: {title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="modal-body premium-scrollbar">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>{cols.map(col => <td key={col}>{row[col]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <span className="data-count">{data.length} rows total</span>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function InsightCard({ card, layout, onUpdate, editMode, font, colors, posterTheme, onDrillDown }: {
  card: DashboardCard;
  layout?: 'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation';
  onUpdate?: (updates: Partial<DashboardCard>) => void;
  onDrillDown?: (dimension: string, value: string | number) => void;
  editMode?: boolean;
  font?: string;
  colors?: string[];
  posterTheme?: string;
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
    if (!activeFilter) return card.data;
    return card.data.filter(row => row[activeFilter.column] === activeFilter.value);
  }, [card.data, activeFilter]);

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

  const type = card.type || (card.data?.length === 1 && Object.keys(card.data?.[0] || {}).length <= 2 ? 'metric' : 'chart');
  const size = card.size || (type === 'metric' ? 'small' : type === 'text' ? 'full' : 'medium');

  const renderContent = () => {
    let resolvedType = card.type;
    if (!resolvedType && card.data?.length === 1 && Object.keys(card.data[0]).length <= 2) {
      resolvedType = 'metric';
    } else if (!resolvedType) {
      resolvedType = 'chart';
    }

    if (resolvedType === 'metric') {
      const val = card.data?.[0] ? Object.values(card.data[0])[0] : 'N/A';
      if (isPoster) {
        const textColor = posterTheme === 'dark' ? '#f8fafc' : '#0f172a';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', paddingTop: 8 }}>
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: textColor, fontFamily: font || 'inherit' }}>
              {typeof val === 'number' ? val.toLocaleString() : String(val)}
            </div>
            {card.insight && (
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 12, fontStyle: 'italic' }}>
                {card.insight}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="metric-content">
          <div className="metric-value">{typeof val === 'number' ? val.toLocaleString() : val}</div>
          <div className="metric-insight">{card.insight}</div>
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
    const chartHeight = size === 'mini' ? 120 : size === 'tall' ? 480 : size === 'small' ? 180 : layout === 'single' ? 400 : 240;
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
          <ReLineChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[i % activeColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />)}
          </ReLineChart>
        </ResponsiveContainer>
      );
      case 'pie': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            <Pie
              data={filteredData}
              cx="50%" cy="50%"
              innerRadius={size === 'small' ? 40 : 60}
              outerRadius={size === 'small' ? 60 : 80}
              dataKey={dataKeys[0]}
              nameKey={xKey}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
              onClick={(data: any) => onDrillDown && data?.name !== undefined && onDrillDown(xKey, data.name as string | number)}
            >
              {filteredData.map((_: any, i: number) => <Cell key={i} fill={activeColors[i % activeColors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
      case 'area': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
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
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={activeColors[i % activeColors.length]} fillOpacity={1} fill={`url(#grad-${i})`} strokeWidth={3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
      case 'stacked_bar': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            {dataKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={activeColors[i % activeColors.length]} radius={i === dataKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      );
      case 'combo_bar_line': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            <Bar dataKey={dataKeys[0]} fill={activeColors[0]} radius={[6, 6, 0, 0]} barSize={40} />
            {dataKeys.slice(1).map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[(i + 1) % activeColors.length]} strokeWidth={3} dot={{ r: 4, fill: '#fff' }} />)}
          </ComposedChart>
        </ResponsiveContainer>
      );
      default: return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={onChartClick}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
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
      <div className="chart-card-head">
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
              {type === 'metric' ? <Activity size={15} className="chart-title-icon" /> : type === 'text' ? <FileText size={15} className="chart-title-icon" /> : <TrendingUp size={15} className="chart-title-icon" />}
              <h4>{card.title}</h4>
            </div>
            <div className="chart-controls">
              {(card.type === 'chart' || !card.type) && (
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
              <button className="view-data-btn" onClick={() => setShowData(true)}>
                <LayoutList size={12} /> Data
              </button>
              {card.filters && card.filters.length > 0 && (
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
      </div>
      <div className="chart-body">{renderContent()}</div>
      {showData && <DataTableModal title={card.title} data={card.data} onClose={() => setShowData(false)} />}
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
