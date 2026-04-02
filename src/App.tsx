import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Send cookies (httpOnly auth cookie) with every request — required for cookie-based auth
axios.defaults.withCredentials = true;
import './App.css';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { BASE } from './components/constants';
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
import { useBrandKit } from './hooks/useBrandKit';
import { generatePalette } from './utils/brandPalette';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type View = 'home' | 'dashboards' | 'workspace' | 'public' | 'datasources' | 'agents' | 'brand' | 'profile' | 'myspace';

export interface Datasource {
  id: number;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  is_myspace?: boolean;
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
  updated_at: string;
  created_at: string;
  my_role?: 'admin' | 'editor' | 'viewer';
  owner?: { id: number; username: string; email: string } | null;
  members?: ProjectMember[];
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
  title: string;
  insight: string;
  sql: string;
  error?: string;
  filters?: { column: string; options: (string | number)[] }[];
  group_by_options?: string[];
  drill_down?: { column: string; target_metric: string; hint: string; };
  is_analytics?: boolean;
  anomaly_info?: {
    anomalies: any[];
    normal_range: [number, number];
    severity: 'low' | 'medium' | 'high';
    anomaly_count: number;
    mean: number;
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
  };
}

export interface HistoryEntry {
  id: number;
  thread_id?: number;
  query: string;
  results_data: DashboardCard[];
  reference_images: string[];
  created_at: string;
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
}

export interface DashboardThread {
  id: number;
  title: string;
  thread_type: 'dashboard' | 'infographic';
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

function MainAppContent({ onLogout, user, onUserUpdate }: { onLogout: () => void; user: any; onUserUpdate: (u: any) => void }) {
  const [view, setView] = useState<View>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [initialThreadId, setInitialThreadId] = useState<number | undefined>(undefined);
  const [newThreadKey, setNewThreadKey] = useState(0);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');

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

  const openProject = async (p: Project) => {
    // Fetch the most recent thread for this project so the user can
    // continue their last conversation instead of starting blank.
    let latestThreadId: number | undefined = undefined;
    try {
      const r = await axios.get(`${BASE}/threads/?project_id=${p.id}`);
      if (r.data.length > 0) latestThreadId = r.data[0].id;
    } catch {}
    setActiveProject(p);
    setInitialThreadId(latestThreadId);
    setView('workspace');
  };

  const openThread = (p: Project, threadId: number) => {
    setActiveProject(p);
    setInitialThreadId(threadId);
    setView('workspace');
  };

  const handleTemplateApplied = (
    project: Project,
    threadId: number,
    _dashboards: any[],
    _narrative: string,
    _suggestedTheme: string
  ) => {
    setProjects(prev => [project, ...prev]);
    setActiveProject(project);
    setInitialThreadId(threadId);
    setView('workspace');
  };

  const handleDeleteProject = async (p: Project) => {
    await axios.delete(`${BASE}/projects/${p.id}/`);
    setProjects(prev => prev.filter(x => x.id !== p.id));
    if (activeProject?.id === p.id) {
      setActiveProject(null);
      setInitialThreadId(undefined);
      setView('home');
    }
  };

  const handleEditProject = async (p: Project, updates: { name: string; description: string; emoji: string }) => {
    await axios.patch(`${BASE}/projects/${p.id}/`, updates);
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, ...updates } : x));
    if (activeProject?.id === p.id) setActiveProject(prev => prev ? { ...prev, ...updates } : prev);
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
        onSelectThread={(tId) => { setInitialThreadId(tId); setNewThreadKey(k => k + 1); setView('workspace'); }}
        onAddThread={() => { setInitialThreadId(undefined); setNewThreadKey(k => k + 1); setView('workspace'); }}
        onNewProject={() => setShowNewModal(true)}
        collapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onLogout={onLogout}
        onProfile={() => setView('profile')}
      />

      <div className="main-area">
        {view === 'home' && <ProjectsHome projects={projects} onOpen={openProject} onNewProject={() => setShowNewModal(true)} datasources={datasources} onApplied={handleTemplateApplied} onDelete={handleDeleteProject} onEdit={handleEditProject} />}
        {view === 'dashboards' && <DashboardsList projects={projects} onOpenEntry={(p, e) => openThread(p, e.thread_id ?? e.id)} />}
        {view === 'datasources' && <DatasourcesManagement datasources={datasources} onRefresh={fetchBasics} />}
        {view === 'myspace' && (
          <MySpace onNavigateToProjects={() => { fetchBasics(); setShowNewModal(true); setView('home'); }} />
        )}
        {view === 'agents' && <AgentsLibrary datasources={datasources} onApplied={handleTemplateApplied} />}
        {view === 'brand' && (
          <BrandKitEditor
            brandKit={brandKit}
            saving={brandSaving}
            error={brandError}
            save={saveBrandKit}
          />
        )}
        {view === 'profile' && (
          <UserProfile
            user={user}
            onUserUpdate={(updates) => onUserUpdate({ ...user, ...updates })}
          />
        )}
        {view === 'workspace' && activeProject && (
          <Workspace
            key={`${activeProject.id}-${initialThreadId ?? 'new'}-${newThreadKey}`}
            project={activeProject}
            onBack={() => setView('home')}
            initialThreadId={initialThreadId}
            brandPalette={brandPalette}
            currentUser={user}
            onProjectUpdate={(updated) => {
              setActiveProject(updated);
              setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
            }}
          />
        )}
      </div>

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
    <BrowserRouter>
      <Routes>
        <Route path="/view/:slug" element={<PublicDashboardView />} />
        <Route path="/" element={!isLoggedIn ? <LandingPage /> : <MainAppContent onLogout={handleLogout} user={user} onUserUpdate={setUser} />} />
        <Route path="/login" element={!isLoggedIn ? <Login onLogin={handleLogin} base={BASE} /> : <Navigate to="/" replace />} />
        <Route path="*" element={!isLoggedIn ? <LandingPage /> : <MainAppContent onLogout={handleLogout} user={user} onUserUpdate={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}
