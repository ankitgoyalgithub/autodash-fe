import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, LayoutDashboard } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { InsightCard } from './InsightCard';
import { BASE } from './constants';

export function PublicDashboardView() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      {(() => {
        const sorted = [...data.results_data].sort((a: any, b: any) => {
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
                {metrics.map((card: any, i: number) => <InsightCard key={i} card={card} layout="grid" />)}
              </div>
            )}
            {charts.length > 0 && (
              <div className="charts-strip">
                {charts.map((card: any, i: number) => <InsightCard key={`c${i}`} card={card} layout="grid" />)}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
