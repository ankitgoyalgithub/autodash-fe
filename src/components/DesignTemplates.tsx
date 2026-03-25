import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Database } from 'lucide-react';
import type { Datasource, Project } from '../App';
import { BASE } from './constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardTemplate {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  accent: string;
  bg_from: string;
  bg_to: string;
  charts: string[];
}

// ─── Mini Chart Mockups ───────────────────────────────────────────────────────

function MiniMetric() {
  return (
    <div className="tpl-mini-metric">
      <div className="tpl-mini-metric-val" />
      <div className="tpl-mini-metric-lbl" />
    </div>
  );
}

function MiniBar() {
  const heights = ['40%', '70%', '55%', '90%', '65%'];
  return (
    <div className="tpl-mini-bar">
      {heights.map((h, i) => (
        <span key={i} style={{ height: h }} />
      ))}
    </div>
  );
}

function MiniLine() {
  return (
    <div className="tpl-mini-line">
      <svg viewBox="0 0 80 50" preserveAspectRatio="none">
        <polyline
          points="0,40 15,30 30,35 45,15 60,20 80,8"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MiniPie() {
  return (
    <div
      className="tpl-mini-pie"
      style={{
        background:
          'conic-gradient(rgba(255,255,255,0.9) 35%, rgba(255,255,255,0.5) 35% 60%, rgba(255,255,255,0.3) 60%)',
      }}
    />
  );
}

function MiniArea() {
  return (
    <div className="tpl-mini-area">
      <svg viewBox="0 0 80 50" preserveAspectRatio="none">
        <polygon
          points="0,50 0,38 15,28 30,32 45,12 60,18 80,6 80,50"
          fill="rgba(255,255,255,0.25)"
        />
        <polyline
          points="0,38 15,28 30,32 45,12 60,18 80,6"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MiniTable() {
  const widths = ['100%', '80%', '90%', '75%'];
  return (
    <div className="tpl-mini-table">
      {widths.map((w, i) => (
        <div key={i} className="tpl-mini-table-row" style={{ width: w }} />
      ))}
    </div>
  );
}

function MiniChart({ type }: { type: string }) {
  switch (type) {
    case 'metric':
      return <MiniMetric />;
    case 'bar':
    case 'stacked_bar':
    case 'combo_bar_line':
      return <MiniBar />;
    case 'line':
      return <MiniLine />;
    case 'pie':
      return <MiniPie />;
    case 'area':
      return <MiniArea />;
    case 'table':
      return <MiniTable />;
    default:
      return <MiniBar />;
  }
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: DashboardTemplate;
  onSelect: () => void;
}) {
  const previewCharts = template.charts.slice(0, 2);

  return (
    <div className="tpl-card" onClick={onSelect}>
      {/* Gradient preview header */}
      <div
        className="tpl-preview"
        style={{
          background: `linear-gradient(135deg, ${template.bg_from} 0%, ${template.bg_to} 100%)`,
        }}
      >
        <div className="tpl-preview-charts">
          {previewCharts.map((chartType, i) => (
            <MiniChart key={i} type={chartType} />
          ))}
        </div>
      </div>

      {/* Info area */}
      <div className="tpl-info">
        <div className="tpl-category">{template.category}</div>
        <div className="tpl-name">
          {template.emoji} {template.name}
        </div>
        <div className="tpl-desc">{template.description}</div>
      </div>

      {/* Hover overlay */}
      <div className="tpl-hover-overlay">
        <button className="tpl-hover-btn">Use Template →</button>
      </div>
    </div>
  );
}

// ─── Apply Template Modal ─────────────────────────────────────────────────────

function ApplyTemplateModal({
  template,
  datasources,
  onClose,
  onApplied,
}: {
  template: DashboardTemplate;
  datasources: Datasource[];
  onClose: () => void;
  onApplied: (
    project: Project,
    threadId: number,
    dashboards: any[],
    narrative: string,
    suggestedTheme: string
  ) => void;
}) {
  const [selectedDs, setSelectedDs] = useState<number | null>(
    datasources.length === 1 ? datasources[0].id : null
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedDs) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await axios.post(`${BASE}/templates/apply/`, {
        template_id: template.id,
        datasource_id: selectedDs,
      });
      onApplied(
        r.data.project,
        r.data.thread_id,
        r.data.dashboards,
        r.data.narrative,
        r.data.suggested_theme
      );
    } catch (e: any) {
      setError(e.response?.data?.error || 'Generation failed. Please try again.');
      setGenerating(false);
    }
  };

  return (
    <div className="apply-tpl-modal-overlay" onClick={generating ? undefined : onClose}>
      <div className="apply-tpl-modal" onClick={e => e.stopPropagation()}>
        {generating ? (
          /* ── Loading state ── */
          <div className="apply-tpl-generating">
            <div className="apply-tpl-gen-emoji">{template.emoji}</div>
            <div className="apply-tpl-gen-title">
              Generating your {template.name} Dashboard...
            </div>
            <div className="apply-tpl-gen-sub">
              Lumio is analyzing your data and building charts. This may take 30–60 seconds.
            </div>
            <div className="apply-tpl-gen-bar">
              <div
                className="apply-tpl-gen-bar-fill"
                style={{ background: template.accent }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="apply-tpl-modal-header">
              <div className="apply-tpl-modal-title">
                <span className="apply-tpl-emoji">{template.emoji}</span>
                <div>
                  <div className="apply-tpl-name">{template.name}</div>
                  <div className="apply-tpl-desc">{template.description}</div>
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={onClose}
                style={{ flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="apply-tpl-body">
              <div className="apply-tpl-section-label">Select a datasource</div>

              {datasources.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '12px 0 16px' }}>
                  You need to connect a datasource first. Go to the{' '}
                  <strong>Datasources</strong> section in the sidebar to add one.
                </div>
              ) : (
                <div className="apply-tpl-ds-list">
                  {datasources.map(ds => (
                    <button
                      key={ds.id}
                      className={`apply-tpl-ds-item ${selectedDs === ds.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDs(ds.id)}
                    >
                      <div className="apply-tpl-ds-icon">
                        <Database size={16} />
                      </div>
                      <div className="apply-tpl-ds-info">
                        <strong>{ds.name}</strong>
                        <span>
                          {ds.host}:{ds.port}/{ds.database}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#b91c1c',
                    fontSize: '0.82rem',
                    marginBottom: '12px',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="apply-tpl-footer">
                <button className="btn-outline" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleGenerate}
                  disabled={!selectedDs || datasources.length === 0}
                >
                  Generate Dashboard ✨
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DesignTemplates Component ────────────────────────────────────────────────

export function DesignTemplates({
  datasources,
  onApplied,
}: {
  datasources: Datasource[];
  onApplied: (
    project: Project,
    threadId: number,
    dashboards: any[],
    narrative: string,
    suggestedTheme: string
  ) => void;
}) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    axios
      .get(`${BASE}/templates/`)
      .then(r => setTemplates(r.data))
      .catch(() => {});
  }, []);

  const displayed = showAll ? templates : templates.slice(0, 8);

  return (
    <>
      <div className="tpl-section-header">
        <h2 className="canva-section-title" style={{ margin: 0 }}>
          Start from a Template
        </h2>
        {templates.length > 8 && (
          <button className="tpl-see-all" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show less' : `See all ${templates.length} →`}
          </button>
        )}
      </div>

      <div className="tpl-gallery">
        {displayed.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            onSelect={() => setSelectedTemplate(t)}
          />
        ))}
      </div>

      {selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          datasources={datasources}
          onClose={() => setSelectedTemplate(null)}
          onApplied={(project, threadId, dashboards, narrative, suggestedTheme) => {
            setSelectedTemplate(null);
            onApplied(project, threadId, dashboards, narrative, suggestedTheme);
          }}
        />
      )}
    </>
  );
}
