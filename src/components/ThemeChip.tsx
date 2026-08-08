/**
 * ThemeChip — visual-theme picker sitting next to TimeframeChip in the
 * infographic composer.
 *
 * UX:
 *   - Default value 'brand' — uses the user's Brand Kit (paints with their
 *     primary color, secondary, and fonts). When the user has no Brand Kit
 *     set, the backend gracefully falls back to 'editorial' — same visual
 *     output as if they'd picked editorial explicitly.
 *   - Click → dropdown listing all 5 themes with a tiny color preview each
 *   - Selected theme persists on the thread; subsequent prompts (without an
 *     explicit override) use the same theme
 *
 * Emits the theme ID via onChange — backend accepts one of
 *   'brand' | 'editorial' | 'executive' | 'vivid' | 'mono' | 'night'
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Palette } from 'lucide-react';
import './ThemeChip.css';


export type ThemeId = 'brand' | 'editorial' | 'executive' | 'vivid' | 'mono' | 'night';

export const DEFAULT_THEME: ThemeId = 'brand';


type ThemePreview = {
  id: ThemeId;
  label: string;
  description: string;
  // 3 swatches that capture the theme's vibe — accent / paper / ink
  swatches: [string, string, string];
};

const THEMES: ThemePreview[] = [
  {
    id: 'brand',
    label: 'Brand Kit',
    description: 'Uses your saved colors and fonts',
    swatches: ['#6366f1', '#ffffff', '#1e293b'],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Warm paper, serif headlines',
    swatches: ['#5b5bf0', '#f7f5f0', '#0e0e2e'],
  },
  {
    id: 'executive',
    label: 'Executive',
    description: 'Sober, restrained, boardroom-ready',
    swatches: ['#1e293b', '#ffffff', '#0f172a'],
  },
  {
    id: 'vivid',
    label: 'Vivid',
    description: 'Hot accents, social-media energy',
    swatches: ['#ec4899', '#fef7ff', '#1a0033'],
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'Black, white, mono-typed labels',
    swatches: ['#0a0a0a', '#ffffff', '#0a0a0a'],
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Dark canvas, indigo + sky accents, editorial after dark',
    swatches: ['#818CF8', '#0B0B14', '#F5F5EF'],
  },
];

const BY_ID: Record<ThemeId, ThemePreview> = THEMES.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {} as Record<ThemeId, ThemePreview>);


export function ThemeChip({
  value, onChange, disabled = false,
}: {
  value: ThemeId;
  onChange: (v: ThemeId) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Position the portal-rendered menu — same logic as TimeframeChip.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) { setMenuPos(null); return; }
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 300;
      const menuHeight = menuRef.current?.offsetHeight ?? 380;
      const wantedTop = r.top - menuHeight - 6;
      const finalTop = wantedTop < 8 ? r.bottom + 6 : wantedTop;
      const finalLeft = Math.max(8, r.right - menuWidth);
      setMenuPos({ top: finalTop, left: finalLeft });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const current = BY_ID[value] || BY_ID.brand;

  const menu = open ? (
    <div
      ref={menuRef}
      className="theme-chip__menu"
      role="listbox"
      style={{
        position: 'fixed',
        top:  menuPos?.top  ?? -9999,
        left: menuPos?.left ?? -9999,
        visibility: menuPos ? 'visible' : 'hidden',
      }}
    >
      <div className="theme-chip__menu-label">Visual theme</div>
      {THEMES.map(t => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={`theme-chip__opt ${selected ? 'theme-chip__opt--sel' : ''}`}
            onClick={() => { onChange(t.id); setOpen(false); }}
          >
            <span className="theme-chip__opt-swatches">
              <span style={{ background: t.swatches[0] }} />
              <span style={{ background: t.swatches[1] }} />
              <span style={{ background: t.swatches[2] }} />
            </span>
            <span className="theme-chip__opt-text">
              <span className="theme-chip__opt-label">{t.label}</span>
              <span className="theme-chip__opt-desc">{t.description}</span>
            </span>
            {selected && <Check size={13} className="theme-chip__opt-check"/>}
          </button>
        );
      })}
      <div className="theme-chip__menu-hint">
        Tip: type "improve the design" to cycle through themes.
      </div>
    </div>
  ) : null;

  return (
    <div className="theme-chip" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="theme-chip__btn"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Theme: ${current.label} (click to change)`}
      >
        <Palette size={13} />
        <span className="theme-chip__swatch" style={{ background: current.swatches[0] }} />
        <span className="theme-chip__label">{current.label}</span>
        <ChevronDown size={12} className="theme-chip__caret" />
      </button>

      {/* Portal the menu to body so .composer-box's overflow:hidden
          can't clip it. Positioning is computed in useLayoutEffect. */}
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
