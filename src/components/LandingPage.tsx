import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

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
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <img src={logo} alt="AutoDash" className="lp-nav-logo" />
            <span className="lp-nav-name">AutoDash</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How it works</a>
            <a href="#analytics" className="lp-nav-link">Analytics</a>
          </div>
          <button className="lp-signin-btn" onClick={() => navigate('/login')}>
            Sign in <span className="lp-signin-arrow">→</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero" ref={heroRef}>
        {/* Background orbs */}
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            AI-Powered · Multi-Agent · Real-time
          </div>

          <h1 className="lp-hero-h1">
            Turn any database<br/>
            into <span className="lp-grad-text">intelligent dashboards</span>
          </h1>

          <p className="lp-hero-sub">
            Connect your PostgreSQL database, describe what you need,
            and AutoDash builds pixel-perfect charts, advanced analytics,
            and executive dashboards — in seconds.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-cta-primary" onClick={() => navigate('/login')}>
              Get started free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="lp-cta-ghost" onClick={() => navigate('/login')}>
              Sign in to your account
            </button>
          </div>

          <p className="lp-hero-note">No credit card required · Free to explore</p>
        </div>

        {/* Dashboard mockup */}
        <div className="lp-hero-visual">
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
                {/* Fake bars */}
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
                {/* Fake pie */}
                <div className="lp-mock-pie-wrap">
                  <svg viewBox="0 0 64 64" className="lp-mock-pie">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray="100 76" strokeDashoffset="0" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#a855f7" strokeWidth="12" strokeDasharray="44 132" strokeDashoffset="-100" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#22d3ee" strokeWidth="12" strokeDasharray="32 144" strokeDashoffset="-144" />
                  </svg>
                </div>
              </div>
            </div>

            {/* AI chat bubble */}
            <div className="lp-mock-bubble">
              <span className="lp-mock-bubble-dot" />
              Revenue ↑ 18% MoM — Electronics driving 62% of growth
            </div>
          </div>

          {/* Floating cards */}
          <div className="lp-float-card lp-float-1">
            <span className="lp-float-emoji">🤖</span>
            <div>
              <div className="lp-float-title">AI Generated</div>
              <div className="lp-float-sub">8 charts · 2s</div>
            </div>
          </div>
          <div className="lp-float-card lp-float-2">
            <span className="lp-float-emoji">⚡</span>
            <div>
              <div className="lp-float-title">Forecast ready</div>
              <div className="lp-float-sub">+6 periods</div>
            </div>
          </div>
          <div className="lp-float-card lp-float-3">
            <span className="lp-float-emoji">🎯</span>
            <div>
              <div className="lp-float-title">Priority Matrix</div>
              <div className="lp-float-sub">12 items plotted</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by (logo row) ── */}
      <section className="lp-trust">
        <p className="lp-trust-label">Works seamlessly with</p>
        <div className="lp-trust-logos">
          {['PostgreSQL', 'Supabase', 'RDS', 'Neon', 'TimescaleDB', 'AlloyDB'].map(name => (
            <div key={name} className="lp-trust-logo">{name}</div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-tag">Features</div>
        <h2 className="lp-section-h2">Everything your team needs</h2>
        <p className="lp-section-sub">From raw SQL to boardroom-ready dashboards — fully automated.</p>

        <div className="lp-features-grid">
          {[
            {
              icon: '🧠',
              title: 'Multi-Agent AI',
              desc: 'A pipeline of specialized agents — Data Analyzer, Planner, SQL Expert, Reflector — work together to generate accurate, insightful dashboards.',
              accent: '#6366f1',
            },
            {
              icon: '📊',
              title: '8 Chart Types',
              desc: 'Bar, Line, Area, Pie, Stacked, Combo, Timeline infographics — automatically selected based on your data shape and query intent.',
              accent: '#8b5cf6',
            },
            {
              icon: '🔬',
              title: 'Advanced Analytics',
              desc: 'One-click Forecasting, Priority Matrix, Trend decomposition, Pareto analysis, Correlation heatmaps, and Anomaly detection.',
              accent: '#a855f7',
            },
            {
              icon: '🙋',
              title: 'Human-in-the-Loop',
              desc: 'When the AI needs clarification — forecast horizon, matrix axes, custom parameters — it pauses and asks you directly in the chat.',
              accent: '#c026d3',
            },
            {
              icon: '🎨',
              title: 'Beautiful Design System',
              desc: 'Multiple themes, palettes, and layout modes. Export as PNG, deploy as a public link, or embed in your product.',
              accent: '#6366f1',
            },
            {
              icon: '🔒',
              title: 'Secure & Private',
              desc: 'Your credentials never leave your server. All SQL runs in read-only mode against your own database. No data stored externally.',
              accent: '#4f46e5',
            },
          ].map(f => (
            <div key={f.title} className="lp-feat-card" style={{ '--accent': f.accent } as any}>
              <div className="lp-feat-icon">{f.icon}</div>
              <h3 className="lp-feat-title">{f.title}</h3>
              <p className="lp-feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-how-section" id="how">
        <div className="lp-section-tag">How it works</div>
        <h2 className="lp-section-h2">From database to dashboard<br/>in three steps</h2>

        <div className="lp-steps">
          {[
            {
              num: '01',
              icon: '🔌',
              title: 'Connect your database',
              desc: 'Add your PostgreSQL connection details. AutoDash automatically discovers your schema, tables, and data types.',
            },
            {
              num: '02',
              icon: '💬',
              title: 'Describe what you want',
              desc: 'Type naturally — "Show monthly revenue by product category" or "Build a CEO dashboard" — and watch the AI plan, query, and render.',
            },
            {
              num: '03',
              icon: '✨',
              title: 'Explore and deploy',
              desc: 'Refine charts, apply themes, drill down into any data point, run advanced analytics, and deploy a live public link in one click.',
            },
          ].map((s, i) => (
            <div key={s.num} className="lp-step">
              <div className="lp-step-num">{s.num}</div>
              <div className="lp-step-icon">{s.icon}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-desc">{s.desc}</p>
              {i < 2 && <div className="lp-step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Analytics highlight ── */}
      <section className="lp-section lp-analytics-section" id="analytics">
        <div className="lp-analytics-inner">
          <div className="lp-analytics-left">
            <div className="lp-section-tag">Advanced Analytics</div>
            <h2 className="lp-analytics-h2">Beyond charts —<br/><span className="lp-grad-text">real intelligence</span></h2>
            <p className="lp-analytics-desc">
              AutoDash doesn't just visualize your data. It runs a dedicated analytics engine
              on top of every dashboard to surface patterns you'd otherwise miss.
            </p>
            <ul className="lp-analytics-list">
              {[
                '📈 Linear forecasting with confidence intervals',
                '🎯 Priority Matrix — effort vs impact visualization',
                '📉 Trend decomposition with moving averages',
                '🔥 Correlation heatmap across numeric columns',
                '⚖️ Pareto (80/20) analysis with cumulative curve',
                '🚨 Statistical anomaly detection (IQR-based)',
              ].map(item => (
                <li key={item} className="lp-analytics-item">{item}</li>
              ))}
            </ul>
          </div>

          <div className="lp-analytics-right">
            {/* Analytics mini cards */}
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
                  {/* dots */}
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

      {/* ── Bottom CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-orb" />
        <div className="lp-section-tag lp-tag-light">Get started today</div>
        <h2 className="lp-cta-h2">
          Your data has a story.<br/>
          <span className="lp-grad-text">Let AI tell it.</span>
        </h2>
        <p className="lp-cta-sub">Join teams using AutoDash to turn raw data into actionable intelligence.</p>
        <button className="lp-cta-primary lp-cta-large" onClick={() => navigate('/login')}>
          Launch AutoDash
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logo} alt="AutoDash" className="lp-footer-logo" />
            <span className="lp-footer-name">AutoDash</span>
          </div>
          <p className="lp-footer-copy">© 2025 AutoDash. Built with AI, for humans.</p>
          <button className="lp-footer-signin" onClick={() => navigate('/login')}>
            Sign in →
          </button>
        </div>
      </footer>

    </div>
  );
}
