import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, FolderOpen, Plus, Database,
  X, Send, ImageIcon, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, Eye, EyeOff, Zap, ChevronRight,
  Clock, BarChart2, LineChart, PieChart as PieIcon, Sparkles,
  Upload, TrendingUp, LayoutGrid, LayoutList, Square, Activity, FileText,
  Palette, AreaChart as AreaIcon, Layers, LayoutTemplate, Columns, MousePointer2, Move
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import logo from './assets/logo.png';
import './App.css';
import Login from './components/Login';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';

const BASE = 'http://127.0.0.1:8000/api';
const PALETTES = {
  vibrant: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#f97316', '#06b6d4', '#84cc16'],
  pastel: ['#a5b4fc', '#c4b5fd', '#f9a8d4', '#fcd34d', '#6ee7b7', '#93c5fd', '#fca5a5', '#fdba74', '#67e8f9', '#bef264'],
  neon: ['#00f2ff', '#7000ff', '#ff00d9', '#fffb00', '#00ff40', '#ff8c00', '#ff0055', '#4dff00', '#0077ff', '#bc00ff'],
  corporate: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#0f172a', '#1e1b4b', '#312e81'],
  emerald: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#064e3b', '#065f46', '#047857', '#059669', '#10b981'],
  royal: ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#eff6ff', '#1e3a8a'],
  cyberpunk: ['#ff0055', '#00ff9f', '#00b8ff', '#f000ff', '#fffb00', '#ff8c00', '#00f2ff', '#bc00ff', '#7000ff', '#ff00d9']
};
const FONTS = [
  { id: 'inter', name: 'Inter (Clean)', value: "'Inter', sans-serif" },
  { id: 'roboto', name: 'Roboto (System)', value: "'Roboto', sans-serif" },
  { id: 'playfair', name: 'Playfair (Elegant)', value: "'Playfair Display', serif" },
  { id: 'montserrat', name: 'Montserrat (Modern)', value: "'Montserrat', sans-serif" },
  { id: 'jetbrains', name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" }
];
const COLORS = PALETTES.vibrant;

type View = 'home' | 'dashboards' | 'workspace' | 'public';

interface Datasource { id: number; name: string; host: string; port: number; database: string; username: string; }
interface Project { id: number; name: string; description: string; emoji: string; color: string; chart_count: number; datasource: Datasource | null; updated_at: string; created_at: string; }
interface DashboardCard { 
  type?: 'chart' | 'metric' | 'text';
  size?: 'mini' | 'small' | 'medium' | 'wide' | 'full' | 'tall';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  data: Record<string, string | number>[]; 
  chart_type: string; 
  title: string; 
  insight: string; 
  sql: string; 
  error?: string; 
}
interface HistoryEntry { id: number; query: string; results_data: DashboardCard[];
  reference_images: string[];
  created_at: string;
  is_deployed?: boolean;
  deploy_slug?: string;
}
interface DashboardThread { id: number; title: string; updated_at: string; created_at: string; }
interface UploadedFile { url: string; path: string; filename: string; image_context: string; preview: string; }

const THEMES = [
  { id: 'light', name: 'Light', color: '#ffffff', class: '' },
  { id: 'dark-pro', name: 'Dark Pro', color: '#1e293b', class: 'theme-dark-pro' },
  { id: 'midnight', name: 'Midnight', color: '#030712', class: 'theme-midnight' },
  { id: 'glassmorphism', name: 'Glassmorphism', color: '#ebedee', class: 'theme-glassmorphism' },
  { id: 'corporate', name: 'Corporate', color: '#0f172a', class: 'theme-corporate' },
  { id: 'sunset', name: 'Sunset', color: '#f97316', class: 'theme-sunset' },
  { id: 'ocean', name: 'Ocean', color: '#06b6d4', class: 'theme-ocean' },
  { id: 'neon', name: 'Neon', color: '#a855f7', class: 'theme-neon' },
];

const EMOJIS = ['📊','📈','📉','🗂️','💡','🚀','🏆','💰','🌍','⚡','🎯','📦'];

const TEMPLATES = [
  { id: 'sales', emoji: '💰', name: 'Sales Leader', desc: 'Revenue trends, top customers, product breakdown', prompt: 'Build me a comprehensive Sales Leader Dashboard' },
  { id: 'marketing', emoji: '📣', name: 'Marketing Analyst', desc: 'Customer acquisition, retention, regional reach', prompt: 'Build me a Marketing Analytics Dashboard' },
  { id: 'finance', emoji: '📊', name: 'Finance Overview', desc: 'Revenue vs targets, margins, outstanding invoices', prompt: 'Build me a Finance Overview Dashboard' },
  { id: 'operations', emoji: '⚙️', name: 'Operations Hub', desc: 'Inventory flow, order volume, fulfillment speed', prompt: 'Build me an Operations Hub Dashboard' },
  { id: 'hr', emoji: '👥', name: 'HR People Analytics', desc: 'Headcount trends, department mix, tenure analysis', prompt: 'Build me an HR People Analytics Dashboard' },
];

function InsightCard({ card, layout, onUpdate, editMode, font, colors }: { 
  card: DashboardCard; 
  layout?: 'grid' | 'masonry' | 'single' | 'exec' | 'poster' | 'hub' | 'split' | 'magazine' | 'presentation';
  onUpdate?: (updates: Partial<DashboardCard>) => void;
  editMode?: boolean;
  font?: string;
  colors?: string[];
}) {
  const [chartType, setChartType] = useState(card.chart_type);
  const [showSql, setShowSql] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
        y: e.clientY - rect.top
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
    } : {})
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
    // If it looks like a month number or ISO date, try to format
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str);
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return str;
  };


  const renderContent = () => {
    let type = card.type;
    
    // Fallback: If AI didn't specify type, guess based on data shape
    if (!type && card.data?.length === 1 && Object.keys(card.data[0]).length <= 2) {
      type = 'metric';
    } else if (!type) {
      type = 'chart';
    }
    
    if (type === 'metric') {
      const val = card.data?.[0] ? Object.values(card.data[0])[0] : 'N/A';
      return (
        <div className="metric-content">
          <div className="metric-value">{typeof val === 'number' ? val.toLocaleString() : val}</div>
          <div className="metric-insight">{card.insight}</div>
        </div>
      );
    }

    if (type === 'text') {
      return (
        <div className="text-content">
          <p>{card.insight}</p>
          {card.data?.length > 0 && (
            <div className="text-data-table">
              <table>
                <thead><tr>{Object.keys(card.data[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>{card.data.slice(0, 5).map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // Default: Chart
    if (!card.data?.length) return <div className="dp-empty">No data</div>;
    const keys = Object.keys(card.data[0]);
    const xKey = keys[0];
    const dataKeys = keys.slice(1);
    const chartHeight = card.size === 'mini' ? 120 : card.size === 'tall' ? 480 : card.size === 'small' ? 180 : layout === 'single' ? 400 : 240;

    switch (chartType) {
      case 'line': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ReLineChart data={card.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
            <Pie data={card.data} cx="50%" cy="50%" innerRadius={size === 'small' ? 40 : 60} outerRadius={size === 'small' ? 60 : 80} dataKey={dataKeys[0]} nameKey={xKey} label={({ name, percent }) => `${name} ${((percent||0)*100).toFixed(0)}%`} labelLine={false}>
              {card.data.map((_, i) => <Cell key={i} fill={activeColors[i % activeColors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
      case 'area': return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={card.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {dataKeys.map((k, i) => (
                <linearGradient key={k} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColors[i % activeColors.length]} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={activeColors[i % activeColors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
          <BarChart data={card.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
          <ComposedChart data={card.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
            <Legend iconType="circle" />
            <Bar dataKey={dataKeys[0]} fill={activeColors[0]} radius={[6, 6, 0, 0]} barSize={40} />
            {dataKeys.slice(1).map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={activeColors[(i+1) % activeColors.length]} strokeWidth={3} dot={{ r: 4, fill: '#fff' }} />)}
          </ComposedChart>
        </ResponsiveContainer>
      );
      default: return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={card.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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

  const type = card.type || (card.data?.length === 1 && Object.keys(card.data?.[0] || {}).length <= 2 ? 'metric' : 'chart');
  const size = card.size || (type === 'metric' ? 'small' : type === 'text' ? 'full' : 'medium');

  return (
    <div 
      ref={cardRef}
      className={`chart-card type-${type} size-${size} ${layout || 'grid'} ${editMode ? 'edit-mode' : ''}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="chart-card-head">
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
        </div>
      </div>
      <div className="chart-body">{renderContent()}</div>
      {(type === 'chart') && card.insight && (
        <div className="insight-row">
          <Sparkles size={13} className="insight-icon" />
          <p>{card.insight}</p>
        </div>
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
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div style={{ width: 4, height: 4, borderRight: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'translate(-2px, -2px)' }} />
        </div>
      )}
    </div>
  );
}

/* ─── Datasource Form ─────────────────────────────────────── */
function DatasourceForm({ onSave, testing, testResult, onTest }: { onSave: (d: object) => void; testing: boolean; testResult: { ok: boolean; msg: string } | null; onTest: (cfg: object) => void }) {
  const [form, setForm] = useState({ name: '', host: '127.0.0.1', port: '5432', database: '', username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="ds-form">
      <div className="form-row"><div className="field full"><label>Connection Name</label><input placeholder="e.g. Production DB" value={form.name} onChange={u('name')} /></div></div>
      <div className="form-row">
        <div className="field"><label>Host</label><input placeholder="127.0.0.1" value={form.host} onChange={u('host')} /></div>
        <div className="field sm"><label>Port</label><input placeholder="5432" value={form.port} onChange={u('port')} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Database</label><input placeholder="my_database" value={form.database} onChange={u('database')} /></div>
        <div className="field"><label>Username</label><input placeholder="postgres" value={form.username} onChange={u('username')} /></div>
      </div>
      <div className="form-row">
        <div className="field full pw-field">
          <label>Password</label>
          <div className="pw-wrap"><input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={u('password')} /><button className="pw-toggle" type="button" onClick={() => setShowPw(s => !s)}>{showPw ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>
        </div>
      </div>
      {testResult && <div className={`test-result ${testResult.ok ? 'ok' : 'err'}`}>{testResult.ok ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}{testResult.msg}</div>}
      <div className="ds-actions">
        <button className="btn-ghost-indigo" type="button" onClick={() => onTest(form)} disabled={testing}>{testing ? <Loader2 size={13} className="spin"/> : <Zap size={13}/>}Test Connection</button>
        <button className="btn-primary" type="button" onClick={() => onSave({ ...form, port: parseInt(form.port) })}>Save & Connect</button>
      </div>
    </div>
  );
}

/* ─── New Project Modal ───────────────────────────────────── */
function NewProjectModal({ datasources, onClose, onCreate }: { datasources: Datasource[]; onClose: () => void; onCreate: (d: object) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [emoji, setEmoji] = useState('📊');
  const [color, setColor] = useState('#6366f1');
  const [selectedDs, setSelectedDs] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(datasources.length === 0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok:boolean; msg:string}|null>(null);
  const [savedDs, setSavedDs] = useState<string>('');

  const handleTest = async (cfg: object) => {
    setTesting(true); setTestResult(null);
    try { const r = await axios.post(`${BASE}/datasources/test/`, cfg); setTestResult({ ok: true, msg: r.data.message }); }
    catch (e: any) { setTestResult({ ok: false, msg: e.response?.data?.message || 'Connection failed.' }); }
    finally { setTesting(false); }
  };

  const handleSaveDs = async (cfg: object) => {
    try { const r = await axios.post(`${BASE}/datasources/`, cfg); setSelectedDs(r.data.id); setSavedDs(r.data.name); setAddingNew(false); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to save datasource.'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h2>New Project</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
        <div className="steps-bar">
          <div className={`step ${step >= 1 ? 'active' : ''}`}><span>1</span>Setup</div>
          <div className="step-line"/>
          <div className={`step ${step >= 2 ? 'active' : ''}`}><span>2</span>Data Source</div>
        </div>

        {step === 1 && (
          <div className="modal-body">
            <div className="field full"><label>Project name</label><input autoFocus placeholder="e.g. Sales Analytics 2024" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field full"><label>Description <span className="opt">(optional)</span></label><input placeholder="What are you tracking?" value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <div className="field full"><label>Icon</label><div className="emoji-grid">{EMOJIS.map(e => <button key={e} className={`emoji-pick ${emoji === e ? 'sel' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
            <div className="field full"><label>Color theme</label><div className="palette">{PALETTES.vibrant.map(c => <button key={c} className={`pal-dot ${color === c ? 'sel' : ''}`} style={{background:c}} onClick={() => setColor(c)}/>)}</div></div>
            <div className="modal-footer"><button className="btn-primary" onClick={() => setStep(2)} disabled={!name.trim()}>Continue →</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="modal-body">
            {datasources.length > 0 && !addingNew && (
              <>
                <div className="ds-list">{datasources.map(d => (
                  <button key={d.id} className={`ds-item ${selectedDs === d.id ? 'sel' : ''}`} onClick={() => setSelectedDs(d.id)}>
                    <div className="ds-icon"><Database size={16}/></div>
                    <div><strong>{d.name}</strong><span>{d.host}:{d.port}/{d.database}</span></div>
                    {selectedDs === d.id && <CheckCircle2 size={16} className="check"/>}
                  </button>
                ))}</div>
                <button className="btn-link" onClick={() => setAddingNew(true)}><Plus size={13}/>Add new datasource</button>
              </>
            )}
            {addingNew && (
              <>
                {savedDs && <div className="saved-badge"><CheckCircle2 size={13}/> "{savedDs}" connected</div>}
                {!savedDs && <DatasourceForm onSave={handleSaveDs} testing={testing} testResult={testResult} onTest={handleTest} />}
                {datasources.length > 0 && !savedDs && <button className="btn-link" onClick={() => setAddingNew(false)}>← Use existing</button>}
              </>
            )}
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => onCreate({ name, description: desc, emoji, color, datasource_id: selectedDs })}>Create Project ✨</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SIDEBAR ─────────────────────────────────────────────── */
function Sidebar({ view, setView, projects, activeProject, activeThreadId, onSelectProject, onNewProject, onSelectThread, onAddThread }: {
  view: View; setView: (v: View) => void;
  projects: Project[]; activeProject: Project | null; activeThreadId: number | null;
  onSelectProject: (p: Project) => void; onNewProject: () => void;
  onSelectThread: (tId: number) => void; onAddThread: () => void;
}) {
  const [threads, setThreads] = useState<DashboardThread[]>([]);

  useEffect(() => {
    if (activeProject) {
      axios.get(`${BASE}/threads/?project_id=${activeProject.id}`)
        .then(r => setThreads(r.data))
        .catch(() => {});
    }
  }, [activeProject, activeThreadId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="AutoDashboard" className="logo-img"/>
        <span className="logo-name">AutoDashboard</span>
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
          <FolderOpen size={16}/> Projects
        </button>
        <button className={`nav-item ${view === 'dashboards' ? 'active' : ''}`} onClick={() => setView('dashboards')}>
          <LayoutDashboard size={16}/> All Dashboards
        </button>
      </nav>

      <div className="sidebar-projects">
        {projects.map(p => (
          <div key={p.id}>
            <button className={`sidebar-project ${activeProject?.id === p.id && view === 'workspace' ? 'active' : ''}`} onClick={() => onSelectProject(p)}>
              <span className="proj-emoji">{p.emoji}</span>
              <span className="proj-name">{p.name}</span>
            </button>
            
            {activeProject?.id === p.id && view === 'workspace' && (
              <div className="sidebar-threads">
                {threads.map(t => (
                  <button key={t.id} className={`sidebar-thread ${activeThreadId === t.id ? 'active' : ''}`} onClick={() => onSelectThread(t.id)}>
                    <ChevronRight size={10}/>
                    <span>{t.title}</span>
                  </button>
                ))}
                <button className="sidebar-new-thread" onClick={onAddThread}><Plus size={12}/> New Dashboard</button>
              </div>
            )}
          </div>
        ))}
        <button className="sidebar-new-project" onClick={onNewProject}><Plus size={14}/> New project</button>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-mini">
          <div className="user-icon-sm">{(localStorage.getItem('autodash_user') ? JSON.parse(localStorage.getItem('autodash_user') || '{}').username?.[0].toUpperCase() : 'U')}</div>
          <div className="user-info">
            <span className="user-name">{JSON.parse(localStorage.getItem('autodash_user') || '{}').username || 'User'}</span>
            <button className="logout-link" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Logout</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── HOME — Projects Grid ───────────────────────────────── */
function ProjectsHome({ projects, onOpen, onNewProject }: { projects: Project[]; onOpen: (p: Project) => void; onNewProject: () => void }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Each project is a dashboard workspace connected to a datasource</p>
        </div>
        <button className="btn-primary" onClick={onNewProject}><Plus size={15}/> New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-art">📊</div>
          <h3>Create your first project</h3>
          <p>Connect a database, describe your goals, and AutoDashboard builds the charts.</p>
          <button className="btn-primary" onClick={onNewProject}><Plus size={15}/> New Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <button key={p.id} className="proj-card" onClick={() => onOpen(p)}>
              <div className="proj-card-emoji" style={{ background: p.color + '18', border: `1.5px solid ${p.color}30` }}>{p.emoji}</div>
              <div className="proj-card-body">
                <h3>{p.name}</h3>
                {p.description && <p>{p.description}</p>}
                <div className="proj-card-meta">
                  {p.datasource && <span><Database size={11}/>{p.datasource.database}</span>}
                  <span><BarChart2 size={11}/>{p.chart_count} charts</span>
                  <span><Clock size={11}/>{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="proj-card-arrow" style={{color: p.color}}><ChevronRight size={16}/></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DASHBOARDS LIST ───────────────────────────────────────── */
function DashboardsList({ projects, onOpenEntry }: { projects: Project[]; onOpenEntry: (project: Project, entry: HistoryEntry) => void }) {
  const [allEntries, setAllEntries] = useState<(HistoryEntry & { project: Project })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  useEffect(() => {
    const fetchAll = async () => {
      const results: (HistoryEntry & { project: Project })[] = [];
      for (const p of projects) {
        try {
          const r = await axios.get(`${BASE}/history/?project_id=${p.id}`);
          r.data.forEach((e: HistoryEntry) => results.push({ ...e, project: p }));
        } catch {}
      }
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllEntries(results);
      setLoading(false);
    };
    fetchAll();
  }, [projects]);

  const filtered = filterProject === 'all' ? allEntries : allEntries.filter(e => e.project.id === filterProject);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Dashboards</h1>
          <p className="page-sub">Browse all generated dashboards across all projects</p>
        </div>
        <div className="filter-bar">
          <label htmlFor="filter-proj">Filter:</label>
          <select id="filter-proj" value={filterProject} onChange={e => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><Loader2 size={24} className="spin"/><p>Loading dashboards...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="empty-art">📈</div><h3>No dashboards yet</h3><p>Start a project and generate your first dashboard.</p></div>
      ) : (
        <div className="dashboard-list">
          {filtered.map(entry => (
            <button key={entry.id} className="dashboard-entry" onClick={() => onOpenEntry(entry.project, entry)}>
              <div className="entry-emoji" style={{ background: entry.project.color + '18' }}>{entry.project.emoji}</div>
              <div className="entry-body">
                <div className="entry-top">
                  <div className="entry-meta-tag" style={{ color: entry.project.color, background: entry.project.color + '18' }}>{entry.project.name}</div>
                  <span className="entry-date"><Clock size={11}/>{new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <h4>{entry.query}</h4>
                <div className="entry-stats">
                  <span><BarChart2 size={12}/>{entry.results_data?.length || 0} charts</span>
                  {entry.reference_images?.length > 0 && <span><ImageIcon size={12}/>{entry.reference_images.length} refs</span>}
                </div>
              </div>
              <div className="entry-arrow"><ChevronRight size={16}/></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── WORKSPACE ─────────────────────────────────────────────── */
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
                <div className="theme-swatch" style={{ background: t.color, border: t.id==='light'?'1px solid #ddd':'none' }}/>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Workspace({ project, onBack, initialThreadId }: { project: Project; onBack: () => void; initialThreadId?: number }) {
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
  const [palette, setPalette] = useState('vibrant');
  const [layoutMode, setLayoutMode] = useState<'dashboard' | 'infographic'>('dashboard');
  const [editMode, setEditMode] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'themes' | 'layouts' | null>(null);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchThreadHistory = useCallback(async (tId: number) => {
    try {
      const r = await axios.get(`${BASE}/threads/${tId}/`);
      const threadHistory = r.data.history;
      setHistory(threadHistory);
      // Ensure we select the latest generation automatically
      if (threadHistory.length > 0) {
        setActiveEntry(threadHistory[threadHistory.length - 1]);
      }
    } catch {
      setError("Failed to load conversation history.");
    }
  }, []);

  useEffect(() => {
    if (initialThreadId !== currentThreadId) {
      setCurrentThreadId(initialThreadId || null);
    }
  }, [initialThreadId, currentThreadId]);

  useEffect(() => {
    if (currentThreadId) {
      fetchThreadHistory(currentThreadId);
    } else {
      setHistory([]);
      setActiveEntry(null);
    }
  }, [currentThreadId, fetchThreadHistory]);

  useEffect(() => {
    if (!activeEntry || layout !== 'poster') return;
    const timer = setTimeout(async () => {
      try {
        await axios.patch(`${BASE}/history/`, {
          id: activeEntry.id,
          results_data: activeEntry.results_data
        });
      } catch (err) {
        console.error("Failed to persist layout:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeEntry?.results_data, activeEntry?.id, layout]);

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

  const handleSubmit = async () => {
    if (!query.trim() && uploads.length === 0) return;
    const promptText = query.trim() || 'Build dashboard from the uploaded reference images.';
    const imgContexts = uploads.map(u => u.image_context).filter(Boolean);
    const imgUrls = uploads.map(u => u.url);
    
    setOptimisticPrompt(promptText);
    setLoading(true); setError(''); setQuery(''); setUploads([]);
    
    try {
      const r = await axios.post(`${BASE}/query/`, {
        query: promptText,
        project_id: project.id,
        thread_id: currentThreadId,
        image_contexts: imgContexts,
        reference_images: imgUrls,
      });
      
      const newThreadId = r.data.thread_id;
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
        if (suggestedLayout === 'poster') {
          setLayoutMode('infographic');
        } else {
          setLayoutMode('dashboard');
        }
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

  return (
    <div className={`workspace theme-${theme.id}`}>

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
              <div className="theme-mini-list-container">
                <header className="sub-header">Color Theme</header>
                <div className="theme-mini-list">
                  {THEMES.map(t => (
                    <button key={t.id} className={`theme-mini-item ${theme.id === t.id ? 'active' : ''}`} onClick={() => setTheme(t)}>
                      <div className="theme-mini-preview" style={{ background: t.id === 'light' ? '#fff' : t.id === 'dark-pro' ? '#1e293b' : 'linear-gradient(135deg, #6366f1, #ec4899)' }}></div>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
                <hr className="config-divider" />
                <header className="sub-header">Chart Palette</header>
                <div className="layout-grid-select" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.keys(PALETTES).map(p => (
                    <button key={p} className={`palette-btn ${palette === p ? 'active' : ''}`} onClick={() => setPalette(p)} style={{ display: 'flex', gap: '4px', padding: '8px', border: '1px solid var(--theme-border)', borderRadius: '8px', background: 'var(--theme-bg-app)' }}>
                      {PALETTES[p as keyof typeof PALETTES].slice(0, 4).map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
                    </button>
                  ))}
                </div>
                <hr className="config-divider" />
                <header className="sub-header">Typography</header>
                <div className="theme-mini-list">
                  {FONTS.map(f => (
                    <button key={f.id} className={`theme-mini-item ${font.id === f.id ? 'active' : ''}`} onClick={() => setFont(f)}>
                      <span style={{ fontFamily: f.value, fontSize: '0.9rem' }}>{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
                {activeSideTab === 'layouts' && (
              <div className="layout-options">
                <button className={`layout-option ${layoutMode === 'dashboard' ? 'active' : ''}`} onClick={() => { setLayoutMode('dashboard'); if (layout === 'poster') setLayout('grid'); }}>
                  <LayoutGrid size={16}/>
                  <div><strong>Dashboard</strong><p>Classic grid for multi-chart reports</p></div>
                </button>
                <button className={`layout-option ${layoutMode === 'infographic' ? 'active' : ''}`} onClick={() => { setLayoutMode('infographic'); setLayout('poster'); }}>
                  <LayoutList size={16}/>
                  <div><strong>Poster / Infographic</strong><p>Rich, canvas-like narrative poster</p></div>
                </button>
                <hr className="config-divider" />
                <div className="layout-sub-options">
                  <header>View Mode</header>
                  <div className="layout-grid-select">
                    <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} title="Grid"><LayoutGrid size={14}/></button>
                    <button className={layout === 'exec' ? 'active' : ''} onClick={() => setLayout('exec')} title="Executive"><Columns size={14}/></button>
                    <button className={layout === 'hub' ? 'active' : ''} onClick={() => setLayout('hub')} title="Analytical Hub"><LayoutList size={14}/></button>
                    <button className={layout === 'split' ? 'active' : ''} onClick={() => setLayout('split')} title="Comparison Split"><Columns size={14} style={{transform:'rotate(90deg)'}}/></button>
                    <button className={layout === 'magazine' ? 'active' : ''} onClick={() => setLayout('magazine')} title="Magazine"><LayoutDashboard size={14}/></button>
                    <button className={layout === 'presentation' ? 'active' : ''} onClick={() => setLayout('presentation')} title="Presentation"><Plus size={14}/></button>
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
        {/* Chat header */}
        <div className="chat-header">
          <button className="back-link" onClick={onBack}><ArrowLeft size={14}/> Back</button>
          <div className="chat-header-project">
            <span className="chat-proj-emoji">{project.emoji}</span>
            <div>
              <strong>{project.name}</strong>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="chat-messages premium-scrollbar">
          {history.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="chat-empty-icon" style={{ background: project.color + '18' }}>{project.emoji}</div>
              <p>How can I help you today?</p>
            </div>
          )}

          {/* Render all history as chat bubbles */}
          {[...history].reverse().map(entry => (
            <div key={entry.id} className="convo-block">
              {/* User message */}
              <div className="user-msg">
                <div className="user-avatar" style={{ background: project.color }}>{project.emoji}</div>
                <div className="user-bubble">
                  <p>{entry.query}</p>
                </div>
              </div>

              {/* AI message */}
              <button
                className={`ai-msg ${activeEntry?.id === entry.id ? 'selected' : ''}`}
                onClick={() => setActiveEntry(entry)}
              >
                <div className="ai-avatar"><img src={logo} alt="AI"/></div>
                <div className="charts-wrap">
                  <div className="ai-intro">
                    <Sparkles size={14}/>
                    <span>Generated {entry.results_data?.length || 0} charts</span>
                  </div>
                </div>
              </button>
            </div>
          ))}

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

        {/* Composer */}
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
            <button className="comp-icon" onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 size={16} className="spin"/> : <Upload size={16}/>}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.csv" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)}/>
            <textarea
              className="comp-textarea"
              placeholder="Tell AI what to build..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              rows={1}
            />
            <button className="comp-send" style={{ background: project.color }} onClick={handleSubmit} disabled={loading || (!query.trim() && !uploads.length)}>
              {loading ? <Loader2 size={15} className="spin"/> : <Send size={15}/>}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Live Dashboard Panel ───────────────────── */}
      <div className="dashboard-panel">
        {/* Dashboard header */}
        <div className="dp-header">
          {activeEntry ? (
            <div className="dp-header-main">
              <div className="dp-header-left">
                <div className="dp-title">
                  <LayoutDashboard size={15} className="dp-title-icon"/>
                  <span>{activeEntry.query}</span>
                </div>
                <div className="dp-meta">
                  <Clock size={11}/>{new Date(activeEntry.created_at).toLocaleTimeString()}
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

        {/* Dashboard content */}
        <div className={`dp-content ${layoutMode}-mode`}>
          {!activeEntry && !loading && (
            <div className="dp-empty">
              <div className="dp-empty-icon" style={{ background: project.color + '15', border: `1.5px dashed ${project.color}50` }}>
                <LayoutDashboard size={28} style={{ color: project.color, opacity: 0.7 }}/>
              </div>
              <h3>No dashboard selected</h3>
              <p>Send a prompt in the chat or click a previous response to view its charts here.</p>
            </div>
          )}

          {activeEntry && (
            <div className={`dp-charts layout-${layout} ${editMode ? 'edit-mode' : ''}`}>
              {(activeEntry.results_data || []).length === 0 ? (
                <div className="dp-empty"><h3>No charts in this response</h3></div>
              ) : (
                <div className="dp-grid">
                  {layout === 'exec' ? (
                    <div className="exec-grid">
                      <div className="exec-metrics">
                        {activeEntry.results_data.filter(c => c.size === 'small' || c.size === 'mini' || c.type === 'metric').slice(0, 4).map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                      </div>
                      <div className="exec-charts">
                        {activeEntry.results_data.filter(c => c.size !== 'small' && c.size !== 'mini' && c.type !== 'metric').map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                      </div>
                    </div>
                  ) : layout === 'hub' ? (
                    <div className="hub-grid">
                      <div className="hub-main">
                        {activeEntry.results_data.filter(c => (c.size === 'wide' || c.size === 'full') && c.type !== 'metric').slice(0, 1).map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                      </div>
                      <div className="hub-side">
                        {activeEntry.results_data.filter((c, i) => (c.size !== 'wide' && c.size !== 'full') || i > 0).map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                      </div>
                    </div>
                  ) : layout === 'split' ? (
                    <div className="split-grid">
                      {activeEntry.results_data.slice(0, 2).map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                    </div>
                  ) : layout === 'magazine' ? (
                    <div className="magazine-grid">
                      {activeEntry.results_data.map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                    </div>
                  ) : layout === 'presentation' ? (
                    <div className="presentation-grid">
                      {activeEntry.results_data.map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)}
                    </div>
                  ) : (
                    activeEntry.results_data.map((card, i) => <InsightCard key={i} card={card} layout={layout} editMode={editMode} font={font.value} colors={PALETTES[palette as keyof typeof PALETTES]} onUpdate={(u) => handleUpdateCard(card, u)}/>)
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




/* ─── PUBLIC VIEW ───────────────────────────────────────── */
function PublicDashboardView({ base }: { base: string }) {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublic = async () => {
      try {
        const r = await axios.get(`${base}/public/${slug}/`);
        setData(r.data);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Dashboard not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublic();
  }, [slug, base]);

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin"/><p>Loading dashboard...</p></div>;
  if (error) return <div className="empty"><AlertCircle size={48}/><p>{error}</p></div>;

  return (
    <div className="page public-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <p className="page-sub">Project: {data.project_name} • Created on {new Date(data.created_at).toLocaleDateString()}</p>
        </div>
        <button className="btn-primary" onClick={() => window.location.href = '/'}>
          <LayoutDashboard size={15}/> Back to Dashboard
        </button>
      </div>
      <div className="charts-grid">
        {data.results_data.map((card: any, i: number) => (
          <InsightCard key={i} card={card} layout="grid" />
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN APP CONTENT ───────────────────────────────────── */
function MainAppContent({ token, user, onLogout }: { token: string, user: any, onLogout: () => void }) {
  const [view, setView] = useState<View>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [initialThreadId, setInitialThreadId] = useState<number | undefined>(undefined);
  const [showNewModal, setShowNewModal] = useState(false);

  // Set auth header for all requests in this component
  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Token ${token}`;
  }, [token]);

  const fetchBasics = async () => {
    try { const r = await axios.get(`${BASE}/projects/`); setProjects(r.data); } catch {}
    try { const r = await axios.get(`${BASE}/datasources/`); setDatasources(r.data); } catch {}
  };
  
  useEffect(() => { fetchBasics(); }, []);

  const handleCreateProject = async (data: object) => {
    try {
      const r = await axios.post(`${BASE}/projects/`, data);
      await fetchBasics();
      setActiveProject(r.data);
      setInitialThreadId(undefined);
      setView('workspace');
      setShowNewModal(false);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to create project'); }
  };

  const openProject = (p: Project) => { 
    setActiveProject(p); 
    setInitialThreadId(undefined); 
    setView('workspace'); 
  };
  const openThread = (p: Project, threadId: number) => { 
    setActiveProject(p); 
    setInitialThreadId(threadId); 
    setView('workspace'); 
  };

  return (
    <div className="app">
      <Sidebar
        view={view} 
        setView={v => { setView(v); if (v !== 'workspace') { setActiveProject(null); setInitialThreadId(undefined); } }}
        projects={projects}
        activeProject={activeProject}
        activeThreadId={initialThreadId || null}
        onSelectProject={openProject}
        onSelectThread={(tId) => {
          setInitialThreadId(tId);
          setView('workspace');
        }}
        onAddThread={() => {
          setInitialThreadId(undefined);
          setView('workspace');
        }}
        onNewProject={() => setShowNewModal(true)}
      />

      <div className="main-area">
        <header className="main-header-strip">
          <div className="user-profile">
            <div className="user-icon">{user?.username?.[0].toUpperCase()}</div>
            <span>{user?.username}</span>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {view === 'home' && <ProjectsHome projects={projects} onOpen={openProject} onNewProject={() => setShowNewModal(true)} />}
        {view === 'dashboards' && <DashboardsList projects={projects} onOpenEntry={(p, e) => openThread(p, e.id)} />}
        {view === 'workspace' && activeProject && (
          <Workspace 
            project={activeProject} 
            onBack={() => setView('home')} 
            initialThreadId={initialThreadId} 
          />
        )}
      </div>

      {showNewModal && <NewProjectModal datasources={datasources} onClose={() => setShowNewModal(false)} onCreate={handleCreateProject} />}
    </div>
  );
}

/* ─── APP ROOT ───────────────────────────────────────────── */
export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('autodash_token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('autodash_user') || 'null'));

  const handleLogin = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('autodash_token', newToken);
    localStorage.setItem('autodash_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Token ${newToken}`;
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('autodash_token');
    localStorage.removeItem('autodash_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/view/:slug" element={<PublicDashboardView base={BASE} />} />
        <Route path="*" element={
          !token ? (
            <Login onLogin={handleLogin} base={BASE} />
          ) : (
            <MainAppContent token={token} user={user} onLogout={handleLogout} />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}
