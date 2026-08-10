import React, { useState } from 'react';
import { Lock, Mail, User, Loader2, Sparkles, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';
const logo = '/app-icon.png';

interface LoginProps {
  onLogin: (token: string, userData: any) => void;
  base: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, base }) => {
  // Login has no search value — keep it out of the index and off the homepage's canonical.
  useSeo({
    title: 'Sign in — LucentReport',
    description: 'Sign in to LucentReport to build AI-powered dashboards and reports from your data.',
    robots: 'noindex, nofollow',
    canonicalPath: '/login',
  });
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRequirements([]);
    try {
      const response = await fetch(`${base}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        onLogin(data.token, data);
      } else {
        setError(data.non_field_errors?.[0] || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRequirements([]);
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${base}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        onLogin(data.token, data);
      } else {
        setError(data.error || 'Registration failed.');
        if (data.requirements) setRequirements(data.requirements);
      }
    } catch {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setRequirements([]);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch(`${base}/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      // Endpoint always returns 200 (no account enumeration); show the same
      // confirmation regardless.
      setForgotSent(true);
    } catch {
      setError('Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotSent(false);
    setForgotEmail(username.includes('@') ? username : '');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-visual">
        <div className="visual-content">
          <div className="visual-badge">
            <Sparkles size={14} className="sparkle" />
            <span>AI-Powered Insights</span>
          </div>
          <h1>Turn your data into <span>visual stories</span> instantly.</h1>
          <p>The first AI-native dashboarding platform that builds, styles, and deploys your insights in seconds.</p>
          <div className="visual-features">
            <div className="v-feat">
              <div className="v-feat-icon"><LayoutDashboard size={18} /></div>
              <div><strong>Dynamic Generation</strong><p>Natural language to charts</p></div>
            </div>
            <div className="v-feat">
              <div className="v-feat-icon"><Sparkles size={18} /></div>
              <div><strong>Premium Aesthetics</strong><p>Curated design systems</p></div>
            </div>
          </div>
        </div>
        <div className="visual-blob blob-1"></div>
        <div className="visual-blob blob-2"></div>
      </div>

      <div className="login-form-area">
        <div className="login-card glass">
          <div className="login-header">
            <img src={logo} alt="LucentReport" className="login-logo" />
            {mode === 'login' ? (
              <>
                <h2>Welcome back</h2>
                <p>Log in to your LucentReport account</p>
              </>
            ) : (
              <>
                <h2>Create account</h2>
                <p>Join LucentReport — it's free to get started</p>
              </>
            )}
          </div>

          {/* Mode toggle tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
              Create Account
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <div className="input-wrap">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="auth-forgot-row">
                <button type="button" className="auth-forgot-link" onClick={openForgot}>Forgot password?</button>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /><span>Signing in...</span></> : <><span>Sign In</span><ChevronRight size={18} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <div className="input-wrap">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    required
                    autoFocus
                    minLength={3}
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Email</label>
                <div className="input-wrap">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="Min 8 chars, upper, lower, number, symbol"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              {requirements.length > 0 && (
                <ul className="auth-requirements">
                  {requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /><span>Creating account...</span></> : <><span>Create Account</span><ChevronRight size={18} /></>}
              </button>
            </form>
          )}

          <div className="login-footer">
            {mode === 'login' ? (
              <p>New here? <span onClick={() => switchMode('register')}>Create an account</span></p>
            ) : (
              <p>Already have an account? <span onClick={() => switchMode('login')}>Sign in</span></p>
            )}
          </div>
        </div>
      </div>

      {showForgot && (
        <div className="forgot-overlay" onClick={() => setShowForgot(false)}>
          <div className="forgot-card" onClick={e => e.stopPropagation()}>
            {forgotSent ? (
              <>
                <h3>Check your email</h3>
                <p>If an account exists for <strong>{forgotEmail}</strong>, we've sent a link to reset your password. It expires in a few hours.</p>
                <button className="login-submit" onClick={() => setShowForgot(false)}>Back to sign in</button>
              </>
            ) : (
              <form onSubmit={handleForgot}>
                <h3>Reset your password</h3>
                <p>Enter the email on your account and we'll send you a reset link.</p>
                <div className="auth-field">
                  <label>Email</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon" />
                    <input type="email" placeholder="you@company.com" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                  </div>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <div className="forgot-actions">
                  <button type="button" className="forgot-cancel" onClick={() => setShowForgot(false)}>Cancel</button>
                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? <><Loader2 size={18} className="spin" /><span>Sending…</span></> : <span>Send reset link</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .auth-forgot-row { display: flex; justify-content: flex-end; margin-top: -2px; }
        .auth-forgot-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-size: var(--text-sm); color: var(--accent-default); font-weight: var(--weight-medium);
        }
        .auth-forgot-link:hover { text-decoration: underline; }
        .forgot-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15, 23, 42, 0.45);
          display: grid; place-items: center; padding: 20px;
        }
        .forgot-card {
          width: 100%; max-width: 400px;
          background: var(--bg-surface); border-radius: 14px;
          padding: 26px 28px; border: 1px solid var(--border-subtle);
          box-shadow: 0 20px 50px -20px rgba(15,23,42,0.4);
          font-family: var(--font-ui);
        }
        .forgot-card h3 { font-size: var(--text-xl); font-weight: var(--weight-semibold); color: var(--text-primary); margin-bottom: 6px; }
        .forgot-card > p { font-size: var(--text-sm); color: var(--text-tertiary); line-height: 1.5; margin-bottom: 16px; }
        .forgot-actions { display: flex; gap: 10px; margin-top: 16px; align-items: center; }
        .forgot-actions .login-submit { flex: 1; margin-top: 0; }
        .forgot-cancel {
          background: none; border: 1px solid var(--border-default); border-radius: 8px;
          padding: 10px 16px; cursor: pointer; color: var(--text-secondary);
          font-size: var(--text-base); font-weight: var(--weight-medium);
        }
        .forgot-cancel:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .login-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #f9fafb;
        }

        .login-visual {
          flex: 1.2;
          background: #0f172a;
          position: relative;
          display: flex;
          align-items: center;
          padding: 80px;
          overflow: hidden;
          color: white;
        }

        .visual-content {
          position: relative;
          z-index: 10;
          max-width: 520px;
        }

        .visual-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #a5b4fc;
          margin-bottom: 24px;
        }

        .login-visual h1 {
          font-size: 3.5rem;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -1.5px;
          margin-bottom: 24px;
        }

        .login-visual h1 span {
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-visual p {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 48px;
        }

        .visual-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .v-feat {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .v-feat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          display: grid;
          place-items: center;
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .v-feat strong {
          display: block;
          font-size: 0.9rem;
          color: white;
        }

        .v-feat p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }

        .visual-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: #4f46e5;
          top: -100px;
          right: -100px;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: #9333ea;
          bottom: -50px;
          left: -50px;
        }

        .login-form-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-9);
          background: var(--bg-canvas);
          position: relative;
          overflow-y: auto;
          font-family: var(--font-ui);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: var(--space-8) var(--space-9);
          border-radius: 16px;
          background: var(--bg-surface);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04),
                      0 12px 32px -16px rgba(15, 23, 42, 0.10);
          border: 1px solid var(--border-subtle);
        }

        .login-logo {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          margin-bottom: var(--space-4);
        }

        .login-header h2 {
          font-size: var(--text-2xl);
          font-weight: var(--weight-semibold);
          color: var(--text-primary);
          letter-spacing: var(--tracking-tight);
          margin-bottom: 4px;
          line-height: var(--leading-2xl);
        }

        .login-header p {
          font-size: var(--text-base);
          color: var(--text-tertiary);
          margin-bottom: 0;
          line-height: var(--leading-base);
        }

        /* Mode toggle tabs */
        .auth-tabs {
          display: flex;
          gap: 0;
          background: var(--bg-inset);
          border-radius: 8px;
          padding: 3px;
          margin: var(--space-5) 0 var(--space-5);
        }

        .auth-tab {
          flex: 1;
          padding: 7px 0;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: var(--text-base);
          font-weight: var(--weight-medium);
          color: var(--text-tertiary);
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-out),
                      color var(--duration-fast) var(--ease-out),
                      box-shadow var(--duration-fast) var(--ease-out);
        }

        .auth-tab.active {
          background: var(--bg-surface);
          color: var(--text-primary);
          font-weight: var(--weight-semibold);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-field label {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--text-secondary);
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 13px;
          color: var(--text-muted);
        }

        .input-wrap input {
          width: 100%;
          padding: 9px 13px 9px 40px;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          font-size: var(--text-base);
          color: var(--text-primary);
          outline: none;
          background: var(--bg-surface);
          font-family: var(--font-ui);
          transition: border-color var(--duration-fast) var(--ease-out),
                      box-shadow var(--duration-fast) var(--ease-out);
        }

        .input-wrap input:hover:not(:focus) { border-color: var(--border-strong); }
        .input-wrap input:focus {
          border-color: var(--accent-default);
          box-shadow: var(--ring-default);
        }
        .input-wrap input::placeholder { color: var(--text-muted); }

        .auth-error {
          padding: 10px 12px;
          background: var(--color-danger-subtle);
          border: 1px solid var(--color-danger-default);
          color: var(--color-danger-fg);
          border-radius: 8px;
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
        }

        .auth-requirements {
          margin: 0;
          padding: 10px 10px 10px 26px;
          background: var(--color-warning-subtle);
          border: 1px solid var(--color-warning-default);
          border-radius: 8px;
          font-size: var(--text-sm);
          color: var(--color-warning-fg);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .login-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: var(--text-primary);
          color: var(--bg-surface);
          border: none;
          border-radius: 8px;
          font-size: var(--text-base);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--tracking-tight);
          cursor: pointer;
          margin-top: var(--space-2);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.06);
          transition: background var(--duration-fast) var(--ease-out),
                      box-shadow var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out);
        }

        .login-submit:hover:not(:disabled) {
          background: var(--gray-800);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.10);
        }

        .login-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: var(--space-5);
          text-align: center;
        }

        .login-footer p {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }

        .login-footer span {
          color: var(--accent-default);
          font-weight: var(--weight-semibold);
          cursor: pointer;
        }

        .login-footer span:hover {
          text-decoration: underline;
        }

        @media (max-width: 992px) {
          .login-visual { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Login;
