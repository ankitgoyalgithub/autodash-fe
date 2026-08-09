import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Send cookies (httpOnly auth cookie) with every request — required for cookie-based auth
axios.defaults.withCredentials = true;
import './styles/tokens.css';
import './App.css';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { BASE } from './components/constants';
import { Toaster, toast } from './components/ui';

// Global 401 interceptor — expired or deleted token → force re-login.
// Skips /me/, /login/, /logout/ to avoid redirect loops.
axios.interceptors.response.use(
  res => res,
  err => {
    const url: string = err?.config?.url ?? '';
    const is401 = err?.response?.status === 401;
    const isAuthEndpoint = url.includes('/me/') || url.includes('/login/') || url.includes('/logout/');
    if (is401 && !isAuthEndpoint) {
      // Best-effort server logout (clears DB token), then hard-reload to /
      axios.post(`${BASE}/logout/`).catch(() => {});
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);
import { Sidebar } from './components/Sidebar';
import { ProjectsHome, NewProjectModal } from './components/ProjectsHome';
import { DashboardsList } from './components/DashboardsList';
import { Workspace } from './components/Workspace';
import { DatasourcesManagement } from './components/DatasourcesManagement';
import { PublicDashboardView } from './components/PublicDashboardView';
import { AgentsLibrary } from './components/AgentsLibrary';
import { BrandKitEditor } from './components/BrandKitEditor';
import { UserProfile } from './components/UserProfile';
import { MySpace } from './components/MySpace';
import { DocumentsList } from './components/DocumentsList';
import { DocumentEditor } from './components/DocumentEditor';
import RenderView from './components/RenderView';
import { useBrandKit } from './hooks/useBrandKit';
import { generatePalette } from './utils/brandPalette';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type View = 'home' | 'dashboards' | 'workspace' | 'public' | 'datasources' | 'agents' | 'brand' | 'profile' | 'myspace' | 'documents';

export interface Datasource {
  id: number;
  name: string;
  kind?: 'postgresql' | 'mssql' | 'clickhouse';
  host: string;
  port: number;
  database: string;
  username: string;
  is_myspace?: boolean;
  is_hubspot?: boolean;
}

export interface ProjectMember {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  is_owner?: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  emoji: string;
  color: string;
  palette?: string;
  thumbnail_url?: string;
  chart_count: number;
  datasource: Datasource | null;
  allowed_tables?: string[];
  updated_at: string;
  created_at: string;
  my_role?: 'admin' | 'editor' | 'viewer';
  owner?: { id: number; username: string; email: string } | null;
  members?: ProjectMember[];
}

/** Canonical chart spec — derived once on the backend, consumed by all renderers. */
export interface CardChartSpec {
  type:          string;
  x_key:         string | null;
  y_keys:        string[];
  color_scheme:  string;
  annotations:   { x: string | number; label: string; color?: string }[];
  goal_line:     { value: number; label: string } | null;
  log_scale:     boolean;
  x_label:       string | null;
  y_label:       string | null;
  series_labels: Record<string, string>;
}

/** Result from one analytics tool run via auto_run_analytics().
 *  Mirrors backend/api/analytics/_base.ToolResult. */
export interface ToolOutput {
  tool_name: string;
  ok: boolean;
  summary?: string;
  metrics?: Record<string, any>;
  insights?: string[];
  visualization_spec?: Record<string, any> | null;
  error?: string | null;
  meta?: Record<string, any>;
}

export interface DashboardCard {
  type?: 'chart' | 'metric' | 'text';
  size?: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'mini' | 'small' | 'medium' | 'wide' | 'full' | 'tall';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  data: Record<string, any>[];
  chart_type: string;
  /** Canonical spec derived by normalize_chart_spec() on the backend. Present on all
   *  new widgets; absent on data stored before this feature was added. */
  chart_spec?: CardChartSpec;
  title: string;
  insight: string;
  sql: string;
  error?: string;
  filters?: { column: string; options: (string | number)[] }[];
  group_by_options?: string[];
  drill_down?: { column: string; target_metric: string; hint: string; };
  is_analytics?: boolean;
  // B6 — Output from analytics tool suite (cohort, funnel, pareto, etc.)
  // Populated by ai_service.auto_run_analytics() during insight enrichment.
  tool_outputs?: ToolOutput[];
  anomaly_info?: {
    anomalies?: any[];
    normal_range?: [number, number];
    severity?: 'low' | 'medium' | 'high' | 'none';
    anomaly_count?: number;
    mean?: number;
    // B1 — new richer fields from anomaly_detection module
    has_anomalies?: boolean;
    outliers?: { label: string; value: number; zscore?: number; direction?: string }[];
    change_points?: { label: string; before_mean: number; after_mean: number; shift_sigma: number; direction: string }[];
    stdev?: number;
    summary?: string;
  };
  matrix_config?: { x_col: string; y_col: string; label_col: string };
  stats?: {
    trend?: 'upward' | 'downward' | 'stable';
    trend_pct?: number;
    total_change_pct?: number;
    top_label?: string;
    top_value?: number;
    top_pct?: number;
    pareto_pct?: number;
    y_sum?: number;
    y_max?: number;
    peak_label?: string;
    outliers?: { label: string; value: number }[];
    row_count?: number;
    // B2 — comparative framing (vs prior, vs segment, trend strength)
    comparative?: {
      temporal?: {
        last: number; prior: number; prior_window_mean: number;
        pct_vs_prior: number | null; pct_vs_prior_window_mean: number | null;
        direction: 'up' | 'down' | 'flat'; window_size: number; recovery_pct?: number;
      };
      segment?: {
        top_label: string; top_value: number; top_pct_of_total: number;
        segment_mean: number; segment_median: number;
        top_vs_median_pct: number | null;
        concentration_top_3_pct: number; segment_size: number;
      };
      trend?: {
        slope: number; r_squared: number;
        strength: 'strong' | 'moderate' | 'weak';
        forecast_next: number; total_change_pct: number | null;
      };
      summary?: string;
    };
  };
  // B5 — Insight quality score
  quality?: {
    score: number;                // 0-100
    specificity: number;          // 0-40
    surprise: number;             // 0-35
    actionability: number;        // 0-25
    band: 'weak' | 'fair' | 'good' | 'excellent';
  };
  // B3 — Root-cause analysis on significant findings
  root_cause?: {
    narrative: string;
    confidence: number;           // 0-100
    hops: number;
    best_hypothesis: {
      text: string;
      test_sql: string;
      result_rows: any[];
      success: boolean;
    };
    all_hypotheses_tested: Array<{
      text: string;
      test_sql: string;
      result_rows: any[];
      success: boolean;
      error?: string;
    }>;
  };
  // Forecasting agent — augments time-series cards with projected future rows
  // (rows tagged is_forecast=true) and a metadata block describing the method.
  forecast_meta?: {
    method: string;                 // 'linear' | 'ets' | 'ets-seasonal' | 'arima' | 'auto'
    confidence: number;             // 0-100
    horizon: number;                // # of future periods appended
    narrative: string;              // single-sentence summary for inline display
    diagnostics?: {
      mean: number;
      std: number;
      trend_strength: number;
      autocorr_lag1: number;
      seasonality_detected: boolean;
      note: string;
    };
    gate_reason?: string;           // why the agent chose to forecast this card
  };
}

export interface HistoryEntry {
  id: number;
  thread_id?: number;
  query: string;
  results_data: DashboardCard[];
  reference_images: string[];
  created_at: string;
  last_refreshed_at?: string | null;
  is_deployed?: boolean;
  deploy_slug?: string;
  narrative?: string;
  infographic_html?: string;
  infographic_data?: {
    accent: string;
    title: string;
    project_name: string;
    sections: Array<{
      id: string;
      type: 'metric_row' | 'bar_chart' | 'line_chart' | 'table' | 'insight';
      title: string;
      // metric_row
      metrics?: Array<{ label: string; value: string; raw: any }>;
      // bar_chart
      data?: Array<{ label: string; value: number }>;
      value_label?: string;
      // line_chart
      y_label?: string;
      // table
      headers?: string[];
      rows?: string[][];
      // insight
      text?: string;
    }>;
  };
  // Long-form report (when thread_type === 'report')
  report_id?: number;
}

// ── Entity 360 (thread_type === 'entity360') ────────────────────────────────
export interface Entity360Section {
  title: string;
  chart_type: string;
  type: string;
  data: Record<string, any>[];
  sql?: string;
  relationship?: string;
  chart_spec?: any;
}

export interface Entity360Payload {
  status: 'ok' | 'disambiguation' | 'not_found' | 'error';
  entity?: { table: string; label: string; type: string; pk_column: string; pk_value: any };
  profile?: Array<{ label: string; value: string }>;
  kpis?: Array<{ label: string; value: string }>;
  sections?: Entity360Section[];
  timeline?: Array<{ date: string; label: string; source: string }>;
  narrative?: string;
  // disambiguation / not_found
  candidates?: Array<{ pk_value: any; label: string }>;
  entity_table?: string;
  pk_column?: string;
  display_column?: string;
  entity_type?: string;
  error?: string;
}

export interface DashboardThread {
  id: number;
  title: string;
  thread_type: 'dashboard' | 'infographic' | 'report' | 'newsletter' | 'cartoon' | 'image_infographic' | 'entity360';
  updated_at: string;
  created_at: string;
}

export interface DashboardFilter {
  column: string;
  label: string;
  values: (string | number)[];
}

export interface UploadedFile {
  url: string;
  path: string;
  filename: string;
  image_context: string;
  preview: string;
}

// ─── Main App Content ─────────────────────────────────────────────────────────

// Map a sidebar `View` enum value to the URL path the app should navigate to.
// Workspace is special — it needs an active project ID, so we leave that to
// callers (which already know whether they have one).
const VIEW_PATH: Record<Exclude<View, 'workspace' | 'public'>, string> = {
  home:        '/',
  dashboards:  '/dashboards',
  datasources: '/datasources',
  myspace:     '/myspace',
  documents:   '/documents',
  agents:      '/agents',
  brand:       '/brand',
  profile:     '/profile',
};

/** Derive the current sidebar `view` (for highlighting) from the URL path. */
function viewFromPath(pathname: string): View {
  if (pathname.startsWith('/projects/')) return 'workspace';
  if (pathname === '/projects' || pathname === '/') return 'home';
  if (pathname.startsWith('/dashboards'))  return 'dashboards';
  if (pathname.startsWith('/datasources')) return 'datasources';
  if (pathname.startsWith('/myspace'))     return 'myspace';
  if (pathname.startsWith('/documents'))   return 'documents';
  if (pathname.startsWith('/agents'))      return 'agents';
  if (pathname.startsWith('/brand'))       return 'brand';
  if (pathname.startsWith('/profile'))     return 'profile';
  return 'home';
}

/** Pull `:projectId` and `:threadId` out of `/projects/:id[/threads/:tid]`. */
function parseProjectRoute(pathname: string): { projectId: number | null; threadId: number | null } {
  const m = pathname.match(/^\/projects\/(\d+)(?:\/threads\/(\d+))?/);
  if (!m) return { projectId: null, threadId: null };
  return {
    projectId: parseInt(m[1], 10),
    threadId:  m[2] ? parseInt(m[2], 10) : null,
  };
}

/** Pull `:docId` from `/documents/:id`. */
function parseDocRoute(pathname: string): number | null {
  const m = pathname.match(/^\/documents\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}


function MainAppContent({ onLogout, user, onUserUpdate }: { onLogout: () => void; user: any; onUserUpdate: (u: any) => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');

  // URL-derived state — every refresh-safe page state lives in the path.
  const view = useMemo(() => viewFromPath(location.pathname), [location.pathname]);
  const { projectId: activeProjectId, threadId: urlThreadId } = useMemo(
    () => parseProjectRoute(location.pathname),
    [location.pathname]
  );
  const activeDocId = useMemo(() => parseDocRoute(location.pathname), [location.pathname]);
  const activeProject = useMemo(
    () => (activeProjectId == null ? null : projects.find(p => p.id === activeProjectId) || null),
    [projects, activeProjectId]
  );
  const initialThreadId = urlThreadId == null ? undefined : urlThreadId;

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  // Auth is handled by httpOnly cookie sent automatically with withCredentials=true
  const { brandKit, saving: brandSaving, error: brandError, save: saveBrandKit } = useBrandKit();
  const brandPalette = useMemo(
    () => generatePalette(brandKit.primary_color, brandKit.secondary_color),
    [brandKit.primary_color, brandKit.secondary_color]
  );

  const fetchBasics = async () => {
    try { const r = await axios.get(`${BASE}/projects/`); setProjects(r.data); } catch {}
    try { const r = await axios.get(`${BASE}/datasources/`); setDatasources(r.data); } catch {}
  };

  useEffect(() => { fetchBasics(); }, []);

  // If the URL references a project we haven't fetched yet (e.g. deep-link
  // after a hard refresh), fetch it on demand and slot it into `projects`.
  useEffect(() => {
    if (activeProjectId == null) return;
    if (projects.find(p => p.id === activeProjectId)) return;
    let alive = true;
    axios.get(`${BASE}/projects/${activeProjectId}/`)
      .then(r => { if (alive) setProjects(prev => prev.find(p => p.id === r.data.id) ? prev : [r.data, ...prev]); })
      .catch(() => { if (alive) navigate('/', { replace: true }); });
    return () => { alive = false; };
  }, [activeProjectId, projects, navigate]);

  const handleCreateProject = async (data: object) => {
    try {
      const r = await axios.post(`${BASE}/projects/`, data);
      await fetchBasics();
      setShowNewModal(false);
      navigate(`/projects/${r.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to create project'); }
  };

  const openProject = async (p: Project) => {
    // Fetch the most recent thread for this project so the user can
    // continue their last conversation instead of starting blank.
    let latestThreadId: number | undefined = undefined;
    try {
      const r = await axios.get(`${BASE}/threads/?project_id=${p.id}`);
      if (r.data.length > 0) latestThreadId = r.data[0].id;
    } catch {}
    navigate(latestThreadId ? `/projects/${p.id}/threads/${latestThreadId}` : `/projects/${p.id}`);
  };

  const openThread = (p: Project, threadId: number) => {
    navigate(`/projects/${p.id}/threads/${threadId}`);
  };

  const handleTemplateApplied = (
    project: Project,
    threadId: number,
    _dashboards: any[],
    _narrative: string,
    _suggestedTheme: string
  ) => {
    setProjects(prev => prev.find(p => p.id === project.id) ? prev : [project, ...prev]);
    navigate(`/projects/${project.id}/threads/${threadId}`);
  };

  const handleDeleteProject = async (p: Project) => {
    await axios.delete(`${BASE}/projects/${p.id}/`);
    setProjects(prev => prev.filter(x => x.id !== p.id));
    if (activeProjectId === p.id) navigate('/');
  };

  const handleEditProject = async (p: Project, updates: { name: string; description: string; emoji: string }) => {
    await axios.patch(`${BASE}/projects/${p.id}/`, updates);
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, ...updates } : x));
  };

  // Sidebar's setView contract — translate to navigate().
  const setView = (v: View) => {
    if (v === 'workspace') {
      navigate(activeProject ? `/projects/${activeProject.id}` : '/');
      return;
    }
    if (v === 'public') return; // public route is outside the app shell
    navigate(VIEW_PATH[v] ?? '/');
  };

  // Key forces Workspace remount when the user clicks the same project but
  // switches threads (or vice versa), so initialThreadId is honored fresh.
  const workspaceKey = `ws-${activeProjectId ?? 'none'}-${initialThreadId ?? 'new'}`;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar
        view={view}
        setView={setView}
        projects={projects}
        activeProject={activeProject}
        activeThreadId={initialThreadId || null}
        onSelectProject={openProject}
        onSelectThread={(tId) => activeProject && navigate(`/projects/${activeProject.id}/threads/${tId}`)}
        onAddThread={() => activeProject && navigate(`/projects/${activeProject.id}`)}
        onNewProject={() => setShowNewModal(true)}
        collapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onLogout={onLogout}
        onProfile={() => navigate('/profile')}
      />

      <main id="main-content" className="main-area">
        <div key={view === 'workspace' ? workspaceKey : view} className="view-fade">
          <Routes>
            <Route path="/" element={
              <ProjectsHome projects={projects} onOpen={openProject} onNewProject={() => setShowNewModal(true)} datasources={datasources} onApplied={handleTemplateApplied} onDelete={handleDeleteProject} onEdit={handleEditProject} />
            } />
            <Route path="/projects" element={<Navigate to="/" replace />} />
            <Route path="/projects/:projectId" element={
              activeProject ? (
                <Workspace
                  project={activeProject}
                  onBack={() => navigate('/')}
                  initialThreadId={undefined}
                  brandPalette={brandPalette}
                  currentUser={user}
                  datasources={datasources}
                  onProjectUpdate={(updated) => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  onNewThread={(tId) => navigate(`/projects/${activeProject.id}/threads/${tId}`, { replace: true })}
                />
              ) : null
            } />
            <Route path="/projects/:projectId/threads/:threadId" element={
              activeProject ? (
                <Workspace
                  project={activeProject}
                  onBack={() => navigate('/')}
                  initialThreadId={initialThreadId}
                  brandPalette={brandPalette}
                  currentUser={user}
                  datasources={datasources}
                  onProjectUpdate={(updated) => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  onNewThread={(tId) => navigate(`/projects/${activeProject.id}/threads/${tId}`, { replace: true })}
                />
              ) : null
            } />
            <Route path="/dashboards" element={
              <DashboardsList projects={projects} onOpenEntry={(p, e) => openThread(p, e.thread_id ?? e.id)} />
            } />
            <Route path="/datasources" element={
              <DatasourcesManagement datasources={datasources} onRefresh={fetchBasics} />
            } />
            <Route path="/myspace" element={
              <MySpace onNavigateToProjects={() => { fetchBasics(); setShowNewModal(true); navigate('/'); }} />
            } />
            <Route path="/documents" element={
              <DocumentsList projects={projects} onOpen={doc => navigate(`/documents/${doc.id}`)} />
            } />
            <Route path="/documents/:docId" element={
              activeDocId ? (
                <DocumentEditor docId={activeDocId} onBack={() => navigate('/documents')} />
              ) : null
            } />
            <Route path="/agents" element={
              <AgentsLibrary datasources={datasources} onApplied={handleTemplateApplied} />
            } />
            <Route path="/brand" element={
              <BrandKitEditor brandKit={brandKit} saving={brandSaving} error={brandError} save={saveBrandKit} />
            } />
            <Route path="/profile" element={
              <UserProfile user={user} onUserUpdate={(updates) => onUserUpdate({ ...user, ...updates })} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {showNewModal && <NewProjectModal datasources={datasources} onClose={() => setShowNewModal(false)} onCreate={handleCreateProject} />}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  // `user` is null while loading, undefined when unauthenticated, or the user object
  const [user, setUser] = useState<any>(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  // On first load, ask the server if we have a valid session (httpOnly cookie)
  useEffect(() => {
    axios.get(`${BASE}/me/`)
      .then(r => { setUser(r.data); })
      .catch(() => { setUser(null); })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (_token: string, userData: any) => {
    // Cookie is already set by the server's Set-Cookie header; just update state
    setUser(userData);
  };

  const handleLogout = async () => {
    try { await axios.post(`${BASE}/logout/`); } catch { /* ignore */ }
    setUser(null);
  };

  // Show nothing while the session check is in-flight to avoid flash
  if (!authChecked) return null;

  const isLoggedIn = !!user;

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/view/:slug" element={<PublicDashboardView />} />
          {/* Headless render route — visited by Playwright during export, no auth chrome */}
          <Route path="/render/:token" element={<RenderView />} />
          <Route path="/login" element={!isLoggedIn ? <Login onLogin={handleLogin} base={BASE} /> : <Navigate to="/" replace />} />
          {/* Splat so MainAppContent's descendant <Routes> (deep links like
              /projects/:id/threads/:id) keep matching. Static routes above win
              by specificity; "/" falls through here too. */}
          <Route path="*" element={!isLoggedIn ? <LandingPage /> : <MainAppContent onLogout={handleLogout} user={user} onUserUpdate={setUser} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </>
  );
}
