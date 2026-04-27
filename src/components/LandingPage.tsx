import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

// ── How it Works — Process Icons ─────────────────────────────────────────────

function ConnectIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="6" rx="7" ry="2.5" fill="#3b82f6"/>
      <path d="M5 6v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V6c0 1.38-3.13 2.5-7 2.5S5 7.38 5 6z" fill="#60a5fa"/>
      <path d="M5 10v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4c0 1.38-3.13 2.5-7 2.5S5 11.38 5 10z" fill="#93c5fd"/>
      <circle cx="18" cy="19" r="3" fill="#1d4ed8"/>
      <path d="M15.5 19h-3" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 16.5v-2" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function AskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2z" fill="#7c3aed"/>
      <rect x="7" y="8" width="6" height="1.5" rx="0.75" fill="#ddd6fe"/>
      <rect x="7" y="11" width="10" height="1.5" rx="0.75" fill="#ddd6fe" opacity="0.7"/>
      <circle cx="19" cy="5" r="2.5" fill="#f59e0b"/>
      <path d="M18.3 4.5l.7.7 1.2-1.2" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BuildIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1.5" fill="#f97316"/>
      <rect x="10" y="9" width="4" height="12" rx="1.5" fill="#fbbf24"/>
      <rect x="17" y="11" width="4" height="10" rx="1.5" fill="#f59e0b"/>
      <path d="M5 12L12 7L21 9.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="19" cy="4" r="2.5" fill="#a78bfa"/>
      <path d="M17.5 5.5l3-3M19 3.5l.5-.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="8" height="8" rx="2" fill="#10b981"/>
      <rect x="13" y="3" width="8" height="8" rx="2" fill="#34d399"/>
      <path d="M11 7H7a2 2 0 0 0-2 2v2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 17h4a2 2 0 0 0 2-2v-2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 16l-2 2 2 2M16 8l2-2-2-2" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── ProcessCard ───────────────────────────────────────────────────────────────

interface ProcessCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ProcessCard({ icon, title, description }: ProcessCardProps) {
  return (
    <div className="process-card">
      <div className="process-card-line-v" aria-hidden="true" />
      <div className="process-card-line-h" aria-hidden="true" />
      <div className="process-icon-wrap">{icon}</div>
      <h3 className="process-card-title">{title}</h3>
      <p className="process-card-desc">{description}</p>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: 'What data sources does LucentReport support?',
    a: 'LucentReport connects to a wide range of data sources: PostgreSQL, MySQL, Snowflake, Google BigQuery, Amazon S3 (via Athena), Salesforce, Google Drive (Sheets & CSV), Redshift, and more. If your data lives somewhere, LucentReport can reach it.',
  },
  {
    q: 'Do I need to write SQL to use LucentReport?',
    a: 'No. LucentReport\'s multi-agent AI converts plain English into optimized queries automatically. Just describe what you want: "Show monthly revenue by product category" and LucentReport handles the SQL, chart selection, and insight generation.',
  },
  {
    q: 'How does LucentReport protect my data?',
    a: 'Your database credentials stay on your own server. All queries run in strict read-only mode and no data is stored externally. LucentReport never writes to your database.',
  },
  {
    q: 'What chart types does LucentReport generate?',
    a: 'LucentReport automatically selects the best visualization based on your data shape and query intent. Standard types include bar, line, area, pie/donut, stacked bar, combo, horizontal bar, scatter, and data table. Advanced D3 visualizations include treemap, sunburst, Sankey diagram, bump chart, and force graph — 15+ chart types in total, powered by Recharts and D3.',
  },
  {
    q: 'Can I export dashboards to PowerPoint or PDF?',
    a: 'Yes. The built-in Export Pipeline uses a headless browser to render pixel-perfect screenshots of your dashboard and package them into PPTX, PDF, or a high-resolution PNG poster — ready to drop straight into board decks or client reports.',
  },
  {
    q: 'Does LucentReport support finance and accounting workflows?',
    a: 'Yes. LucentReport includes 7 Finance Specialist AI Agents pre-loaded with domain expertise: Reconciliation, Month-End Close, Variance Analysis, Financial Statement Close, Actuals Reporting, Exception Identification, and Close Process Monitoring. Each agent understands accounting terminology, required output cards, and escalation logic out of the box.',
  },
  {
    q: 'Can I share dashboards publicly?',
    a: 'Yes. Deploy any dashboard as a live public URL with one click. Viewers don\'t need a LucentReport account, making it easy to share with stakeholders, investors, or clients.',
  },
  {
    q: 'How is LucentReport different from Power BI or Tableau?',
    a: 'LucentReport generates a complete styled dashboard from one sentence in under 10 seconds. No drag-and-drop, no data modeling, no DAX formulas. Just plain English. It\'s the difference between asking a question and spending hours configuring a report.',
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Subtle parallax on mouse move
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const dx = (e.clientX / w - 0.5) * 18;
      const dy = (e.clientY / h - 0.5) * 12;
      el.style.setProperty('--px', `${dx}px`);
      el.style.setProperty('--py', `${dy}px`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="lp-root">

      {/* ── Navbar ── */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <a href="/" className="lp-nav-brand" aria-label="LucentReport home">
            <img src="/app-icon.png" alt="" className="lp-nav-logo" />
            <span className="lp-nav-name">
              <span className="lp-nav-name-lucent">Lucent</span><span className="lp-nav-name-report">Report</span>
            </span>
          </a>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How it works</a>
            <a href="#analytics" className="lp-nav-link">Analytics</a>
            <a href="#finance" className="lp-nav-link">Finance AI</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
          </div>
          <a href="/login" className="lp-signin-btn" aria-label="Sign in to LucentReport">
            Sign in
          </a>
        </div>
      </nav>

      <main id="main-content">

        {/* ── Hero ── */}
        <section className="lp-hero" ref={heroRef} aria-label="Hero section">
          {/* Background orbs */}
          <div className="lp-orb lp-orb-1" aria-hidden="true" />
          <div className="lp-orb lp-orb-2" aria-hidden="true" />
          <div className="lp-orb lp-orb-3" aria-hidden="true" />

          <div className="lp-hero-content">
            <div className="lp-hero-badge" aria-label="Product highlights">
              <span className="lp-badge-dot" aria-hidden="true" />
              Multi-Agent AI · Finance AI Agents · Any Data Source · Export to PDF/PPTX
            </div>

            <h1 className="lp-hero-h1">
              Build AI dashboards from<br/>
              your data <span className="lp-grad-text">in seconds</span>
            </h1>

            <p className="lp-hero-sub">
              Connect any data source — Snowflake, BigQuery, MySQL, Salesforce, S3, Google Drive, or your own database —
              ask in plain English, and LucentReport's AI generates pixel-perfect charts,
              advanced analytics, and boardroom-ready dashboards automatically. No SQL or BI experience needed.
            </p>

            <div className="lp-hero-actions">
              <a href="/login" className="lp-cta-primary">
                Get started free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a href="/login" className="lp-cta-ghost">
                Sign in to your account
              </a>
            </div>

            <p className="lp-hero-note">No credit card required · Free to explore</p>
          </div>

          {/* Dashboard mockup */}
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-dash-mockup">
              {/* Top bar */}
              <div className="lp-mock-bar">
                <div className="lp-mock-dots">
                  <span style={{ background: '#ef4444' }} />
                  <span style={{ background: '#f59e0b' }} />
                  <span style={{ background: '#22c55e' }} />
                </div>
                <div className="lp-mock-title">Sales Analytics · Q4 2024</div>
              </div>

              {/* KPI row */}
              <div className="lp-mock-kpis">
                {[
                  { label: 'Revenue', val: '$2.4M', trend: '+18%', up: true },
                  { label: 'Orders', val: '12,849', trend: '+7%', up: true },
                  { label: 'Churn', val: '2.1%', trend: '-0.4%', up: false },
                ].map(k => (
                  <div key={k.label} className="lp-mock-kpi">
                    <div className="lp-mock-kpi-label">{k.label}</div>
                    <div className="lp-mock-kpi-val">{k.val}</div>
                    <div className={`lp-mock-kpi-trend ${k.up ? 'up' : 'down'}`}>{k.trend}</div>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="lp-mock-charts">
                <div className="lp-mock-chart lp-mock-chart-main">
                  <div className="lp-mock-chart-label">Revenue over time</div>
                  <div className="lp-mock-bars">
                    {[40, 65, 50, 80, 70, 90, 75, 100, 85, 110, 95, 120].map((h, i) => (
                      <div key={i} className="lp-mock-bar-wrap">
                        <div className="lp-mock-bar-fill" style={{ height: `${h}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lp-mock-chart lp-mock-chart-side">
                  <div className="lp-mock-chart-label">By Category</div>
                  <div className="lp-mock-pie-wrap">
                    <svg viewBox="0 0 64 64" className="lp-mock-pie" aria-hidden="true">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray="100 76" strokeDashoffset="0" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#a855f7" strokeWidth="12" strokeDasharray="44 132" strokeDashoffset="-100" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#22d3ee" strokeWidth="12" strokeDasharray="32 144" strokeDashoffset="-144" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* AI insight bubble */}
              <div className="lp-mock-bubble">
                <span className="lp-mock-bubble-dot" aria-hidden="true" />
                Revenue ↑ 18% MoM · Electronics driving 62% of growth
              </div>
            </div>

            {/* Floating cards */}
            <div className="lp-float-card lp-float-1" aria-hidden="true">
              <span className="lp-float-emoji">🤖</span>
              <div>
                <div className="lp-float-title">AI Generated</div>
                <div className="lp-float-sub">8 charts · 2s</div>
              </div>
            </div>
            <div className="lp-float-card lp-float-2" aria-hidden="true">
              <span className="lp-float-emoji">⚡</span>
              <div>
                <div className="lp-float-title">Forecast ready</div>
                <div className="lp-float-sub">+6 periods</div>
              </div>
            </div>
            <div className="lp-float-card lp-float-3" aria-hidden="true">
              <span className="lp-float-emoji">🎯</span>
              <div>
                <div className="lp-float-title">Priority Matrix</div>
                <div className="lp-float-sub">12 items plotted</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Compatible data sources ── */}
        <section className="lp-trust" aria-label="Compatible data sources">
          <p className="lp-trust-label">Connects to any data source</p>
          <div className="lp-trust-logos" role="list">
            {['PostgreSQL', 'MySQL', 'Snowflake', 'Salesforce', 'Amazon S3', 'Google Drive', 'BigQuery', 'Redshift', 'Supabase', 'RDS'].map(name => (
              <div key={name} className="lp-trust-logo" role="listitem">{name}</div>
            ))}
          </div>
        </section>

        {/* ── Stats / Social proof ── */}
        <section className="lp-stats-section" aria-label="Product statistics">
          <div className="lp-stats-grid">
            {[
              { num: '< 10s', label: 'From question to dashboard', desc: 'Average time to first chart' },
              { num: '15+',   label: 'Chart types generated', desc: 'Recharts, D3, and custom renderers' },
              { num: '7',     label: 'Finance AI Agents', desc: 'Reconciliation, close, variance & more' },
              { num: '100%',  label: 'Read-only queries', desc: 'Your database is never written to' },
            ].map(s => (
              <div key={s.num} className="lp-stat-card">
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-label">{s.label}</div>
                <div className="lp-stat-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lp-section" id="features" aria-labelledby="features-heading">
          <div className="lp-section-tag">Features</div>
          <h2 className="lp-section-h2" id="features-heading">Everything your team needs</h2>
          <p className="lp-section-sub">From any data source to boardroom-ready dashboards, fully automated by AI.</p>

          <div className="lp-features-grid">
            {[
              {
                img: '/feat-multi-agent.png',
                title: 'Multi-Agent AI Pipeline',
                desc: 'Specialized agents (Data Analyzer, Planner, SQL Expert, Reflector, Insight Enricher) collaborate to generate accurate, insightful dashboards from a single prompt.',
                accent: '#6366f1',
              },
              {
                img: '/feat-nl-charts.png',
                title: '15+ Chart Types',
                desc: 'Standard charts (bar, line, area, pie, stacked, combo, scatter, table) plus advanced D3 visualizations: treemap, sunburst, Sankey diagram, bump chart, and force graph — automatically selected by AI.',
                accent: '#8b5cf6',
              },
              {
                img: '/feat-analytics.png',
                title: 'Advanced Analytics Engine',
                desc: 'One-click forecasting, priority matrix, trend decomposition, Pareto (80/20) analysis, correlation heatmaps, and statistical anomaly detection built into every dashboard.',
                accent: '#a855f7',
              },
              {
                img: '/feat-hitl.png',
                title: 'Human-in-the-Loop AI',
                desc: 'When the AI needs clarification on forecast horizon, matrix axes, or custom parameters, it pauses and asks you in the chat before proceeding.',
                accent: '#c026d3',
              },
              {
                img: '/feat-design.png',
                title: 'Export to PDF, PPTX & PNG',
                desc: 'One-click pixel-perfect export pipeline. A headless browser renders your full dashboard and packages it into a PowerPoint deck, PDF report, or high-resolution PNG poster — board-ready in seconds.',
                accent: '#0891b2',
              },
              {
                img: '/feat-secure.png',
                title: 'Secure by Design',
                desc: 'Database credentials never leave your server. All SQL runs in read-only mode against your own database. No data is stored or transmitted externally. httpOnly cookie auth prevents token theft.',
                accent: '#4f46e5',
              },
            ].map(f => (
              <article key={f.title} className="lp-feat-card" style={{ '--accent': f.accent } as React.CSSProperties}>
                <div className="lp-feat-icon">
                  <img src={f.img} alt={f.title} className="lp-feat-img" />
                </div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-process-section" id="how" aria-labelledby="how-heading">
          <div className="lp-process-inner">
            {/* Left */}
            <div className="lp-process-left">
              <span className="lp-section-tag">How it works</span>
              <h2 className="lp-process-h2" id="how-heading">
                From raw data to live dashboard in minutes
              </h2>
              <p className="lp-process-desc">
                No SQL knowledge, no BI training, no setup headaches. Just connect your data, ask a question, and LucentReport's AI pipeline handles everything from query to insight.
              </p>
              <a href="/login" className="lp-process-cta">
                Get started free <ArrowUpRight size={18} />
              </a>
            </div>

            {/* Right — 2×2 grid */}
            <div className="lp-process-grid">
              <ProcessCard
                icon={<ConnectIcon />}
                title="Connect your datasource"
                description="Add any database or cloud source — Postgres, Snowflake, BigQuery, MySQL, Google Sheets, and more. LucentReport auto-discovers your schema instantly."
              />
              <ProcessCard
                icon={<AskIcon />}
                title="Ask in plain English"
                description='Type naturally — "Show monthly revenue by region" — and the AI pipeline plans, writes SQL, and executes queries on your live data.'
              />
              <ProcessCard
                icon={<BuildIcon />}
                title="AI builds your dashboard"
                description="Charts, metrics, and insights are generated automatically. The multi-agent AI picks the right visualization for every query result."
              />
              <ProcessCard
                icon={<DeployIcon />}
                title="Share and deploy"
                description="Apply your brand kit, share a live public link, export to PDF/PPTX, or embed dashboards — all in one click."
              />
            </div>
          </div>
        </section>

        {/* ── Advanced Analytics ── */}
        <section className="lp-section lp-analytics-section" id="analytics" aria-labelledby="analytics-heading">
          <div className="lp-analytics-inner">
            <div className="lp-analytics-left">
              <div className="lp-section-tag">Advanced Analytics</div>
              <h2 className="lp-analytics-h2" id="analytics-heading">
                Beyond charts —<br/><span className="lp-grad-text">real intelligence</span>
              </h2>
              <p className="lp-analytics-desc">
                LucentReport doesn't just visualize your data. A dedicated analytics engine
                runs on top of every dashboard to automatically surface patterns,
                forecasts, and anomalies you'd otherwise miss.
              </p>
              <ul className="lp-analytics-list" aria-label="Analytics capabilities">
                {[
                  '📈 Linear forecasting with confidence intervals',
                  '🎯 Priority Matrix: effort vs impact visualization',
                  '📉 Trend decomposition with moving averages',
                  '🔥 Correlation heatmap across numeric columns',
                  '⚖️ Pareto (80/20) analysis with cumulative curve',
                  '🚨 Statistical anomaly detection (IQR-based)',
                ].map(item => (
                  <li key={item} className="lp-analytics-item">{item}</li>
                ))}
              </ul>
            </div>

            <div className="lp-analytics-right" aria-hidden="true">
              <div className="lp-analytics-cards">
                <div className="lp-ana-card lp-ana-card-forecast">
                  <div className="lp-ana-card-head">
                    <span>📈</span>
                    <span className="lp-ana-card-tag analytics-badge-sm">Forecast</span>
                  </div>
                  <div className="lp-ana-sparkline">
                    <svg viewBox="0 0 120 40" fill="none">
                      <polyline points="0,35 20,28 40,22 60,18 80,14 100,10" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="100,10 120,7" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round"/>
                      <polyline points="100,10 120,14" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
                      <polyline points="100,10 120,4" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="lp-ana-card-label">Next 6 periods projected</p>
                </div>

                <div className="lp-ana-card lp-ana-card-matrix">
                  <div className="lp-ana-card-head">
                    <span>🎯</span>
                    <span className="lp-ana-card-tag analytics-badge-sm">Priority Matrix</span>
                  </div>
                  <div className="lp-ana-matrix-preview">
                    <div className="lp-ana-quad" style={{ background: '#10b98118', borderColor: '#10b98130' }}><span style={{ color: '#10b981', fontSize: 9, fontWeight: 700 }}>Quick Win</span></div>
                    <div className="lp-ana-quad" style={{ background: '#6366f118', borderColor: '#6366f130' }}><span style={{ color: '#6366f1', fontSize: 9, fontWeight: 700 }}>Major</span></div>
                    <div className="lp-ana-quad" style={{ background: '#f59e0b18', borderColor: '#f59e0b30' }}><span style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700 }}>Fill-In</span></div>
                    <div className="lp-ana-quad" style={{ background: '#ef444418', borderColor: '#ef444430' }}><span style={{ color: '#ef4444', fontSize: 9, fontWeight: 700 }}>Avoid</span></div>
                    <div className="lp-ana-dot" style={{ left: '22%', top: '18%', background: '#10b981' }} />
                    <div className="lp-ana-dot" style={{ left: '68%', top: '24%', background: '#6366f1' }} />
                    <div className="lp-ana-dot" style={{ left: '30%', top: '72%', background: '#f59e0b' }} />
                    <div className="lp-ana-dot" style={{ left: '75%', top: '68%', background: '#ef4444' }} />
                  </div>
                </div>

                <div className="lp-ana-card lp-ana-card-anomaly">
                  <div className="lp-ana-card-head">
                    <span>🚨</span>
                    <span className="lp-ana-card-tag analytics-badge-sm">Anomaly</span>
                  </div>
                  <div className="lp-ana-bars-preview">
                    {[30, 45, 38, 42, 95, 40, 35, 41, 38].map((h, i) => (
                      <div key={i} className="lp-ana-bar" style={{ height: `${h}%`, background: h > 80 ? '#ef4444' : '#6366f1' }} />
                    ))}
                  </div>
                  <p className="lp-ana-card-label">2 anomalies detected · severity: medium</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Finance AI Agents ── */}
        <section className="lp-finance-section" id="finance" aria-labelledby="finance-heading">
          <div className="lp-finance-inner">
            <div className="lp-section-tag">Finance &amp; Compliance</div>
            <h2 className="lp-section-h2" id="finance-heading">Finance AI Agents — built for close teams</h2>
            <p className="lp-section-sub">
              Seven specialist AI agents pre-loaded with accounting domain expertise. No prompt engineering required —
              just pick an agent and it already knows the required outputs, SQL patterns, and escalation logic for your workflow.
            </p>

            <div className="lp-finance-grid">
              {[
                { emoji: '🔄', title: 'Reconciliation Agent', desc: 'Auto-match rates, break amounts by category, aging buckets, and exception tables with drill-down into unmatched items.' },
                { emoji: '📅', title: 'Month-End Close', desc: 'Close status by entity, task completion tracker, open item aging, and blocking issue summary — updated in real time.' },
                { emoji: '📊', title: 'Variance Analysis', desc: 'Favorable/unfavorable bridges, root cause ranking, period-over-period comparison, and budget vs. actuals waterfalls.' },
                { emoji: '📋', title: 'Financial Statement Close', desc: 'P&L, balance sheet, and cash flow statement cards with inter-statement consistency checks and footnote flags.' },
                { emoji: '📈', title: 'Actuals Reporting', desc: 'YTD actuals vs. budget, prior year comparatives, rolling 12-month trends, and executive KPI summary panels.' },
                { emoji: '⚠️', title: 'Exception Identification', desc: 'Threshold-based alerts, duplicate detection, outlier flagging, and a prioritized exception queue for review.' },
                { emoji: '⏱️', title: 'Close Process Monitoring', desc: 'Predictive close date, bottleneck identification, entity-level status heatmap, and days-to-close trend.' },
              ].map(agent => (
                <article key={agent.title} className="lp-finance-card">
                  <div className="lp-finance-emoji">{agent.emoji}</div>
                  <h3 className="lp-finance-title">{agent.title}</h3>
                  <p className="lp-finance-desc">{agent.desc}</p>
                </article>
              ))}
            </div>

            <div className="lp-finance-cta">
              <a href="/login" className="lp-cta-primary">
                Explore Finance Agents
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          </div>
        </section>

        {/* ── Enterprise Trust ── */}
        <section className="lp-enterprise-section" aria-labelledby="enterprise-heading">
          <div className="lp-enterprise-inner">
          <div className="lp-section-tag">Enterprise Ready</div>
          <h2 className="lp-section-h2" id="enterprise-heading">Built for teams that need to trust their tools</h2>
          <p className="lp-section-sub">Security, data governance, and audit readiness are first-class features — not afterthoughts.</p>

          <div className="lp-enterprise-grid">
            {[
              {
                icon: '🔒',
                title: 'Read-Only Data Access',
                desc: 'All SQL executes in strict read-only mode. LucentReport can never modify, delete, or write to your database — guaranteed by design.',
              },
              {
                icon: '🍪',
                title: 'httpOnly Cookie Auth',
                desc: 'Auth tokens are stored in httpOnly cookies, invisible to JavaScript. XSS attacks cannot steal session credentials.',
              },
              {
                icon: '🔑',
                title: 'Credential Isolation',
                desc: 'Database credentials are stored encrypted on your own server. They are never transmitted to LucentReport\'s infrastructure.',
              },
              {
                icon: '👥',
                title: 'Role-Based Access',
                desc: 'Admin, Editor, and Viewer roles per project. Control who can query, who can edit dashboards, and who can only view.',
              },
              {
                icon: '📤',
                title: 'Audit-Ready Exports',
                desc: 'Export any dashboard to PDF or PPTX for audit trails, board presentations, or regulatory submissions — pixel-perfect and timestamped.',
              },
              {
                icon: '⏰',
                title: 'Session Token Expiry',
                desc: 'Auth tokens expire after 24 hours and are automatically rotated on each login. Stale tokens are deleted server-side immediately.',
              },
            ].map(item => (
              <article key={item.title} className="lp-enterprise-card">
                <div className="lp-enterprise-icon">{item.icon}</div>
                <h3 className="lp-enterprise-title">{item.title}</h3>
                <p className="lp-enterprise-desc">{item.desc}</p>
              </article>
            ))}
          </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-section lp-faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="lp-section-tag">FAQ</div>
          <h2 className="lp-section-h2" id="faq-heading">Frequently asked questions</h2>
          <p className="lp-section-sub">Everything you need to know about LucentReport's AI dashboard builder.</p>

          <div className="lp-faq-list" role="list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`lp-faq-item ${openFaq === i ? 'open' : ''}`} role="listitem">
                <button
                  className="lp-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span>{item.q}</span>
                  <span className="lp-faq-chevron" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  className="lp-faq-a"
                  role="region"
                  aria-hidden={openFaq !== i}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="lp-cta-section" aria-label="Call to action">
          <div className="lp-cta-orb" aria-hidden="true" />
          <div className="lp-section-tag lp-tag-light">Get started today</div>
          <h2 className="lp-cta-h2">
            Your data has a story.<br/>
            <span className="lp-grad-text">Let AI tell it.</span>
          </h2>
          <p className="lp-cta-sub">
            Join teams using LucentReport to turn raw data from any source into actionable intelligence —
            no SQL expertise, no BI consultants, no setup time.
          </p>
          <a href="/login" className="lp-cta-primary lp-cta-large">
            Launch LucentReport free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-inner">
          <a href="/" className="lp-footer-brand" aria-label="LucentReport home">
            <img src="/app-icon.png" alt="" className="lp-nav-logo" />
            <span className="lp-nav-name" style={{ color: '#e2e8f0' }}>
              <span className="lp-nav-name-lucent">Lucent</span><span style={{ WebkitTextFillColor: '#e2e8f0', color: '#e2e8f0' }}>Report</span>
            </span>
          </a>
          <nav aria-label="Footer navigation" className="lp-footer-nav">
            <a href="#features" className="lp-footer-link">Features</a>
            <a href="#how" className="lp-footer-link">How it works</a>
            <a href="#analytics" className="lp-footer-link">Analytics</a>
            <a href="#finance" className="lp-footer-link">Finance AI</a>
            <a href="#faq" className="lp-footer-link">FAQ</a>
          </nav>
          <p className="lp-footer-copy">© 2026 LucentReport. AI-powered multi-database dashboard builder.</p>
          <a href="/login" className="lp-footer-signin">
            Sign in →
          </a>
        </div>
      </footer>

    </div>
  );
}
