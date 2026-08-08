/**
 * Modal — primitive shell that every dialog in the app should switch to.
 *
 * Usage:
 *   <Modal open={open} onClose={close} title="Share project" size="md">
 *     <Modal.Body>...form fields...</Modal.Body>
 *     <Modal.Footer>
 *       <Button variant="ghost" onClick={close}>Cancel</Button>
 *       <Button onClick={submit}>Share</Button>
 *     </Modal.Footer>
 *   </Modal>
 *
 *   // Or with full slot control:
 *   <Modal open onClose={close} renderHeader={false}>
 *     <div className="custom-header" />
 *     <Modal.Body>...</Modal.Body>
 *   </Modal>
 *
 * Provides:
 *   - portal-rendered overlay with click-outside-to-close
 *   - escape-to-close
 *   - focus trap (light: focuses first focusable child on open, restores on close)
 *   - size variants: sm | md | lg | xl
 *   - title + subtitle + eyebrow + close button by default; opt out with
 *     `renderHeader={false}` and compose your own
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  size?: Size;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Render the default header. Set to false to compose your own. */
  renderHeader?: boolean;
  /** Render the close (×) button. */
  renderClose?: boolean;
  /** Disable click-outside-to-close (use for in-progress forms). */
  dismissOnOverlayClick?: boolean;
  className?: string;
  /** ID for aria-labelledby. Auto-generated if title is provided. */
  ariaLabelledBy?: string;
  children?: React.ReactNode;
};

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Modal({
  open, onClose,
  size = 'md',
  title, subtitle, eyebrow,
  renderHeader = true,
  renderClose = true,
  dismissOnOverlayClick = true,
  className,
  ariaLabelledBy,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useRef(`ui-modal-title-${Math.random().toString(36).slice(2, 9)}`);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const focusable = modalRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
    return () => previouslyFocused.current?.focus();
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="ui-modal-overlay"
      onClick={dismissOnOverlayClick ? onClose : undefined}
      role="dialog" aria-modal="true"
      aria-labelledby={ariaLabelledBy || (title ? titleId.current : undefined)}
    >
      <div
        ref={modalRef}
        className={joinClasses('ui-modal', `ui-modal--${size}`, className)}
        onClick={e => e.stopPropagation()}
      >
        {renderHeader && (title || subtitle || eyebrow || renderClose) && (
          <header className="ui-modal__header">
            <div className="ui-modal__header-text">
              {eyebrow && <div className="ui-modal__eyebrow">{eyebrow}</div>}
              {title && <h2 id={titleId.current} className="ui-modal__title">{title}</h2>}
              {subtitle && <p className="ui-modal__subtitle">{subtitle}</p>}
            </div>
            {renderClose && (
              <Button variant="ghost" iconOnly size="md" onClick={onClose} aria-label="Close">
                <X size={18}/>
              </Button>
            )}
          </header>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

Modal.Body = function ModalBody({
  children, className,
}: { children?: React.ReactNode; className?: string }) {
  return <div className={joinClasses('ui-modal__body', className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({
  children, between, className,
}: { children?: React.ReactNode; between?: boolean; className?: string }) {
  return (
    <footer className={joinClasses('ui-modal__footer', between && 'ui-modal__footer--between', className)}>
      {children}
    </footer>
  );
};
