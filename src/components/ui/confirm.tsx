/**
 * confirmDialog — promise-based replacement for the native `confirm()`.
 *
 * Mirrors the module-level `toast` API so call sites stay one line and don't
 * have to thread modal state through components:
 *
 *   import { confirmDialog } from '@/components/ui';
 *   if (!(await confirmDialog({
 *     title: 'Delete project?',
 *     message: 'This permanently removes the project and its dashboards.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   }))) return;
 *   // ...proceed with the destructive action
 *
 * A single <ConfirmHost /> mounted near the app root renders the active
 * dialog. Resolves true on confirm, false on cancel / escape / overlay click.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
};

type Request = ConfirmOptions & { id: number; resolve: (ok: boolean) => void };

type Listener = (req: Request | null) => void;
const listeners = new Set<Listener>();
let current: Request | null = null;
let _ctr = 0;

function notify() {
  for (const l of listeners) l(current);
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    _ctr += 1;
    // If a dialog is already open, resolve it as cancelled before replacing.
    if (current) current.resolve(false);
    current = { ...opts, id: _ctr, resolve };
    notify();
  });
}

function settle(ok: boolean) {
  if (!current) return;
  current.resolve(ok);
  current = null;
  notify();
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    const sub: Listener = (next) => setReq(next);
    listeners.add(sub);
    sub(current);
    return () => { listeners.delete(sub); };
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') settle(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);

  if (typeof document === 'undefined' || !req) return null;

  return createPortal(
    <div
      className="ui-modal-overlay"
      onClick={() => settle(false)}
      role="dialog" aria-modal="true" aria-label={req.title}
    >
      <div className="ui-modal ui-modal--sm ui-confirm" onClick={e => e.stopPropagation()}>
        <div className="ui-confirm__body">
          {req.danger && (
            <div className="ui-confirm__icon" aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
          )}
          <div className="ui-confirm__text">
            <h2 className="ui-confirm__title">{req.title}</h2>
            {req.message && <div className="ui-confirm__message">{req.message}</div>}
          </div>
        </div>
        <footer className="ui-modal__footer">
          <Button variant="ghost" onClick={() => settle(false)} autoFocus>
            {req.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={req.danger ? 'danger' : 'primary'}
            onClick={() => settle(true)}
          >
            {req.confirmLabel || 'Confirm'}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
