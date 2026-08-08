/**
 * Spinner — small, consistent loading spinner.
 *
 * USE FOR:
 *   - In-place loading on a single action ("Saving…", "Connecting…")
 *   - Buttons in flight (the <Button loading> prop already wraps this)
 *   - Tiny inline indicators next to a status row
 *
 * DON'T USE FOR:
 *   - Content area loads — use <SkeletonCard>/<Skeleton> instead so the
 *     final layout's footprint is visible while loading
 *   - Full-page loads — use a centered <PageLoader> (also exported below)
 *
 * Why a thin wrapper around Loader2: it keeps the size, color, and
 * animation duration consistent across every call site, and lets us swap
 * the underlying icon later without touching every component.
 */

import { Loader2 } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<Size, number> = { sm: 14, md: 18, lg: 22 };

export function Spinner({
  size = 'md', color, label, className,
}: {
  size?: Size;
  color?: string;
  /** Accessible label for screen readers. Defaults to "Loading". */
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', color }}
    >
      <Loader2
        size={SIZE_PX[size]}
        className="ui-spinner"
        aria-hidden="true"
      />
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  );
}

/**
 * Centered full-region loader for a panel or page. Use sparingly — prefer
 * skeleton screens for content loads.
 */
export function PageLoader({
  label = 'Loading', className,
}: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-12) var(--space-4)',
        color: 'var(--text-tertiary)',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <Loader2 size={22} className="ui-spinner" aria-hidden="true"/>
      <span>{label}</span>
    </div>
  );
}
