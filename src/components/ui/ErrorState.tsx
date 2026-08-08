/**
 * ErrorState — when a list / page / panel FAILED to load (vs. EmptyState
 * which is "this loaded fine, there's just nothing here yet").
 *
 * Use this in error boundaries and catch blocks instead of a red alert bar.
 * A real error state explains what happened and gives the user one or two
 * concrete actions — retry, go back, contact support.
 *
 * Usage — generic:
 *   <ErrorState onRetry={refetch} />
 *
 * Usage — specific (recommended):
 *   <ErrorState
 *     title="Couldn't load datasources"
 *     subtitle="Check your connection and try again."
 *     onRetry={refetch}
 *   />
 *
 * Usage — with a custom action:
 *   <ErrorState
 *     title="This datasource is unreachable"
 *     subtitle="Database returned: ECONNREFUSED 127.0.0.1:5432"
 *     actions={<Button onClick={openSettings}>Edit connection</Button>}
 *   />
 *
 * Variants:
 *   severity="default"  — neutral icon
 *   severity="danger"   — red ring (use for hard failures)
 *   severity="warning"  — amber ring (use for partial/recoverable failures)
 */

import React from 'react';
import { AlertTriangle, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './Button';

type Severity = 'default' | 'danger' | 'warning';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

const SEVERITY_ICON: Record<Severity, React.ReactNode> = {
  default: <AlertCircle size={26}/>,
  danger:  <AlertTriangle size={26}/>,
  warning: <AlertTriangle size={26}/>,
};

export function ErrorState({
  icon, title, subtitle, severity = 'default', compact = false,
  onRetry, retryLabel = 'Try again',
  actions, className,
}: {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  severity?: Severity;
  compact?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const renderedIcon = icon ?? SEVERITY_ICON[severity];
  return (
    <div className={joinClasses('ui-empty', `ui-error--${severity}`, compact && 'ui-empty--compact', className)}
         style={compact ? { padding: 'var(--space-6) var(--space-4)' } : undefined}>
      <div className={`ui-empty__icon ui-error__icon--${severity}`}>{renderedIcon}</div>
      <h3 className="ui-empty__title">{title ?? 'Something went wrong'}</h3>
      <p className="ui-empty__subtitle">
        {subtitle ?? 'Please try again. If the problem persists, contact support.'}
      </p>
      {(onRetry || actions) && (
        <div className="ui-empty__actions">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry} leading={<RefreshCw size={14}/>}>
              {retryLabel}
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

/** Drop-in for network-failure context — pre-fills sensible copy. */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      severity="warning"
      icon={<WifiOff size={26}/>}
      title="Connection problem"
      subtitle="Check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}
