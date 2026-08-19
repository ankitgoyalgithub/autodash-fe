import { useState, useMemo } from 'react';

// ── Number & label helpers ─────────────────────────────────────────────────────

// Trim trailing zeros so compact numbers read like a designer set them:
// 120.00M → 120M, 90.0M → 90M, 1.87B → 1.87B, 1.5K → 1.5K.
function _trim(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function formatCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${_trim(v / 1e9, 2)}B`;
  if (abs >= 1e6) return `${_trim(v / 1e6, 1)}M`;
  if (abs >= 1e3) return `${_trim(v / 1e3, 1)}K`;
  return parseFloat(v.toFixed(2)).toLocaleString();
}

export function isCurrencyKey(key: string): boolean {
  return /revenue|sales|profit|cost|price|amount|budget|spend|earning|income|value|gmv|arr|mrr|ltv|cac|fee|payment|invoice/i.test(key);
}

// Percent-valued columns render with a % suffix instead of $/compact.
export function isPercentKey(key: string): boolean {
  return /(pct|percent|_rate\b|ratio|share_pct)/i.test(key);
}

export function prettifyCol(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatAxisTick(val: any, dataKey?: string): string {
  if (typeof val !== 'number') return String(val ?? '');
  if (dataKey && isPercentKey(dataKey)) return `${parseFloat(val.toFixed(1))}%`;
  const prefix = dataKey && isCurrencyKey(dataKey) ? '$' : '';
  return prefix + formatCompact(val);
}

export function formatTooltipValue(val: any, name: string | number | undefined): [string, string] {
  const nameStr = String(name ?? '');
  if (typeof val !== 'number') return [String(val ?? ''), nameStr];
  if (isPercentKey(nameStr)) return [`${parseFloat(val.toFixed(1))}%`, nameStr];
  const prefix = isCurrencyKey(nameStr) ? '$' : '';
  return [prefix + formatCompact(val), nameStr];
}

// Majority of x-labels parse as dates → treat as a time axis (single-hue bars,
// date tick formatting). Categorical axes (brands, segments) get per-bar colors.
export function isTimeAxis(data: any[], xKey: string): boolean {
  if (!data?.length) return false;
  const sample = data.slice(0, Math.min(6, data.length));
  const parseable = sample.filter(r => parseDateLabelToMs(String(r[xKey] ?? '')) !== null).length;
  return parseable >= Math.ceil(sample.length / 2);
}

export function formatXAxis(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return str;
}

export function formatCellValue(val: any, col: string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (isPercentKey(col)) return `${parseFloat(val.toFixed(1))}%`;
    if (isCurrencyKey(col)) return '$' + formatCompact(val);
    if (Number.isInteger(val)) return val.toLocaleString();
    return parseFloat(val.toFixed(2)).toLocaleString();
  }
  return String(val);
}

// ── Date-aware sorting ─────────────────────────────────────────────────────────

export function parseDateLabelToMs(label: string): number | null {
  const s = String(label).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01`).getTime();
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-01`).getTime();
  const monYear = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monYear) { const t = new Date(`${monYear[1]} 1, ${monYear[2]}`).getTime(); if (!isNaN(t)) return t; }
  const quarter = s.match(/^Q(\d)\s+(\d{4})$/i);
  if (quarter) return new Date(`${quarter[2]}-${String((+quarter[1] - 1) * 3 + 1).padStart(2, '0')}-01`).getTime();
  return null;
}

export function sortByDateLabel(data: any[], xKey: string): any[] {
  if (data.length < 2) return data;
  const samples = data.slice(0, Math.min(5, data.length));
  const parseable = samples.filter(r => parseDateLabelToMs(String(r[xKey] ?? '')) !== null).length;
  if (parseable < Math.ceil(samples.length / 2)) return data;
  return [...data].sort((a, b) => {
    const ta = parseDateLabelToMs(String(a[xKey] ?? '')) ?? 0;
    const tb = parseDateLabelToMs(String(b[xKey] ?? '')) ?? 0;
    return ta - tb;
  });
}

// ── Smart XAxis props ──────────────────────────────────────────────────────────

export function getXAxisProps(data: any[], key: string, forceAngle?: boolean) {
  const n = data.length;
  const maxLabelLen = Math.max(...data.slice(0, 20).map(r => String(r[key] ?? '').length));
  const needsAngle = forceAngle || n > 8 || maxLabelLen > 10;
  // Aim for ~8 evenly-spaced labels max so a long time series doesn't cram the
  // axis into an unreadable smear of rotated text.
  const interval = n > 16 ? Math.ceil(n / 8) - 1 : n > 10 ? 1 : 0;
  return {
    interval,
    angle: needsAngle ? -35 : 0,
    height: needsAngle ? 60 : 30,
    textAnchor: needsAngle ? 'end' as const : 'middle' as const,
    tickFormatter: (v: any) => {
      const s = String(formatXAxis(v));
      return needsAngle && s.length > 16 ? s.slice(0, 14) + '…' : s;
    },
  };
}

// ── Column sequencing helpers ──────────────────────────────────────────────────

export function deriveKeys(data: Record<string, any>[]) {
  const sample = data.slice(0, Math.min(8, data.length));
  const keys = Object.keys(data[0] || {});

  const isYearInt = (k: string) => sample.every(r => {
    const v = r[k]; return typeof v === 'number' && Number.isInteger(v) && v >= 1900 && v <= 2100;
  });
  const isNumeric = (k: string) => {
    if (isYearInt(k)) return false;
    const nonNull = sample.filter(r => r[k] !== null && r[k] !== undefined);
    return nonNull.length > 0 && nonNull.every(r => typeof r[k] === 'number');
  };

  const numericCols = keys.filter(k => isNumeric(k));
  const labelCols = keys.filter(k => !isNumeric(k));
  const xKey = labelCols.length > 0 ? labelCols[0] : keys[0];
  const dataKeys = numericCols.length > 0 ? numericCols : keys.filter(k => k !== xKey);
  return { xKey, dataKeys, keys };
}

// ── Recharts tooltip components ───────────────────────────────────────────────

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== null && p.value !== undefined && p.type !== 'none');
  if (!visible.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== '' && (
        <div className="ct-label">{String(label)}</div>
      )}
      {visible.map((p: any, i: number) => {
        const name = prettifyCol(String(p.name ?? p.dataKey ?? ''));
        const [fmtVal] = formatTooltipValue(p.value, p.name ?? p.dataKey);
        return (
          <div key={i} className="ct-row">
            <span className="ct-dot" style={{ background: p.color || p.fill }} />
            <span className="ct-name">{name}</span>
            <span className="ct-value">{fmtVal}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AnomalyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (!p) return null;
  const isAnomaly = p.payload?.is_anomaly;
  const [fmtVal] = formatTooltipValue(p.value, p.name ?? p.dataKey);
  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== '' && (
        <div className="ct-label">{String(label)}</div>
      )}
      <div className="ct-row">
        <span className="ct-dot" style={{ background: isAnomaly ? '#ef4444' : p.color }} />
        <span className="ct-name">{prettifyCol(String(p.name ?? p.dataKey ?? ''))}</span>
        <span className="ct-value">
          {fmtVal}
          {isAnomaly && <span className="ct-anomaly-flag">⚠ Anomaly</span>}
        </span>
      </div>
    </div>
  );
}

// ── Legend toggle component (passed hiddenSeries + onToggle) ──────────────────

export function LegendToggle({ payload, hiddenSeries, onToggle }: {
  payload?: any[];
  hiddenSeries: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (!payload?.length) return null;
  const visible = payload.filter((p: any) => p.type !== 'none');
  if (!visible.length || visible.length < 2) return null;
  return (
    <div className="chart-legend">
      {visible.map((p: any, i: number) => {
        const key = String(p.value ?? '');
        const isHidden = hiddenSeries.has(key);
        return (
          <div key={i} className={`cl-item${isHidden ? ' cl-item--hidden' : ''}`} onClick={() => onToggle(key)} title={isHidden ? 'Click to show' : 'Click to hide'}>
            <span className="cl-dot" style={{ background: isHidden ? '#d1d5db' : p.color }} />
            <span className="cl-name">{prettifyCol(key)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sortable data table ───────────────────────────────────────────────────────

export function TableInsight({ data, colors }: { data: any[]; colors: string[] }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!data?.length) return null;

  const HIDDEN_COL_PATTERNS = /^(ma_\d+|momentum_pct|is_vital_few|is_forecast|is_anomaly|deviation_factor|cumulative_pct)$/i;
  const cols = Object.keys(data[0]).filter(c => !HIDDEN_COL_PATTERNS.test(c));

  const numericCols = cols.filter(c => data.slice(0, 5).some(r => typeof r[c] === 'number'));
  const cleanData = numericCols.length > 0
    ? data.filter(row => numericCols.some(c => row[c] != null && row[c] !== 0))
    : data;

  const sorted = useMemo(() => {
    if (!sortCol) return cleanData;
    return [...cleanData].sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [cleanData, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const isNumericCol = (col: string) => cleanData.slice(0, 5).some(r => typeof r[col] === 'number');
  const accentColor = colors[0] || '#6366f1';

  const colMaxMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const col of numericCols) {
      const vals = cleanData.map(r => typeof r[col] === 'number' ? Math.abs(r[col] as number) : 0);
      m[col] = Math.max(...vals, 1);
    }
    return m;
  }, [cleanData, numericCols]);

  const dataBarCol = numericCols.find(c => !/^(id|_id|rank|index|row_num|sequence)$/i.test(c));

  return (
    <div className="insight-table-wrap">
      <table className="insight-table">
        <thead>
          <tr>
            {cols.map((col, i) => (
              <th
                key={col}
                className={`${isNumericCol(col) ? 'num' : ''} ${sortCol === col ? 'sorted' : ''}`}
                onClick={() => handleSort(col)}
                style={sortCol === col ? { color: accentColor } : undefined}
              >
                <span className="th-inner">
                  {prettifyCol(col)}
                  <span className="sort-icon">{sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </span>
                {i === 0 && <div className="th-accent" style={{ background: accentColor }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri}>
              {cols.map((col, ci) => {
                const val = row[col];
                const numeric = typeof val === 'number';
                const isDataBarCol = col === dataBarCol && numeric;
                const barPct = isDataBarCol ? Math.min(100, (Math.abs(val as number) / colMaxMap[col]) * 100) : 0;
                return (
                  <td key={col} className={numeric ? 'num' : ''} style={isDataBarCol ? {
                    position: 'relative',
                    background: `linear-gradient(to right, ${accentColor}18 ${barPct}%, transparent ${barPct}%)`,
                  } : undefined}>
                    {ci === 0 && (
                      <span className="row-rank" style={{ background: accentColor + '18', color: accentColor }}>
                        {ri + 1}
                      </span>
                    )}
                    {numeric && isCurrencyKey(col) ? (
                      <span className="cell-currency">{formatCellValue(val, col)}</span>
                    ) : numeric ? (
                      <span className="cell-num">{formatCellValue(val, col)}</span>
                    ) : (
                      <span className="cell-text">{formatCellValue(val, col)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
