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
import {
  Maximize2, Minimize2, Printer, FileText, ChevronLeft,
  Loader2, AlertCircle,
} from 'lucide-react';

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
  format:            'report' | 'newsletter';
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

const STATUS_MESSAGES: Record<string, string> = {
  queued:      'Preparing your report...',
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

  // Loading / error states
  if (report.status !== 'ready') {
    return <ReportLoadingState report={report} />;
  }

  // Write the HTML into the iframe
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !report.report_html) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(report.report_html);
    doc.close();

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
  }, [report.report_html]);

  useEffect(() => { handleIframeLoad(); }, [handleIframeLoad]);

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

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
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
            <FileText size={13} /> {report.title}
          </span>
          <span className={`report-style-badge report-fmt-${report.format}`}>
            {report.format === 'newsletter' ? 'NEWSLETTER' : 'REPORT'}
          </span>
        </div>
        <div className="report-toolbar-right">
          <button className="report-tb-btn" onClick={handlePrint} title="Print or save as PDF">
            <Printer size={14} /> <span>Print / PDF</span>
          </button>
          <button className="report-tb-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Read fullscreen'}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Body: TOC sidebar (reports only) + iframe canvas */}
      <div className={`report-body ${report.format === 'newsletter' ? 'report-body--newsletter' : ''}`}>
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

        {/* Iframe canvas */}
        <div className="report-canvas">
          <iframe
            ref={iframeRef}
            className="report-iframe"
            title={report.title}
            sandbox="allow-same-origin allow-popups allow-modals allow-scripts"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
    </div>
  );
}

// ── Loading / progress state ──────────────────────────────────────────────────

function ReportLoadingState({ report }: { report: ReportData }) {
  if (report.status === 'error') {
    return (
      <div className="report-loading-state">
        <AlertCircle size={32} className="report-loading-icon" />
        <h3>Report generation failed</h3>
        <p className="report-loading-msg">{report.error || 'An unexpected error occurred.'}</p>
        <p className="report-loading-hint">Try simplifying your prompt or check that your data has the relevant tables.</p>
      </div>
    );
  }

  return (
    <div className="report-loading-state">
      <Loader2 size={32} className="report-loading-icon spin" />
      <h3>{STATUS_MESSAGES[report.status] || 'Generating report...'}</h3>
      <div className="report-progress-track">
        <div className="report-progress-fill" style={{ width: `${report.progress}%` }} />
      </div>
      <p className="report-loading-hint">
        Reports take 60-90 seconds. We are running outline planning, data fetching,
        chapter writing, and assembly steps.
      </p>
    </div>
  );
}
