/**
 * EmptyState — when a list / page / panel has nothing to show.
 *
 * Default to using this everywhere instead of a stub paragraph. Real
 * empty states make a product feel finished — they tell the user
 * "you're not broken, you just haven't done X yet" and offer the action.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Database size={26}/>}
 *     title="No datasources yet"
 *     subtitle="Connect a database to start asking questions about your data."
 *     actions={<Button onClick={openConnect}>Connect a database</Button>}
 *   />
 *
 * Compact variant for nested empty states (e.g. inside a card):
 *   <EmptyState compact title="No results" />
 */

import React from 'react';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function EmptyState({
  icon, title, subtitle, actions, compact = false, className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={joinClasses('ui-empty', compact && 'ui-empty--compact', className)}
         style={compact ? { padding: 'var(--space-6) var(--space-4)' } : undefined}>
      {icon && <div className="ui-empty__icon">{icon}</div>}
      <h3 className="ui-empty__title">{title}</h3>
      {subtitle && <p className="ui-empty__subtitle">{subtitle}</p>}
      {actions && <div className="ui-empty__actions">{actions}</div>}
    </div>
  );
}
