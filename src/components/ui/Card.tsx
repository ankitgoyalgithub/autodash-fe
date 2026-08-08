/**
 * Card — the surface primitive that every floating, framed UI region
 * should consume. Replaces ad-hoc divs that all reinvent border + radius
 * + shadow + padding.
 *
 * Usage:
 *   <Card>
 *     <Card.Header title="Revenue" subtitle="Last 30 days" />
 *     <Card.Body>...chart...</Card.Body>
 *     <Card.Footer>...actions...</Card.Footer>
 *   </Card>
 *
 *   <Card elevated>...</Card>          // higher shadow
 *   <Card variant="flush">...</Card>   // no border / no shadow (for inner use)
 *   <Card variant="inset">...</Card>   // tinted background
 */

import React from 'react';

type Variant = 'default' | 'flush' | 'inset';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  variant = 'default',
  elevated = false,
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  elevated?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={joinClasses(
        'ui-card',
        variant !== 'default' && `ui-card--${variant}`,
        elevated && 'ui-card--elevated',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({
  title, subtitle, actions, className, children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={joinClasses('ui-card__header', className)}>
      {children ?? (
        <>
          <div>
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <div className="ui-card__subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="ui-card__actions">{actions}</div>}
        </>
      )}
    </div>
  );
};

Card.Body = function CardBody({
  flush = false, className, children,
}: { flush?: boolean; className?: string; children?: React.ReactNode }) {
  return (
    <div className={joinClasses('ui-card__body', flush && 'ui-card__body--flush', className)}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({
  className, children,
}: { className?: string; children?: React.ReactNode }) {
  return <div className={joinClasses('ui-card__footer', className)}>{children}</div>;
};
