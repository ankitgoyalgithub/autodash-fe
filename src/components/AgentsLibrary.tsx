import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Database, Sparkles, Search } from 'lucide-react';
import type { Datasource, Project } from '../App';
import { BASE } from './constants';

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
}

// ─── Apply Modal (matches apply-tpl-modal design exactly) ────────────────────

function AgentApplyModal({
  agent,
  datasources,
  onClose,
  onApplied,
}: {
  agent: SpecializedAgent;
  datasources: Datasource[];
  onClose: () => void;
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, theme: string) => void;
}) {
  const [selectedDs, setSelectedDs] = useState<number | null>(datasources[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!selectedDs) return;
    setLoading(true);
    setError('');
    try {
      const r = await axios.post(`${BASE}/agents/apply/`, {
        agent_id: agent.id,
        datasource_id: selectedDs,
      });
      onApplied(r.data.project, r.data.thread_id, r.data.dashboards, r.data.narrative, r.data.suggested_theme);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Generation failed. Try a different datasource.');
      setLoading(false);
    }
  };

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
              <button className="modal-close-btn" onClick={onClose}><X size={15} /></button>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Agent Card (styled like tpl-card) ───────────────────────────────────────

function AgentCard({ agent, onSelect }: { agent: SpecializedAgent; onSelect: () => void }) {
  return (
    <div className="agent-card" onClick={onSelect}>
      {/* Thumbnail preview area */}
      <div className="agent-card-thumb">
        {agent.thumbnail_url ? (
          <>
            <img src={agent.thumbnail_url} alt={agent.name} className="agent-thumb-svg" draggable={false} />
            <div className="agent-thumb-overlay" style={{ background: `linear-gradient(to top, ${agent.color}44 0%, transparent 60%)` }} />
          </>
        ) : (
          /* Fallback: colored strip */
          <div className="agent-card-strip" style={{ background: agent.color }} />
        )}
      </div>

      <div className="agent-card-inner">
        <div className="agent-card-top">
          <span className="agent-card-emoji">{agent.emoji}</span>
          <span className="agent-card-category" style={{ color: agent.color }}>{agent.category}</span>
        </div>
        <h3 className="agent-card-name">{agent.name}</h3>
        <p className="agent-card-desc">{agent.description}</p>
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
}: {
  datasources: Datasource[];
  onApplied: (project: Project, threadId: number, dashboards: any[], narrative: string, theme: string) => void;
}) {
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgent | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(`${BASE}/agents/`).then(r => setAgents(r.data)).catch(() => {});
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

      {/* ── Hero (matches Projects page hero exactly) ── */}
      <div className="canva-home-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="canva-home-title">AI Agents</h1>
            <p style={{ fontSize: 14, color: '#6b6880', marginTop: 4, maxWidth: 520 }}>
              Domain-expert agents that analyze your database with specialized insight. Pick one, connect your data.
            </p>
          </div>
          <div className="canva-search-wrap" style={{ maxWidth: 280, marginTop: 4 }}>
            <Search size={15} className="canva-search-icon" />
            <input
              className="canva-search-input"
              placeholder="Search agents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category filter chips */}
        <div className="canva-filter-row" style={{ marginTop: 4 }}>
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
        {filtered.length === 0 ? (
          <div className="canva-empty">
            <div className="canva-empty-art">🔍</div>
            <h3>No agents found</h3>
            <p>Try a different category or search term.</p>
          </div>
        ) : (
          <>
            {activeCategory === 'All' ? (
              // Group by category when showing all
              CATEGORIES.filter(c => c !== 'All').map(cat => {
                const catAgents = filtered.filter(a => a.category === cat);
                if (catAgents.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="canva-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {cat}
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{catAgents.length} agents</span>
                    </div>
                    <div className="agents-grid">
                      {catAgents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} onSelect={() => setSelectedAgent(agent)} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="agents-grid">
                {filtered.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onSelect={() => setSelectedAgent(agent)} />
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
          onClose={() => setSelectedAgent(null)}
          onApplied={(project, threadId, dashboards, narrative, theme) => {
            setSelectedAgent(null);
            onApplied(project, threadId, dashboards, narrative, theme);
          }}
        />
      )}
    </div>
  );
}
