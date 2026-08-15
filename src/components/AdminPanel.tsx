import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { BASE } from './constants';
import { toast, confirmDialog } from './ui';
import {
  Users, ShieldCheck, Ban, UserPlus, LayoutDashboard, FileText,
  LogIn, RefreshCw, Search, Loader2, Activity, KeyRound, MonitorSmartphone,
} from 'lucide-react';

// ─── Types (mirror the /api/admin/* payloads) ────────────────────────────────
interface Overview {
  users: { total: number; active: number; blocked: number; admins: number; new_7d: number };
  content: { projects: number; dashboards: number; documents: number; reports: number };
  activity: { logins_24h: number; active_sessions: number; credits_used: number };
}
interface AdminUser {
  id: number; username: string; email: string;
  is_active: boolean; is_superuser: boolean; is_staff: boolean;
  date_joined: string; last_login: string | null;
  usage: {
    projects: number; dashboards: number; documents: number; reports: number;
    active_sessions: number; credits_used: number; credit_limit: number | null; is_unlimited: boolean;
  };
}
interface AuditEvt {
  id: number; event: string; username: string | null; user_id: number | null;
  actor: string | null; ip: string | null; user_agent: string; detail: string; created_at: string;
}

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (s: string) => new Date(s).toLocaleString(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const relative = (s: string | null) => {
  if (!s) return 'never';
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(s);
};

const EVENT_META: Record<string, { label: string; cls: string }> = {
  login:           { label: 'Login',           cls: 'ae-login' },
  logout:          { label: 'Logout',          cls: 'ae-logout' },
  logout_all:      { label: 'Logout (all)',    cls: 'ae-logout' },
  register:        { label: 'Registered',      cls: 'ae-register' },
  password_change: { label: 'Password change', cls: 'ae-neutral' },
  blocked:         { label: 'Blocked',         cls: 'ae-blocked' },
  unblocked:       { label: 'Unblocked',       cls: 'ae-unblocked' },
};

export function AdminPanel() {
  const [tab, setTab] = useState<'users' | 'activity'>('users');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AuditEvt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, us, au] = await Promise.all([
        axios.get(`${BASE}/admin/overview/`),
        axios.get(`${BASE}/admin/users/`),
        axios.get(`${BASE}/admin/audit/?page_size=100`),
      ]);
      setOverview(ov.data);
      setUsers(us.data.users);
      setEvents(au.data.events);
    } catch {
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleBlock = async (u: AdminUser) => {
    const blocking = u.is_active;
    const ok = await confirmDialog({
      title: blocking ? `Block ${u.username}?` : `Unblock ${u.username}?`,
      message: blocking
        ? 'They will be signed out of all devices immediately and cannot log in until unblocked.'
        : 'They will be able to log in again.',
      confirmLabel: blocking ? 'Block user' : 'Unblock user',
      danger: blocking,
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await axios.post(`${BASE}/admin/users/${u.id}/block/`, { block: blocking });
      toast.success(blocking ? `${u.username} blocked` : `${u.username} unblocked`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [users, q]);

  const stats = overview && [
    { icon: <Users size={18} />,           label: 'Total users',      value: overview.users.total,        tint: '#3b82f6', sub: `${overview.users.new_7d} new this week` },
    { icon: <ShieldCheck size={18} />,     label: 'Active',           value: overview.users.active,       tint: '#10b981', sub: `${overview.users.admins} admin${overview.users.admins === 1 ? '' : 's'}` },
    { icon: <Ban size={18} />,             label: 'Blocked',          value: overview.users.blocked,      tint: '#ef4444', sub: overview.users.blocked ? 'needs review' : 'all clear' },
    { icon: <LayoutDashboard size={18} />, label: 'Dashboards',       value: overview.content.dashboards, tint: '#f59e0b', sub: `${overview.content.projects} projects` },
    { icon: <FileText size={18} />,        label: 'Documents & reports', value: overview.content.documents + overview.content.reports, tint: '#6366f1', sub: `${overview.content.reports} reports` },
    { icon: <LogIn size={18} />,           label: 'Logins (24h)',     value: overview.activity.logins_24h, tint: '#0ea5e9', sub: `${overview.activity.active_sessions} active sessions` },
  ];

  return (
    <div className="admin-panel">
      <header className="admin-head">
        <div>
          <h1 className="admin-title"><ShieldCheck size={22} /> Admin Control</h1>
          <p className="admin-sub">Users, usage, activity and account controls.</p>
        </div>
        <button className="admin-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </header>

      {/* Stat cards */}
      <div className="admin-stats">
        {(stats || Array.from({ length: 6 })).map((s: any, i) => (
          <div className="admin-stat" key={i} style={s ? ({ ['--stat-tint' as any]: s.tint }) : undefined}>
            {s ? (
              <>
                <div className="admin-stat-icon">{s.icon}</div>
                <div className="admin-stat-body">
                  <span className="admin-stat-value">{s.value}</span>
                  <span className="admin-stat-label">{s.label}</span>
                  <span className="admin-stat-sub">{s.sub}</span>
                </div>
              </>
            ) : <div className="admin-skeleton" />}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          <Users size={15} /> Users {overview && <span className="admin-tab-count">{overview.users.total}</span>}
        </button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          <Activity size={15} /> Activity {events.length > 0 && <span className="admin-tab-count">{events.length}</span>}
        </button>
      </div>

      {tab === 'users' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={15} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…" />
            </div>
            <span className="admin-toolbar-count">{filtered.length} of {users.length}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th><th>Status</th><th className="num">Projects</th><th className="num">Dashboards</th>
                  <th className="num">Docs</th><th className="num">Reports</th><th className="num">Credits</th>
                  <th className="num">Sessions</th><th>Last active</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 && (
                  <tr><td colSpan={11} className="admin-empty-row"><Loader2 size={18} className="spin" /> Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={11} className="admin-empty-row">No users match “{q}”.</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className={u.is_active ? '' : 'row-blocked'}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar" style={{ background: u.is_superuser ? '#dc2626' : '#6366f1' }}>
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <div className="admin-user-meta">
                          <span className="admin-user-name">
                            {u.username}
                            {u.is_superuser && <span className="admin-badge admin-badge-super"><KeyRound size={10} /> Admin</span>}
                          </span>
                          <span className="admin-user-email">{u.email || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.is_active
                        ? <span className="admin-status ok">Active</span>
                        : <span className="admin-status blocked"><Ban size={11} /> Blocked</span>}
                    </td>
                    <td className="num">{u.usage.projects}</td>
                    <td className="num">{u.usage.dashboards}</td>
                    <td className="num">{u.usage.documents}</td>
                    <td className="num">{u.usage.reports}</td>
                    <td className="num">{u.usage.is_unlimited ? '∞' : u.usage.credits_used}</td>
                    <td className="num">
                      {u.usage.active_sessions > 0
                        ? <span className="admin-sessions"><MonitorSmartphone size={12} /> {u.usage.active_sessions}</span>
                        : <span className="admin-muted">0</span>}
                    </td>
                    <td title={u.last_login || ''}>{relative(u.last_login)}</td>
                    <td>{fmtDate(u.date_joined)}</td>
                    <td className="admin-action-cell">
                      {u.is_superuser ? (
                        <span className="admin-muted" title="Administrators cannot be blocked">—</span>
                      ) : (
                        <button
                          className={`admin-block-btn ${u.is_active ? 'block' : 'unblock'}`}
                          onClick={() => toggleBlock(u)}
                          disabled={busyId === u.id}
                        >
                          {busyId === u.id ? <Loader2 size={13} className="spin" />
                            : u.is_active ? <><Ban size={13} /> Block</> : <><UserPlus size={13} /> Unblock</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <span className="admin-toolbar-title"><Activity size={15} /> Recent activity</span>
            <span className="admin-toolbar-count">{events.length} events</span>
          </div>
          <div className="admin-audit">
            {loading && events.length === 0 && (
              <div className="admin-empty-row"><Loader2 size={18} className="spin" /> Loading…</div>
            )}
            {!loading && events.length === 0 && (
              <div className="admin-empty-row">No activity recorded yet.</div>
            )}
            {events.map(e => {
              const meta = EVENT_META[e.event] || { label: e.event, cls: 'ae-neutral' };
              return (
                <div className="admin-audit-row" key={e.id}>
                  <span className={`admin-event-badge ${meta.cls}`}>{meta.label}</span>
                  <span className="admin-audit-user">{e.username || 'unknown'}</span>
                  <span className="admin-audit-detail">
                    {e.actor && e.actor !== e.username ? `by ${e.actor}` : ''}
                    {e.ip ? <span className="admin-audit-ip">{e.ip}</span> : null}
                  </span>
                  <span className="admin-audit-time" title={fmtDateTime(e.created_at)}>{relative(e.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
