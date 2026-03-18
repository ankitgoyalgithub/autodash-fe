import { useState, useEffect } from 'react';
import { Loader2, Clock, BarChart2, ImageIcon, ChevronRight } from 'lucide-react';
import axios from 'axios';
import type { Project, HistoryEntry } from '../App';
import { BASE } from './constants';

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
