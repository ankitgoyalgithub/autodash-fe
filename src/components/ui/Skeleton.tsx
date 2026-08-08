/**
 * Skeleton — animated placeholder that matches the final layout's footprint.
 *
 * Always prefer skeleton screens over spinners for content loads — they
 * reduce perceived latency by hinting at what's coming. Reserve spinners
 * for in-place actions ("Saving…").
 *
 * Usage — primitives:
 *   <Skeleton width={120} height={14} />                 // single bar
 *   <Skeleton circle size={32} />                        // circle (avatar)
 *
 * Usage — composed:
 *   <SkeletonText lines={3} />                           // paragraph
 *   <SkeletonCard />                                     // a card-shaped block
 */

import React from 'react';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Skeleton({
  width, height, circle = false, size, radius, className, style,
}: {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  size?: number;          // shortcut: sets width + height equal (good for circles)
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const w = size ?? width;
  const h = size ?? height;
  return (
    <span
      className={joinClasses('ui-skeleton', className)}
      style={{
        width: w, height: h,
        borderRadius: circle ? '50%' : radius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  lines = 3, width, className,
}: {
  lines?: number;
  width?: (number | string)[];  // per-line widths; loops if shorter than `lines`
  className?: string;
}) {
  const widths = width ?? ['100%', '92%', '78%'];
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

export function SkeletonCard({
  withMedia = true, className,
}: { withMedia?: boolean; className?: string }) {
  return (
    <div
      className={joinClasses('ui-card', className)}
      style={{ padding: 0 }}
    >
      {withMedia && <Skeleton height={140} radius={0} />}
      <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width="65%" height={14} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}
