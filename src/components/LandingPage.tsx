import { useEffect, useRef, useState } from 'react';

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
    a: 'LucentReport automatically selects the best visualization based on your data shape and query intent: bar, line, area, pie/donut, stacked bar, combo, horizontal bar, scatter, and data table.',
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
            <img src="/app-icon.png" alt="LucentReport" className="lp-nav-brand-img" />
          </a>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How it works</a>
            <a href="#analytics" className="lp-nav-link">Analytics</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
          </div>
          <a href="/login" className="lp-signin-btn" aria-label="Sign in to LucentReport">
            Sign in <span className="lp-signin-arrow" aria-hidden="true">→</span>
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
              Multi-Agent AI · Any Data Source · Real-time Analytics
            </div>

            <h1 className="lp-hero-h1">
              Build AI dashboards from<br/>
              your data <span className="lp-grad-text">in seconds</span>
            </h1>

            <p className="lp-hero-sub">
              Connect Postgres, Snowflake, Salesforce, S3, Google Drive, or any other data source —
              ask in plain English, and LucentReport's AI generates pixel-perfect charts,
              advanced analytics, and executive dashboards automatically. No SQL or BI experience needed.
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
            {['PostgreSQL', 'Snowflake', 'Salesforce', 'Amazon S3', 'Google Drive', 'BigQuery', 'MySQL', 'Redshift', 'Supabase', 'RDS'].map(name => (
              <div key={name} className="lp-trust-logo" role="listitem">{name}</div>
            ))}
          </div>
        </section>

        {/* ── Stats / Social proof ── */}
        <section className="lp-stats-section" aria-label="Product statistics">
          <div className="lp-stats-grid">
            {[
              { num: '< 10s', label: 'From question to dashboard', desc: 'Average time to first chart' },
              { num: '8+',    label: 'Chart types generated', desc: 'Automatically selected by AI' },
              { num: '6',     label: 'Analytics algorithms', desc: 'Forecasting, anomaly detection & more' },
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
                title: 'Natural Language to Charts',
                desc: 'Bar, line, area, pie, stacked, combo, scatter, horizontal bar, and table. LucentReport automatically picks the right chart type based on your data shape and query intent.',
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
                title: 'Beautiful Design System',
                desc: 'Multiple themes, 7 color palettes, and layout modes. Export as PNG, deploy as a public shareable link, or embed live dashboards in your product.',
                accent: '#6366f1',
              },
              {
                img: '/feat-secure.png',
                title: 'Secure by Design',
                desc: 'Database credentials never leave your server. All SQL runs in read-only mode against your own database. No data is stored or transmitted externally.',
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
        <section className="lp-section lp-how-section" id="how" aria-labelledby="how-heading">
          <div className="lp-section-tag">How it works</div>
          <h2 className="lp-section-h2" id="how-heading">
            From any data source to dashboard<br/>in three steps
          </h2>

          <ol className="lp-steps" aria-label="Steps to build a dashboard">
            {[
              {
                num: '01',
                icon: '🔌',
                title: 'Connect your data source',
                desc: 'Add your connection: Postgres, Snowflake, Salesforce, S3, Google Drive, BigQuery, MySQL, and more. LucentReport automatically discovers your schema, tables, relationships, and data types with no manual configuration needed.',
              },
              {
                num: '02',
                icon: '💬',
                title: 'Ask in plain English',
                desc: 'Type naturally: "Show monthly revenue by product category" or "Build a CEO dashboard" and watch the AI pipeline plan, write SQL, execute queries, and render charts.',
              },
              {
                num: '03',
                icon: '✨',
                title: 'Explore, refine, and deploy',
                desc: 'Refine charts, apply themes, drill into any data point, run advanced analytics, and deploy a live public dashboard link for stakeholders in one click.',
              },
            ].map((s, i) => (
              <li key={s.num} className="lp-step">
                <div className="lp-step-num" aria-hidden="true">{s.num}</div>
                <div className="lp-step-icon" aria-hidden="true">{s.icon}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
                {i < 2 && <div className="lp-step-connector" aria-hidden="true" />}
              </li>
            ))}
          </ol>
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
            Join teams using LucentReport to turn raw PostgreSQL data into actionable intelligence —
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
            <img src="/app-icon.png" alt="LucentReport" className="lp-footer-brand-img" loading="lazy" />
          </a>
          <nav aria-label="Footer navigation" className="lp-footer-nav">
            <a href="#features" className="lp-footer-link">Features</a>
            <a href="#how" className="lp-footer-link">How it works</a>
            <a href="#analytics" className="lp-footer-link">Analytics</a>
            <a href="#faq" className="lp-footer-link">FAQ</a>
          </nav>
          <p className="lp-footer-copy">© 2025 LucentReport. AI-powered dashboard builder for PostgreSQL.</p>
          <a href="/login" className="lp-footer-signin">
            Sign in →
          </a>
        </div>
      </footer>

    </div>
  );
}
