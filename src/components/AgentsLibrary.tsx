import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Database, Sparkles, Search, SearchX, FlaskConical } from 'lucide-react';
import type { Datasource, Project } from '../App';
import { BASE } from './constants';
import { EmptyState, Skeleton, Button, HITLCard, type HITLRequest } from './ui';
import { fetchTools, toolLabel, type ToolSpec } from './analysisTools';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpecializedAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  color: string;
  accent: string;
  bg_from: string;
  bg_to: string;
  thumbnail_url?: string;
  /** Analysis job tools this agent can hand off to (e.g. 'demand_forecast'). */
  tools?: string[];
}

// ─── Apply Modal (matches apply-tpl-modal design exactly) ────────────────────

function AgentApplyModal({
  agent,
  datasources,
  toolCatalog,
  onClose,
  onApplied,
  onRunTool,
}: {
  agent: SpecializedAgent;
  datasources: Datasource[];
  toolCatalog: ToolSpec[] | null;
  onClose: () => void;
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, theme: string) => void;
  /** Open the Workspace analysis flow for the created project with `tool` preselected. */
  onRunTool?: (project: Project, tool: string) => void;
}) {
  const [selectedDs, setSelectedDs] = useState<number | null>(datasources[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hitl, setHitl] = useState<HITLRequest | null>(null);
  const [hitlProjectId, setHitlProjectId] = useState<number | null>(null);
  // Tool the user asked to run once the agent has created its project.
  const [pendingTool, setPendingTool] = useState<string | null>(null);

  // Run the agent. `extra` carries a resolved clarification (project_id +
  // hitl_responses) so answering the question re-runs on the SAME project.
  // `tool` (or the remembered pendingTool) hands off to the analysis flow
  // instead of the dashboard thread once the project exists.
  const run = async (extra: Record<string, any> = {}, tool: string | null = pendingTool) => {
    if (!selectedDs) return;
    setLoading(true);
    setError('');
    try {
      const r = await axios.post(`${BASE}/agents/apply/`, {
        agent_id: agent.id,
        datasource_id: selectedDs,
        ...extra,
      });
      if (r.data.action === 'hitl_required') {
        setHitl(r.data.hitl_request || null);
        setHitlProjectId(r.data.project?.id ?? null);
        setLoading(false);
        return;
      }
      if (tool && onRunTool && r.data.project) {
        onRunTool(r.data.project, tool);
        return;
      }
      onApplied(r.data.project, r.data.thread_id, r.data.dashboards, r.data.narrative, r.data.suggested_theme);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Generation failed. Try a different datasource.');
      setLoading(false);
    }
  };

  const handleRun = () => { setPendingTool(null); run({}, null); };
  const handleRunTool = (tool: string) => { setPendingTool(tool); run({}, tool); };
  const answerHitl = (questionId: string, answer: any) => {
    setHitl(null);
    run({ project_id: hitlProjectId, hitl_responses: { [questionId]: answer } });
  };

  const agentTools = (agent.tools || []).filter(t => typeof t === 'string' && t);

  return (
    <div className="apply-tpl-modal-overlay" onClick={onClose}>
      <div className="apply-tpl-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="apply-tpl-generating">
            <div className="apply-tpl-gen-emoji">{agent.emoji}</div>
            <div className="apply-tpl-gen-title">Running {agent.name}…</div>
            <div className="apply-tpl-gen-sub">Analyzing your data with domain expertise</div>
            <div className="apply-tpl-gen-bar">
              <div className="apply-tpl-gen-bar-fill" style={{ background: agent.color }} />
            </div>
          </div>
        ) : hitl ? (
          <>
            {/* Inline clarification (HITL) — answer here and re-run */}
            <div className="apply-tpl-modal-header">
              <div className="apply-tpl-modal-title">
                <span className="apply-tpl-emoji">{agent.emoji}</span>
                <div>
                  <div className="apply-tpl-name">Quick question</div>
                  <div className="apply-tpl-desc">{agent.name}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={15} /></button>
            </div>
            <div className="apply-tpl-body">
              {/* Same HITL card as the Workspace chat — handles select / number / text / form. */}
              <HITLCard
                request={hitl}
                onAnswer={answerHitl}
                projectColor={agent.color}
              />
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="apply-tpl-modal-header">
              <div className="apply-tpl-modal-title">
                <span className="apply-tpl-emoji">{agent.emoji}</span>
                <div>
                  <div className="apply-tpl-name">{agent.name}</div>
                  <div className="apply-tpl-desc">{agent.description}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={15} /></button>
            </div>

            {/* Body */}
            <div className="apply-tpl-body">
              <div className="apply-tpl-section-label">Select Datasource</div>

              {datasources.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  No datasources connected. Add one in Data settings first.
                </p>
              ) : (
                <div className="apply-tpl-ds-list">
                  {datasources.map(ds => (
                    <div
                      key={ds.id}
                      className={`apply-tpl-ds-item ${selectedDs === ds.id ? 'selected' : ''}`}
                      style={selectedDs === ds.id ? { borderColor: agent.color, background: agent.color + '0f' } : {}}
                      onClick={() => setSelectedDs(ds.id)}
                    >
                      <div className="apply-tpl-ds-icon" style={selectedDs === ds.id ? { background: agent.color + '18', color: agent.color } : {}}>
                        <Database size={15} />
                      </div>
                      <div className="apply-tpl-ds-info">
                        <strong>{ds.name}</strong>
                        <span>{ds.database} · {ds.host}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <button
                className="np-btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, background: agent.color, opacity: (!selectedDs || datasources.length === 0) ? 0.5 : 1 }}
                onClick={handleRun}
                disabled={!selectedDs || datasources.length === 0}
              >
                <Sparkles size={15} /> Run {agent.name}
              </button>

              {/* Analysis hand-off: create the project with this agent, then
                  open the Workspace analysis flow with the tool preselected. */}
              {agentTools.length > 0 && onRunTool && (
                <>
                  <div className="agent-tools-label">Or run an analysis model</div>
                  <div className="agent-tools-row">
                    {agentTools.map(t => (
                      <button
                        key={t}
                        className="agent-tool-btn"
                        style={{ borderColor: agent.color + '70', color: agent.color }}
                        onClick={() => handleRunTool(t)}
                        disabled={!selectedDs || datasources.length === 0}
                        title={`Create the project with ${agent.name}, then run ${toolLabel(t, toolCatalog)}`}
                      >
                        <FlaskConical size={14} /> Run {toolLabel(t, toolCatalog)} analysis
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Agent Card (styled like tpl-card) ───────────────────────────────────────

function AgentCard({ agent, toolCatalog, onSelect }: { agent: SpecializedAgent; toolCatalog: ToolSpec[] | null; onSelect: () => void }) {
  return (
    <div className="agent-card" onClick={onSelect}>
      {/* Thumbnail preview area */}
      <div className="agent-card-thumb">
        {agent.thumbnail_url ? (
          <img src={agent.thumbnail_url} alt="" className="agent-thumb-svg" draggable={false} />
        ) : (
          /* Fallback: colored strip */
          <div className="agent-card-strip" style={{ background: agent.color }} />
        )}
      </div>

      <div className="agent-card-inner">
        <div className="agent-card-head">
          <div className="agent-card-icon" style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}c0)` }}>
            <span>{agent.emoji}</span>
          </div>
          <h3 className="agent-card-name">{agent.name}</h3>
        </div>
        <p className="agent-card-desc">{agent.description}</p>
        {agent.tools && agent.tools.length > 0 && (
          <div className="agent-card-tools">
            {agent.tools.map(t => (
              <span key={t} className="agent-card-tool"><FlaskConical size={10} /> {toolLabel(t, toolCatalog)}</span>
            ))}
          </div>
        )}
        <div className="tpl-hover-overlay">
          <span className="tpl-hover-btn">Run Analysis →</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main AgentsLibrary ───────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Data', 'Compliance', 'Policy', 'Marketing', 'Finance', 'Product', 'RevOps'];

export function AgentsLibrary({
  datasources,
  onApplied,
  onRunTool,
}: {
  datasources: Datasource[];
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, theme: string) => void;
  /** Open the Workspace analysis flow for `project` with `tool` preselected. */
  onRunTool?: (project: Project, tool: string) => void;
}) {
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  // Tool catalogue (labels for the `tools` chips); only fetched when an agent carries tools.
  const [toolCatalog, setToolCatalog] = useState<ToolSpec[] | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgent | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BASE}/agents/`)
      .then(r => {
        const list: SpecializedAgent[] = r.data;
        setAgents(list);
        if (list.some(a => Array.isArray(a.tools) && a.tools.length > 0)) {
          fetchTools().then(setToolCatalog).catch(() => setToolCatalog([]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = agents.filter(a => {
    const matchCat = activeCategory === 'All' || a.category === activeCategory;
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="canva-home">

      {/* ── Hero (centered, matches Projects page hero) ── */}
      <div className="canva-home-hero">
        <h1 className="canva-home-title">AI Agents</h1>
        <p className="agents-hero-sub">
          Domain-expert agents that analyze your database with specialized insight. Pick one, connect your data.
        </p>
        <div className="canva-search-wrap agents-hero-search">
          <Search size={15} className="canva-search-icon" />
          <input
            className="canva-search-input"
            placeholder="Search agents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter chips */}
        <div className="canva-filter-row agents-hero-chips">
          {CATEGORIES.map(cat => {
            const count = cat === 'All' ? agents.length : agents.filter(a => a.category === cat).length;
            return (
              <button
                key={cat}
                className={`canva-filter-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                {cat !== 'All' && <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Agent Grid ── */}
      <div className="canva-home-content">
        {loading ? (
          <div className="agents-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Skeleton height={120} radius={12} />
                <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton height={14} width="65%" />
                  <Skeleton height={11} width="90%" />
                  <Skeleton height={11} width="78%" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX size={26}/>}
            title="No agents match your filters"
            subtitle={search
              ? `No agents matched "${search}". Try a different category or search term.`
              : 'Try a different category or clear the search.'}
            actions={(search || activeCategory !== 'All') && (
              <Button variant="secondary" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
                Reset filters
              </Button>
            )}
          />
        ) : (
          <>
            {activeCategory === 'All' ? (
              CATEGORIES.filter(c => c !== 'All').map(cat => {
                const catAgents = filtered.filter(a => a.category === cat);
                if (catAgents.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="canva-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {cat}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--weight-medium)' }}>{catAgents.length} agents</span>
                    </div>
                    <div className="agents-grid">
                      {catAgents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} toolCatalog={toolCatalog} onSelect={() => setSelectedAgent(agent)} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="agents-grid">
                {filtered.map(agent => (
                  <AgentCard key={agent.id} agent={agent} toolCatalog={toolCatalog} onSelect={() => setSelectedAgent(agent)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Apply Modal ── */}
      {selectedAgent && (
        <AgentApplyModal
          agent={selectedAgent}
          datasources={datasources}
          toolCatalog={toolCatalog}
          onClose={() => setSelectedAgent(null)}
          onApplied={(project, threadId, dashboards, narrative, theme) => {
            setSelectedAgent(null);
            onApplied(project, threadId, dashboards, narrative, theme);
          }}
          onRunTool={onRunTool ? (project, tool) => { setSelectedAgent(null); onRunTool(project, tool); } : undefined}
        />
      )}
    </div>
  );
}
