import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, X, Send, AlertCircle, Loader2, ArrowLeft,
  Eye, EyeOff, Zap, Sparkles, Upload, LayoutGrid, LayoutList, Square,
  Palette, LayoutTemplate, Columns, MousePointer2, Move, Download, Plus, Filter,
  Brain, ChevronRight,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import axios from 'axios';
import logo from '../assets/logo.png';
import type { Project, DashboardCard, HistoryEntry, UploadedFile } from '../App';
import { BASE, THEMES, FONTS, PALETTES, TEMPLATES } from './constants';
import { InsightCard } from './InsightCard';

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
  const [palette, setPalette] = useState('vibrant');
  const [layoutMode, setLayoutMode] = useState<'dashboard' | 'infographic'>('dashboard');
  const [editMode, setEditMode] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'themes' | 'layouts' | null>(null);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [posterTheme, setPosterTheme] = useState<'light' | 'dark' | 'branded' | 'newspaper'>('light');
  const [pendingTableRequest, setPendingTableRequest] = useState<string | null>(null);
  const [tableHints] = useState<string[]>([]);
  const [globalFilters, setGlobalFilters] = useState<Record<string, string | number | null>>({});
  // HITL state
  const [pendingHITL, setPendingHITL] = useState<HITLRequest | null>(null);
  const [hitlResponses, setHitlResponses] = useState<Record<string, any>>({});
  const [hitlQueryRef, setHitlQueryRef] = useState<string>('');
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
    setGlobalFilters({});
  }, [currentThreadId, fetchThreadHistory]);

  useEffect(() => {
    if (!activeEntry || layout !== 'poster') return;
    const timer = setTimeout(async () => {
      try {
        await axios.patch(`${BASE}/history/`, {
          id: activeEntry.id,
          results_data: activeEntry.results_data,
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

      // Clear HITL state on successful response
      setHitlResponses({});
      setPendingHITL(null);
      setHitlQueryRef('');

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

  const handleHITLAnswer = async (questionId: string, answer: any) => {
    // Accumulate the answer and re-run the original query
    const newResponses = { ...hitlResponses, [questionId]: answer };
    setHitlResponses(newResponses);
    setPendingHITL(null);
    await handleSubmit(hitlQueryRef, newResponses);
  };

  const activeColors = PALETTES[palette as keyof typeof PALETTES];

  const renderCards = (cards: DashboardCard[]) => {
    const sorted = [...cards].sort((a, b) => {
      const aM = a.type === 'metric' || a.size === 's' || a.size === 'mini' || a.size === 'small' ? 0 : 1;
      const bM = b.type === 'metric' || b.size === 's' || b.size === 'mini' || b.size === 'small' ? 0 : 1;
      return aM - bM;
    });
    return sorted.map((card, i) => (
      <InsightCard
        key={i}
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
    ));
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
                      <div className="theme-mini-preview" style={{
                        background: t.id === 'light' ? '#fff' :
                                   t.id === 'dark-pro' ? '#1e293b' :
                                   t.id === 'canva' ? 'linear-gradient(135deg, #00c4cc, #7d2ae8)' :
                                   t.id === 'neon' ? 'linear-gradient(135deg, #a855f7, #ec4899)' :
                                   'linear-gradient(135deg, #6366f1, #a855f7)',
                      }}></div>
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
      <div className="dashboard-panel">
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

          {activeEntry && (() => {
            const allFilters: { column: string; options: (string | number)[] }[] = [];
            const seen = new Set<string>();
            for (const card of activeEntry.results_data || []) {
              for (const f of card.filters || []) {
                if (!seen.has(f.column)) {
                  seen.add(f.column);
                  allFilters.push(f);
                } else {
                  const existing = allFilters.find(x => x.column === f.column);
                  if (existing) {
                    const newOpts = f.options.filter(o => !existing.options.includes(o));
                    existing.options = [...existing.options, ...newOpts];
                  }
                }
              }
            }
            return allFilters.length > 0 ? (
              <div className="global-filter-bar">
                <div className="gf-label"><Filter size={13}/> Filters</div>
                {allFilters.map(f => (
                  <div key={f.column} className="gf-group">
                    <span className="gf-col-name">{f.column.replace(/_/g, ' ')}</span>
                    <div className="gf-chips">
                      <button
                        className={`gf-chip ${!globalFilters[f.column] ? 'active' : ''}`}
                        onClick={() => setGlobalFilters(prev => { const n = {...prev}; delete n[f.column]; return n; })}
                      >All</button>
                      {f.options.map(opt => (
                        <button
                          key={String(opt)}
                          className={`gf-chip ${globalFilters[f.column] === opt ? 'active' : ''}`}
                          onClick={() => setGlobalFilters(prev => ({...prev, [f.column]: prev[f.column] === opt ? null : opt}))}
                        >{String(opt)}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.values(globalFilters).some(v => v !== null) && (
                  <button className="gf-clear" onClick={() => setGlobalFilters({})}>Clear all</button>
                )}
              </div>
            ) : null;
          })()}

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
                    <div ref={posterRef} className={`poster-canvas poster-theme-${posterTheme}`}>
                      {renderCards(activeEntry.results_data)}
                    </div>
                  ) : (() => {
                    const metricCards = activeEntry.results_data.filter(c => c.type === 'metric' || c.size === 's' || c.size === 'mini' || c.size === 'small');
                    const chartCards = activeEntry.results_data.filter(c => c.type !== 'metric' && c.size !== 's' && c.size !== 'mini' && c.size !== 'small');
                    return (
                      <>
                        {metricCards.length > 0 && (
                          <div className="metrics-strip">
                            {renderCards(metricCards)}
                          </div>
                        )}
                        {chartCards.length > 0 && (
                          <div className="charts-strip">
                            {renderCards(chartCards)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
