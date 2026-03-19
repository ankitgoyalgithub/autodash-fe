import { useState, useEffect } from 'react';
import { Layers, BarChart3, Database, ChevronRight, ChevronLeft, Plus, Hash } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.png';
import type { View, Project, DashboardThread } from '../App';
import { BASE } from './constants';

export function Sidebar({ view, setView, projects, activeProject, activeThreadId, onSelectProject, onNewProject, onSelectThread, onAddThread, collapsed, onToggle }: {
  view: View;
  setView: (v: View) => void;
  projects: Project[];
  activeProject: Project | null;
  activeThreadId: number | null;
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
  onSelectThread: (tId: number) => void;
  onAddThread: () => void;
  collapsed: boolean;
  onToggle: () => void;
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
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <img src={logo} alt="AutoDashboard" className="logo-img"/>
        {!collapsed && <span className="logo-name">AutoDashboard</span>}
      </div>

      {/* ── Main Nav ── */}
      <nav className="sidebar-nav">
        <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')} title="Projects">
          <Layers size={17}/> {!collapsed && <span>Projects</span>}
        </button>
        <button className={`nav-item ${view === 'dashboards' ? 'active' : ''}`} onClick={() => setView('dashboards')} title="All Dashboards">
          <BarChart3 size={17}/> {!collapsed && <span>All Dashboards</span>}
        </button>
        <button className={`nav-item ${view === 'datasources' ? 'active' : ''}`} onClick={() => setView('datasources')} title="Data Sources">
          <Database size={17}/> {!collapsed && <span>Data Sources</span>}
        </button>
      </nav>

      {/* ── Divider + section label ── */}
      <div className="sidebar-divider"/>
      {!collapsed && <div className="sidebar-section-label">Workspaces</div>}

      {/* ── Projects ── */}
      <div className="sidebar-projects">
        {projects.map(p => (
          <div key={p.id}>
            <button
              className={`sidebar-project ${activeProject?.id === p.id && view === 'workspace' ? 'active' : ''}`}
              onClick={() => onSelectProject(p)}
              title={p.name}
            >
              <span className="proj-emoji-badge" style={{ background: p.color + '25', borderColor: p.color + '40' }}>
                {p.emoji}
              </span>
              {!collapsed && <span className="proj-name">{p.name}</span>}
            </button>

            {!collapsed && activeProject?.id === p.id && view === 'workspace' && (
              <div className="sidebar-threads">
                {threads.map(t => (
                  <button key={t.id} className={`sidebar-thread ${activeThreadId === t.id ? 'active' : ''}`} onClick={() => onSelectThread(t.id)}>
                    <Hash size={10}/>
                    <span>{t.title}</span>
                  </button>
                ))}
                <button className="sidebar-new-thread" onClick={onAddThread}>
                  <Plus size={11}/> New dashboard
                </button>
              </div>
            )}
          </div>
        ))}
        <button className="sidebar-new-project" onClick={onNewProject} title="New Project">
          <div className="new-proj-btn-inner">
            <div className="new-proj-icon-box"><Plus size={14}/></div>
            {!collapsed && <span>New workspace</span>}
          </div>
        </button>
      </div>

      {/* ── Footer: toggle + user ── */}
      <div className="sidebar-footer">
        <div className="sidebar-toggle-row">
          <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>
        <div className="user-profile-mini">
          <div className="user-icon-sm">{(localStorage.getItem('autodash_user') ? JSON.parse(localStorage.getItem('autodash_user') || '{}').username?.[0].toUpperCase() : 'U')}</div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('autodash_user') || '{}').username || 'User'}</span>
              <button className="logout-link" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
