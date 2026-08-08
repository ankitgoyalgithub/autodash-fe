// EmailModal.tsx
// Reusable "email this as a PDF" dialog. Collects recipients + an optional
// message and delegates the actual send to the parent via `onSend`, so it works
// for both reports (POST /reports/:id/email/) and dashboard exports.

import { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react';
import './EmailModal.css';

export interface EmailSendArgs {
  recipients: string;   // raw, comma/space separated — backend parses + validates
  subject: string;
  message: string;
}

interface Props {
  title?: string;
  /** Small line under the title, e.g. the document name being sent. */
  subtitle?: string;
  defaultSubject?: string;
  showSubject?: boolean;
  sendLabel?: string;
  onClose: () => void;
  /** Resolve on success (optionally with the accepted recipients); throw Error on failure. */
  onSend: (args: EmailSendArgs) => Promise<{ recipients?: string[] } | void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailModal({
  title = 'Email as PDF',
  subtitle,
  defaultSubject = '',
  showSubject = true,
  sendLabel = 'Send PDF',
  onClose,
  onSend,
}: Props) {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string[]>([]);

  const parsed = recipients.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  const hasValid = parsed.length > 0 && parsed.every(e => EMAIL_RE.test(e));
  const canSend = hasValid && status !== 'sending';

  const handleSend = async () => {
    if (!canSend) return;
    setStatus('sending');
    setError('');
    try {
      const res = await onSend({ recipients, subject: subject.trim(), message: message.trim() });
      setSentTo((res && res.recipients) || parsed);
      setStatus('sent');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to send email.');
      setStatus('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal email-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2><Mail size={16} style={{ verticalAlign: '-2px', marginRight: 8 }} />{title}</h2>
          <button className="email-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {status === 'sent' ? (
          <div className="modal-body email-modal-result">
            <div className="email-result-icon success"><CheckCircle size={40} /></div>
            <h3>PDF sent</h3>
            <p className="email-result-sub">
              Delivered to {sentTo.length} recipient{sentTo.length === 1 ? '' : 's'}:
            </p>
            <div className="email-recipient-chips">
              {sentTo.map(r => <span key={r} className="email-chip">{r}</span>)}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            {subtitle && <p className="email-modal-subtitle">{subtitle}</p>}

            <div className="field full">
              <label>Recipients <span className="opt">comma-separated</span></label>
              <input
                type="text"
                placeholder="alex@company.com, dana@company.com"
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                autoFocus
              />
              {recipients && !hasValid && (
                <span className="email-field-hint error">Enter one or more valid email addresses.</span>
              )}
            </div>

            {showSubject && (
              <div className="field full">
                <label>Subject <span className="opt">optional</span></label>
                <input
                  type="text"
                  placeholder={defaultSubject || 'Subject'}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="field full">
              <label>Message <span className="opt">optional</span></label>
              <textarea
                className="email-modal-textarea"
                placeholder="Add a short note to include in the email…"
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {status === 'error' && (
              <div className="email-field-hint error email-send-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-outline" onClick={onClose} disabled={status === 'sending'}>Cancel</button>
              <button className="btn-primary" onClick={handleSend} disabled={!canSend}>
                {status === 'sending'
                  ? <><Loader2 size={14} className="spin" /> Sending…</>
                  : <><Send size={14} /> {sendLabel}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
