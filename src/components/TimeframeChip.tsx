/**
 * TimeframeChip — small pill next to the composer's send button that lets
 * users choose a timeframe BEFORE generating an infographic.
 *
 * UX:
 *   - Defaults to "Last 90 days" so a user can press Send and get something
 *     sensible without touching the chip
 *   - Click → dropdown with 6 presets + Custom
 *   - Custom opens an inline start/end date picker
 *   - The pill text always shows the current selection
 *
 * Emits `{preset, start?, end?}` via onChange — the same shape the backend
 * expects in /api/infographic/'s `time_range` field.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import './TimeframeChip.css';


export type TimeframePreset =
  | 'all_time'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export type TimeRangeValue = {
  preset: TimeframePreset;
  start?: string;   // ISO date (YYYY-MM-DD), only for `custom`
  end?: string;     // ISO date
};

export const DEFAULT_TIMEFRAME: TimeRangeValue = { preset: 'last_90_days' };

const PRESET_LABELS: Record<TimeframePreset, string> = {
  all_time:      'All time',
  last_7_days:   'Last 7 days',
  last_30_days:  'Last 30 days',
  last_90_days:  'Last 90 days',
  this_quarter:  'This quarter',
  this_year:     'This year',
  custom:        'Custom range',
};

const PRESET_ORDER: TimeframePreset[] = [
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'this_quarter',
  'this_year',
  'all_time',
  'custom',
];


/** Pretty-print the selection for the pill text. */
function describe(v: TimeRangeValue): string {
  if (v.preset === 'custom' && v.start && v.end) {
    return `${v.start} – ${v.end}`;
  }
  return PRESET_LABELS[v.preset] || 'Last 90 days';
}


export function TimeframeChip({
  value, onChange, disabled = false,
}: {
  value: TimeRangeValue;
  onChange: (v: TimeRangeValue) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Click outside to close — covers BOTH the chip and the portal-rendered menu
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

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Position the portal-rendered menu relative to the button. Recompute on
  // open + on window resize/scroll so it stays anchored even if the page
  // shifts under it.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) { setMenuPos(null); return; }
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 240;
      const menuHeight = menuRef.current?.offsetHeight ?? 320;
      // Prefer opening UPWARD (chip lives at top of composer). Fall back
      // downward if the menu would go off-screen above.
      const wantedTop = r.top - menuHeight - 6;
      const finalTop = wantedTop < 8 ? r.bottom + 6 : wantedTop;
      // Right-align the menu to the button so the corner stays anchored.
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

  const pickPreset = (p: TimeframePreset) => {
    if (p === 'custom') {
      // Don't close — let user fill the dates first. Pre-fill with sane defaults
      // (last 30 days) when transitioning into custom.
      const today = new Date();
      const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      onChange({
        preset: 'custom',
        start: value.start || fmt(start),
        end:   value.end   || fmt(today),
      });
      return;
    }
    onChange({ preset: p });
    setOpen(false);
  };

  const menu = open ? (
    <div
      ref={menuRef}
      className="tf-chip__menu"
      role="listbox"
      style={{
        position: 'fixed',
        top:  menuPos?.top  ?? -9999,
        left: menuPos?.left ?? -9999,
        visibility: menuPos ? 'visible' : 'hidden',
      }}
    >
      <div className="tf-chip__menu-label">Timeframe</div>
      {PRESET_ORDER.map(p => {
        const selected = value.preset === p;
        return (
          <button
            key={p}
            type="button"
            className={`tf-chip__opt ${selected ? 'tf-chip__opt--sel' : ''}`}
            onClick={() => pickPreset(p)}
            role="option"
            aria-selected={selected}
          >
            <span>{PRESET_LABELS[p]}</span>
            {selected && <Check size={13} />}
          </button>
        );
      })}

      {value.preset === 'custom' && (
        <div className="tf-chip__custom">
          <label className="tf-chip__custom-row">
            <span>From</span>
            <input
              type="date"
              value={value.start || ''}
              max={value.end}
              onChange={e => onChange({ ...value, preset: 'custom', start: e.target.value })}
            />
          </label>
          <label className="tf-chip__custom-row">
            <span>To</span>
            <input
              type="date"
              value={value.end || ''}
              min={value.start}
              onChange={e => onChange({ ...value, preset: 'custom', end: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="tf-chip__custom-apply"
            onClick={() => setOpen(false)}
            disabled={!value.start || !value.end}
          >Apply range</button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="tf-chip" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="tf-chip__btn"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Timeframe: ${describe(value)} (click to change)`}
      >
        <Calendar size={13} />
        <span className="tf-chip__label">{describe(value)}</span>
        <ChevronDown size={12} className="tf-chip__caret" />
      </button>

      {/* Portal the menu to body so .composer-box's overflow:hidden
          can't clip it. Positioning is computed in useLayoutEffect. */}
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
