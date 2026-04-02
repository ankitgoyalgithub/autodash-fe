import React, { useState } from 'react';
import { Lock, Mail, User, Loader2, Sparkles, ChevronRight, LayoutDashboard } from 'lucide-react';
const logo = '/app-icon.png';

interface LoginProps {
  onLogin: (token: string, userData: any) => void;
  base: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, base }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

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

      <style>{`
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
          padding: 40px;
          background: #f9fafb;
          position: relative;
          overflow-y: auto;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px 48px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
          border: 1px solid #eaecf0;
        }

        .login-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .login-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #101828;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .login-header p {
          font-size: 0.95rem;
          color: #667085;
          margin-bottom: 0;
        }

        /* Mode toggle tabs */
        .auth-tabs {
          display: flex;
          gap: 0;
          background: #f4f4f5;
          border-radius: 10px;
          padding: 3px;
          margin: 20px 0 24px;
        }

        .auth-tab {
          flex: 1;
          padding: 8px 0;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .auth-tab.active {
          background: white;
          color: #101828;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-field label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #344054;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #98a2b3;
        }

        .input-wrap input {
          width: 100%;
          padding: 11px 14px 11px 42px;
          border-radius: 12px;
          border: 1px solid #d0d5dd;
          font-size: 0.95rem;
          color: #101828;
          outline: none;
          transition: all 0.2s;
          background: #fafafa;
        }

        .input-wrap input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          background: #fff;
        }

        .auth-error {
          padding: 10px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 10px;
          font-size: 0.83rem;
          font-weight: 500;
        }

        .auth-requirements {
          margin: 0;
          padding: 10px 10px 10px 26px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-size: 0.8rem;
          color: #92400e;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .login-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px;
          background: #101828;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 4px;
        }

        .login-submit:hover:not(:disabled) {
          background: #1d2939;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .login-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
        }

        .login-footer p {
          font-size: 0.85rem;
          color: #667085;
        }

        .login-footer span {
          color: #6366f1;
          font-weight: 600;
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
