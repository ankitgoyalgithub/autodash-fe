import { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronLeft, Hash } from 'lucide-react';
import axios from 'axios';
const logo = '/brand-logo.png';
import type { View, Project, DashboardThread } from '../App';
import { BASE } from './constants';

// ── Colorful nav icons ────────────────────────────────────────────────────────

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7.5" height="7.5" rx="2" fill="#3b82f6"/>
      <rect x="10.5" y="2" width="7.5" height="7.5" rx="2" fill="#93c5fd"/>
      <rect x="2" y="10.5" width="7.5" height="7.5" rx="2" fill="#93c5fd"/>
      <rect x="10.5" y="10.5" width="7.5" height="7.5" rx="2" fill="#3b82f6"/>
    </svg>
  );
}

function MySpaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="5" rx="2" fill="#0d9488"/>
      <rect x="2" y="11" width="16" height="5" rx="2" fill="#2dd4bf"/>
      <rect x="4.5" y="6" width="2" height="1.5" rx="0.75" fill="white" opacity="0.85"/>
      <rect x="4.5" y="12.5" width="2" height="1.5" rx="0.75" fill="white" opacity="0.85"/>
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="7" width="14" height="9" rx="3" fill="#7c3aed"/>
      <circle cx="7.5" cy="11.5" r="1.5" fill="white"/>
      <circle cx="12.5" cy="11.5" r="1.5" fill="white"/>
      <rect x="8.5" y="13.5" width="3" height="1.5" rx="0.75" fill="#c4b5fd"/>
      <rect x="9" y="3.5" width="2" height="3.5" rx="1" fill="#7c3aed"/>
      <circle cx="10" cy="3.5" r="1.5" fill="#a78bfa"/>
    </svg>
  );
}

function DashboardsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="13" width="4" height="5" rx="1.5" fill="#f97316"/>
      <rect x="8" y="9" width="4" height="9" rx="1.5" fill="#fbbf24"/>
      <rect x="14" y="11" width="4" height="7" rx="1.5" fill="#f59e0b"/>
      <path d="M4 11.5L10 7L16 9.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <ellipse cx="10" cy="5" rx="7" ry="2.5" fill="#059669"/>
      <path d="M3 5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V5c0 1.38-3.13 2.5-7 2.5S3 6.38 3 5z" fill="#10b981"/>
      <path d="M3 9v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V9c0 1.38-3.13 2.5-7 2.5S3 10.38 3 9z" fill="#34d399"/>
    </svg>
  );
}

function BrandKitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2a8 8 0 1 0 4.9 14.3 3 3 0 0 1-1.9-2.8 3 3 0 0 1 3-3H17A8 8 0 0 0 10 2z" fill="#ec4899"/>
      <circle cx="7" cy="9" r="1.5" fill="#fce7f3"/>
      <circle cx="10" cy="6.5" r="1.5" fill="#fce7f3"/>
      <circle cx="13" cy="9" r="1.5" fill="#fce7f3"/>
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ view, setView, projects: _projects, activeProject, activeThreadId, onSelectProject, onNewProject, onSelectThread, onAddThread, collapsed, onToggle, onLogout, onProfile }: {
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
  onLogout: () => void;
  onProfile: () => void;
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

  const navItems: { id: View; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    { id: 'home',        label: 'Projects',   icon: <ProjectsIcon />,   color: '#3b82f6', bg: '#eff6ff' },
    { id: 'myspace',     label: 'My Space',   icon: <MySpaceIcon />,    color: '#0d9488', bg: '#f0fdfa' },
    { id: 'agents',      label: 'Agents',     icon: <AgentsIcon />,     color: '#7c3aed', bg: '#faf5ff' },
    { id: 'dashboards',  label: 'Dashboards', icon: <DashboardsIcon />, color: '#f59e0b', bg: '#fffbeb' },
    { id: 'datasources', label: 'Data',       icon: <DataIcon />,       color: '#059669', bg: '#ecfdf5' },
    { id: 'brand',       label: 'Brand Kit',  icon: <BrandKitIcon />,   color: '#ec4899', bg: '#fdf2f8' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        {collapsed
          ? <img src="/app-icon.png" alt="LucentReport" className="logo-img" />
          : <img src={logo} alt="LucentReport" className="logo-img-wide" />
        }
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
        {navItems.map(({ id, icon, label, color, bg }) => {
          const isActive = view === id;
          return (
            <button
              key={id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setView(id)}
              title={label}
              style={isActive ? { '--nav-active-color': color, '--nav-active-bg': bg } as React.CSSProperties : {}}
            >
              <div className="nav-icon" style={{ background: isActive ? bg : undefined }}>
                {icon}
              </div>
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Active project threads (expanded only, only when in workspace) ── */}
      {!collapsed && activeProject && view === 'workspace' && (
        <>
          <div className="sidebar-section-label">Project</div>
          <div className="sidebar-projects">
            <button
              className="sidebar-project active"
              onClick={() => onSelectProject(activeProject)}
              title={activeProject.name}
            >
              <span className="proj-emoji-badge" style={{ background: activeProject.color + '20', borderColor: activeProject.color + '35' }}>
                {activeProject.emoji}
              </span>
              <span className="proj-name">{activeProject.name}</span>
            </button>
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
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={`user-profile-mini ${view === 'profile' ? 'active' : ''}`} title={username} onClick={onProfile} style={{ cursor: 'pointer' }}>
          <div className="user-icon-sm">{username[0]?.toUpperCase()}</div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{username}</span>
              <button className="logout-link" onClick={e => { e.stopPropagation(); onLogout(); }}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
