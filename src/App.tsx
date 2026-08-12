import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Send cookies (httpOnly auth cookie) with every request — required for cookie-based auth
axios.defaults.withCredentials = true;
import './styles/tokens.css';
import './App.css';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import LandingPage from './components/LandingPage';
import { BASE } from './components/constants';
import { Toaster, ConfirmHost } from './components/ui';

// Global 401 interceptor — expired or deleted token → force re-login.
// Skips /me/, /login/, /logout/ to avoid redirect loops.
axios.interceptors.response.use(
  res => res,
  err => {
    const url: string = err?.config?.url ?? '';
    const is401 = err?.response?.status === 401;
    const isAuthEndpoint = url.includes('/me/') || url.includes('/login/') || url.includes('/logout/');
    if (is401 && !isAuthEndpoint) {
      // Best-effort server logout (clears DB token), then hard-reload to /
      axios.post(`${BASE}/logout/`).catch(() => {});
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);
// Heavy app surfaces are code-split so the public landing page (the SEO
// entrypoint) ships without echarts/d3/recharts/jspdf — see src/MainApp.tsx.
const MainAppContent = lazy(() => import('./MainApp'));
const PublicDashboardView = lazy(() =>
  import('./components/PublicDashboardView').then(m => ({ default: m.PublicDashboardView }))
);
const RenderView = lazy(() => import('./components/RenderView'));

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type View = 'home' | 'dashboards' | 'workspace' | 'public' | 'datasources' | 'agents' | 'brand' | 'profile' | 'myspace' | 'documents' | 'admin';

export interface Datasource {
  id: number;
  name: string;
  kind?: 'postgresql' | 'mssql' | 'clickhouse';
  host: string;
  port: number;
  database: string;
  username: string;
  is_myspace?: boolean;
  is_hubspot?: boolean;
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
  allowed_tables?: string[];
  updated_at: string;
  created_at: string;
  my_role?: 'admin' | 'editor' | 'viewer';
  owner?: { id: number; username: string; email: string } | null;
  members?: ProjectMember[];
}

/** Canonical chart spec — derived once on the backend, consumed by all renderers. */
export interface CardChartSpec {
  type:          string;
  x_key:         string | null;
  y_keys:        string[];
  color_scheme:  string;
  annotations:   { x: string | number; label: string; color?: string }[];
  goal_line:     { value: number; label: string } | null;
  log_scale:     boolean;
  x_label:       string | null;
  y_label:       string | null;
  series_labels: Record<string, string>;
}

/** Result from one analytics tool run via auto_run_analytics().
 *  Mirrors backend/api/analytics/_base.ToolResult. */
export interface ToolOutput {
  tool_name: string;
  ok: boolean;
  summary?: string;
  metrics?: Record<string, any>;
  insights?: string[];
  visualization_spec?: Record<string, any> | null;
  error?: string | null;
  meta?: Record<string, any>;
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
  /** Canonical spec derived by normalize_chart_spec() on the backend. Present on all
   *  new widgets; absent on data stored before this feature was added. */
  chart_spec?: CardChartSpec;
  title: string;
  insight: string;
  sql: string;
  error?: string;
  filters?: { column: string; options: (string | number)[] }[];
  group_by_options?: string[];
  drill_down?: { column: string; target_metric: string; hint: string; };
  is_analytics?: boolean;
  // B6 — Output from analytics tool suite (cohort, funnel, pareto, etc.)
  // Populated by ai_service.auto_run_analytics() during insight enrichment.
  tool_outputs?: ToolOutput[];
  anomaly_info?: {
    anomalies?: any[];
    normal_range?: [number, number];
    severity?: 'low' | 'medium' | 'high' | 'none';
    anomaly_count?: number;
    mean?: number;
    // B1 — new richer fields from anomaly_detection module
    has_anomalies?: boolean;
    outliers?: { label: string; value: number; zscore?: number; direction?: string }[];
    change_points?: { label: string; before_mean: number; after_mean: number; shift_sigma: number; direction: string }[];
    stdev?: number;
    summary?: string;
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
    // B2 — comparative framing (vs prior, vs segment, trend strength)
    comparative?: {
      temporal?: {
        last: number; prior: number; prior_window_mean: number;
        pct_vs_prior: number | null; pct_vs_prior_window_mean: number | null;
        direction: 'up' | 'down' | 'flat'; window_size: number; recovery_pct?: number;
      };
      segment?: {
        top_label: string; top_value: number; top_pct_of_total: number;
        segment_mean: number; segment_median: number;
        top_vs_median_pct: number | null;
        concentration_top_3_pct: number; segment_size: number;
      };
      trend?: {
        slope: number; r_squared: number;
        strength: 'strong' | 'moderate' | 'weak';
        forecast_next: number; total_change_pct: number | null;
      };
      summary?: string;
    };
  };
  // B5 — Insight quality score
  quality?: {
    score: number;                // 0-100
    specificity: number;          // 0-40
    surprise: number;             // 0-35
    actionability: number;        // 0-25
    band: 'weak' | 'fair' | 'good' | 'excellent';
  };
  // B3 — Root-cause analysis on significant findings
  root_cause?: {
    narrative: string;
    confidence: number;           // 0-100
    hops: number;
    best_hypothesis: {
      text: string;
      test_sql: string;
      result_rows: any[];
      success: boolean;
    };
    all_hypotheses_tested: Array<{
      text: string;
      test_sql: string;
      result_rows: any[];
      success: boolean;
      error?: string;
    }>;
  };
  // Forecasting agent — augments time-series cards with projected future rows
  // (rows tagged is_forecast=true) and a metadata block describing the method.
  forecast_meta?: {
    method: string;                 // 'linear' | 'ets' | 'ets-seasonal' | 'arima' | 'auto'
    confidence: number;             // 0-100
    horizon: number;                // # of future periods appended
    narrative: string;              // single-sentence summary for inline display
    diagnostics?: {
      mean: number;
      std: number;
      trend_strength: number;
      autocorr_lag1: number;
      seasonality_detected: boolean;
      note: string;
    };
    gate_reason?: string;           // why the agent chose to forecast this card
  };
}

export interface HistoryEntry {
  id: number;
  thread_id?: number;
  query: string;
  results_data: DashboardCard[];
  reference_images: string[];
  created_at: string;
  last_refreshed_at?: string | null;
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
  // Long-form report (when thread_type === 'report')
  report_id?: number;
}

// ── Entity 360 (thread_type === 'entity360') ────────────────────────────────
export interface Entity360Section {
  title: string;
  chart_type: string;
  type: string;
  data: Record<string, any>[];
  sql?: string;
  relationship?: string;
  chart_spec?: any;
}

export interface Entity360Payload {
  status: 'ok' | 'disambiguation' | 'not_found' | 'error';
  entity?: { table: string; label: string; type: string; pk_column: string; pk_value: any };
  profile?: Array<{ label: string; value: string }>;
  kpis?: Array<{ label: string; value: string }>;
  sections?: Entity360Section[];
  timeline?: Array<{ date: string; label: string; source: string }>;
  narrative?: string;
  // disambiguation / not_found
  candidates?: Array<{ pk_value: any; label: string }>;
  entity_table?: string;
  pk_column?: string;
  display_column?: string;
  entity_type?: string;
  error?: string;
}

export interface DashboardThread {
  id: number;
  title: string;
  thread_type: 'dashboard' | 'infographic' | 'report' | 'newsletter' | 'cartoon' | 'image_infographic' | 'entity360';
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
    <>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/view/:slug" element={<PublicDashboardView />} />
            {/* Headless render route — visited by Playwright during export, no auth chrome */}
            <Route path="/render/:token" element={<RenderView />} />
            <Route path="/login" element={!isLoggedIn ? <Login onLogin={handleLogin} base={BASE} /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Splat so MainAppContent's descendant <Routes> (deep links like
                /projects/:id/threads/:id) keep matching. Static routes above win
                by specificity; "/" falls through here too. */}
            <Route path="*" element={!isLoggedIn ? <LandingPage /> : <MainAppContent onLogout={handleLogout} user={user} onUserUpdate={setUser} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-right" />
      <ConfirmHost />
    </>
  );
}
