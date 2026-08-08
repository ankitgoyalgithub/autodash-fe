import { useState, useEffect } from 'react';
import { Clock, BarChart2, ImageIcon, ChevronRight, LayoutDashboard } from 'lucide-react';
import axios from 'axios';
import type { Project, HistoryEntry } from '../App';
import { BASE } from './constants';
import { ProjectLogoTile } from './projectLogos';
import { EmptyState, Skeleton } from './ui';

export function DashboardsList({ projects, onOpenEntry }: {
  projects: Project[];
  onOpenEntry: (project: Project, entry: HistoryEntry) => void;
}) {
  const [allEntries, setAllEntries] = useState<(HistoryEntry & { project: Project })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  useEffect(() => {
    const fetchAll = async () => {
      const responses = await Promise.all(
        projects.map(p =>
          axios.get(`${BASE}/history/?project_id=${p.id}`)
            .then(r => r.data.map((e: HistoryEntry) => ({ ...e, project: p })))
            .catch(() => [])
        )
      );
      const results = responses.flat();
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
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dashboard-entry" style={{ cursor: 'default', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Skeleton size={36} radius={10} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton width="48%" height={12} />
                <Skeleton width="78%" height={14} />
                <Skeleton width="32%" height={10} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutDashboard size={26}/>}
          title="No dashboards yet"
          subtitle={filterProject === 'all'
            ? 'Start a project and generate your first dashboard. The results will appear here.'
            : 'No dashboards in this project yet. Run a query to create the first one.'}
        />
      ) : (
        <div className="dashboard-list">
          {filtered.map(entry => (
            <button key={entry.id} className="dashboard-entry" onClick={() => onOpenEntry(entry.project, entry)}>
              <div className="entry-emoji">
                <ProjectLogoTile id={entry.project.emoji} emoji={entry.project.emoji} size={36} />
              </div>
              <div className="entry-body">
                <div className="entry-top">
                  <div className="entry-meta-tag" style={{ color: entry.project.color, background: entry.project.color + '18' }}>{entry.project.name}</div>
                  <span className="entry-date"><Clock size={11}/>{new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <h4>{entry.query}</h4>
                <div className="entry-stats">
                  <span><BarChart2 size={12}/>{entry.results_data?.length || 0} charts</span>
                  {entry.reference_images?.length > 0 && <span><ImageIcon size={12}/>{entry.reference_images?.length} refs</span>}
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
