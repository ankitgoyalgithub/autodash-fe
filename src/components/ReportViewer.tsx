/**
 * ReportViewer — McKinsey/Bain-grade long-form report renderer.
 *
 * Renders the generated report HTML in a sandboxed iframe with:
 *   - Sticky table-of-contents sidebar (desktop)
 *   - Reading-optimized canvas (760px max-width)
 *   - Print/PDF export
 *   - Fullscreen reading mode
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Maximize2, Minimize2, Printer, FileText, FileImage, ChevronLeft, ChevronRight, Mail, Presentation,
} from 'lucide-react';
import { ErrorState, Spinner } from './ui';
import { BASE } from './constants';
import EmailModal, { type EmailSendArgs } from './EmailModal';

export interface ReportChapter {
  id:          string;
  num:         number;
  title:       string;
  body_html?:  string;
  exhibit_ids?: string[];
}

export interface ReportData {
  id:                number;
  title:             string;
  subtitle:          string;
  query:             string;
  format:            'report' | 'newsletter' | 'cartoon' | 'image_infographic' | 'deck' | 'eda';
  style:             string;
  length:            'brief' | 'standard' | 'deep';
  status:            string;
  progress:          number;
  error:             string;
  executive_summary: string;
  methodology:       string;
  chapters:          ReportChapter[];
  exhibits:          any[];
  report_html:       string;
}

interface ReportViewerProps {
  report: ReportData;
  onBack?: () => void;
}

// ── Reading progress + status messages ───────────────────────────────────────

/** Slide stage geometry — every deck slide is a 1280×720 <section class="slide">. */
const SLIDE_W = 1280;
const SLIDE_H = 720;

const STATUS_MESSAGES: Record<string, string> = {
  queued:      'Preparing your report...',
  modeling:    'Running the analysis model...',
  outlining:   'Planning the report structure...',
  fetching:    'Fetching data from your database...',
  writing:     'Writing chapter narratives...',
  summarizing: 'Crafting the executive summary...',
  assembling:  'Assembling the final document...',
  ready:       'Report ready',
  error:       'Generation failed',
};

export function ReportViewer({ report, onBack }: ReportViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const isDeck = report.format === 'deck';
  // Deck mode: the iframe is a fixed 1280×720 stage scaled to the viewport.
  const deckViewportRef = useRef<HTMLDivElement>(null);
  const [deckScale, setDeckScale] = useState(1);
  const [slideCount, setSlideCount] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);

  // IMPORTANT: every hook in this component MUST run on every render.
  // The early-return for the loading state below comes AFTER all hooks,
  // so the hook order is stable when `report.status` flips writing→ready.
  // (Previously the early-return sat between hooks and triggered React's
  // "Rendered more hooks than during the previous render" error.)

  // Write the HTML into the iframe
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !report.report_html) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(report.report_html);
    doc.close();

    if (report.format === 'deck') {
      // Pin the document to the stage: no margins, no scrollbars; navigation
      // scrolls the document programmatically one slide at a time.
      try {
        const style = doc.createElement('style');
        style.textContent = 'html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#fff}';
        (doc.head || doc.documentElement).appendChild(style);
      } catch { /* ignore */ }
      const count = () => {
        try {
          const n = doc.querySelectorAll('.slide').length;
          setSlideCount(n);
          setSlideIdx(0);
          doc.documentElement.scrollTop = 0;
        } catch { /* same-origin guard */ }
      };
      count();
      setTimeout(count, 300);
      return;
    }

    if (report.format === 'eda') {
      // EDA reports switch tabs with CSS (scripts are disabled in the frame),
      // so each tab has its own height. html is forced to height:auto so its
      // box is the content height (scrollHeight never shrinks below the
      // frame), and the effect below re-measures it while the report is open.
      try {
        const style = doc.createElement('style');
        style.textContent = 'html,body{height:auto!important;min-height:0!important}';
        (doc.head || doc.documentElement).appendChild(style);
      } catch { /* ignore */ }
      return;
    }

    // Auto-resize iframe
    const resize = () => {
      try {
        const body = iframe.contentDocument?.body;
        const html = iframe.contentDocument?.documentElement;
        if (body && html) {
          const h = Math.max(body.scrollHeight, html.scrollHeight);
          iframe.style.height = `${h + 40}px`;
        }
      } catch { /* same-origin guard */ }
    };
    setTimeout(resize, 300);
    setTimeout(resize, 1200);
    setTimeout(resize, 2500);
  }, [report.report_html, report.format]);

  useEffect(() => { handleIframeLoad(); }, [handleIframeLoad]);

  // EDA reports: follow the active tab's height. A light poll is used rather
  // than event listeners because the frame runs without scripts and tab
  // changes happen purely through CSS :checked selectors.
  useEffect(() => {
    if (report.format !== 'eda' || !report.report_html) return;
    let last = 0;
    const measure = () => {
      try {
        const iframe = iframeRef.current;
        const html = iframe?.contentDocument?.documentElement;
        if (!iframe || !html) return;
        const h = Math.ceil(html.getBoundingClientRect().height);
        if (h > 0 && Math.abs(h - last) > 4) {
          last = h;
          iframe.style.height = `${h + 24}px`;
        }
      } catch { /* same-origin guard */ }
    };
    measure();
    const id = window.setInterval(measure, 400);
    return () => window.clearInterval(id);
  }, [report.format, report.report_html]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Deck: scale the 1280×720 stage to the viewport (width-bound; height-bound
  // too in fullscreen so a whole slide is always visible).
  useEffect(() => {
    if (!isDeck) return;
    const el = deckViewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const sw = w > 0 ? w / SLIDE_W : 1;
      const sh = h > 0 ? h / SLIDE_H : sw;
      setDeckScale(Math.max(0.1, Math.min(sw, sh)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [isDeck, report.status, isFullscreen]);

  // Deck: scroll the iframe document to the nth slide.
  const goToSlide = useCallback((n: number) => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const slides = doc.querySelectorAll('.slide');
    if (!slides.length) return;
    const idx = Math.max(0, Math.min(slides.length - 1, n));
    const target = slides[idx] as HTMLElement;
    try {
      // scrollIntoView works on overflow:hidden documents; fall back to manual offset.
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      doc.documentElement.scrollTop = target.offsetTop;
    }
    setSlideIdx(idx);
  }, []);

  // Deck: arrow-key navigation while the viewer is on screen.
  useEffect(() => {
    if (!isDeck || report.status !== 'ready') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goToSlide(slideIdx + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToSlide(slideIdx - 1); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isDeck, report.status, slideIdx, goToSlide]);

  // Loading / error states — early return AFTER all hooks so the hook
  // order stays consistent across renders.
  if (report.status !== 'ready') {
    return <ReportLoadingState report={report} />;
  }

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  // Email the report as a server-rendered PDF (works for every format).
  const handleEmail = async ({ recipients, subject, message }: EmailSendArgs) => {
    const r = await axios.post(`${BASE}/reports/${report.id}/email/`, {
      to: recipients,
      subject,
      message,
    });
    return { recipients: r.data?.recipients as string[] | undefined };
  };

  const fmtLabel = report.format === 'newsletter' ? 'Newsletter'
    : report.format === 'cartoon' ? 'Cartoon'
    : report.format === 'image_infographic' ? 'Infographic'
    : report.format === 'deck' ? 'Deck'
    : report.format === 'eda' ? 'EDA report'
    : 'Report';

  const handleDownloadPNG = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument?.body) return;
      const canvas = await html2canvas(iframe.contentDocument.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // For image_infographic the body width is 720px; for cartoon it's 880px
        width: report.format === 'cartoon' ? 880 : 720,
        windowWidth: report.format === 'cartoon' ? 880 : 720,
      });
      const link = document.createElement('a');
      link.download = `${(report.title || 'infographic').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  };

  // Scroll the iframe to a specific chapter anchor
  const scrollToChapter = (chapterId: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const target = iframe.contentDocument.getElementById(`ch-${chapterId}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={containerRef} className={`report-viewer ${isFullscreen ? 'report-viewer--fullscreen' : ''}`}>
      {/* Toolbar */}
      <div className="report-toolbar">
        <div className="report-toolbar-left">
          {onBack && (
            <button className="report-tb-btn" onClick={onBack} title="Back">
              <ChevronLeft size={14} />
            </button>
          )}
          <span className="report-tb-title">
            {isDeck ? <Presentation size={13} /> : <FileText size={13} />} {report.title}
          </span>
          <span className={`report-style-badge report-fmt-${report.format}`}>
            {report.format === 'newsletter' ? 'NEWSLETTER'
              : report.format === 'cartoon' ? 'CARTOON'
              : report.format === 'image_infographic' ? 'INFOGRAPHIC'
              : report.format === 'deck' ? 'DECK'
              : report.format === 'eda' ? 'EDA'
              : 'REPORT'}
          </span>
        </div>
        <div className="report-toolbar-right">
          {isDeck && (
            <div className="deck-nav" role="group" aria-label="Slide navigation">
              <button className="report-tb-btn" onClick={() => goToSlide(slideIdx - 1)} disabled={slideIdx <= 0} title="Previous slide (←)">
                <ChevronLeft size={14} />
              </button>
              <span className="deck-nav-count">{slideCount ? `${slideIdx + 1} / ${slideCount}` : '—'}</span>
              <button className="report-tb-btn" onClick={() => goToSlide(slideIdx + 1)} disabled={slideCount === 0 || slideIdx >= slideCount - 1} title="Next slide (→)">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          {(report.format === 'image_infographic' || report.format === 'cartoon') && (
            <button className="report-tb-btn report-tb-btn--primary" onClick={handleDownloadPNG} title="Download as PNG">
              <FileImage size={14} /> <span>Download PNG</span>
            </button>
          )}
          <button className="report-tb-btn report-tb-btn--primary" onClick={() => setShowEmail(true)} title="Email this as a PDF">
            <Mail size={14} /> <span>Email PDF</span>
          </button>
          <button className="report-tb-btn" onClick={handlePrint} title="Print or save as PDF">
            <Printer size={14} /> <span>Print / PDF</span>
          </button>
          <button className="report-tb-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Read fullscreen'}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Body: TOC sidebar (reports only) + iframe canvas */}
      <div className={`report-body ${report.format === 'newsletter' ? 'report-body--newsletter' : ''} ${report.format === 'cartoon' ? 'report-body--cartoon' : ''} ${report.format === 'image_infographic' ? 'report-body--imginfo' : ''} ${isDeck ? 'report-body--deck' : ''} ${report.format === 'eda' ? 'report-body--eda' : ''}`}>
        {/* Sticky TOC sidebar — only for long-form reports */}
        {report.format === 'report' && (
          <aside className="report-toc-sidebar">
            <div className="report-toc-eyebrow">Contents</div>
            <ol className="report-toc-list">
              {report.chapters.map(c => (
                <li key={c.id}>
                  <button onClick={() => scrollToChapter(c.id)} className="report-toc-link">
                    <span className="report-toc-num">{String(c.num).padStart(2, '0')}</span>
                    <span className="report-toc-text">{c.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="report-toc-footer">
              <div className="report-toc-eyebrow">Exhibits</div>
              <div className="report-toc-exhibit-count">{report.exhibits.length} figures</div>
            </div>
          </aside>
        )}

        {/* Iframe canvas. In deck mode the iframe is a fixed 1280×720 stage
            scaled with a CSS transform to fit the viewport; the same sandboxed
            iframe path is used (see SECURITY note below). */}
        {isDeck ? (
          <div className="report-canvas report-canvas--deck">
            <div className="deck-viewport" ref={deckViewportRef}>
              <div className="deck-stage-box" style={{ width: SLIDE_W * deckScale, height: SLIDE_H * deckScale }}>
                <div className="deck-stage" style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${deckScale})` }}>
                  <iframe
                    ref={iframeRef}
                    className="report-iframe report-iframe--deck"
                    title={report.title}
                    width={SLIDE_W}
                    height={SLIDE_H}
                    scrolling="no"
                    sandbox="allow-same-origin allow-popups allow-modals"
                    onLoad={handleIframeLoad}
                  />
                </div>
              </div>
              {slideCount > 1 && (
                <div className="deck-dots" aria-hidden="true">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <button key={i} className={`deck-dot${i === slideIdx ? ' active' : ''}`} onClick={() => goToSlide(i)} tabIndex={-1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="report-canvas">
            <iframe
              ref={iframeRef}
              className="report-iframe"
              title={report.title}
              // SECURITY: no 'allow-scripts'. report_html is LLM-generated from
              // user/DB data; with 'allow-same-origin' present, also allowing
              // scripts would let injected markup run as first-party JS on
              // lucentreport.com and call the API with the session cookie. The
              // report is static HTML/CSS, so scripts are not needed.
              sandbox="allow-same-origin allow-popups allow-modals"
              onLoad={handleIframeLoad}
            />
          </div>
        )}
      </div>

      {showEmail && (
        <EmailModal
          title={`Email ${fmtLabel.toLowerCase()} as PDF`}
          subtitle={report.title}
          defaultSubject={report.title}
          sendLabel="Send PDF"
          onClose={() => setShowEmail(false)}
          onSend={handleEmail}
        />
      )}
    </div>
  );
}

// ── Loading / progress state ──────────────────────────────────────────────────

function ReportLoadingState({ report }: { report: ReportData }) {
  if (report.status === 'error') {
    return (
      <div className="report-loading-state">
        <ErrorState
          severity="danger"
          title="Report generation failed"
          subtitle={report.error || 'An unexpected error occurred. Try simplifying your prompt or check that your data has the relevant tables.'}
        />
      </div>
    );
  }

  // Active generation — show progress with status copy.
  return (
    <div className="report-loading-state">
      <div className="report-loading-spinner"><Spinner size="lg" label="Generating report"/></div>
      <h3>{STATUS_MESSAGES[report.status] || 'Generating report...'}</h3>
      <div className="report-progress-track">
        <div className="report-progress-fill" style={{ width: `${report.progress}%` }} />
      </div>
      <p className="report-loading-hint">
        {report.format === 'deck' || report.format === 'eda'
          ? 'Built from the analysis job results. This usually takes a few minutes while the analysis runs.'
          : 'Reports take 60-90 seconds. We are running outline planning, data fetching, chapter writing, and assembly steps.'}
      </p>
    </div>
  );
}
