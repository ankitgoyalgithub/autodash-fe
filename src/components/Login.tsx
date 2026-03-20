import React, { useState } from 'react';
import { Lock, Mail, Loader2, Sparkles, ChevronRight, LayoutDashboard } from 'lucide-react';
import logo from '../assets/logo.svg';

interface LoginProps {
  onLogin: (token: string, userData: any) => void;
  base: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, base }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${base}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data);
      } else {
        setError(data.non_field_errors?.[0] || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
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
            <img src={logo} alt="Lumio" className="login-logo" />
            <h2>Welcome back</h2>
            <p>Log in to your Lumio account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Username</label>
              <div className="input-wrap">
                <Mail size={18} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Enter your username" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <span>Contact Admin</span></p>
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
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 48px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
          border: 1px solid #eaecf0;
        }

        .login-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .login-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #101828;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }

        .login-header p {
          font-size: 0.95rem;
          color: #667085;
          margin-bottom: 36px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          padding: 12px 14px 12px 42px;
          border-radius: 12px;
          border: 1px solid #d0d5dd;
          font-size: 1rem;
          color: #101828;
          outline: none;
          transition: all 0.2s;
        }

        .input-wrap input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .auth-error {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .login-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: #101828;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
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
          margin-top: 32px;
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

        @media (max-width: 992px) {
          .login-visual {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
