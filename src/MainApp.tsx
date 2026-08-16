import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BASE } from './components/constants';
import { toast } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { ProjectsHome, NewProjectModal } from './components/ProjectsHome';
import { DashboardsList } from './components/DashboardsList';
import { Workspace } from './components/Workspace';
import { DatasourcesManagement } from './components/DatasourcesManagement';
import { AgentsLibrary } from './components/AgentsLibrary';
import { BrandKitEditor } from './components/BrandKitEditor';
import { UserProfile } from './components/UserProfile';
import { MySpace } from './components/MySpace';
import { DocumentsList } from './components/DocumentsList';
import { DocumentEditor } from './components/DocumentEditor';
import { AdminPanel } from './components/AdminPanel';
import { useBrandKit } from './hooks/useBrandKit';
import { brandChartColors } from './utils/brandPalette';
import type { View, Project, Datasource } from './App';

// ─── Main App Content ─────────────────────────────────────────────────────────
// Lazy-loaded from App.tsx so the public landing page ships without the chart
// libraries (echarts, d3, recharts) and the rest of the authenticated app.

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
  admin:       '/admin',
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
  if (pathname.startsWith('/admin'))       return 'admin';
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


export default function MainAppContent({ onLogout, user, onUserUpdate }: { onLogout: () => void; user: any; onUserUpdate: (u: any) => void }) {
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
    () => brandChartColors(brandKit),
    // Recompute when any input to the chart palette changes.
    [brandKit.primary_color, brandKit.secondary_color, brandKit.chart_colors]
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
        user={user}
        brand={{ company_name: brandKit.company_name, logo_url: brandKit.logo_url }}
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
            <Route path="/admin" element={
              user?.is_admin ? <AdminPanel /> : <Navigate to="/" replace />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {showNewModal && <NewProjectModal datasources={datasources} onClose={() => setShowNewModal(false)} onCreate={handleCreateProject} />}
    </div>
  );
}
