/**
 * CreditsPanel — credit usage tracker shown in the sidebar + expandable modal
 * with transaction history.
 */

import { useState } from 'react';
import {
  Coins, X, ChevronRight, AlertTriangle, Zap, TrendingUp,
  Clock, BarChart2, Sparkles, FileText, Gift, CreditCard, RefreshCw,
} from 'lucide-react';
import { useCredits, useCreditTransactions, type CreditBalance } from '../hooks/useCredits';

// ── Tx type icons / labels ───────────────────────────────────────────────────

const TX_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  query:       { icon: <BarChart2 size={12} />,  label: 'Dashboard',   color: '#6366f1' },
  infographic: { icon: <Sparkles size={12} />,   label: 'Infographic', color: '#8b5cf6' },
  refund:      { icon: <RefreshCw size={12} />,  label: 'Refund',      color: '#10b981' },
  bonus:       { icon: <Gift size={12} />,       label: 'Bonus',       color: '#f59e0b' },
  topup:       { icon: <CreditCard size={12} />, label: 'Top-up',      color: '#3b82f6' },
};

// ── Credits badge in sidebar ─────────────────────────────────────────────────

export function CreditsBadge({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { balance } = useCredits();

  if (balance.is_unlimited) return null;

  const pct = balance.usage_pct;
  const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1';

  return (
    <button className="credits-badge" onClick={onClick} title={`${balance.credits_remaining} credits remaining`}>
      <Coins size={14} style={{ color: barColor, flexShrink: 0 }} />
      {!collapsed && (
        <div className="credits-badge-info">
          <div className="credits-badge-row">
            <span className="credits-badge-label">Credits</span>
            <span className="credits-badge-count" style={{ color: barColor }}>
              {balance.credits_remaining.toFixed(0)}/{balance.credit_limit.toFixed(0)}
            </span>
          </div>
          <div className="credits-bar-track">
            <div
              className="credits-bar-fill"
              style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

// ── Warning banner (shown at top of workspace) ───────────────────────────────

export function CreditsWarningBanner({ warning, onDismiss }: {
  warning: 'near_limit' | 'at_limit' | null;
  onDismiss: () => void;
}) {
  if (!warning) return null;

  const isAtLimit = warning === 'at_limit';

  return (
    <div className={`credits-warning ${isAtLimit ? 'credits-warning--critical' : 'credits-warning--warn'}`}>
      <AlertTriangle size={14} />
      <span>
        {isAtLimit
          ? 'You have reached your free credit limit. Contact admin for more credits.'
          : 'You are running low on credits. Consider managing your usage.'}
      </span>
      <button className="credits-warning-close" onClick={onDismiss}><X size={12} /></button>
    </div>
  );
}

// ── Full credits modal with balance + transaction history ────────────────────

export function CreditsModal({ onClose }: { onClose: () => void }) {
  const { balance, refresh } = useCredits();
  const [page, setPage] = useState(1);
  const { transactions, total, loading: txLoading } = useCreditTransactions(page);

  const pct = balance.usage_pct;
  const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1';
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <div className="credits-overlay" onClick={onClose} />
      <div className="credits-modal">
        {/* Header */}
        <div className="credits-modal-head">
          <div className="credits-modal-title">
            <Coins size={18} />
            <span>Credit Usage</span>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Balance card */}
        <div className="credits-balance-card">
          {balance.is_unlimited ? (
            <div className="credits-unlimited">
              <Zap size={20} />
              <span>Unlimited Plan</span>
            </div>
          ) : (
            <>
              <div className="credits-balance-grid">
                <div className="credits-stat">
                  <div className="credits-stat-value" style={{ color: barColor }}>
                    {balance.credits_remaining.toFixed(1)}
                  </div>
                  <div className="credits-stat-label">Remaining</div>
                </div>
                <div className="credits-stat">
                  <div className="credits-stat-value">{balance.credits_used.toFixed(1)}</div>
                  <div className="credits-stat-label">Used</div>
                </div>
                <div className="credits-stat">
                  <div className="credits-stat-value">{balance.credit_limit.toFixed(0)}</div>
                  <div className="credits-stat-label">Total Limit</div>
                </div>
                <div className="credits-stat">
                  <div className="credits-stat-value">${balance.usd_used.toFixed(2)}</div>
                  <div className="credits-stat-label">of ${balance.usd_limit.toFixed(2)}</div>
                </div>
              </div>

              <div className="credits-bar-large-track">
                <div
                  className="credits-bar-large-fill"
                  style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                />
              </div>
              <div className="credits-bar-label">
                {pct.toFixed(1)}% used
                {balance.at_limit && <span className="credits-at-limit-tag">Limit reached</span>}
                {!balance.at_limit && balance.near_limit && <span className="credits-near-limit-tag">Running low</span>}
              </div>

              <div className="credits-pricing-note">
                <Coins size={11} /> 1 credit = $0.25 &middot; Each query or infographic = 1 credit
              </div>
            </>
          )}
        </div>

        {/* Transaction history */}
        <div className="credits-txn-section">
          <div className="credits-txn-header">
            <Clock size={14} />
            <span>Transaction History</span>
            <span className="credits-txn-count">{total} total</span>
          </div>

          {txLoading ? (
            <div className="credits-txn-loading">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="credits-txn-empty">No transactions yet. Start querying to see usage here.</div>
          ) : (
            <div className="credits-txn-list">
              {transactions.map(tx => {
                const meta = TX_META[tx.tx_type] || TX_META.query;
                const isDebit = tx.amount > 0;
                return (
                  <div key={tx.id} className="credits-txn-row">
                    <div className="credits-txn-icon" style={{ background: meta.color + '15', color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="credits-txn-info">
                      <div className="credits-txn-desc">{tx.description || meta.label}</div>
                      <div className="credits-txn-time">
                        {new Date(tx.created_at).toLocaleDateString()} &middot; {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className={`credits-txn-amount ${isDebit ? 'debit' : 'credit'}`}>
                      {isDebit ? '-' : '+'}{Math.abs(tx.amount).toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="credits-txn-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
