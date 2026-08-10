/**
 * ShareProjectModal — first modal migrated to the UI-primitive shell.
 *
 * Template for future modal migrations:
 *   1. Wrap content in <Modal open onClose title subtitle size>...</Modal>
 *   2. Put content inside <Modal.Body>
 *   3. Put actions in <Modal.Footer> with <Button> primitives
 *   4. Use <Field>+<Input> for any form fields
 *   5. Use <Tag> for status chips, <Toast> for transient notifications
 *
 * Result: ~80 fewer lines of bespoke JSX + CSS, behavior identical, with
 * ESC-to-close, focus trap, body scroll lock, and ARIA wiring all for free.
 */

import { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, Crown, Edit3, Eye, ChevronDown, Check, AlertTriangle,
} from 'lucide-react';
import axios from 'axios';
import { BASE } from './constants';
import type { Project, ProjectMember } from '../App';
import { Modal, Button, Field, Input, Tag, toast, confirmDialog } from './ui';

const ROLE_META = {
  admin:  { label: 'Admin',  icon: Crown,  color: '#7c3aed', desc: 'Full access, can invite members' },
  editor: { label: 'Editor', icon: Edit3,  color: '#2563eb', desc: 'Can run queries and edit dashboards' },
  viewer: { label: 'Viewer', icon: Eye,    color: '#059669', desc: 'Read-only access' },
} as const;

type Role = keyof typeof ROLE_META;

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
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

function RoleDropdown({
  value, onChange, disabled,
}: { value: string; onChange: (r: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[value as Role] ?? ROLE_META.editor;
  const Icon = meta.icon;
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
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
          {(Object.keys(ROLE_META) as Role[]).map(r => {
            const M = ROLE_META[r]; const RIcon = M.icon;
            return (
              <button
                key={r}
                type="button"
                className={`spm-role-opt ${value === r ? 'sel' : ''}`}
                onClick={() => { onChange(r); setOpen(false); }}
              >
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

export function ShareProjectModal({
  project, currentUser, onClose, onProjectUpdate,
}: {
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
    try {
      const r = await axios.post(`${BASE}/projects/${project.id}/members/`, { identifier: identifier.trim(), role: inviteRole });
      toast.success(`${r.data.username} added as ${inviteRole}`);
      setIdentifier('');
      await fetchMembers();
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
      toast.success('Role updated');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update role.');
    }
  };

  const handleRemove = async (memberId: number) => {
    if (!(await confirmDialog({
      title: 'Remove member?',
      message: 'They will lose access to this project.',
      confirmLabel: 'Remove', danger: true,
    }))) return;
    try {
      await axios.delete(`${BASE}/projects/${project.id}/members/${memberId}/`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      const proj = await axios.get(`${BASE}/projects/`);
      const updated = proj.data.find((p: Project) => p.id === project.id);
      if (updated) onProjectUpdate(updated);
      toast.success('Member removed');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to remove member.');
    }
  };

  const isAdmin = myRole === 'admin';

  return (
    <Modal
      open onClose={onClose} size="lg"
      eyebrow="Share project"
      title={project.name}
      subtitle="Invite collaborators by username or email."
    >
      <Modal.Body>
        {project.datasource?.is_myspace && (
          <div className="spm-myspace-warning" style={{ marginBottom: 'var(--space-4)' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }}/>
            <span>
              This project is connected to <strong>My Space</strong> (a personal private datasource).
              Collaborators you invite will <strong>not</strong> be able to run queries — they'll see the project
              but the data belongs only to you. Connect a shared datasource to enable collaboration.
            </span>
          </div>
        )}

        {isAdmin && (
          <Field
            label="Add a collaborator"
            htmlFor="spm-invite-id"
            error={inviteError || undefined}
            className="spm-invite-field"
          >
            <div className="spm-invite-row">
              <Input
                id="spm-invite-id"
                placeholder="username or email@company.com"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setInviteError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                error={!!inviteError}
              />
              <RoleDropdown value={inviteRole} onChange={setInviteRole} />
              <Button
                onClick={handleInvite}
                loading={inviting}
                disabled={!identifier.trim()}
                leading={<UserPlus size={14}/>}
              >Invite</Button>
            </div>
          </Field>
        )}

        <div className="spm-members" style={{ marginTop: 'var(--space-4)' }}>
          <div className="spm-members-label">
            {loading ? 'Loading…' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
          </div>
          {loading ? (
            <div className="spm-loading" />
          ) : (
            <div className="spm-member-list">
              {members.map(m => {
                const isMe = m.id === currentUser?.user_id;
                const canManage = isAdmin && !isMe && !m.is_owner;
                return (
                  <div key={m.id} className="spm-member-row">
                    <Avatar name={m.username} size={36} />
                    <div className="spm-member-info">
                      <div className="spm-member-name">
                        {m.username}
                        {isMe && <Tag tone="accent">you</Tag>}
                        {m.is_owner && <Tag tone="warning"><Crown size={10}/> owner</Tag>}
                      </div>
                      <div className="spm-member-email">{m.email}</div>
                    </div>
                    <div className="spm-member-actions">
                      {canManage ? (
                        <>
                          <RoleDropdown value={m.role} onChange={(r) => handleRoleChange(m.id, r)} />
                          <Button
                            variant="ghost" iconOnly size="sm"
                            onClick={() => handleRemove(m.id)}
                            aria-label="Remove member"
                          ><Trash2 size={13}/></Button>
                        </>
                      ) : (
                        <div
                          className="spm-role-static"
                          style={{ color: ROLE_META[m.role as Role]?.color ?? '#888' }}
                        >
                          {(() => {
                            const M = ROLE_META[m.role as Role];
                            if (!M) return m.role;
                            const I = M.icon;
                            return <><I size={13} />{M.label}</>;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer between>
        <div className="spm-access-hint">
          {isAdmin
            ? 'You can invite, change roles, and remove members.'
            : `You have ${myRole} access to this project.`}
        </div>
        <Button onClick={onClose}>Done</Button>
      </Modal.Footer>
    </Modal>
  );
}
