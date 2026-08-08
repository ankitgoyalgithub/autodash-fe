import { ChartRenderer } from '../renderers/ChartRenderer';
import { deriveKeys, sortByDateLabel } from '../renderers/utils';
import type { Entity360Payload, Entity360Section } from '../App';
import './Entity360View.css';

interface Props {
  payload: Entity360Payload;
  colors: string[];
  /** Called when the user picks a specific row from the disambiguation list. */
  onDisambiguate?: (pkValue: any, label: string) => void;
}

/**
 * Bespoke 360° entity profile: header banner → narrative → KPI strip →
 * profile attributes + one card per related table → activity timeline.
 * Also renders the disambiguation picker and not-found / error states.
 */
export function Entity360View({ payload, colors, onDisambiguate }: Props) {
  if (!payload) return null;

  if (payload.status === 'disambiguation') {
    return (
      <div className="e360-msg">
        <h3>Multiple matches</h3>
        <p>Which {payload.entity_type || payload.entity_table || 'record'} did you mean?</p>
        <div className="e360-candidates">
          {(payload.candidates || []).map((c, i) => (
            <button
              key={i}
              className="e360-candidate"
              onClick={() => onDisambiguate?.(c.pk_value, c.label)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (payload.status === 'not_found' || payload.status === 'error') {
    const isError = payload.status === 'error';
    return (
      <div className="e360-msg">
        <h3>{isError ? 'Could not build the 360° view' : 'No matching record'}</h3>
        <p>{payload.error || 'No matching entity was found.'}</p>
        {!isError && (
          <ul className="e360-msg-hints">
            <li>Name a specific row, e.g. <em>"360 view of customer Acme Corp"</em> or <em>"everything about license LIC-2024-001"</em>.</li>
            <li>Or use a generic noun (e.g. <em>"Trade License"</em>, <em>"Customer"</em>) and we'll show a picker to choose from.</li>
            <li>Check the dataset has rows in the entity table you meant.</li>
          </ul>
        )}
      </div>
    );
  }

  const entity = payload.entity;
  const initial = (entity?.label || '?').trim().slice(0, 1).toUpperCase();

  return (
    <div className="e360">
      {/* Header banner */}
      <div className="e360-header">
        <div className="e360-avatar">{initial}</div>
        <div className="e360-headtext">
          <div className="e360-eyebrow">{(entity?.type || entity?.table || 'entity')} · 360° view</div>
          <h2 className="e360-title">{entity?.label}</h2>
        </div>
      </div>

      {payload.narrative && <p className="e360-narrative">{payload.narrative}</p>}

      {/* KPI strip */}
      {!!payload.kpis?.length && (
        <div className="e360-kpis">
          {payload.kpis.map((k, i) => (
            <div className="e360-kpi" key={i}>
              <div className="e360-kpi-value">{k.value}</div>
              <div className="e360-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="e360-grid">
        {/* Profile attributes */}
        {!!payload.profile?.length && (
          <div className="e360-card e360-profile">
            <div className="e360-card-title">Profile</div>
            <dl className="e360-attrs">
              {payload.profile.map((p, i) => (
                <div className="e360-attr" key={i}>
                  <dt>{p.label}</dt>
                  <dd>{p.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* One card per related table */}
        {(payload.sections || []).map((s, i) => (
          <Section key={i} section={s} colors={colors} />
        ))}

        {/* Activity timeline */}
        {!!payload.timeline?.length && (
          <div className="e360-card e360-timeline">
            <div className="e360-card-title">Activity timeline</div>
            <ul>
              {payload.timeline.map((t, i) => (
                <li key={i}>
                  <span className="e360-tl-dot" />
                  <span className="e360-tl-date">{t.date}</span>
                  <span className="e360-tl-label">{t.label}</span>
                  {t.source && <span className="e360-tl-source">{t.source}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function prettify(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function Section({ section, colors }: { section: Entity360Section; colors: string[] }) {
  const data = section.data || [];
  if (!data.length) return null;

  const isWide = section.chart_type === 'table' ||
    ['line', 'area', 'combo_bar_line', 'stacked_bar'].includes(section.chart_type);

  return (
    <div className={`e360-card e360-section ${isWide ? 'wide' : ''}`}>
      <div className="e360-card-title">{section.title}</div>
      {section.chart_type === 'table' ? (
        <SectionTable data={data} />
      ) : section.chart_type === 'metric' ? (
        <SectionMetric data={data} />
      ) : (
        <SectionChart section={section} data={data} colors={colors} />
      )}
    </div>
  );
}

function SectionTable({ data }: { data: Record<string, any>[] }) {
  const cols = Object.keys(data[0]).slice(0, 8);
  return (
    <div className="e360-table-wrap">
      <table className="e360-table">
        <thead>
          <tr>{cols.map(c => <th key={c}>{prettify(c)}</th>)}</tr>
        </thead>
        <tbody>
          {data.slice(0, 25).map((r, ri) => (
            <tr key={ri}>{cols.map(c => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionMetric({ data }: { data: Record<string, any>[] }) {
  const row = data[0] || {};
  const value = Object.values(row).find(v => typeof v === 'number') ?? Object.values(row)[0];
  return <div className="e360-section-metric">{String(value ?? '—')}</div>;
}

function SectionChart({ section, data, colors }: {
  section: Entity360Section; data: Record<string, any>[]; colors: string[];
}) {
  const spec0 = section.chart_spec || {};
  const derived = deriveKeys(data);
  const xKey = spec0.x_key || derived.xKey;
  const dataKeys = (spec0.y_keys && spec0.y_keys.length) ? spec0.y_keys : derived.dataKeys;
  const displayData = sortByDateLabel(data, xKey);

  return (
    <ChartRenderer
      spec={{
        chart_type: section.chart_type as any,
        data: displayData,
        xKey,
        dataKeys,
        colors,
        height: 260,
        gridStroke: '#f1f5f9',
        gridDash: '3 3',
        hiddenSeries: new Set<string>(),
        onToggleSeries: () => {},
      }}
    />
  );
}
