/**
 * AnalysisPanel — "Analysis & Deck" flow.
 *
 *   1. GET  /tools/                       → tool cards
 *   2. POST /tools/<tool>/preflight/      → HITL form (parameters)
 *   3. POST /tools/jobs/                  → 202 { job }
 *   4. GET  /tools/jobs/<id>/ every 3 s   → stage + progress
 *   5. ready → onReady(job)  |  error → inline error
 *
 * The job runs server-side, so the panel can be closed at any time without
 * losing the run; the created dashboard / deck threads show up in the sidebar.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Clock, FlaskConical, Loader2, AlertCircle, CheckCircle2,
  LayoutDashboard, Presentation, RefreshCw,
} from 'lucide-react';
import { BASE } from './constants';
import { HITLCard, type HITLRequest } from './ui';
import { fetchTools, toolLabel, NO_DECK_TOOLS, type ToolSpec, type ToolJob } from './analysisTools';

// ── Component ─────────────────────────────────────────────────────────────────

const POLL_MS = 3000;

type Step = 'pick' | 'preflight' | 'running' | 'ready' | 'error';

export function AnalysisPanel({
  projectId,
  projectColor,
  preselectedTool,
  onReady,
  onOpenDashboard,
  onOpenDeck,
  onBack,
  compact,
}: {
  projectId: number;
  projectColor: string;
  /** Skip the tool picker and go straight to pre-flight for this tool. */
  preselectedTool?: string | null;
  /** Called once when the job reaches 'ready'. */
  onReady?: (job: ToolJob) => void;
  /** Open the dashboard thread the job created. */
  onOpenDashboard?: (job: ToolJob) => void;
  /** Open the slide deck report the job created. */
  onOpenDeck?: (job: ToolJob) => void;
  /** Back to the format picker (only shown on the first step). */
  onBack?: () => void;
  /** Tighter layout for use inside a modal. */
  compact?: boolean;
}) {
  const [tools, setTools] = useState<ToolSpec[] | null>(null);
  const [toolsError, setToolsError] = useState('');
  const [selected, setSelected] = useState<ToolSpec | null>(null);
  const [step, setStep] = useState<Step>('pick');
  const [preflight, setPreflight] = useState<HITLRequest | null>(null);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [job, setJob] = useState<ToolJob | null>(null);
  const [error, setError] = useState('');
  const readyFiredRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  // 1. Tool catalogue
  useEffect(() => {
    let alive = true;
    fetchTools()
      .then(list => { if (alive) setTools(list); })
      .catch(e => { if (alive) setToolsError(e?.response?.data?.error || 'Could not load the analysis tools.'); });
    return () => { alive = false; };
  }, []);

  // 2. Pre-flight for the chosen tool
  const startPreflight = useCallback(async (tool: ToolSpec) => {
    setSelected(tool);
    setError('');
    setPreflightBusy(true);
    setStep('preflight');
    try {
      const r = await axios.post(`${BASE}/tools/${tool.name}/preflight/`, { project_id: projectId });
      const req: HITLRequest = r.data?.hitl_request || {
        id: 'tool_params',
        question: `${tool.label} — confirm the parameters`,
        type: 'form',
        fields: tool.params,
      };
      // Backend defaults win over the schema defaults when provided.
      const defaults: Record<string, any> = r.data?.defaults || {};
      if (req.fields) {
        req.fields = req.fields.map(f => (defaults[f.id] !== undefined ? { ...f, default: defaults[f.id] } : f));
      }
      setPreflight(req);
    } catch (e: any) {
      // Pre-flight is advisory — fall back to the schema so the user can still run.
      if (tool.params?.length) {
        setPreflight({ id: 'tool_params', question: `${tool.label} — confirm the parameters`, type: 'form', fields: tool.params });
      } else {
        setError(e?.response?.data?.error || 'Pre-flight check failed.');
        setStep('pick');
      }
    } finally {
      setPreflightBusy(false);
    }
  }, [projectId]);

  // Preselected tool (from a suggested_tools chip or ?analysis= query param)
  useEffect(() => {
    if (!preselectedTool || !tools || selected) return;
    const hit = tools.find(t => t.name === preselectedTool);
    if (hit) startPreflight(hit);
  }, [preselectedTool, tools, selected, startPreflight]);

  // 3. Submit the job
  const submitJob = async (_qid: string, answer: Record<string, any>) => {
    if (!selected) return;
    setSubmitBusy(true);
    setError('');
    const params: Record<string, any> = {};
    for (const f of (preflight?.fields || selected.params || [])) {
      const raw = answer?.[f.id];
      if (raw === undefined || raw === '') continue;
      params[f.id] = f.type === 'number' && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
    }
    try {
      const r = await axios.post(`${BASE}/tools/jobs/`, {
        tool: selected.name,
        project_id: projectId,
        params,
        make_dashboard: true,
        make_deck: !NO_DECK_TOOLS.has(selected.name),
      }, { timeout: 60000 });
      const j: ToolJob = r.data?.job;
      if (!j?.id) throw new Error('No job returned');
      readyFiredRef.current = false;
      setJob(j);
      setStep(j.status === 'ready' ? 'ready' : j.status === 'error' || j.status === 'stale' ? 'error' : 'running');
      if (j.status === 'error' || j.status === 'stale') setError(j.error || 'The analysis job failed.');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not start the analysis job.');
    } finally {
      setSubmitBusy(false);
    }
  };

  // 4. Poll
  useEffect(() => {
    if (!job || step !== 'running') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await axios.get(`${BASE}/tools/jobs/${job.id}/`);
        if (cancelled) return;
        const j: ToolJob = r.data?.job || r.data;
        setJob(j);
        if (j.status === 'ready') {
          setStep('ready');
          return;
        }
        if (j.status === 'error' || j.status === 'stale') {
          setStep('error');
          setError(j.error || (j.status === 'stale' ? 'The job stopped responding and was marked stale.' : 'The analysis job failed.'));
          return;
        }
      } catch { /* transient poll failure — keep trying */ }
      if (!cancelled) pollRef.current = window.setTimeout(tick, POLL_MS);
    };
    pollRef.current = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [job?.id, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Ready → notify once
  useEffect(() => {
    if (step === 'ready' && job && !readyFiredRef.current) {
      readyFiredRef.current = true;
      onReady?.(job);
    }
  }, [step, job, onReady]);

  const reset = () => {
    setSelected(null); setPreflight(null); setJob(null); setError(''); setStep('pick');
  };

  const makesDeck = selected ? !NO_DECK_TOOLS.has(selected.name) : true;

  return (
    <div className={`analysis-panel${compact ? ' analysis-panel--compact' : ''}`}>
      {/* ── Step: pick a tool ── */}
      {step === 'pick' && (
        <>
          {onBack && (
            <button className="chat-change-format" onClick={onBack}>
              <ArrowLeft size={14}/> Change format
            </button>
          )}
          <div className="analysis-head">
            <span className="analysis-head-icon" style={{ '--fmt-tint': projectColor } as React.CSSProperties}>
              <FlaskConical size={22} strokeWidth={2}/>
            </span>
            <div>
              <div className="analysis-title">Run an analysis</div>
              <p className="analysis-sub">
                Pick a model. It runs on the project's data in the background and produces an
                interactive dashboard{' '}and a slide deck.
              </p>
            </div>
          </div>

          {toolsError && <div className="error-bar"><AlertCircle size={13}/>{toolsError}</div>}
          {error && <div className="error-bar"><AlertCircle size={13}/>{error}</div>}

          {!tools && !toolsError && (
            <div className="analysis-loading"><Loader2 size={16} className="spin"/> Loading analysis tools…</div>
          )}

          {tools && tools.length === 0 && (
            <p className="analysis-sub">No analysis tools are available on this server yet.</p>
          )}

          {tools && tools.length > 0 && (
            <div className="analysis-tool-grid">
              {tools.map(t => {
                const unavailable = /^unavailable:/i.test(t.description || '');
                return (
                  <button
                    key={t.name}
                    className="analysis-tool-card"
                    style={{ '--ttp-tint': projectColor } as React.CSSProperties}
                    disabled={unavailable}
                    onClick={() => startPreflight(t)}
                  >
                    <span className="analysis-tool-head">
                      <strong>{t.label}</strong>
                      {typeof t.estimated_minutes === 'number' && (
                        <span className="analysis-tool-eta"><Clock size={11}/> ~{t.estimated_minutes} min</span>
                      )}
                    </span>
                    <span className="analysis-tool-desc">{t.description}</span>
                    <span className="analysis-tool-outputs">
                      <span><LayoutDashboard size={11}/> Dashboard</span>
                      {!NO_DECK_TOOLS.has(t.name) && <span><Presentation size={11}/> Deck</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Step: pre-flight parameters ── */}
      {step === 'preflight' && selected && (
        <>
          <button className="chat-change-format" onClick={reset}>
            <ArrowLeft size={14}/> Choose a different analysis
          </button>
          <div className="analysis-head">
            <span className="analysis-head-icon" style={{ '--fmt-tint': projectColor } as React.CSSProperties}>
              <FlaskConical size={22} strokeWidth={2}/>
            </span>
            <div>
              <div className="analysis-title">{selected.label}</div>
              <p className="analysis-sub">{selected.description}</p>
            </div>
          </div>
          {error && <div className="error-bar"><AlertCircle size={13}/>{error}</div>}
          {preflightBusy && !preflight && (
            <div className="analysis-loading"><Loader2 size={16} className="spin"/> Checking the project data…</div>
          )}
          {preflight && (
            <HITLCard
              key={`${selected.name}-${preflight.id}`}
              request={preflight}
              onAnswer={submitJob}
              projectColor={projectColor}
              submitLabel={submitBusy ? 'Starting…' : makesDeck ? 'Run analysis & build deck' : 'Run analysis'}
              busy={submitBusy}
            />
          )}
        </>
      )}

      {/* ── Step: running ── */}
      {(step === 'running' || step === 'ready' || step === 'error') && job && (
        <div className={`analysis-progress analysis-progress--${step}`}>
          <div className="analysis-progress-head">
            {step === 'running' && <Loader2 size={16} className="spin"/>}
            {step === 'ready' && <CheckCircle2 size={16}/>}
            {step === 'error' && <AlertCircle size={16}/>}
            <div>
              <div className="analysis-title">
                {step === 'running' ? `Running ${selected?.label || toolLabel(job.tool, tools)}`
                  : step === 'ready' ? `${selected?.label || toolLabel(job.tool, tools)} is ready`
                  : `${selected?.label || toolLabel(job.tool, tools)} failed`}
              </div>
              <div className="analysis-stage">
                {step === 'running'
                  ? (job.stage || (job.status === 'queued' ? 'Queued — waiting for a worker' : 'Starting…'))
                  : step === 'ready' ? 'Dashboard and deck have been built.'
                  : (error || job.error || 'The analysis job failed.')}
              </div>
            </div>
          </div>

          {step !== 'error' && (
            <div className="report-progress-track analysis-progress-track">
              <div className="report-progress-fill" style={{ width: `${Math.max(2, Math.min(100, step === 'ready' ? 100 : job.progress || 0))}%` }} />
            </div>
          )}

          {step === 'running' && (
            <p className="analysis-hint">
              Job #{job.id}
              {selected?.estimated_minutes ? ` · usually ${selected.estimated_minutes} min` : ''}
              {' '}· runs in the background, so you can keep working. The results appear in this project when done.
            </p>
          )}

          {step === 'ready' && (
            <div className="analysis-actions">
              {job.thread_id && (
                <button className="hitl-submit-btn" style={{ background: projectColor }} onClick={() => onOpenDashboard?.(job)}>
                  <LayoutDashboard size={13}/> Open dashboard
                </button>
              )}
              {job.report_id && (
                <button className="hitl-option analysis-action-secondary" onClick={() => onOpenDeck?.(job)}>
                  <Presentation size={13}/> Open slide deck
                </button>
              )}
              {!job.thread_id && !job.report_id && (
                <p className="analysis-hint">The job finished, but no dashboard or deck was attached. Check the job result on the server.</p>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="analysis-actions">
              <button className="hitl-option analysis-action-secondary" onClick={() => selected ? startPreflight(selected) : reset()}>
                <RefreshCw size={13}/> Try again
              </button>
              <button className="hitl-option analysis-action-secondary" onClick={reset}>
                Choose a different analysis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
