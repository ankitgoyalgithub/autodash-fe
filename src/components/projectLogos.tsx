/**
 * Custom-designed project logos. 50 elegant single-color marks used in
 * place of unicode emoji throughout the project picker, sidebar, and
 * project cards.
 *
 * Design system:
 *   - 24×24 viewBox, stroke="currentColor", stroke-width=1.6, fill=none
 *   - Rounded line-caps and line-joins for a softer modern feel
 *   - Some marks layer a translucent filled accent over the stroke
 *   - All marks read cleanly at 18px (badges) and scale up to 56px (hero)
 *
 * Render via <ProjectLogo id="trend-line" size={32} color="#6366f1" />
 *
 * For backwards-compat with old projects that stored a unicode emoji,
 * <ProjectLogo emoji={p.emoji} /> falls back to rendering the emoji
 * if the value isn't a known logo id.
 */

import React from 'react';

type LogoSpec = {
  id: string;
  name: string;
  category: 'data' | 'business' | 'people' | 'ops' | 'marketing' | 'insight' | 'geo' | 'abstract';
  paths: React.ReactNode;
};

// ── Helpers — keep markup terse ───────────────────────────────────────────
const P = (props: React.SVGProps<SVGPathElement>) => (
  <path strokeLinecap="round" strokeLinejoin="round" {...props} />
);
const C = (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />;
const L = (props: React.SVGProps<SVGLineElement>) => (
  <line strokeLinecap="round" {...props} />
);
const R = (props: React.SVGProps<SVGRectElement>) => <rect {...props} />;
const FILL = 'currentColor';

// ── The 50 logos ──────────────────────────────────────────────────────────
export const PROJECT_LOGOS: LogoSpec[] = [
  // ── DATA / CHARTS (8) ───────────────────────────────────────────────
  { id: 'trend-line', name: 'Trend', category: 'data', paths: (
    <>
      <P d="M3 17l5-6 4 3 8-9" />
      <C cx="20" cy="5"  r="1.4" fill={FILL} stroke="none" />
      <C cx="3"  cy="17" r="1.4" fill={FILL} stroke="none" />
    </>
  )},
  { id: 'bar-rise', name: 'Bar Chart', category: 'data', paths: (
    <>
      <R x="3"  y="14" width="3.5" height="7" rx="1" />
      <R x="9"  y="9"  width="3.5" height="12" rx="1" />
      <R x="15" y="5"  width="3.5" height="16" rx="1" fill={FILL} fillOpacity="0.18" />
    </>
  )},
  { id: 'pie-slice', name: 'Pie', category: 'data', paths: (
    <>
      <P d="M12 3a9 9 0 1 0 9 9h-9z" />
      <P d="M12 3v9h9" fill={FILL} fillOpacity="0.18" />
    </>
  )},
  { id: 'area-curve', name: 'Area', category: 'data', paths: (
    <>
      <P d="M3 18l4-6 4 3 4-5 6 4v3z" fill={FILL} fillOpacity="0.18" />
      <P d="M3 18l4-6 4 3 4-5 6 4" />
    </>
  )},
  { id: 'scatter-cloud', name: 'Scatter', category: 'data', paths: (
    <>
      <C cx="5"  cy="18" r="1.4" fill={FILL} stroke="none" />
      <C cx="9"  cy="13" r="1.4" fill={FILL} stroke="none" />
      <C cx="13" cy="15" r="1.4" fill={FILL} stroke="none" />
      <C cx="16" cy="9"  r="1.4" fill={FILL} stroke="none" />
      <C cx="20" cy="6"  r="1.4" fill={FILL} stroke="none" />
      <C cx="11" cy="6"  r="1.4" fill={FILL} stroke="none" />
      <C cx="20" cy="14" r="1.4" fill={FILL} stroke="none" />
    </>
  )},
  { id: 'heatmap-grid', name: 'Heatmap', category: 'data', paths: (
    <>
      <R x="3"  y="3"  width="5" height="5" rx="1" fill={FILL} fillOpacity="0.15" />
      <R x="10" y="3"  width="5" height="5" rx="1" fill={FILL} fillOpacity="0.45" />
      <R x="17" y="3"  width="4" height="5" rx="1" fill={FILL} fillOpacity="0.85" />
      <R x="3"  y="10" width="5" height="5" rx="1" fill={FILL} fillOpacity="0.30" />
      <R x="10" y="10" width="5" height="5" rx="1" fill={FILL} fillOpacity="0.65" />
      <R x="17" y="10" width="4" height="5" rx="1" fill={FILL} fillOpacity="0.25" />
      <R x="3"  y="17" width="5" height="4" rx="1" fill={FILL} fillOpacity="0.55" />
      <R x="10" y="17" width="5" height="4" rx="1" fill={FILL} fillOpacity="0.15" />
      <R x="17" y="17" width="4" height="4" rx="1" fill={FILL} fillOpacity="0.40" />
    </>
  )},
  { id: 'funnel-flow', name: 'Funnel', category: 'data', paths: (
    <>
      <P d="M3 4h18l-7 8v7l-4 2v-9z" />
      <L x1="6" y1="8" x2="18" y2="8" opacity="0.5" />
    </>
  )},
  { id: 'spark-pulse', name: 'Pulse', category: 'data', paths: (
    <>
      <P d="M3 12h4l2-6 3 12 2-7 2 4 2-2h3" />
    </>
  )},

  // ── BUSINESS (6) ─────────────────────────────────────────────────────
  { id: 'briefcase', name: 'Briefcase', category: 'business', paths: (
    <>
      <R x="3" y="7" width="18" height="13" rx="2" />
      <P d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <L x1="3" y1="12" x2="21" y2="12" />
    </>
  )},
  { id: 'target-rings', name: 'Target', category: 'business', paths: (
    <>
      <C cx="12" cy="12" r="9" />
      <C cx="12" cy="12" r="5" />
      <C cx="12" cy="12" r="1.6" fill={FILL} stroke="none" />
    </>
  )},
  { id: 'trophy-rise', name: 'Trophy', category: 'business', paths: (
    <>
      <P d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <P d="M16 6h3v2a3 3 0 0 1-3 3" />
      <P d="M8 6H5v2a3 3 0 0 0 3 3" />
      <P d="M9 14h6l-1 4H10z" />
      <L x1="7" y1="20" x2="17" y2="20" />
    </>
  )},
  { id: 'wallet-card', name: 'Wallet', category: 'business', paths: (
    <>
      <R x="3" y="6" width="18" height="13" rx="2" />
      <P d="M3 10h18" />
      <C cx="17" cy="14" r="1.4" fill={FILL} stroke="none" />
    </>
  )},
  { id: 'growth-arrow', name: 'Growth', category: 'business', paths: (
    <>
      <P d="M3 20l7-7 4 4 7-11" />
      <P d="M14 6h7v7" />
    </>
  )},
  { id: 'coin-stack', name: 'Revenue', category: 'business', paths: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <P d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <P d="M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
      <P d="M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
    </>
  )},

  // ── PEOPLE / CUSTOMERS (5) ──────────────────────────────────────────
  { id: 'user-circle', name: 'Customer', category: 'people', paths: (
    <>
      <C cx="12" cy="12" r="9" />
      <C cx="12" cy="10" r="3" />
      <P d="M6 19c1.5-3 3.5-4 6-4s4.5 1 6 4" />
    </>
  )},
  { id: 'team-trio', name: 'Team', category: 'people', paths: (
    <>
      <C cx="8"  cy="9" r="3" />
      <C cx="16" cy="9" r="3" />
      <C cx="12" cy="14" r="3" fill={FILL} fillOpacity="0.18" />
      <P d="M3 20c1-3 3-4.5 5-4.5" />
      <P d="M21 20c-1-3-3-4.5-5-4.5" />
      <P d="M7 20c1-2.5 3-3.5 5-3.5s4 1 5 3.5" />
    </>
  )},
  { id: 'network-nodes', name: 'Network', category: 'people', paths: (
    <>
      <C cx="5"  cy="6"  r="2" />
      <C cx="19" cy="6"  r="2" />
      <C cx="12" cy="12" r="2.4" fill={FILL} fillOpacity="0.2" />
      <C cx="5"  cy="18" r="2" />
      <C cx="19" cy="18" r="2" />
      <L x1="7"  y1="7"  x2="10.5" y2="11" />
      <L x1="17" y1="7"  x2="13.5" y2="11" />
      <L x1="10.5" y1="13" x2="7"  y2="17" />
      <L x1="13.5" y1="13" x2="17" y2="17" />
    </>
  )},
  { id: 'handshake', name: 'Partnership', category: 'people', paths: (
    <>
      <P d="M3 12l4-4 3 3 2-2 4 4-3 3-3-1-3 1z" />
      <P d="M11 9l2-2 3 1 3-1 2 2-5 5" />
    </>
  )},
  { id: 'avatar-grid', name: 'Audience', category: 'people', paths: (
    <>
      <C cx="7"  cy="7"  r="2.5" />
      <C cx="17" cy="7"  r="2.5" />
      <C cx="7"  cy="17" r="2.5" />
      <C cx="17" cy="17" r="2.5" fill={FILL} fillOpacity="0.18" />
    </>
  )},

  // ── OPERATIONS (5) ──────────────────────────────────────────────────
  { id: 'gear-cog', name: 'Operations', category: 'ops', paths: (
    <>
      <C cx="12" cy="12" r="3" />
      <P d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1" />
    </>
  )},
  { id: 'cube-package', name: 'Inventory', category: 'ops', paths: (
    <>
      <P d="M12 2l9 5v10l-9 5-9-5V7z" />
      <P d="M3 7l9 5 9-5" />
      <P d="M12 12v10" />
    </>
  )},
  { id: 'shield-check', name: 'Quality', category: 'ops', paths: (
    <>
      <P d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
      <P d="M9 12l2 2 4-5" />
    </>
  )},
  { id: 'flow-boxes', name: 'Pipeline', category: 'ops', paths: (
    <>
      <R x="3" y="9" width="6" height="6" rx="1" />
      <R x="15" y="9" width="6" height="6" rx="1" fill={FILL} fillOpacity="0.18" />
      <L x1="9" y1="12" x2="15" y2="12" />
      <P d="M13 10l2 2-2 2" />
    </>
  )},
  { id: 'workflow-cycle', name: 'Workflow', category: 'ops', paths: (
    <>
      <P d="M20 12a8 8 0 1 1-3-6.2" />
      <P d="M20 4v5h-5" />
    </>
  )},

  // ── MARKETING (5) ────────────────────────────────────────────────────
  { id: 'megaphone', name: 'Marketing', category: 'marketing', paths: (
    <>
      <P d="M3 11v2l11 5V6z" />
      <P d="M14 8c2 0 4 1.5 4 4s-2 4-4 4" />
      <L x1="6" y1="14" x2="6" y2="19" />
    </>
  )},
  { id: 'bullseye-arrow', name: 'Targeting', category: 'marketing', paths: (
    <>
      <C cx="11" cy="13" r="7" />
      <C cx="11" cy="13" r="3.5" />
      <P d="M14 10l7-7M16 3h5v5" />
    </>
  )},
  { id: 'rocket-launch', name: 'Launch', category: 'marketing', paths: (
    <>
      <P d="M14 4l6 6-7 9-3-1-1-3z" />
      <C cx="15.5" cy="8.5" r="1.4" />
      <P d="M5 19c1-3 3-3 4-2" />
    </>
  )},
  { id: 'lightning-bolt', name: 'Energy', category: 'marketing', paths: (
    <>
      <P d="M13 2L4 14h7l-1 8 9-12h-7z" fill={FILL} fillOpacity="0.18" />
    </>
  )},
  { id: 'paper-plane', name: 'Send', category: 'marketing', paths: (
    <>
      <P d="M3 11L21 3l-7 18-3-7z" />
      <P d="M11 14L21 3" />
    </>
  )},

  // ── INSIGHT / KNOWLEDGE (6) ──────────────────────────────────────────
  { id: 'lightbulb', name: 'Insight', category: 'insight', paths: (
    <>
      <P d="M9 18h6" />
      <L x1="10" y1="21" x2="14" y2="21" />
      <P d="M12 3a6 6 0 0 0-4 10c1 1 2 2 2 4h4c0-2 1-3 2-4a6 6 0 0 0-4-10z" />
    </>
  )},
  { id: 'magnifier', name: 'Research', category: 'insight', paths: (
    <>
      <C cx="11" cy="11" r="7" />
      <L x1="20" y1="20" x2="16" y2="16" />
    </>
  )},
  { id: 'brain-circuit', name: 'AI', category: 'insight', paths: (
    <>
      <P d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3v2a3 3 0 0 0 2 3v1a3 3 0 0 0 3 3" />
      <P d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3v2a3 3 0 0 1-2 3v1a3 3 0 0 1-3 3" />
      <L x1="12" y1="4" x2="12" y2="20" opacity="0.4" />
      <C cx="9" cy="9" r="1" fill={FILL} stroke="none" />
      <C cx="15" cy="15" r="1" fill={FILL} stroke="none" />
    </>
  )},
  { id: 'atom-orbit', name: 'Science', category: 'insight', paths: (
    <>
      <C cx="12" cy="12" r="1.4" fill={FILL} stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" />
    </>
  )},
  { id: 'book-open', name: 'Knowledge', category: 'insight', paths: (
    <>
      <P d="M3 5c4 0 7 1 9 3 2-2 5-3 9-3v13c-4 0-7 1-9 3-2-2-5-3-9-3z" />
      <L x1="12" y1="8" x2="12" y2="21" opacity="0.4" />
    </>
  )},
  { id: 'compass', name: 'Direction', category: 'insight', paths: (
    <>
      <C cx="12" cy="12" r="9" />
      <P d="M15 9l-2 6-4 2 2-6z" fill={FILL} fillOpacity="0.2" />
    </>
  )},

  // ── GEO / GLOBAL (3) ────────────────────────────────────────────────
  { id: 'globe-grid', name: 'Global', category: 'geo', paths: (
    <>
      <C cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <L x1="3" y1="12" x2="21" y2="12" />
    </>
  )},
  { id: 'pin-drop', name: 'Location', category: 'geo', paths: (
    <>
      <P d="M12 21c-4-5-7-9-7-12a7 7 0 0 1 14 0c0 3-3 7-7 12z" />
      <C cx="12" cy="9" r="2.4" />
    </>
  )},
  { id: 'map-folded', name: 'Region', category: 'geo', paths: (
    <>
      <P d="M3 6l5-2 8 4 5-2v14l-5 2-8-4-5 2z" />
      <L x1="8"  y1="4"  x2="8"  y2="18" />
      <L x1="16" y1="8" x2="16" y2="22" />
    </>
  )},

  // ── ABSTRACT / NATURE (8) ───────────────────────────────────────────
  { id: 'leaf-fresh', name: 'Organic', category: 'abstract', paths: (
    <>
      <P d="M4 20c0-10 6-16 16-16 0 10-6 16-16 16z" />
      <P d="M4 20c4-4 8-8 12-12" opacity="0.5" />
    </>
  )},
  { id: 'flame-spark', name: 'Hot', category: 'abstract', paths: (
    <>
      <P d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-3-1 3 0 5 2 4 0-3-2-6 1-12z" />
    </>
  )},
  { id: 'crystal-gem', name: 'Premium', category: 'abstract', paths: (
    <>
      <P d="M6 3h12l3 6-9 12L3 9z" />
      <P d="M9 3l3 6 3-6" />
      <P d="M3 9h18" />
      <P d="M6 3l6 18 6-18" opacity="0.4" />
    </>
  )},
  { id: 'hexagon-tile', name: 'Module', category: 'abstract', paths: (
    <>
      <P d="M12 2l8.7 5v10L12 22 3.3 17V7z" />
      <P d="M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z" fill={FILL} fillOpacity="0.18" />
    </>
  )},
  { id: 'infinity-loop', name: 'Loop', category: 'abstract', paths: (
    <>
      <P d="M7 12a4 4 0 1 0 4-4l4 4a4 4 0 1 0-4 4l-4-4z" />
    </>
  )},
  { id: 'wave-flow', name: 'Flow', category: 'abstract', paths: (
    <>
      <P d="M3 8c3 0 3 4 6 4s3-4 6-4 3 4 6 4" />
      <P d="M3 16c3 0 3-4 6-4s3 4 6 4 3-4 6-4" opacity="0.55" />
    </>
  )},
  { id: 'star-burst', name: 'Star', category: 'abstract', paths: (
    <>
      <P d="M12 2l2.6 6.8L22 9.5l-5.5 4.5L18 22l-6-4-6 4 1.5-8L2 9.5l7.4-.7z" />
    </>
  )},
  { id: 'sun-rays', name: 'Bright', category: 'abstract', paths: (
    <>
      <C cx="12" cy="12" r="4" />
      <L x1="12" y1="2" x2="12" y2="5" />
      <L x1="12" y1="19" x2="12" y2="22" />
      <L x1="2" y1="12" x2="5" y2="12" />
      <L x1="19" y1="12" x2="22" y2="12" />
      <L x1="4.9" y1="4.9" x2="7" y2="7" />
      <L x1="17" y1="17" x2="19.1" y2="19.1" />
      <L x1="4.9" y1="19.1" x2="7" y2="17" />
      <L x1="17" y1="7" x2="19.1" y2="4.9" />
    </>
  )},

  // ── EXTRAS — TECHNICAL / IDENTITY (4) ───────────────────────────────
  { id: 'database-stack', name: 'Database', category: 'data', paths: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="2.5" />
      <P d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5" />
      <P d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6" />
    </>
  )},
  { id: 'cloud-arrow', name: 'Cloud', category: 'ops', paths: (
    <>
      <P d="M6 17a4 4 0 0 1 .5-7.95 6 6 0 0 1 11.5 1.95 3.5 3.5 0 0 1 0 7H7" />
      <P d="M12 11v6M9 14l3-3 3 3" />
    </>
  )},
  { id: 'key-shield', name: 'Security', category: 'ops', paths: (
    <>
      <P d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
      <C cx="12" cy="11" r="2.4" />
      <P d="M12 13.5v3" />
    </>
  )},
  { id: 'tag-label', name: 'Pricing', category: 'business', paths: (
    <>
      <P d="M3 12V4h8l10 10-8 8z" />
      <C cx="8" cy="8" r="1.6" fill={FILL} stroke="none" />
    </>
  )},
];


// ── Category color tints ──────────────────────────────────────────────────
// One muted tint per category. We use these for the colored-tile variant so
// the picker grid + project cards have visual rhythm without screaming.
// Each tint provides:
//   `bg`       — soft tinted background for the tile
//   `bgEnd`    — gradient endpoint (slightly darker, same hue)
//   `fg`       — icon stroke color (saturated, accessible on `bg`)
//   `border`   — subtle border for un-selected tiles

type Tint = { bg: string; bgEnd: string; fg: string; border: string };

const CATEGORY_TINTS: Record<LogoSpec['category'], Tint> = {
  data:       { bg: '#eef2ff', bgEnd: '#e0e7ff', fg: '#4f46e5', border: '#c7d2fe' },
  business:   { bg: '#ecfdf5', bgEnd: '#d1fae5', fg: '#059669', border: '#a7f3d0' },
  people:     { bg: '#f5f3ff', bgEnd: '#ede9fe', fg: '#7c3aed', border: '#ddd6fe' },
  ops:        { bg: '#f1f5f9', bgEnd: '#e2e8f0', fg: '#475569', border: '#cbd5e1' },
  marketing:  { bg: '#fff1f2', bgEnd: '#ffe4e6', fg: '#e11d48', border: '#fecdd3' },
  insight:    { bg: '#fffbeb', bgEnd: '#fef3c7', fg: '#d97706', border: '#fde68a' },
  geo:        { bg: '#ecfeff', bgEnd: '#cffafe', fg: '#0891b2', border: '#a5f3fc' },
  abstract:   { bg: '#fdf4ff', bgEnd: '#fae8ff', fg: '#a21caf', border: '#f5d0fe' },
};

const DEFAULT_TINT: Tint = CATEGORY_TINTS.data;

function tintForLogo(id?: string): Tint {
  if (!id) return DEFAULT_TINT;
  const spec = BY_ID.get(id);
  return spec ? CATEGORY_TINTS[spec.category] : DEFAULT_TINT;
}

/** Public — for thumbnails, banners, anywhere the project's logo color matters. */
export function logoColorFor(id?: string | null): { bg: string; bgEnd: string; fg: string } {
  const t = tintForLogo(id || undefined);
  return { bg: t.bg, bgEnd: t.bgEnd, fg: t.fg };
}


// ── Public API ────────────────────────────────────────────────────────────

export const LOGO_IDS = PROJECT_LOGOS.map(l => l.id);
export const DEFAULT_LOGO_ID = 'trend-line';

const BY_ID = new Map(PROJECT_LOGOS.map(l => [l.id, l]));

/**
 * Render a project logo by id. Falls back to rendering `emoji` verbatim
 * if the value isn't a known logo id — preserves legacy projects whose
 * `emoji` field still contains a unicode character.
 */
export function ProjectLogo({
  id, emoji, size = 22, color, className = '',
}: {
  id?: string;
  emoji?: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const key = id || emoji || DEFAULT_LOGO_ID;
  const spec = BY_ID.get(key);
  if (!spec) {
    // Legacy unicode emoji or unknown id — fall back to text rendering
    return (
      <span className={className} style={{
        fontSize: size, lineHeight: 1, color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{emoji || key}</span>
    );
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color || 'currentColor'} strokeWidth="1.6"
      className={className}
      style={{ color: color || 'currentColor', flexShrink: 0 }}
    >
      {spec.paths}
    </svg>
  );
}

export function isLogoId(value: string | undefined | null): boolean {
  if (!value) return false;
  return BY_ID.has(value);
}


/**
 * Logo rendered on a colored gradient tile. The category-mapped tint gives
 * the picker grid + project cards visual rhythm. Used wherever we'd otherwise
 * show a flat outline logo on a bare background.
 *
 * Props:
 *   id        — logo id; legacy unicode emoji still falls back to text
 *   size      — outer tile dimension in px
 *   selected  — adds a ring + lifts shadow; used by the picker
 *   accent    — optional override (when selected, paint with this color
 *               so picker selection reflects the user's project accent)
 *   rounded   — border-radius preset; "soft" for picker, "round" for badges
 */
export function ProjectLogoTile({
  id, emoji, size = 44, selected = false, accent, rounded = 'soft',
  className = '',
}: {
  id?: string;
  emoji?: string;
  size?: number;
  selected?: boolean;
  accent?: string;
  rounded?: 'soft' | 'round' | 'pill';
  className?: string;
}) {
  const key = id || emoji || DEFAULT_LOGO_ID;
  const tint = tintForLogo(key);
  const fg = selected && accent ? accent : tint.fg;
  const bg = selected && accent
    ? `linear-gradient(135deg, ${accent}1f 0%, ${accent}33 100%)`
    : `linear-gradient(135deg, ${tint.bg} 0%, ${tint.bgEnd} 100%)`;
  const borderRadius = rounded === 'round' ? '50%' : rounded === 'pill' ? size : Math.round(size * 0.28);
  const ring = selected
    ? `0 0 0 2px ${accent || tint.fg}, 0 4px 12px ${(accent || tint.fg)}20`
    : `inset 0 0 0 1px ${tint.border}`;
  const iconSize = Math.round(size * 0.55);

  return (
    <span
      className={className}
      style={{
        width: size, height: size, borderRadius,
        background: bg, boxShadow: ring,
        display: 'inline-grid', placeItems: 'center',
        color: fg, flexShrink: 0,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <ProjectLogo id={id} emoji={emoji} size={iconSize} color={fg} />
    </span>
  );
}
