import { useState, useEffect } from 'react';
import { LayoutGrid, BarChart3, Database, Plus, ChevronRight, ChevronLeft, Hash } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.svg';
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
  const username = JSON.parse(localStorage.getItem('autodash_user') || '{}').username || 'U';

  useEffect(() => {
    if (activeProject) {
      axios.get(`${BASE}/threads/?project_id=${activeProject.id}`)
        .then(r => setThreads(r.data))
        .catch(() => {});
    }
  }, [activeProject, activeThreadId]);

  const navItems = [
    { id: 'home' as View,        icon: LayoutGrid,  label: 'Projects'   },
    { id: 'dashboards' as View,  icon: BarChart3,   label: 'Dashboards' },
    { id: 'datasources' as View, icon: Database,    label: 'Data'       },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <img src={logo} alt="LucentReport" className="logo-img" />
        {!collapsed && <span className="logo-name">LucentReport</span>}
      </div>

      {/* ── Create button ── */}
      <div className="sidebar-create-wrap">
        <button className="sidebar-create-btn" onClick={onNewProject} title="New Project">
          <div className="create-icon"><Plus size={18} strokeWidth={2.5} /></div>
          {!collapsed && <span>Create</span>}
        </button>
      </div>

      {/* ── Main Nav ── */}
      <nav className="sidebar-nav">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
            title={label}
          >
            <Icon size={collapsed ? 20 : 17} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Workspaces (expanded only) ── */}
      {!collapsed && (
        <>
          <div className="sidebar-section-label">Workspaces</div>
          <div className="sidebar-projects">
            {projects.map(p => (
              <div key={p.id}>
                <button
                  className={`sidebar-project ${activeProject?.id === p.id && view === 'workspace' ? 'active' : ''}`}
                  onClick={() => onSelectProject(p)}
                  title={p.name}
                >
                  <span className="proj-emoji-badge" style={{ background: p.color + '20', borderColor: p.color + '35' }}>
                    {p.emoji}
                  </span>
                  <span className="proj-name">{p.name}</span>
                </button>
                {activeProject?.id === p.id && view === 'workspace' && (
                  <div className="sidebar-threads">
                    {threads.map(t => (
                      <button key={t.id} className={`sidebar-thread ${activeThreadId === t.id ? 'active' : ''}`} onClick={() => onSelectThread(t.id)}>
                        <Hash size={10} />
                        <span>{t.title}</span>
                      </button>
                    ))}
                    <button className="sidebar-new-thread" onClick={onAddThread}>
                      <Plus size={11} /> New dashboard
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className="user-profile-mini" title={username}>
          <div className="user-icon-sm">{username[0]?.toUpperCase()}</div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{username}</span>
              <button className="logout-link" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
