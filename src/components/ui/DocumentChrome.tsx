/**
 * DocumentChrome — three-slot toolbar for long-form viewers
 * (reports, newsletters, cartoons, infographics, and any future
 * document-style canvas).
 *
 * Replaces the bespoke `.report-toolbar` / `.rich-ig-toolbar` blocks that
 * each viewer rolls its own version of. The chrome is purely presentational:
 * viewers compose buttons (via the <Button> primitive or `<DocumentChrome.Button>`
 * shortcut) into the three slots and the chrome handles spacing, separators,
 * sticky positioning, and responsive collapse.
 *
 * Usage:
 *   <DocumentChrome
 *     left={
 *       <>
 *         <DocumentChrome.Button onClick={onBack}><ChevronLeft size={14}/></DocumentChrome.Button>
 *         <DocumentChrome.Title icon={<FileText size={13}/>}>{title}</DocumentChrome.Title>
 *         <Tag tone="accent">REPORT</Tag>
 *       </>
 *     }
 *     center={
 *       <DocumentChrome.ZoomControl
 *         zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomFit={zoomFit}
 *       />
 *     }
 *     right={
 *       <>
 *         <DocumentChrome.Button onClick={onPrint}><Printer size={14}/> Print</DocumentChrome.Button>
 *         <DocumentChrome.Button onClick={toggleFs}><Maximize2 size={14}/></DocumentChrome.Button>
 *       </>
 *     }
 *   />
 *
 * Layout:
 *   - left slot pushes flush-left
 *   - center slot is true-centered (uses grid columns)
 *   - right slot pushes flush-right
 *   - if center is omitted, left/right behave like a 2-column flex bar
 */

import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function DocumentChrome({
  left, center, right, sticky = true, className,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <header
      className={joinClasses(
        'ui-doc-chrome',
        center !== undefined && 'ui-doc-chrome--3col',
        sticky && 'ui-doc-chrome--sticky',
        className,
      )}
      role="toolbar"
    >
      <div className="ui-doc-chrome__slot ui-doc-chrome__slot--left">{left}</div>
      {center !== undefined && (
        <div className="ui-doc-chrome__slot ui-doc-chrome__slot--center">{center}</div>
      )}
      <div className="ui-doc-chrome__slot ui-doc-chrome__slot--right">{right}</div>
    </header>
  );
}

// Lightweight button shortcut sized for chrome bars. Skipped using the full
// <Button> primitive here because chrome buttons want a smaller default
// (sm-size, icon-leading-text, ghost-on-white).
DocumentChrome.Button = function DocumentChromeButton({
  active = false, primary = false, disabled = false,
  onClick, title, children, className,
}: {
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={joinClasses(
        'ui-doc-chrome__btn',
        primary && 'ui-doc-chrome__btn--primary',
        active  && 'ui-doc-chrome__btn--active',
        className,
      )}
    >
      {children}
    </button>
  );
};

DocumentChrome.Title = function DocumentChromeTitle({
  icon, children,
}: { icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <span className="ui-doc-chrome__title">
      {icon && <span className="ui-doc-chrome__title-icon">{icon}</span>}
      <span className="ui-doc-chrome__title-text">{children}</span>
    </span>
  );
};

DocumentChrome.Divider = function DocumentChromeDivider() {
  return <span className="ui-doc-chrome__divider" aria-hidden="true" />;
};

DocumentChrome.ZoomControl = function ZoomControl({
  zoom, onZoomIn, onZoomOut, onZoomFit,
  canZoomIn = true, canZoomOut = true,
}: {
  zoom: number;       // 1.0 = 100%
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}) {
  return (
    <div className="ui-doc-chrome__zoom">
      <DocumentChrome.Button onClick={onZoomOut} disabled={!canZoomOut} title="Zoom out">
        <ZoomOut size={14}/>
      </DocumentChrome.Button>
      <button
        type="button"
        onClick={onZoomFit}
        className="ui-doc-chrome__zoom-label"
        title="Fit to view"
      >{Math.round(zoom * 100)}%</button>
      <DocumentChrome.Button onClick={onZoomIn} disabled={!canZoomIn} title="Zoom in">
        <ZoomIn size={14}/>
      </DocumentChrome.Button>
    </div>
  );
};
