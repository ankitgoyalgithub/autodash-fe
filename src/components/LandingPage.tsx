import { useEffect, useRef, useState } from 'react';
import { useSeo } from '../hooks/useSeo';
import './LandingPage.css';

/* ═══════════════════════════════════════════════════════════════════════════
   LucentReport — "Aurora" homepage
   All graphics are hand-built SVG / CSS — no emoji, no raster images.
   ═══════════════════════════════════════════════════════════════════════════ */

type IconProps = { size?: number; className?: string };

/* ── Brand mark — the app icon, matching the post-login sidebar logo ── */
function BrandMark({ size = 34 }: IconProps) {
  return (
    <img
      src="/app-icon.png"
      alt=""
      aria-hidden="true"
      className="lr-brand-mark"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), objectFit: 'contain' }}
    />
  );
}

/* ── Minimal stroke icons (inherit color) ── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const I = ({ size = 22, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...S}>{children}</svg>
);

const ArrowRight = ({ size = 16 }: IconProps) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcCheck = ({ size = 15 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" {...S}><path d="M20 6L9 17l-5-5" /></svg>;
const IcSpark = ({ size = 16 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" {...S}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" /></svg>;

/* content icons */
const IcPlug = () => <I><path d="M9 7V3M15 7V3M8 7h8v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V7zM12 15v6" /></I>;
const IcChat = () => <I><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /><path d="M9 11h6M9 8h4" /></I>;
const IcWand = () => <I><path d="M15 4V2M15 10V8M20 5h2M18 5h-2" /><path d="M14.5 6.5l-11 11 2 2 11-11z" /></I>;
const IcShare = () => <I><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></I>;

const IcAgents = () => <I><circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="18" r="2.4" /><circle cx="19" cy="18" r="2.4" /><path d="M12 7.4v4.6M10.5 13l-4 3M13.5 13l4 3" /></I>;
const IcCharts = () => <I><path d="M4 20V4M4 20h16" /><rect x="7" y="12" width="3" height="5" rx="0.6" /><rect x="12.5" y="8" width="3" height="9" rx="0.6" /><path d="M6 8l4-3 4 2 5-4" /></I>;
const IcTrendUp = () => <I><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></I>;
const IcExport = () => <I><path d="M12 3v11M8 8l4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></I>;

/* pipeline node icons */
const IcScan = () => <I size={16}><path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2M4 12h16" /></I>;
const IcRoute = () => <I size={16}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h6a2 2 0 0 0 2-2V8M6 16V9" /></I>;
const IcSql = () => <I size={16}><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6" /></I>;
const IcLoop = () => <I size={16}><path d="M4 10a8 8 0 0 1 13-3l3 3M20 4v6h-6M20 14a8 8 0 0 1-13 3l-3-3M4 20v-6h6" /></I>;

/* analytics list icons */
const IcForecast = () => <I size={18}><path d="M3 16l4-4 3 3 5-6" /><path d="M15 9h4v4" /><path d="M15 20l2-3 2 3" strokeDasharray="1 2" /></I>;
const IcMatrix = () => <I size={18}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18M3 12h18" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" /><circle cx="16.5" cy="16.5" r="1.2" fill="currentColor" /></I>;
const IcWave = () => <I size={18}><path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0" /></I>;
const IcPareto = () => <I size={18}><path d="M4 20V4M4 20h16" /><rect x="6.5" y="8" width="2.4" height="9" /><rect x="10.5" y="11" width="2.4" height="6" /><rect x="14.5" y="13" width="2.4" height="4" /><path d="M6 8c6 0 10 4 13 5" strokeDasharray="2 2" /></I>;
const IcHeat = () => <I size={18}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></I>;
const IcAlert = () => <I size={18}><path d="M12 3l9 16H3l9-16z" /><path d="M12 10v4M12 17v.5" /></I>;

/* reports icons */
const IcDoc = () => <I><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M8 12h8M8 16h5" /></I>;
const IcLink = () => <I><path d="M10 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7L11 8" /><path d="M14 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 5.7 5.7L13 16" /></I>;

/* finance agent icons */
const IcRecon = () => <I size={20}><path d="M4 8h11M4 8l3-3M4 8l3 3M20 16H9M20 16l-3-3M20 16l-3 3" /></I>;
const IcCalendar = () => <I size={20}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4M9 15l2 2 4-4" /></I>;
const IcVariance = () => <I size={20}><path d="M4 20V4M4 20h16" /><rect x="7" y="10" width="2.5" height="7" /><rect x="12" y="6" width="2.5" height="11" /><path d="M16.5 13l2-2 2 2" /></I>;
const IcStatement = () => <I size={20}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></I>;
const IcActuals = () => <I size={20}><path d="M4 19h16M7 19v-6M12 19V7M17 19v-9" /></I>;
const IcException = () => <I size={20}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.5" /></I>;
const IcMonitor = () => <I size={20}><path d="M4 13a8 8 0 0 1 16 0" /><path d="M12 13l4-3" /><path d="M4 13h2M18 13h2M12 4v2" /></I>;

/* security icons */
const IcLock = () => <I><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" /></I>;
const IcCookie = () => <I><path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="14" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" /></I>;
const IcKey = () => <I><circle cx="8" cy="8" r="4" /><path d="M11 11l8 8M16 16l2-2M18 18l2-2" /></I>;
const IcUsers = () => <I><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.5M21 20a6 6 0 0 0-4-5.6" /></I>;
const IcClock = () => <I><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;

/* brand kit icons */
const IcPalette = () => <I size={18}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /><circle cx="16.5" cy="11" r="1" fill="currentColor" /></I>;
const IcType = () => <I size={18}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></I>;
const IcLayout = () => <I size={18}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></I>;

/* small chart glyphs for the "chart cloud" */
const GBar = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><path d="M4 20V4M4 20h16" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg>;
const GLine = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><path d="M3 17l5-5 4 3 8-9" /></svg>;
const GPie = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="8" /><path d="M12 4v8h8" /></svg>;
const GArea = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><path d="M3 18l5-6 4 3 9-9v12H3z" /></svg>;
const GScatter = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><circle cx="7" cy="15" r="1.4" /><circle cx="12" cy="9" r="1.4" /><circle cx="17" cy="12" r="1.4" /><circle cx="15" cy="6" r="1.4" /></svg>;
const GTree = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="10" height="10" /><rect x="15" y="3" width="6" height="6" /><rect x="15" y="11" width="6" height="10" /><rect x="3" y="15" width="10" height="6" /></svg>;
const GSankey = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><path d="M4 5h4v5H4zM4 14h4v5H4zM16 8h4v8h-4M8 7c4 0 4 5 8 5M8 17c4 0 4-5 8-5" /></svg>;
const GFunnel = () => <svg width="13" height="13" viewBox="0 0 24 24" {...S}><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /></svg>;

/* data-source glyphs */
const glyphDB = (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="7" ry="2.6" stroke={c} strokeWidth="1.7" /><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>;
const glyphCloud = (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9.5 3.5 3.5 0 0 1 17.5 18H7z" stroke={c} strokeWidth="1.7" strokeLinejoin="round" /></svg>;
const glyphSheet = (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke={c} strokeWidth="1.7" /><path d="M4 9h16M4 15h16M10 3v18" stroke={c} strokeWidth="1.5" /></svg>;
const glyphCrm = (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth="1.7" /><circle cx="8" cy="12" r="2" stroke={c} strokeWidth="1.5" /><path d="M13 10h5M13 14h4" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;

/* ── FAQ data ── */
const FAQ_ITEMS = [
  { q: 'Do I need to know SQL or BI tools?', a: 'No. You describe what you want in plain English — "Show monthly revenue by product category" — and LucentReport\'s multi-agent AI plans the query, writes the SQL, runs it on your live data, picks the right charts, and writes the insights. No SQL, no drag-and-drop, no DAX.' },
  { q: 'Is LucentReport an AI reporting tool?', a: 'Yes. LucentReport is an AI reporting tool: ask a question in plain English and it generates automated reports, dashboards, and narrative summaries directly from your live data. Every report is board-ready — charts, forecasts, and written insights — and exports to PDF or PowerPoint in one click.' },
  { q: 'Which data sources can I connect?', a: 'A wide range: PostgreSQL, MySQL, SQL Server, Snowflake, Google BigQuery, Amazon Redshift, Amazon S3 (via Athena), Salesforce, HubSpot, Google Sheets, Supabase, and more. If your data lives somewhere, LucentReport can usually reach it.' },
  { q: 'Is my data safe?', a: 'Yes. Your database credentials stay encrypted on your own server and are never sent to us. Every query runs in strict read-only mode — LucentReport can never modify, delete, or write to your database. Auth uses httpOnly cookies so tokens can\'t be stolen by scripts.' },
  { q: 'What can it actually build?', a: 'Complete, styled dashboards with 15+ chart types, plus a full analytics layer (forecasts, anomaly detection, priority matrices, Pareto analysis, correlation heatmaps). It also generates narrative reports, poster-style infographics, and single-entity 360° profiles — all from your data.' },
  { q: 'Can I export or share what I build?', a: 'Absolutely. Export any dashboard to PowerPoint, PDF, or a high-resolution PNG poster with one click — pixel-perfect and board-ready. Or publish a live public link that stakeholders can open without an account.' },
  { q: 'Does it handle finance and accounting work?', a: 'Yes — seven Finance AI Agents come pre-loaded with domain expertise: Reconciliation, Month-End Close, Variance Analysis, Financial Statement Close, Actuals Reporting, Exception Identification, and Close Process Monitoring. Each already knows the outputs, patterns, and escalation logic for its workflow.' },
  { q: 'How is this different from Power BI or Tableau?', a: 'Those tools ask you to build the report. LucentReport builds it for you — a complete, branded dashboard from one sentence in seconds. No data modeling, no formulas, no dashboard design work. You ask the question; the AI does the rest.' },
];

const DATA_SOURCES = [
  { name: 'PostgreSQL', g: glyphDB('#818cf8') },
  { name: 'MySQL', g: glyphDB('#38bdf8') },
  { name: 'SQL Server', g: glyphDB('#a78bfa') },
  { name: 'Snowflake', g: glyphCloud('#22d3ee') },
  { name: 'BigQuery', g: glyphCloud('#818cf8') },
  { name: 'Redshift', g: glyphCloud('#c084fc') },
  { name: 'Amazon S3', g: glyphCloud('#fbbf24') },
  { name: 'Salesforce', g: glyphCrm('#38bdf8') },
  { name: 'HubSpot', g: glyphCrm('#fb7185') },
  { name: 'Google Sheets', g: glyphSheet('#34d399') },
  { name: 'Supabase', g: glyphDB('#34d399') },
  { name: 'Amazon RDS', g: glyphDB('#a5b4fc') },
];

const TYPE_PROMPTS = [
  'Show monthly revenue by product category',
  'Top 10 customers by lifetime value',
  'Forecast next quarter sales with anomalies',
  'Reconcile AP aging by vendor and bucket',
];

export default function LandingPage() {
  // Restore homepage metadata after client-side navigation (e.g. back from /login)
  useSeo();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [typed, setTyped] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  // Sticky-nav shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Subtle parallax on the hero demo
  useEffect(() => {
    const el = heroRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 14;
      const dy = (e.clientY / window.innerHeight - 0.5) * 10;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Typewriter for the hero prompt
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(TYPE_PROMPTS[0]);
      return;
    }
    let i = 0, char = 0, deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = TYPE_PROMPTS[i];
      if (!deleting) {
        char++;
        setTyped(full.slice(0, char));
        if (char === full.length) { deleting = true; timer = setTimeout(tick, 1900); return; }
        timer = setTimeout(tick, 46);
      } else {
        char--;
        setTyped(full.slice(0, char));
        if (char === 0) { deleting = false; i = (i + 1) % TYPE_PROMPTS.length; timer = setTimeout(tick, 320); return; }
        timer = setTimeout(tick, 24);
      }
    };
    timer = setTimeout(tick, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="lr-root">
      <a href="#main" className="lr-skip">Skip to content</a>

      {/* ══════════ NAV ══════════ */}
      <nav className={`lr-nav ${scrolled ? 'scrolled' : ''}`} aria-label="Main navigation">
        <div className="lr-nav-inner">
          <a href="/" className="lr-brand" aria-label="LucentReport home">
            <BrandMark />
            <span className="lr-brand-name"><span className="lc">Lucent</span>Report</span>
          </a>
          <div className="lr-nav-links">
            <a href="#product" className="lr-nav-link">Product</a>
            <a href="#analytics" className="lr-nav-link">Analytics</a>
            <a href="#reports" className="lr-nav-link">Reports</a>
            <a href="#finance" className="lr-nav-link">Finance AI</a>
            <a href="#security" className="lr-nav-link">Security</a>
            <a href="#faq" className="lr-nav-link">FAQ</a>
          </div>
          <div className="lr-nav-cta">
            <a href="/login" className="lr-nav-signin">Sign in</a>
            <a href="/login" className="lr-btn lr-btn-primary">Get started <ArrowRight /></a>
          </div>
        </div>
      </nav>

      <main id="main">

        {/* ══════════ HERO ══════════ */}
        <section className="lr-hero" aria-label="Hero">
          <div className="lr-aurora" aria-hidden="true">
            <span className="lr-aurora-blob lr-ab-1" />
            <span className="lr-aurora-blob lr-ab-2" />
            <span className="lr-aurora-blob lr-ab-3" />
            <span className="lr-aurora-blob lr-ab-4" />
          </div>
          <div className="lr-grid-overlay" aria-hidden="true" />
          <div className="lr-beam" aria-hidden="true" />

          <div className="lr-hero-inner">
            <div className="lr-hero-copy">
              <span className="lr-badge">
                <span className="lr-badge-pill">New</span>
                Multi-agent AI · Reports, dashboards &amp; finance agents
              </span>
              <h1 className="lr-h1">
                Ask your data.<br />
                Get <span className="lr-grad-text">dashboards &amp; reports</span> in seconds.
              </h1>
              <p className="lr-hero-sub">
                LucentReport is the AI reporting tool that connects to any database or cloud source,
                understands a plain-English question, and builds a complete, on-brand dashboard or
                report — charts, forecasts, insights and narrative — automatically. No SQL. No BI
                training. No setup.
              </p>
              <div className="lr-hero-actions">
                <a href="/login" className="lr-btn lr-btn-primary lr-btn-lg">Start free <ArrowRight /></a>
                <a href="#product" className="lr-btn lr-btn-ghost lr-btn-lg">See how it works</a>
              </div>
              <p className="lr-hero-note"><IcCheck /> No credit card required · Free to explore</p>
            </div>

            {/* Live glass dashboard demo */}
            <div className="lr-demo-wrap" ref={heroRef}>
              <div className="lr-demo">
                <div className="lr-demo-prompt">
                  <span className="lr-demo-prompt-icon"><IcSpark /></span>
                  <span className="lr-demo-prompt-text">{typed}<span className="lr-caret" /></span>
                  <span className="lr-demo-pill">Ask AI</span>
                </div>

                <div className="lr-demo-title">
                  <span className="lr-demo-dots"><span style={{ background: '#fb7185' }} /><span style={{ background: '#fbbf24' }} /><span style={{ background: '#34d399' }} /></span>
                  <span className="lr-demo-title-t">Revenue Analytics · Q4</span>
                </div>

                <div className="lr-demo-kpis">
                  {[
                    { l: 'Revenue', v: '$2.4M', t: '+18%', up: true, pts: '0,10 8,7 16,8 24,4 32,5 40,1' },
                    { l: 'Orders', v: '12,849', t: '+7%', up: true, pts: '0,9 8,8 16,6 24,7 32,4 40,3' },
                    { l: 'Churn', v: '2.1%', t: '-0.4%', up: false, pts: '0,3 8,4 16,3 24,6 32,7 40,9' },
                  ].map(k => (
                    <div className="lr-kpi" key={k.l}>
                      <div className="lr-kpi-label">{k.l}</div>
                      <div className="lr-kpi-val">{k.v}</div>
                      <div className={`lr-kpi-trend ${k.up ? 'up' : 'down'}`}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d={k.up ? 'M2 8l3-3 2 2 3-4' : 'M2 4l3 3 2-2 3 4'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {k.t}
                      </div>
                      <svg className="lr-kpi-spark" width="100%" height="16" viewBox="0 0 40 12" preserveAspectRatio="none">
                        <polyline points={k.pts} fill="none" stroke={k.up ? '#34d399' : '#fb7185'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ))}
                </div>

                <div className="lr-demo-charts">
                  <div className="lr-demo-card">
                    <div className="lr-demo-card-label">Revenue over time</div>
                    <div className="lr-demo-bars">
                      {[38, 52, 45, 70, 60, 82, 68, 92, 78, 100, 88, 116].map((h, i) => (
                        <div className="lr-demo-bar" key={i} style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </div>
                  <div className="lr-demo-card">
                    <div className="lr-demo-card-label">By category</div>
                    <div className="lr-demo-donut">
                      <svg width="76" height="76" viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="32" r="24" fill="none" stroke="#1a2150" strokeWidth="11" />
                        <circle cx="32" cy="32" r="24" fill="none" stroke="#6366f1" strokeWidth="11" strokeDasharray="86 65" strokeDashoffset="0" transform="rotate(-90 32 32)" strokeLinecap="round" />
                        <circle cx="32" cy="32" r="24" fill="none" stroke="#a855f7" strokeWidth="11" strokeDasharray="42 109" strokeDashoffset="-90" transform="rotate(-90 32 32)" strokeLinecap="round" />
                        <circle cx="32" cy="32" r="24" fill="none" stroke="#22d3ee" strokeWidth="11" strokeDasharray="26 125" strokeDashoffset="-136" transform="rotate(-90 32 32)" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="lr-demo-insight">
                  <span className="lr-spark-dot" />
                  Revenue up 18% MoM — Electronics drives 62% of the growth.
                </div>
              </div>

              {/* floating chips */}
              <div className="lr-chip lr-chip-1">
                <span className="lr-chip-ico" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}><IcSpark size={15} /></span>
                <div><div className="lr-chip-t">AI generated</div><div className="lr-chip-s">8 cards · 2.1s</div></div>
              </div>
              <div className="lr-chip lr-chip-2">
                <span className="lr-chip-ico" style={{ background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }}><IcForecast /></span>
                <div><div className="lr-chip-t">Forecast ready</div><div className="lr-chip-s">+6 periods</div></div>
              </div>
              <div className="lr-chip lr-chip-3">
                <span className="lr-chip-ico" style={{ background: 'linear-gradient(135deg,#fb7185,#d946ef)' }}><IcAlert /></span>
                <div><div className="lr-chip-t">2 anomalies</div><div className="lr-chip-s">flagged &amp; explained</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ DATA SOURCE MARQUEE ══════════ */}
        <section className="lr-marquee-sec" aria-label="Compatible data sources">
          <p className="lr-marquee-label">Connects to the data you already have</p>
          <div className="lr-marquee">
            <div className="lr-marquee-track">
              {DATA_SOURCES.map(s => <div className="lr-src" key={s.name}>{s.g}{s.name}</div>)}
            </div>
            <div className="lr-marquee-track" aria-hidden="true">
              {DATA_SOURCES.map(s => <div className="lr-src" key={s.name + '2'}>{s.g}{s.name}</div>)}
            </div>
          </div>
        </section>

        {/* ══════════ STATS ══════════ */}
        <section className="lr-stats" aria-label="At a glance">
          <div className="lr-stats-grid">
            {[
              { n: '< 10s', c: 'lr-grad-text', l: 'Question to dashboard', d: 'Average time to your first chart' },
              { n: '15+', c: 'lr-grad-warm', l: 'Chart types', d: 'From bars to Sankey & sunburst' },
              { n: '7', c: 'lr-grad-text', l: 'Finance AI agents', d: 'Close, reconciliation, variance & more' },
              { n: '100%', c: 'lr-grad-warm', l: 'Read-only queries', d: 'Your database is never written to' },
            ].map(s => (
              <div className="lr-stat" key={s.l}>
                <div className={`lr-stat-num ${s.c}`}>{s.n}</div>
                <div className="lr-stat-label">{s.l}</div>
                <div className="lr-stat-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <section className="lr-section lr-sec-light-2" id="how" aria-labelledby="how-h">
          <div className="lr-section-inner">
            <div className="lr-head">
              <span className="lr-tag"><span className="lr-tag-dot" />How it works</span>
              <h2 className="lr-h2" id="how-h">From raw data to live dashboard in four steps</h2>
              <p className="lr-sub">No pipelines to build, no models to define. Connect once and just ask.</p>
            </div>
            <div className="lr-steps">
              {[
                { n: 1, ic: <IcPlug />, t: 'Connect your source', d: 'Add any database or cloud source in a minute. LucentReport auto-discovers your schema and relationships.' },
                { n: 2, ic: <IcChat />, t: 'Ask in plain English', d: 'Type a question the way you\'d say it. The AI plans the query, writes SQL, and runs it on live data.' },
                { n: 3, ic: <IcWand />, t: 'AI builds the dashboard', d: 'Charts, KPIs, forecasts and written insights are generated and laid out automatically.' },
                { n: 4, ic: <IcShare />, t: 'Share & export', d: 'Apply your brand, publish a live public link, or export to PDF, PPTX or a PNG poster.' },
              ].map(s => (
                <div className="lr-step" key={s.n}>
                  <div className="lr-step-card">
                    <span className="lr-step-num">{s.n}</span>
                    <div className="lr-step-ico" style={{ color: '#7c3aed' }}>{s.ic}</div>
                    <h3 className="lr-step-title">{s.t}</h3>
                    <p className="lr-step-desc">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CAPABILITIES (bento) ══════════ */}
        <section className="lr-section lr-sec-light" id="product" aria-labelledby="prod-h">
          <div className="lr-section-inner">
            <div className="lr-head">
              <span className="lr-tag"><span className="lr-tag-dot" />The platform</span>
              <h2 className="lr-h2" id="prod-h">Everything a data team does — automated by AI</h2>
              <p className="lr-sub">A team of specialized AI agents does the analysis, picks the visuals, and writes the story.</p>
            </div>

            <div className="lr-bento">
              {/* Multi-agent pipeline (dark hero tile) */}
              <div className="lr-tile lr-tile-dark lr-col-3">
                <div className="lr-tile-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff' }}><IcAgents /></div>
                <span className="lr-tile-tag">Multi-agent AI</span>
                <h3 className="lr-tile-title">A pipeline of specialists, not one prompt</h3>
                <p className="lr-tile-desc">Dedicated agents collaborate on every request — analyze your schema, plan the answer, write and check the SQL, then enrich the result with insights.</p>
                <div className="lr-pipe">
                  <span className="lr-pipe-node"><IcScan />Analyze</span>
                  <span className="lr-pipe-arrow"><ArrowRight size={13} /></span>
                  <span className="lr-pipe-node"><IcRoute />Plan</span>
                  <span className="lr-pipe-arrow"><ArrowRight size={13} /></span>
                  <span className="lr-pipe-node"><IcSql />SQL</span>
                  <span className="lr-pipe-arrow"><ArrowRight size={13} /></span>
                  <span className="lr-pipe-node"><IcLoop />Reflect</span>
                  <span className="lr-pipe-arrow"><ArrowRight size={13} /></span>
                  <span className="lr-pipe-node"><IcSpark />Enrich</span>
                </div>
              </div>

              {/* 15+ chart types */}
              <div className="lr-tile lr-col-3">
                <div className="lr-tile-icon" style={{ background: '#eef2ff', color: '#6366f1' }}><IcCharts /></div>
                <span className="lr-tile-tag">Visualization</span>
                <h3 className="lr-tile-title">15+ chart types, auto-selected</h3>
                <p className="lr-tile-desc">The AI matches the right visual to your data shape and intent — powered by Recharts and D3.</p>
                <div className="lr-chartcloud">
                  <span className="lr-chip-mini"><GBar />Bar</span>
                  <span className="lr-chip-mini"><GLine />Line</span>
                  <span className="lr-chip-mini"><GArea />Area</span>
                  <span className="lr-chip-mini"><GPie />Donut</span>
                  <span className="lr-chip-mini"><GScatter />Scatter</span>
                  <span className="lr-chip-mini"><GTree />Treemap</span>
                  <span className="lr-chip-mini"><GSankey />Sankey</span>
                  <span className="lr-chip-mini"><GFunnel />Funnel</span>
                </div>
              </div>

              {/* Advanced analytics */}
              <div className="lr-tile lr-col-2">
                <div className="lr-tile-icon" style={{ background: '#f3e8ff', color: '#a855f7' }}><IcTrendUp /></div>
                <span className="lr-tile-tag">Analytics engine</span>
                <h3 className="lr-tile-title">Forecasts & anomalies built in</h3>
                <p className="lr-tile-desc">Every dashboard gets predictive analytics — not just a picture of the past.</p>
                <div className="lr-tile-viz">
                  <svg width="100%" height="52" viewBox="0 0 200 52" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points="0,44 30,38 60,30 90,24 120,18 150,13" fill="none" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="150,13 200,6" fill="none" stroke="#a855f7" strokeWidth="2.4" strokeDasharray="5 4" strokeLinecap="round" />
                    <circle cx="150" cy="13" r="3" fill="#a855f7" />
                  </svg>
                </div>
              </div>

              {/* Human in the loop */}
              <div className="lr-tile lr-col-2">
                <div className="lr-tile-icon" style={{ background: '#e0f2fe', color: '#0891b2' }}><IcChat /></div>
                <span className="lr-tile-tag">Human-in-the-loop</span>
                <h3 className="lr-tile-title">It asks before it assumes</h3>
                <div className="lr-hitl">
                  <span className="lr-hitl-q">How many periods should I forecast?</span>
                  <span className="lr-hitl-a">Next 6 months</span>
                </div>
              </div>

              {/* Export */}
              <div className="lr-tile lr-col-2">
                <div className="lr-tile-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IcExport /></div>
                <span className="lr-tile-tag">Share anywhere</span>
                <h3 className="lr-tile-title">Board-ready in one click</h3>
                <div className="lr-export-row">
                  <span className="lr-export-chip"><IcDoc />PDF</span>
                  <span className="lr-export-chip"><IcLayout />PPTX</span>
                  <span className="lr-export-chip"><IcCharts />PNG</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ ADVANCED ANALYTICS (dark) ══════════ */}
        <section className="lr-section lr-sec-dark" id="analytics" aria-labelledby="ana-h">
          <div className="lr-aurora" aria-hidden="true"><span className="lr-aurora-blob lr-ab-2" style={{ opacity: 0.3 }} /></div>
          <div className="lr-section-inner">
            <div className="lr-ana-inner">
              <div>
                <div className="lr-head left" style={{ margin: 0 }}>
                  <span className="lr-tag"><span className="lr-tag-dot" />Beyond charts</span>
                  <h2 className="lr-h2" id="ana-h">Real intelligence, not just pictures</h2>
                  <p className="lr-sub">A dedicated analytics engine runs on top of every dashboard to surface the patterns, forecasts and outliers you'd otherwise miss.</p>
                </div>
                <ul className="lr-ana-list">
                  {[
                    { ic: <IcForecast />, t: 'Forecasting', d: 'Projected trends with confidence intervals' },
                    { ic: <IcMatrix />, t: 'Priority matrix', d: 'Effort vs. impact, plotted automatically' },
                    { ic: <IcWave />, t: 'Trend decomposition', d: 'Signal and moving averages, separated' },
                    { ic: <IcPareto />, t: 'Pareto (80/20)', d: 'The vital few, with a cumulative curve' },
                    { ic: <IcHeat />, t: 'Correlation heatmap', d: 'Relationships across every numeric column' },
                    { ic: <IcAlert />, t: 'Anomaly detection', d: 'Statistical outliers flagged and explained' },
                  ].map(a => (
                    <li className="lr-ana-li" key={a.t}>
                      <span className="lr-ana-li-ico" style={{ color: '#a5b4fc' }}>{a.ic}</span>
                      <div><p className="lr-ana-li-t">{a.t}</p><p className="lr-ana-li-d">{a.d}</p></div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lr-ana-grid">
                <div className="lr-ana-card wide">
                  <div className="lr-ana-card-head"><IcForecast /><span className="lr-ana-card-t">Revenue forecast</span><span className="lr-ana-badge">Forecast</span></div>
                  <svg width="100%" height="64" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="lrfc" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity="0.35" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0,52 40,46 80,40 120,30 160,26 200,18 240,12 L240,64 L0,64 Z" fill="url(#lrfc)" />
                    <polyline points="0,52 40,46 80,40 120,30 160,26 200,18 240,12" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="240,12 280,8 320,3" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeDasharray="5 4" strokeLinecap="round" />
                    <polyline points="240,12 320,10" fill="none" stroke="#c084fc" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                    <polyline points="240,12 320,-4" fill="none" stroke="#c084fc" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                  </svg>
                  <p className="lr-ana-caption">Next 6 periods projected · 92% confidence</p>
                </div>

                <div className="lr-ana-card">
                  <div className="lr-ana-card-head"><IcMatrix /><span className="lr-ana-card-t">Priority</span></div>
                  <div className="lr-matrix">
                    <div className="lr-matrix-q" style={{ background: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.28)' }}><span style={{ color: '#34d399' }}>Quick win</span></div>
                    <div className="lr-matrix-q" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.28)' }}><span style={{ color: '#818cf8' }}>Major</span></div>
                    <div className="lr-matrix-q" style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.26)' }}><span style={{ color: '#fbbf24' }}>Fill-in</span></div>
                    <div className="lr-matrix-q" style={{ background: 'rgba(251,113,133,0.1)', borderColor: 'rgba(251,113,133,0.26)' }}><span style={{ color: '#fb7185' }}>Avoid</span></div>
                    <span className="lr-matrix-dot" style={{ left: '26%', top: '30%', background: '#34d399' }} />
                    <span className="lr-matrix-dot" style={{ left: '70%', top: '26%', background: '#818cf8' }} />
                    <span className="lr-matrix-dot" style={{ left: '34%', top: '72%', background: '#fbbf24' }} />
                  </div>
                </div>

                <div className="lr-ana-card">
                  <div className="lr-ana-card-head"><IcAlert /><span className="lr-ana-card-t">Anomaly</span></div>
                  <div className="lr-mini-bars">
                    {[34, 46, 40, 44, 96, 42, 37, 45, 40].map((h, i) => (
                      <div key={i} style={{ height: `${h}%`, background: h > 80 ? '#fb7185' : '#6366f1' }} />
                    ))}
                  </div>
                  <p className="lr-ana-caption">2 outliers · severity medium</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ REPORTS & PROFILES ══════════ */}
        <section className="lr-section lr-sec-light-2" id="reports" aria-labelledby="rep-h">
          <div className="lr-section-inner">
            <div className="lr-head">
              <span className="lr-tag"><span className="lr-tag-dot" />More than dashboards</span>
              <h2 className="lr-h2" id="rep-h">AI-generated reports, profiles and shareable links</h2>
              <p className="lr-sub">The same AI reporting engine that builds dashboards can write the whole story — and put it anywhere your audience is.</p>
            </div>

            <div className="lr-show-grid">
              {/* Documents / reports */}
              <div className="lr-show">
                <div className="lr-show-visual" style={{ background: 'linear-gradient(160deg,#eef2ff,#f5f3ff)' }}>
                  <div className="lr-mock-report">
                    <div className="lr-mock-line accent" />
                    <div className="lr-mock-line" />
                    <div className="lr-mock-line short" />
                    <div className="lr-mock-charts-row">
                      <div className="lr-mock-mini"><GBar /></div>
                      <div className="lr-mock-mini"><GLine /></div>
                    </div>
                    <div className="lr-mock-line" />
                    <div className="lr-mock-line short" />
                  </div>
                </div>
                <div className="lr-show-body">
                  <h3 className="lr-show-title">AI documents &amp; reports</h3>
                  <p className="lr-show-desc">Generate polished, narrative reports and poster-style infographics — executive summaries, findings and recommendations, written from your data.</p>
                </div>
              </div>

              {/* Entity 360 */}
              <div className="lr-show">
                <div className="lr-show-visual" style={{ background: 'linear-gradient(160deg,#f0fdfa,#eef2ff)' }}>
                  <div className="lr-mock-e360">
                    <div className="lr-mock-avatar">A</div>
                    <div className="lr-mock-e360-stats">
                      <div className="lr-mock-e360-stat"><b>$48k</b><span>LTV</span></div>
                      <div className="lr-mock-e360-stat"><b>96</b><span>Orders</span></div>
                      <div className="lr-mock-e360-stat"><b>A+</b><span>Health</span></div>
                    </div>
                  </div>
                </div>
                <div className="lr-show-body">
                  <h3 className="lr-show-title">Entity 360° profiles</h3>
                  <p className="lr-show-desc">Zoom into a single customer, account or product and get a complete profile — every metric and relationship pulled together on one page.</p>
                </div>
              </div>

              {/* Public sharing */}
              <div className="lr-show">
                <div className="lr-show-visual" style={{ background: 'linear-gradient(160deg,#faf5ff,#eef2ff)' }}>
                  <div className="lr-mock-share">
                    <div className="lr-mock-avatar" style={{ background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }}><IcLink /></div>
                    <div className="lr-mock-url"><span className="dot" />lucentreport.com/view/q4-board</div>
                  </div>
                </div>
                <div className="lr-show-body">
                  <h3 className="lr-show-title">One-click public links</h3>
                  <p className="lr-show-desc">Publish any dashboard as a live link. Stakeholders, clients and investors open it in a browser — no account, always current.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ FINANCE AI AGENTS ══════════ */}
        <section className="lr-section lr-sec-light" id="finance" aria-labelledby="fin-h">
          <div className="lr-section-inner">
            <div className="lr-agents-grid">
              <div className="lr-agent lr-agent-lead">
                <span className="lr-tag"><span className="lr-tag-dot" />Finance &amp; compliance</span>
                <h2 id="fin-h">Seven finance agents, ready on day one</h2>
                <p>Specialist AI agents pre-loaded with accounting expertise. No prompt engineering — each already knows the outputs, SQL patterns and escalation logic for its workflow.</p>
              </div>
              {[
                { ic: <IcRecon />, t: 'Reconciliation', d: 'Match rates, break amounts, aging buckets and exception tables with drill-down.' },
                { ic: <IcCalendar />, t: 'Month-End Close', d: 'Close status by entity, task tracker, open-item aging and blocking issues.' },
                { ic: <IcVariance />, t: 'Variance Analysis', d: 'Favorable/unfavorable bridges, root-cause ranking and budget-vs-actual.' },
                { ic: <IcStatement />, t: 'Statement Close', d: 'P&L, balance sheet and cash flow with inter-statement consistency checks.' },
                { ic: <IcActuals />, t: 'Actuals Reporting', d: 'YTD vs. budget, prior-year comparatives and rolling 12-month trends.' },
                { ic: <IcException />, t: 'Exception Identification', d: 'Threshold alerts, duplicate detection and a prioritized review queue.' },
                { ic: <IcMonitor />, t: 'Close Monitoring', d: 'Predictive close date, bottleneck detection and entity status heatmap.' },
              ].map(a => (
                <div className="lr-agent" key={a.t}>
                  <div className="lr-agent-ico" style={{ color: '#059669' }}>{a.ic}</div>
                  <h3 className="lr-agent-title">{a.t}</h3>
                  <p className="lr-agent-desc">{a.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ MAKE IT YOURS (brand) ══════════ */}
        <section className="lr-section lr-sec-light-2" aria-labelledby="brand-h">
          <div className="lr-section-inner">
            <div className="lr-brand-strip">
              <div>
                <span className="lr-tag"><span className="lr-tag-dot" />Make it yours</span>
                <h2 className="lr-h2" id="brand-h">Every dashboard, unmistakably your brand</h2>
                <p className="lr-sub" style={{ margin: 0 }}>Drop in your logo, colors and fonts once. LucentReport applies your identity across every dashboard, report and export — automatically.</p>
                <ul className="lr-brand-feats">
                  <li className="lr-brand-feat"><IcPalette />Brand kit — logo, color palette &amp; accent</li>
                  <li className="lr-brand-feat"><IcType />Five font families, tuned for data</li>
                  <li className="lr-brand-feat"><IcLayout />Nine themes &amp; multiple layout modes</li>
                  <li className="lr-brand-feat"><IcExport />Branded PDF, PPTX &amp; poster exports</li>
                </ul>
              </div>
              <div className="lr-brand-panel">
                <div className="lr-swatches">
                  <span className="lr-swatch" style={{ background: '#6366f1' }} />
                  <span className="lr-swatch" style={{ background: '#a855f7' }} />
                  <span className="lr-swatch" style={{ background: '#22d3ee' }} />
                  <span className="lr-swatch" style={{ background: '#34d399' }} />
                  <span className="lr-swatch" style={{ background: '#fbbf24' }} />
                  <span className="lr-swatch" style={{ background: '#0b1030' }} />
                </div>
                <div className="lr-theme-row">
                  <span className="lr-theme-pill active">Midnight</span>
                  <span className="lr-theme-pill">Aurora</span>
                  <span className="lr-theme-pill">Slate</span>
                  <span className="lr-theme-pill">Minimal</span>
                  <span className="lr-theme-pill">Executive</span>
                </div>
                <div className="lr-font-row">
                  <span className="lr-font-sample" style={{ fontFamily: 'Georgia, serif' }}>Aa</span>
                  <span className="lr-font-sample">Aa</span>
                  <span className="lr-font-sample" style={{ fontWeight: 400, letterSpacing: '0.02em' }}>Aa</span>
                  <span className="lr-font-sample" style={{ fontFamily: 'ui-monospace, monospace' }}>Aa</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ SECURITY (dark) ══════════ */}
        <section className="lr-section lr-sec-dark" id="security" aria-labelledby="sec-h">
          <div className="lr-section-inner">
            <div className="lr-head">
              <span className="lr-tag"><span className="lr-tag-dot" />Enterprise-ready</span>
              <h2 className="lr-h2" id="sec-h">Built for teams that need to trust their tools</h2>
              <p className="lr-sub">Security and data governance are first-class — not an afterthought.</p>
            </div>
            <div className="lr-sec-grid">
              {[
                { ic: <IcLock />, t: 'Read-only by design', d: 'Every query runs in strict read-only mode. LucentReport can never modify, delete or write to your database.' },
                { ic: <IcKey />, t: 'Credential isolation', d: 'Database credentials stay encrypted on your own server. They are never transmitted to our infrastructure.' },
                { ic: <IcCookie />, t: 'httpOnly cookie auth', d: 'Session tokens live in httpOnly cookies, invisible to JavaScript, so scripts can\'t steal them.' },
                { ic: <IcUsers />, t: 'Role-based access', d: 'Admin, Editor and Viewer roles per project. Control who can query, edit and view.' },
                { ic: <IcDoc />, t: 'Audit-ready exports', d: 'Timestamped, pixel-perfect PDF and PPTX exports for audits, boards and regulatory filings.' },
                { ic: <IcClock />, t: 'Session expiry', d: 'Tokens expire and rotate on every login. Stale sessions are deleted server-side immediately.' },
              ].map(s => (
                <div className="lr-sec-card" key={s.t}>
                  <div className="lr-sec-ico" style={{ color: '#34d399' }}>{s.ic}</div>
                  <h3 className="lr-sec-t">{s.t}</h3>
                  <p className="lr-sec-d">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ FAQ ══════════ */}
        <section className="lr-section lr-sec-light" id="faq" aria-labelledby="faq-h">
          <div className="lr-section-inner">
            <div className="lr-head">
              <span className="lr-tag"><span className="lr-tag-dot" />FAQ</span>
              <h2 className="lr-h2" id="faq-h">Questions, answered</h2>
              <p className="lr-sub">Everything you need to know about building with LucentReport.</p>
            </div>
            <div className="lr-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <div className={`lr-faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
                  <button className="lr-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} aria-controls={`lr-faq-a-${i}`}>
                    <span>{item.q}</span>
                    <svg className="lr-faq-chev" width="18" height="18" viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <div className="lr-faq-a" id={`lr-faq-a-${i}`} role="region"><p>{item.a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ FINAL CTA ══════════ */}
        <section className="lr-cta" aria-label="Get started">
          <div className="lr-aurora" aria-hidden="true">
            <span className="lr-aurora-blob lr-ab-1" style={{ top: '-160px', left: '20%' }} />
            <span className="lr-aurora-blob lr-ab-3" style={{ left: '55%' }} />
          </div>
          <div className="lr-cta-inner">
            <h2>Your data has a story.<br /><span className="lr-grad-text">Let AI tell it.</span></h2>
            <p>Turn raw data from any source into dashboards, reports and decisions — no SQL, no BI consultants, no setup time.</p>
            <div className="lr-cta-actions">
              <a href="/login" className="lr-btn lr-btn-primary lr-btn-lg">Start free <ArrowRight /></a>
              <a href="/login" className="lr-btn lr-btn-ghost lr-btn-lg">Sign in</a>
            </div>
            <p className="lr-cta-note">Free to explore · No credit card required</p>
          </div>
        </section>
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="lr-footer" role="contentinfo">
        <div className="lr-footer-inner">
          <div className="lr-footer-top">
            <div>
              <a href="/" className="lr-brand" aria-label="LucentReport home">
                <BrandMark size={30} />
                <span className="lr-brand-name"><span className="lc">Lucent</span>Report</span>
              </a>
              <p className="lr-footer-brand-blurb">The AI reporting tool and dashboard builder that turns plain-English questions into complete, on-brand reports and analytics — from any data source.</p>
            </div>
            <div className="lr-footer-col">
              <h4>Product</h4>
              <a href="#product">Platform</a>
              <a href="#analytics">Analytics</a>
              <a href="#reports">Reports</a>
              <a href="#finance">Finance AI</a>
            </div>
            <div className="lr-footer-col">
              <h4>Company</h4>
              <a href="#security">Security</a>
              <a href="#faq">FAQ</a>
              <a href="#how">How it works</a>
            </div>
            <div className="lr-footer-col">
              <h4>Get started</h4>
              <a href="/login">Sign in</a>
              <a href="/login">Create account</a>
            </div>
          </div>
          <div className="lr-footer-bottom">
            <span className="lr-footer-copy">© 2026 LucentReport. AI reporting &amp; analytics from any data source.</span>
            <span className="lr-footer-made"><span className="lr-spark-dot" />Turning questions into dashboards.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
