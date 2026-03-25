import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type View = 'home' | 'dashboards' | 'workspace' | 'public' | 'datasources';

export interface Datasource {
  id: number;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  emoji: string;
  color: string;
  chart_count: number;
  datasource: Datasource | null;
  updated_at: string;
  created_at: string;
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
  query: string;
  results_data: DashboardCard[];
  reference_images: string[];
  created_at: string;
  is_deployed?: boolean;
  deploy_slug?: string;
  narrative?: string;
}

export interface DashboardThread {
  id: number;
  title: string;
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

function MainAppContent({ token }: { token: string; user?: any; onLogout?: () => void }) {
  const [view, setView] = useState<View>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [initialThreadId, setInitialThreadId] = useState<number | undefined>(undefined);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

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

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={v => { setView(v); if (v !== 'workspace') { setActiveProject(null); setInitialThreadId(undefined); } }}
        projects={projects}
        activeProject={activeProject}
        activeThreadId={initialThreadId || null}
        onSelectProject={openProject}
        onSelectThread={(tId) => { setInitialThreadId(tId); setView('workspace'); }}
        onAddThread={() => { setInitialThreadId(undefined); setView('workspace'); }}
        onNewProject={() => setShowNewModal(true)}
        collapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div className="main-area">
        {view === 'home' && <ProjectsHome projects={projects} onOpen={openProject} onNewProject={() => setShowNewModal(true)} datasources={datasources} onApplied={handleTemplateApplied} />}
        {view === 'dashboards' && <DashboardsList projects={projects} onOpenEntry={(p, e) => openThread(p, e.id)} />}
        {view === 'datasources' && <DatasourcesManagement datasources={datasources} onRefresh={fetchBasics} />}
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

// ─── App Root ─────────────────────────────────────────────────────────────────

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
        <Route path="/view/:slug" element={<PublicDashboardView />} />
        <Route path="/" element={!token ? <LandingPage /> : <MainAppContent token={token} user={user} onLogout={handleLogout} />} />
        <Route path="/login" element={!token ? <Login onLogin={handleLogin} base={BASE} /> : <Navigate to="/" replace />} />
        <Route path="*" element={!token ? <LandingPage /> : <MainAppContent token={token} user={user} onLogout={handleLogout} />} />
      </Routes>
    </BrowserRouter>
  );
}
