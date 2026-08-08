import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, LayoutDashboard, Filter } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { InsightCard } from './InsightCard';
import { BASE } from './constants';

export function PublicDashboardView() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Cross-filter state: clicking a chart category scopes every card to it.
  // Purely client-side (no prompt, no LLM) so it works on the public page.
  const [globalFilters, setGlobalFilters] = useState<Record<string, string | number | null>>({});

  const onDrillDown = (dimension: string, value: string | number) => {
    setGlobalFilters(prev => ({
      ...prev,
      [dimension]: prev[dimension] === value ? null : value,
    }));
  };

  const activeFilters = Object.entries(globalFilters).filter(([, v]) => v !== null && v !== undefined);

  // OLAP drill-down on the public page — by card INDEX (the endpoint never takes
  // client SQL). No LLM at click time; the hierarchy is planned + cached server-side.
  const fetchPublicDrill = async (cardIndex: number, path: (string | number)[]) => {
    if (cardIndex < 0) return null;
    try {
      const r = await axios.post(`${BASE}/public/${slug}/drill/`, { card_index: cardIndex, path });
      return r.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchPublic = async () => {
      try {
        const r = await axios.get(`${BASE}/public/${slug}/`);
        setData(r.data);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Dashboard not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublic();
  }, [slug]);

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin"/><p>Loading dashboard...</p></div>;
  if (error) return <div className="empty"><AlertCircle size={48}/><p>{error}</p></div>;

  return (
    <div className="page public-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <p className="page-sub">Project: {data.project_name} • Created on {new Date(data.created_at).toLocaleDateString()}</p>
        </div>
        <button className="btn-primary" onClick={() => window.location.href = '/'}>
          <LayoutDashboard size={15}/> Back to Dashboard
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="global-filter-bar">
          <div className="gf-label"><Filter size={13}/> Filtered by</div>
          {activeFilters.map(([k, v]) => (
            <div key={k} className="gf-group">
              <span className="gf-col-name">{k.replace(/_/g, ' ')}</span>
              <div className="gf-chips">
                <button
                  className="gf-chip active"
                  title="Click to clear"
                  onClick={() => onDrillDown(k, v as string | number)}
                >{String(v)} ✕</button>
              </div>
            </div>
          ))}
          <button className="gf-clear" onClick={() => setGlobalFilters({})}>Clear all</button>
        </div>
      )}

      {(() => {
        const sorted = [...(data.results_data || [])].sort((a: any, b: any) => {
          const aM = a.type === 'metric' || a.size === 'mini' || a.size === 'small' ? 0 : 1;
          const bM = b.type === 'metric' || b.size === 'mini' || b.size === 'small' ? 0 : 1;
          return aM - bM;
        });
        const metrics = sorted.filter((c: any) => c.type === 'metric' || c.size === 'mini' || c.size === 'small');
        const charts = sorted.filter((c: any) => c.type !== 'metric' && c.size !== 'mini' && c.size !== 'small');
        return (
          <>
            {metrics.length > 0 && (
              <div className="metrics-strip">
                {metrics.map((card: any, i: number) => (
                  <InsightCard key={i} card={card} layout="grid" globalFilters={globalFilters} onDrillDown={onDrillDown}
                    drillFetch={(path) => fetchPublicDrill((data.results_data || []).indexOf(card), path)} />
                ))}
              </div>
            )}
            {charts.length > 0 && (
              <div className="charts-strip">
                {charts.map((card: any, i: number) => (
                  <InsightCard key={`c${i}`} card={card} layout="grid" globalFilters={globalFilters} onDrillDown={onDrillDown}
                    drillFetch={(path) => fetchPublicDrill((data.results_data || []).indexOf(card), path)} />
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
