/**
 * LazyChart — viewport-aware chart wrapper.
 *
 * Only renders the actual chart when the container is within 200px of the
 * viewport (or closer). Off-screen cards show a lightweight skeleton that
 * occupies the same height, preventing layout jitter on scroll.
 *
 * Usage:
 *   <LazyChart height={280}>
 *     <MyExpensiveChart ... />
 *   </LazyChart>
 *
 * The component accepts an optional `skeletonType` hint so the skeleton shape
 * roughly matches what the real chart looks like, reducing layout shift.
 */

import { useRef, useEffect, useState, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkeletonType = 'bar' | 'line' | 'pie' | 'metric' | 'table' | 'default';

interface LazyChartProps {
  children: ReactNode;
  /** Approximate height of the chart in pixels — used to size the skeleton. */
  height?: number;
  skeletonType?: SkeletonType;
  /** Additional className forwarded to the wrapper div. */
  className?: string;
}

// ─── Intersection hook ────────────────────────────────────────────────────────

function useInView(ref: React.RefObject<Element | null>, rootMargin = '200px'): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver isn't available (old browsers / SSR) render immediately
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

// ─── Skeleton shapes ──────────────────────────────────────────────────────────

function BarSkeleton({ height }: { height: number }) {
  return (
    <div className="lazy-skeleton lazy-skeleton--bar" style={{ height }}>
      <div className="lazy-skeleton__label-row">
        <div className="lazy-skeleton__line" style={{ width: '40%', height: 10 }} />
      </div>
      <div className="lazy-skeleton__bars">
        {[55, 80, 45, 90, 65, 75, 50, 85].map((h, i) => (
          <div key={i} className="lazy-skeleton__bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function LineSkeleton({ height }: { height: number }) {
  return (
    <div className="lazy-skeleton lazy-skeleton--line" style={{ height }}>
      <div className="lazy-skeleton__line" style={{ width: '35%', height: 10, marginBottom: 16 }} />
      <svg width="100%" height={height - 40} viewBox={`0 0 200 ${height - 40}`} preserveAspectRatio="none">
        <polyline
          points="0,70 25,45 50,55 75,30 100,40 125,20 150,35 175,15 200,25"
          fill="none"
          stroke="var(--skeleton-shimmer, #e2e8f0)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function PieSkeleton({ height }: { height: number }) {
  return (
    <div className="lazy-skeleton lazy-skeleton--pie" style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div className="lazy-skeleton__line" style={{ width: '40%', height: 10, alignSelf: 'flex-start' }} />
      <div className="lazy-skeleton__circle" style={{ width: Math.min(height - 40, 140), height: Math.min(height - 40, 140) }} />
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="lazy-skeleton lazy-skeleton--metric" style={{ height: 80 }}>
      <div className="lazy-skeleton__line" style={{ width: '45%', height: 10, marginBottom: 10 }} />
      <div className="lazy-skeleton__line" style={{ width: '70%', height: 28 }} />
    </div>
  );
}

function TableSkeleton({ height }: { height: number }) {
  const rows = Math.max(2, Math.floor((height - 40) / 34));
  return (
    <div className="lazy-skeleton lazy-skeleton--table" style={{ height }}>
      <div className="lazy-skeleton__line" style={{ width: '100%', height: 14, marginBottom: 10, borderRadius: 4 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="lazy-skeleton__line" style={{ width: '100%', height: 10, marginBottom: 8, opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

function DefaultSkeleton({ height }: { height: number }) {
  return (
    <div className="lazy-skeleton" style={{ height }}>
      <div className="lazy-skeleton__line" style={{ width: '40%', height: 10, marginBottom: 16 }} />
      <div className="lazy-skeleton__block" style={{ flex: 1 }} />
    </div>
  );
}

function ChartSkeleton({ type, height }: { type: SkeletonType; height: number }) {
  if (type === 'bar')    return <BarSkeleton height={height} />;
  if (type === 'line')   return <LineSkeleton height={height} />;
  if (type === 'pie')    return <PieSkeleton height={height} />;
  if (type === 'metric') return <MetricSkeleton />;
  if (type === 'table')  return <TableSkeleton height={height} />;
  return <DefaultSkeleton height={height} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LazyChart({
  children,
  height = 280,
  skeletonType = 'default',
  className,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      {inView ? children : <ChartSkeleton type={skeletonType} height={height} />}
    </div>
  );
}

// ─── Skeleton CSS (injected once) ─────────────────────────────────────────────
// Exported so App.css can be kept as the single source; or import this component
// and the styles come from App.css (see below).

export const LAZY_CHART_CSS = `
.lazy-skeleton {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}
.lazy-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: lazy-shimmer 1.4s infinite linear;
}
@keyframes lazy-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
.lazy-skeleton__line {
  background: var(--skeleton-shimmer, #e2e8f0);
  border-radius: 4px;
  flex-shrink: 0;
}
.lazy-skeleton__block {
  background: var(--skeleton-shimmer, #e2e8f0);
  border-radius: 8px;
}
.lazy-skeleton__circle {
  background: var(--skeleton-shimmer, #e2e8f0);
  border-radius: 50%;
  flex-shrink: 0;
}
.lazy-skeleton__label-row { margin-bottom: 12px; }
.lazy-skeleton__bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  flex: 1;
}
.lazy-skeleton__bar {
  flex: 1;
  background: var(--skeleton-shimmer, #e2e8f0);
  border-radius: 3px 3px 0 0;
  min-width: 8px;
}
`;
