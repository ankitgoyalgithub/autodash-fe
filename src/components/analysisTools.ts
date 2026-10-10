/**
 * analysisTools — types + catalogue helpers for the analysis job API
 * (GET /api/tools/, POST /api/tools/jobs/, GET /api/tools/jobs/<id>/).
 * Kept separate from AnalysisPanel.tsx so that file only exports a component.
 */

import axios from 'axios';
import { BASE } from './constants';

// ── Types (mirror api/tool_views.py) ─────────────────────────────────────────

export interface ToolParam {
  id: string;
  label: string;
  type: 'number' | 'select' | 'text';
  options?: string[];
  default?: string | number;
  hint?: string;
}

export interface ToolSpec {
  name: string;
  label: string;
  description: string;
  estimated_minutes?: number;
  version?: string;
  params: ToolParam[];
}

export type ToolJobStatus = 'queued' | 'running' | 'ready' | 'error' | 'stale';

export interface ToolJob {
  id: number;
  tool: string;
  status: ToolJobStatus;
  stage: string;
  progress: number;
  params?: Record<string, any>;
  error?: string;
  dashboard_id: number | null;
  thread_id: number | null;
  report_id: number | null;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  result_summary?: {
    scalars?: Record<string, any>;
    warnings?: string[];
    assumptions?: any[];
    inputs_wanted?: any[];
  };
}

/** Tools whose output is a decomposition only — no slide deck is built. */
export const NO_DECK_TOOLS = new Set(['distribution_velocity']);

/** What the tool's `make_deck` output is called in the UI (eda_profile builds an EDA report, not slides). */
export const deckOutputLabel = (tool?: string | null): string =>
  tool === 'eda_profile' ? 'EDA report' : 'slide deck';

/** Fetch the tool catalogue once per session (shared by Workspace chips too). */
let _toolsCache: ToolSpec[] | null = null;
let _toolsInflight: Promise<ToolSpec[]> | null = null;
export async function fetchTools(force = false): Promise<ToolSpec[]> {
  if (_toolsCache && !force) return _toolsCache;
  if (_toolsInflight && !force) return _toolsInflight;
  _toolsInflight = axios.get(`${BASE}/tools/`)
    .then(r => {
      _toolsCache = (r.data?.tools || []) as ToolSpec[];
      return _toolsCache;
    })
    .finally(() => { _toolsInflight = null; });
  return _toolsInflight;
}

/** Human label for a tool name, with a readable fallback when the catalogue is unknown. */
export function toolLabel(name: string, tools?: ToolSpec[] | null): string {
  const hit = tools?.find(t => t.name === name);
  if (hit) return hit.label;
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

