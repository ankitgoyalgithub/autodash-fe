/**
 * dashboardStore.ts — Zustand store for the active dashboard session.
 *
 * Covers:
 *   - Active dashboard cards (with per-card mutations)
 *   - Layout mode and visual preferences
 *   - Global cross-chart filters and timeframe
 *   - Edit mode / drag mode flags
 *   - Undo / redo stack (Command pattern, max 50 snapshots)
 *   - Selected card ID (for future toolbar / inspector integration)
 */

import { create } from 'zustand';
import type { DashboardCard, DashboardFilter } from '../App';

// ─── Layout mode type ─────────────────────────────────────────────────────────

export type LayoutMode =
  | 'grid' | 'masonry' | 'single'
  | 'exec' | 'poster' | 'hub' | 'split'
  | 'magazine' | 'presentation';

// ─── Snapshot (undo / redo entry) ─────────────────────────────────────────────

export interface Snapshot {
  /** Immutable copy of cards at the time the snapshot was taken. */
  cards: DashboardCard[];
  /** Human-readable description for devtools. */
  label: string;
}

// ─── Active filter types ───────────────────────────────────────────────────────

export type GlobalFilters = Record<string, string | number | null>;

// ─── Store shape ──────────────────────────────────────────────────────────────

export interface DashboardState {
  // ── Core card list ──
  cards: DashboardCard[];
  /** Replace the entire card list (e.g. when a new query result arrives). */
  setCards: (cards: DashboardCard[], snapshotLabel?: string) => void;

  // ── Per-card mutations ──
  updateCard: (index: number, patch: Partial<DashboardCard>) => void;
  deleteCard: (index: number) => void;
  reorderCards: (oldIndex: number, newIndex: number) => void;

  // ── Layout mode ──
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;

  // ── Visual preferences ──
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  dragEnabled: boolean;
  setDragEnabled: (v: boolean) => void;

  // ── Selection ──
  selectedCardId: string | null;
  selectCard: (id: string | null) => void;

  // ── Filters ──
  globalFilters: GlobalFilters;
  setGlobalFilter: (column: string, value: string | number | null) => void;
  clearGlobalFilters: () => void;
  dashboardFilters: DashboardFilter[];
  setDashboardFilters: (filters: DashboardFilter[]) => void;
  timeframeFilter: number | null;   // days back; null = All Time
  setTimeframeFilter: (days: number | null) => void;

  // ── Undo / redo ──
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Push a snapshot for the current cards state before mutating. */
  _pushSnapshot: (label: string) => void;
}

const MAX_HISTORY = 50;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────

  cards: [],
  layout: 'grid',
  editMode: false,
  dragEnabled: true,
  selectedCardId: null,
  globalFilters: {},
  dashboardFilters: [],
  timeframeFilter: null,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  // ── Card list ─────────────────────────────────────────────────────────────

  setCards: (cards, snapshotLabel) => {
    const { _pushSnapshot } = get();
    if (snapshotLabel) _pushSnapshot(snapshotLabel);
    set({ cards, future: [] });
  },

  // ── Per-card mutations ────────────────────────────────────────────────────

  updateCard: (index, patch) => {
    const { cards, _pushSnapshot } = get();
    _pushSnapshot(`edit card ${index}`);
    const next = cards.map((c, i) => i === index ? { ...c, ...patch } : c);
    set({ cards: next, future: [] });
  },

  deleteCard: (index) => {
    const { cards, _pushSnapshot } = get();
    _pushSnapshot(`delete card ${index}`);
    set({ cards: cards.filter((_, i) => i !== index), future: [] });
  },

  reorderCards: (oldIndex, newIndex) => {
    const { cards, _pushSnapshot } = get();
    _pushSnapshot('reorder cards');
    const next = [...cards];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    set({ cards: next, future: [] });
  },

  // ── Layout / visual ───────────────────────────────────────────────────────

  setLayout: (layout) => set({ layout }),

  setEditMode: (editMode) => set({ editMode }),

  setDragEnabled: (dragEnabled) => set({ dragEnabled }),

  // ── Selection ─────────────────────────────────────────────────────────────

  selectCard: (selectedCardId) => set({ selectedCardId }),

  // ── Filters ───────────────────────────────────────────────────────────────

  setGlobalFilter: (column, value) =>
    set(s => ({ globalFilters: { ...s.globalFilters, [column]: value } })),

  clearGlobalFilters: () => set({ globalFilters: {} }),

  setDashboardFilters: (dashboardFilters) => set({ dashboardFilters }),

  setTimeframeFilter: (timeframeFilter) => set({ timeframeFilter }),

  // ── Undo / redo ───────────────────────────────────────────────────────────

  _pushSnapshot: (label) => {
    const { cards, past } = get();
    const snapshot: Snapshot = { cards: [...cards], label };
    const trimmed = past.length >= MAX_HISTORY ? past.slice(1) : past;
    set({ past: [...trimmed, snapshot], canUndo: true });
  },

  undo: () => {
    const { past, cards, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const newPast = past.slice(0, -1);
    set({
      cards: prev.cards,
      past: newPast,
      future: [{ cards: [...cards], label: 'redo point' }, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { future, cards, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      cards: next.cards,
      future: newFuture,
      past: [...past, { cards: [...cards], label: 'undo point' }],
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },
}));

// ─── Convenience selectors ────────────────────────────────────────────────────

/** Selector: filtered cards respecting global + timeframe filters. */
export function useFilteredCards() {
  return useDashboardStore(s => {
    if (Object.keys(s.globalFilters).length === 0 && s.timeframeFilter === null) {
      return s.cards;
    }
    return s.cards.map(card => {
      let data = card.data ?? [];

      // Timeframe filter — expects a date-like column named 'date', 'created_at', etc.
      if (s.timeframeFilter !== null && data.length > 0) {
        const cutoff = Date.now() - s.timeframeFilter * 86_400_000;
        const dateKey = Object.keys(data[0]).find(k =>
          /date|time|created|updated|timestamp/i.test(k)
        );
        if (dateKey) {
          data = data.filter(row => {
            const t = new Date(row[dateKey]).getTime();
            return isNaN(t) || t >= cutoff;
          });
        }
      }

      // Global column filters
      for (const [col, val] of Object.entries(s.globalFilters)) {
        if (val === null || val === undefined || val === '') continue;
        data = data.filter(row => String(row[col]) === String(val));
      }

      return data.length === card.data?.length ? card : { ...card, data };
    });
  });
}
