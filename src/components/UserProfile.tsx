import { useState } from 'react';
import { User, Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { BASE } from './constants';

interface Props {
  user: { user_id: number; username: string; email: string };
  onUserUpdate: (updates: { email?: string }) => void;
}

const PASSWORD_RULES = [
  { key: 'length',    label: 'At least 8 characters',                          test: (p: string) => p.length >= 8 },
  { key: 'upper',     label: 'At least one uppercase letter',                   test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',     label: 'At least one lowercase letter',                   test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',    label: 'At least one number',                             test: (p: string) => /\d/.test(p) },
  { key: 'special',   label: 'At least one special character (!@#$%^&* etc.)',  test: (p: string) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(p) },
];

export function UserProfile({ user, onUserUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Info tab
  const [email, setEmail] = useState(user.email || '');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password tab
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveInfo = async () => {
    setInfoSaving(true);
    setInfoMsg(null);
    try {
      await axios.patch(`${BASE}/me/`, { email });
      onUserUpdate({ email });
      setInfoMsg({ type: 'success', text: 'Profile updated.' });
    } catch {
      setInfoMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setInfoSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPw) { setPwMsg({ type: 'error', text: 'Enter your current password.' }); return; }
    const failed = PASSWORD_RULES.filter(r => !r.test(newPw));
    if (failed.length) { setPwMsg({ type: 'error', text: 'New password does not meet all requirements.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }

    setPwSaving(true);
    try {
      await axios.post(`${BASE}/change-password/`, {
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmPw,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Failed to change password.';
      setPwMsg({ type: 'error', text: msg });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{user.username[0]?.toUpperCase()}</div>
        <div>
          <h1 className="profile-username">{user.username}</h1>
          <p className="profile-email-sub">{user.email || 'No email set'}</p>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
          <User size={15} /> Profile
        </button>
        <button className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
          <Lock size={15} /> Password
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="profile-card">
          <h2 className="profile-card-title">Profile information</h2>
          <div className="profile-field">
            <label className="profile-label">Username</label>
            <input className="profile-input" value={user.username} disabled />
            <span className="profile-hint">Username cannot be changed.</span>
          </div>
          <div className="profile-field">
            <label className="profile-label">Email address</label>
            <input
              className="profile-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          {infoMsg && (
            <div className={`profile-msg ${infoMsg.type}`}>
              {infoMsg.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {infoMsg.text}
            </div>
          )}
          <div className="profile-footer">
            <button className="btn-primary" onClick={handleSaveInfo} disabled={infoSaving}>
              {infoSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="profile-card">
          <h2 className="profile-card-title">Change password</h2>
          <p className="profile-card-sub">Your existing password continues to work. When you set a new one it must meet the requirements below.</p>

          <div className="profile-field">
            <label className="profile-label">Current password</label>
            <div className="profile-pw-wrap">
              <input
                className="profile-input"
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
              />
              <button className="pw-eye" onClick={() => setShowCurrent(v => !v)} tabIndex={-1} type="button">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="profile-field">
            <label className="profile-label">New password</label>
            <div className="profile-pw-wrap">
              <input
                className="profile-input"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Enter new password"
              />
              <button className="pw-eye" onClick={() => setShowNew(v => !v)} tabIndex={-1} type="button">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Strength checklist */}
          <div className="pw-rules">
            {PASSWORD_RULES.map(r => {
              const met = r.test(newPw);
              return (
                <div key={r.key} className={`pw-rule ${met ? 'met' : newPw ? 'unmet' : ''}`}>
                  {met ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {r.label}
                </div>
              );
            })}
          </div>

          <div className="profile-field">
            <label className="profile-label">Confirm new password</label>
            <div className="profile-pw-wrap">
              <input
                className="profile-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
              />
              <button className="pw-eye" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} type="button">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPw && newPw !== confirmPw && (
              <span className="profile-hint error">Passwords do not match.</span>
            )}
          </div>

          {pwMsg && (
            <div className={`profile-msg ${pwMsg.type}`}>
              {pwMsg.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {pwMsg.text}
            </div>
          )}
          <div className="profile-footer">
            <button
              className="btn-primary"
              onClick={handleChangePassword}
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            >
              {pwSaving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
