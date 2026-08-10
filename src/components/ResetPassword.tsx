import React, { useMemo, useState } from 'react';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE } from './constants';

const logo = '/app-icon.png';

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'An uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: p => /[a-z]/.test(p) },
  { label: 'A number', test: p => /\d/.test(p) },
  { label: 'A symbol', test: p => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { uid, token } = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return { uid: q.get('uid') || '', token: q.get('token') || '' };
  }, []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const unmet = RULES.filter(r => !r.test(password));
  const canSubmit = password.length > 0 && unmet.length === 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = await r.json();
      if (r.ok) {
        setDone(true);
      } else {
        setError(data.error || 'Could not reset password.');
      }
    } catch {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !uid || !token;

  return (
    <div className="reset-page">
      <div className="reset-card">
        <img src={logo} alt="LucentReport" className="reset-logo" />
        {done ? (
          <div className="reset-done">
            <CheckCircle2 size={40} className="reset-done-icon" />
            <h2>Password updated</h2>
            <p>Your password has been changed. You can now sign in with it.</p>
            <button className="reset-submit" onClick={() => navigate('/login')}>Go to sign in</button>
          </div>
        ) : invalidLink ? (
          <>
            <h2>Invalid reset link</h2>
            <p className="reset-sub">This link is missing information or has expired. Request a new one from the sign-in page.</p>
            <button className="reset-submit" onClick={() => navigate('/login')}>Back to sign in</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>Choose a new password</h2>
            <p className="reset-sub">Enter and confirm your new password below.</p>

            <div className="reset-field">
              <label>New password</label>
              <div className="reset-input-wrap">
                <Lock size={18} className="reset-input-icon" />
                <input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required autoFocus />
              </div>
            </div>
            <div className="reset-field">
              <label>Confirm password</label>
              <div className="reset-input-wrap">
                <Lock size={18} className="reset-input-icon" />
                <input type="password" placeholder="••••••••" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required />
              </div>
            </div>

            {password.length > 0 && (
              <ul className="reset-rules">
                {RULES.map((r, i) => (
                  <li key={i} className={r.test(password) ? 'met' : ''}>{r.label}</li>
                ))}
              </ul>
            )}
            {confirm.length > 0 && password !== confirm && (
              <div className="reset-error">Passwords do not match.</div>
            )}
            {error && <div className="reset-error">{error}</div>}

            <button type="submit" className="reset-submit" disabled={loading || !canSubmit}>
              {loading ? <><Loader2 size={18} className="spin" /><span>Updating…</span></> : <span>Reset password</span>}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .reset-page {
          min-height: 100vh; display: grid; place-items: center;
          background: var(--bg-canvas, #f9fafb); padding: 24px;
          font-family: var(--font-ui);
        }
        .reset-card {
          width: 100%; max-width: 420px;
          background: var(--bg-surface, #fff); border-radius: 16px;
          padding: 32px 34px; border: 1px solid var(--border-subtle, #eef0f4);
          box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.10);
        }
        .reset-logo { width: 44px; height: 44px; border-radius: 10px; margin-bottom: 16px; }
        .reset-card h2 { font-size: 1.4rem; font-weight: 650; color: var(--text-primary, #111827); margin-bottom: 4px; }
        .reset-sub { font-size: 0.9rem; color: var(--text-tertiary, #6b7280); margin-bottom: 18px; }
        .reset-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .reset-field label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary, #374151); }
        .reset-input-wrap { position: relative; display: flex; align-items: center; }
        .reset-input-icon { position: absolute; left: 13px; color: var(--text-muted, #9ca3af); }
        .reset-input-wrap input {
          width: 100%; padding: 9px 13px 9px 40px; border-radius: 8px;
          border: 1px solid var(--border-default, #d1d5db); font-size: 0.95rem;
          color: var(--text-primary, #111827); outline: none; background: var(--bg-surface, #fff);
          font-family: var(--font-ui);
        }
        .reset-input-wrap input:focus { border-color: var(--accent-default, #6366f1); box-shadow: var(--ring-default, 0 0 0 3px rgba(99,102,241,0.15)); }
        .reset-rules {
          list-style: none; margin: 4px 0 12px; padding: 10px 12px;
          background: var(--bg-inset, #f3f4f6); border-radius: 8px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;
          font-size: 0.78rem; color: var(--text-tertiary, #6b7280);
        }
        .reset-rules li::before { content: '○ '; color: var(--text-muted, #9ca3af); }
        .reset-rules li.met { color: var(--success, #16a34a); }
        .reset-rules li.met::before { content: '✓ '; }
        .reset-error {
          padding: 10px 12px; margin-bottom: 12px;
          background: var(--color-danger-subtle, #fef2f2); border: 1px solid var(--color-danger-default, #fecaca);
          color: var(--color-danger-fg, #b91c1c); border-radius: 8px; font-size: 0.85rem; font-weight: 500;
        }
        .reset-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px; background: var(--text-primary, #111827); color: #fff; border: none;
          border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-top: 4px;
        }
        .reset-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .reset-done { text-align: center; }
        .reset-done-icon { color: var(--success, #16a34a); margin-bottom: 8px; }
        .spin { animation: reset-spin 0.8s linear infinite; }
        @keyframes reset-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ResetPassword;
