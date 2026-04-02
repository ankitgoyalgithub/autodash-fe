import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Crown, Edit3, Eye, ChevronDown, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import { BASE } from './constants';
import type { Project, ProjectMember } from '../App';

const ROLE_META = {
  admin:  { label: 'Admin',  icon: Crown,  color: '#7c3aed', desc: 'Full access, can invite members' },
  editor: { label: 'Editor', icon: Edit3,  color: '#2563eb', desc: 'Can run queries and edit dashboards' },
  viewer: { label: 'Viewer', icon: Eye,    color: '#059669', desc: 'Read-only access' },
} as const;

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  // Deterministic color from username
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,55%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
      flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

function RoleDropdown({ value, onChange, disabled }: { value: string; onChange: (r: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[value as keyof typeof ROLE_META] ?? ROLE_META.editor;
  const Icon = meta.icon;
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="spm-role-btn"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{ color: meta.color }}
      >
        <Icon size={13} />
        {meta.label}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div className="spm-role-dropdown" onClick={e => e.stopPropagation()}>
          {(Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).map(r => {
            const M = ROLE_META[r]; const RIcon = M.icon;
            return (
              <button key={r} className={`spm-role-opt ${value === r ? 'sel' : ''}`}
                onClick={() => { onChange(r); setOpen(false); }}>
                <RIcon size={13} style={{ color: M.color }} />
                <div>
                  <div className="spm-role-opt-label">{M.label}</div>
                  <div className="spm-role-opt-desc">{M.desc}</div>
                </div>
                {value === r && <Check size={13} style={{ color: M.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ShareProjectModal({ project, currentUser, onClose, onProjectUpdate }: {
  project: Project;
  currentUser: any;
  onClose: () => void;
  onProjectUpdate: (p: Project) => void;
}) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [myRole, setMyRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const accent = project.color || '#6366f1';

  const fetchMembers = async () => {
    try {
      const r = await axios.get(`${BASE}/projects/${project.id}/members/`);
      setMembers(r.data.members);
      setMyRole(r.data.my_role);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async () => {
    if (!identifier.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const r = await axios.post(`${BASE}/projects/${project.id}/members/`, { identifier: identifier.trim(), role: inviteRole });
      setInviteSuccess(`${r.data.username} added as ${inviteRole}.`);
      setIdentifier('');
      await fetchMembers();
      // Refresh project in parent
      const proj = await axios.get(`${BASE}/projects/`);
      const updated = proj.data.find((p: Project) => p.id === project.id);
      if (updated) onProjectUpdate(updated);
    } catch (e: any) {
      setInviteError(e.response?.data?.error || 'Failed to invite user.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: number, newRole: string) => {
    try {
      await axios.patch(`${BASE}/projects/${project.id}/members/${memberId}/`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update role.');
    }
  };

  const handleRemove = async (memberId: number) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await axios.delete(`${BASE}/projects/${project.id}/members/${memberId}/`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      const proj = await axios.get(`${BASE}/projects/`);
      const updated = proj.data.find((p: Project) => p.id === project.id);
      if (updated) onProjectUpdate(updated);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to remove member.');
    }
  };

  const isAdmin = myRole === 'admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="spm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="spm-header" style={{ borderBottom: `2px solid ${accent}20` }}>
          <div className="spm-header-left">
            <div className="spm-project-badge" style={{ background: accent + '18', color: accent }}>
              {project.emoji}
            </div>
            <div>
              <div className="spm-title">Share project</div>
              <div className="spm-subtitle">{project.name}</div>
            </div>
          </div>
          <button className="spm-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Invite section (admin only) */}
        {isAdmin && (
          <div className="spm-invite-section">
            <div className="spm-invite-label">Invite by username or email</div>
            <div className="spm-invite-row">
              <input
                className="spm-invite-input"
                placeholder="username or email@company.com"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setInviteError(''); setInviteSuccess(''); }}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={{ '--focus-accent': accent } as React.CSSProperties}
              />
              <RoleDropdown value={inviteRole} onChange={setInviteRole} />
              <button
                className="spm-invite-btn"
                style={{ background: accent }}
                onClick={handleInvite}
                disabled={inviting || !identifier.trim()}
              >
                {inviting ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
                Invite
              </button>
            </div>
            {inviteError && <div className="spm-invite-error">{inviteError}</div>}
            {inviteSuccess && <div className="spm-invite-success"><Check size={13} /> {inviteSuccess}</div>}
          </div>
        )}

        {/* Members list */}
        <div className="spm-members">
          <div className="spm-members-label">
            {loading ? 'Loading…' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
          </div>
          {loading ? (
            <div className="spm-loading"><Loader2 size={20} className="spin" /></div>
          ) : (
            <div className="spm-member-list">
              {members.map(m => {
                const isMe = m.id === currentUser?.user_id;
                const isOwner = m.is_owner || m.role === 'admin';
                const canManage = isAdmin && !isMe && !m.is_owner;
                return (
                  <div key={m.id} className="spm-member-row">
                    <Avatar name={m.username} size={36} />
                    <div className="spm-member-info">
                      <div className="spm-member-name">
                        {m.username}
                        {isMe && <span className="spm-you-badge">you</span>}
                        {m.is_owner && <span className="spm-owner-badge"><Crown size={10} /> owner</span>}
                      </div>
                      <div className="spm-member-email">{m.email}</div>
                    </div>
                    <div className="spm-member-actions">
                      {canManage ? (
                        <>
                          <RoleDropdown value={m.role} onChange={(r) => handleRoleChange(m.id, r)} />
                          <button className="spm-remove-btn" onClick={() => handleRemove(m.id)} title="Remove member">
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <div className="spm-role-static" style={{ color: ROLE_META[m.role as keyof typeof ROLE_META]?.color ?? '#888' }}>
                          {(() => { const M = ROLE_META[m.role as keyof typeof ROLE_META]; if (!M) return m.role; const I = M.icon; return <><I size={13} />{M.label}</>; })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="spm-footer">
          <div className="spm-access-hint">
            {isAdmin ? 'As admin you can invite, change roles, and remove members.' : `You have ${myRole} access to this project.`}
          </div>
          <button className="spm-done-btn" style={{ background: accent }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
