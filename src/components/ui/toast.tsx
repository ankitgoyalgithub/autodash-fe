/**
 * Toast — non-blocking notification queue. Replaces `alert()` everywhere.
 *
 * The API is module-level (`toast.success(...)`, `toast.error(...)`) so
 * call sites don't need to thread a context through. A single <Toaster />
 * mounted near the app root subscribes to the queue and renders.
 *
 * Usage:
 *
 *   // In App.tsx (once):
 *   import { Toaster } from '@/components/ui';
 *   <Toaster />
 *
 *   // Anywhere:
 *   import { toast } from '@/components/ui';
 *   toast.success('Project created');
 *   toast.error('Could not save', { description: err.message });
 *   toast('Note saved');           // neutral
 *   toast.promise(save(), {        // auto success/error from a promise
 *     loading: 'Saving…',
 *     success: 'Saved',
 *     error:   (e) => `Failed: ${e.message}`,
 *   });
 *   toast.dismiss(id);             // manual dismiss
 *
 * Why module-level not context: 90% of toast calls are inside async handlers
 * already deep in catch blocks. Threading a context there adds noise; the
 * tiny tradeoff is that we get one global queue (which is what we want).
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

type Tone = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'neutral';

export type ToastOptions = {
  description?: string;
  duration?: number;       // ms; defaults to 4000 (or Infinity for `loading`)
  action?: { label: string; onClick: () => void };
};

type ToastEntry = {
  id: string;
  tone: Tone;
  message: string;
  description?: string;
  duration: number;
  action?: ToastOptions['action'];
  createdAt: number;
};

// ── Subscriber queue ────────────────────────────────────────────────────

type Listener = (toasts: ToastEntry[]) => void;
const queue: ToastEntry[] = [];
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(queue.slice());
}

function nextId() {
  // Avoid Math.random for reproducibility across SSR/runs; counter is fine here
  _ctr += 1;
  return `t-${Date.now().toString(36)}-${_ctr}`;
}
let _ctr = 0;

function pushToast(tone: Tone, message: string, options?: ToastOptions): string {
  const id = nextId();
  const entry: ToastEntry = {
    id, tone, message,
    description: options?.description,
    duration: options?.duration ?? (tone === 'loading' ? Infinity : 4000),
    action: options?.action,
    createdAt: Date.now(),
  };
  queue.push(entry);
  notify();
  if (entry.duration !== Infinity) {
    setTimeout(() => dismissToast(id), entry.duration);
  }
  return id;
}

function dismissToast(id: string) {
  const i = queue.findIndex(t => t.id === id);
  if (i === -1) return;
  queue.splice(i, 1);
  notify();
}

function updateToast(id: string, patch: Partial<ToastEntry>) {
  const entry = queue.find(t => t.id === id);
  if (!entry) return;
  Object.assign(entry, patch);
  notify();
  if (patch.duration !== undefined && patch.duration !== Infinity) {
    setTimeout(() => dismissToast(id), patch.duration);
  }
}

// ── Public API ──────────────────────────────────────────────────────────

type ToastFn = ((msg: string, opts?: ToastOptions) => string) & {
  success: (msg: string, opts?: ToastOptions) => string;
  error:   (msg: string, opts?: ToastOptions) => string;
  warning: (msg: string, opts?: ToastOptions) => string;
  info:    (msg: string, opts?: ToastOptions) => string;
  loading: (msg: string, opts?: ToastOptions) => string;
  dismiss: (id?: string) => void;
  promise: <T>(promise: Promise<T>, msgs: {
    loading: string;
    success: string | ((value: T) => string);
    error:   string | ((err: any) => string);
  }) => Promise<T>;
};

export const toast: ToastFn = ((msg: string, opts?: ToastOptions) =>
  pushToast('neutral', msg, opts)) as ToastFn;

toast.success = (msg, opts) => pushToast('success', msg, opts);
toast.error   = (msg, opts) => pushToast('error',   msg, opts);
toast.warning = (msg, opts) => pushToast('warning', msg, opts);
toast.info    = (msg, opts) => pushToast('info',    msg, opts);
toast.loading = (msg, opts) => pushToast('loading', msg, opts);
toast.dismiss = (id) => {
  if (id) return dismissToast(id);
  // Dismiss all
  queue.splice(0, queue.length);
  notify();
};
toast.promise = async <T,>(promise: Promise<T>, msgs: {
  loading: string;
  success: string | ((value: T) => string);
  error:   string | ((err: any) => string);
}) => {
  const id = pushToast('loading', msgs.loading);
  try {
    const value = await promise;
    const m = typeof msgs.success === 'function' ? msgs.success(value) : msgs.success;
    updateToast(id, { tone: 'success', message: m, duration: 4000 });
    return value;
  } catch (err) {
    const m = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
    updateToast(id, { tone: 'error', message: m, duration: 6000 });
    throw err;
  }
};

// ── <Toaster /> — mount once ────────────────────────────────────────────

const TONE_META: Record<Tone, { icon: React.ReactNode; cls: string }> = {
  success: { icon: <CheckCircle2 size={18}/>, cls: 'ui-toast--success' },
  error:   { icon: <AlertCircle  size={18}/>, cls: 'ui-toast--error'   },
  warning: { icon: <AlertTriangle size={18}/>, cls: 'ui-toast--warning' },
  info:    { icon: <Info size={18}/>,         cls: 'ui-toast--info'    },
  loading: { icon: <Loader2 size={18} className="ui-toast__spin"/>, cls: 'ui-toast--loading' },
  neutral: { icon: null,                      cls: '' },
};

export function Toaster({
  position = 'bottom-right',
}: { position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center' } = {}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  useEffect(() => {
    const sub: Listener = (next) => setToasts(next);
    listeners.add(sub);
    sub(queue.slice());     // seed with whatever's already queued
    return () => { listeners.delete(sub); };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`ui-toaster ui-toaster--${position}`} role="region" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id} className={`ui-toast ${TONE_META[t.tone].cls}`} role="status">
          {TONE_META[t.tone].icon && (
            <div className="ui-toast__icon">{TONE_META[t.tone].icon}</div>
          )}
          <div className="ui-toast__text">
            <div className="ui-toast__msg">{t.message}</div>
            {t.description && <div className="ui-toast__desc">{t.description}</div>}
          </div>
          {t.action && (
            <button
              type="button"
              className="ui-toast__action"
              onClick={() => { t.action!.onClick(); dismissToast(t.id); }}
            >{t.action.label}</button>
          )}
          <button
            type="button"
            className="ui-toast__close"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
          ><X size={14}/></button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
