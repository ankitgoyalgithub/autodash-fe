import React, { useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, LineChart as ReLineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart, ReferenceLine, ReferenceArea,
  ScatterChart, Scatter, LabelList, Label,
} from 'recharts';
import type { ChartAdapterProps } from '../types';
import {
  ChartTooltip, AnomalyTooltip, LegendToggle, TableInsight,
  formatAxisTick, formatXAxis, formatCompact, isCurrencyKey, prettifyCol,
  getXAxisProps,
} from '../utils';

// ── Recharts adapter — all canonical 2D chart types ───────────────────────────

export function RechartsAdapter({ spec }: ChartAdapterProps) {
  const {
    chart_type, data, xKey, dataKeys, colors, height, index,
    gridStroke = '#f1f5f9', gridDash = '3 3',
    hiddenSeries, onToggleSeries, onDrillDown, onChartClick,
    anomaly_info, matrix_config, _ts_config, _pareto_config,
  } = spec;

  const tickColor = '#64748b';
  const colorOffset = (index ?? 0) % colors.length;
  const seriesColor = (i: number) => colors[(colorOffset + i) % colors.length];
  const visibleDataKeys = dataKeys.filter(k => !hiddenSeries.has(k));

  // Memoized legend renderer — must be stable across renders or Recharts
  // JavascriptAnimate enters an infinite setState loop on every new function ref.
  const legend = useCallback(({ payload }: any) => (
    <LegendToggle payload={payload} hiddenSeries={hiddenSeries} onToggle={onToggleSeries} />
  ), [hiddenSeries, onToggleSeries]);

  const handleChartClick = (state: any) => {
    if (state?.activeLabel !== undefined && onDrillDown) onDrillDown(xKey, state.activeLabel);
    onChartClick?.(state);
  };

  // ── Line ─────────────────────────────────────────────────────────────────
  if (chart_type === 'line') {
    const xp = getXAxisProps(data, xKey);
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ReLineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: xp.height }} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={xp.tickFormatter} tick={{ fontSize: 11, fill: tickColor, angle: xp.angle, textAnchor: xp.textAnchor }} axisLine={false} tickLine={false} height={xp.height} interval={xp.interval} />
          <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          {visibleDataKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={seriesColor(i)} strokeWidth={2.5}
              dot={data.length > 30 ? false : { r: 3.5, fill: seriesColor(i), strokeWidth: 0 }}
              activeDot={{ r: 6, fill: seriesColor(i), stroke: '#fff', strokeWidth: 2.5 }}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    );
  }

  // ── Pie / Donut ───────────────────────────────────────────────────────────
  if (chart_type === 'pie') {
    const PIE_MAX = 8;
    let pieData = data;
    if (data.length > PIE_MAX) {
      const sorted = [...data].sort((a, b) => (b[dataKeys[0]] || 0) - (a[dataKeys[0]] || 0));
      const otherVal = sorted.slice(PIE_MAX - 1).reduce((sum: number, row: any) => sum + (typeof row[dataKeys[0]] === 'number' ? row[dataKeys[0]] : 0), 0);
      pieData = [...sorted.slice(0, PIE_MAX - 1), { [xKey]: 'Other', [dataKeys[0]]: otherVal }];
    }
    const pieTotal = pieData.reduce((sum, row) => sum + (typeof row[dataKeys[0]] === 'number' ? row[dataKeys[0]] : 0), 0);
    const isCurrPie = isCurrencyKey(dataKeys[0] || '');
    const centerLabel = pieTotal > 0 ? (isCurrPie ? '$' : '') + formatCompact(pieTotal) : '';
    const size = height < 180 ? 's' : 'm';
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <PieChart>
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          <Pie
            data={pieData} cx="50%" cy="50%"
            innerRadius={size === 's' ? 44 : 62} outerRadius={size === 's' ? 66 : 90}
            dataKey={dataKeys[0]} nameKey={xKey} paddingAngle={2}
            label={({ percent }) => (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(0)}%` : ''}
            labelLine={false}
            onClick={(d: any) => onDrillDown && d?.name !== undefined && onDrillDown(xKey, d.name)}
          >
            {centerLabel && (
              <Label position="center" content={({ viewBox }: any) => {
                const cx = viewBox?.cx ?? 0; const cy = viewBox?.cy ?? 0;
                return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="var(--theme-text-main,#111827)">{centerLabel}</text>;
              }} />
            )}
            {pieData.map((_: any, i: number) => <Cell key={i} fill={seriesColor(i)} stroke="none" />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ── Area ──────────────────────────────────────────────────────────────────
  if (chart_type === 'area') {
    const pfx = `ag-${index ?? 0}`;
    const xp = getXAxisProps(data, xKey);
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: xp.height }} onClick={handleChartClick}>
          <defs>
            {visibleDataKeys.map((k, i) => (
              <linearGradient key={k} id={`${pfx}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(i)} stopOpacity={0.5}/>
                <stop offset="88%" stopColor={seriesColor(i)} stopOpacity={0.04}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={xp.tickFormatter} tick={{ fontSize: 11, fill: tickColor, angle: xp.angle, textAnchor: xp.textAnchor }} axisLine={false} tickLine={false} height={xp.height} interval={xp.interval} />
          <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          {visibleDataKeys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stroke={seriesColor(i)} fillOpacity={1} fill={`url(#${pfx}-${i})`} strokeWidth={2.5}
              dot={{ r: 3, fill: seriesColor(i), strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: seriesColor(i), stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // ── Stacked bar ───────────────────────────────────────────────────────────
  if (chart_type === 'stacked_bar') {
    const pfx = `sbg-${index ?? 0}`;
    const xp = getXAxisProps(data, xKey);
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: xp.height }} onClick={handleChartClick} barCategoryGap="28%">
          <defs>
            {visibleDataKeys.map((k, i) => (
              <linearGradient key={k} id={`${pfx}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(i)} stopOpacity={1}/>
                <stop offset="100%" stopColor={seriesColor(i)} stopOpacity={0.7}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={xp.tickFormatter} tick={{ fontSize: 11, fill: tickColor, angle: xp.angle, textAnchor: xp.textAnchor }} axisLine={false} tickLine={false} height={xp.height} interval={xp.interval} />
          <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
          <RTooltip content={ChartTooltip} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
          <Legend content={legend} />
          {visibleDataKeys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={`url(#${pfx}-${i})`} radius={i === visibleDataKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Combo bar+line ────────────────────────────────────────────────────────
  if (chart_type === 'combo_bar_line') {
    const pfx = `cbl-${index ?? 0}`;
    const xp = getXAxisProps(data, xKey);
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: xp.height }} onClick={handleChartClick} barCategoryGap="28%">
          <defs>
            <linearGradient id={pfx} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(0)} stopOpacity={1}/>
              <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0.62}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={xp.tickFormatter} tick={{ fontSize: 11, fill: tickColor, angle: xp.angle, textAnchor: xp.textAnchor }} axisLine={false} tickLine={false} height={xp.height} interval={xp.interval} />
          <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
          <RTooltip content={ChartTooltip} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
          <Legend content={legend} />
          {!hiddenSeries.has(dataKeys[0]) && <Bar dataKey={dataKeys[0]} fill={`url(#${pfx})`} radius={[6, 6, 0, 0]} maxBarSize={44} />}
          {dataKeys.slice(1).map((k, i) => !hiddenSeries.has(k) && (
            <Line key={k} type="monotone" dataKey={k} stroke={seriesColor(i + 1)} strokeWidth={2.5}
              dot={{ r: 3.5, fill: seriesColor(i + 1), strokeWidth: 0 }}
              activeDot={{ r: 6, fill: seriesColor(i + 1), stroke: '#fff', strokeWidth: 2.5 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Horizontal bar ────────────────────────────────────────────────────────
  if (chart_type === 'horizontal_bar') {
    const dynH = Math.min(Math.max(data.length * 34 + 40, height), 520);
    const pfx = `hbg-${index ?? 0}`;
    return (
      <ResponsiveContainer debounce={1} width="100%" height={dynH}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 4 }} onClick={handleChartClick} barCategoryGap="22%">
          <defs>
            {visibleDataKeys.map((k, i) => (
              <linearGradient key={k} id={`${pfx}-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={seriesColor(i)} stopOpacity={0.6}/>
                <stop offset="100%" stopColor={seriesColor(i)} stopOpacity={1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={130}
            tickFormatter={(v) => { const s = String(v ?? ''); return s.length > 22 ? s.slice(0, 20) + '…' : s; }}
          />
          <RTooltip content={ChartTooltip} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
          <Legend content={legend} />
          {visibleDataKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={`url(#${pfx}-${i})`} radius={[0, 6, 6, 0]} maxBarSize={24}>
              {data.length <= 12 && (
                <LabelList dataKey={k} position="right" formatter={(v: any) => typeof v === 'number' ? formatAxisTick(v, k) : ''} style={{ fontSize: 10, fill: tickColor, fontWeight: 600 }} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Scatter ───────────────────────────────────────────────────────────────
  if (chart_type === 'scatter') {
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} />
          <XAxis type="number" dataKey={xKey} name={prettifyCol(xKey)} tickFormatter={(v) => formatAxisTick(v, xKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}
            label={{ value: prettifyCol(xKey), position: 'insideBottom', offset: -12, fontSize: 11, fill: tickColor }}
          />
          <YAxis type="number" dataKey={dataKeys[0]} name={prettifyCol(dataKeys[0])} tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}
            label={{ value: prettifyCol(dataKeys[0]), angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: tickColor }}
          />
          <RTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="chart-tooltip">
                {payload.map((p: any, i: number) => (
                  <div key={i} className="ct-row">
                    <span className="ct-name">{prettifyCol(p.name || '')}</span>
                    <span className="ct-value">{formatAxisTick(p.value, p.name)}</span>
                  </div>
                ))}
              </div>
            );
          }} />
          <Scatter data={data} fill={seriesColor(0)} opacity={0.72} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  if (chart_type === 'table') {
    return <TableInsight data={data} colors={colors} />;
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  if (chart_type === 'timeline') {
    const TL_COLORS = ['#374f6e', '#e6a817', '#c0395a', '#1b6ca8', '#2abaab', '#6366f1', '#10b981'];
    return (
      <div style={{ position: 'relative', padding: '20px 0 8px', width: '100%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#e2e8f0', transform: 'translateX(-50%)' }} />
        {data.map((row, idx) => {
          const label    = String(row[xKey] ?? '');
          const titleVal = dataKeys[0] ? String(row[dataKeys[0]] ?? '') : '';
          const descVal  = dataKeys[1] ? String(row[dataKeys[1]] ?? '') : '';
          const isLeft   = idx % 2 === 0;
          const color    = TL_COLORS[idx % TL_COLORS.length];
          const banner = (
            <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {!isLeft && <div style={{ width: 0, height: 0, borderTop: '20px solid transparent', borderBottom: '20px solid transparent', borderRight: `13px solid ${color}` }} />}
              <div style={{ background: color, color: '#fff', padding: '10px 20px', borderRadius: isLeft ? '6px 0 0 6px' : '0 6px 6px 0', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{label}</div>
              {isLeft && <div style={{ width: 0, height: 0, borderTop: '20px solid transparent', borderBottom: '20px solid transparent', borderLeft: `13px solid ${color}` }} />}
            </div>
          );
          const cardEl = (titleVal || descVal) ? (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginTop: 10 }}>
              {titleVal && <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#344054', marginBottom: descVal ? 5 : 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titleVal}</div>}
              {descVal && <div style={{ fontSize: '0.82rem', color: '#667085', lineHeight: 1.55 }}>{descVal}</div>}
            </div>
          ) : null;
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'start', marginBottom: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 20 }}>
                {isLeft && <>{banner}{cardEl}</>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 13, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `3px solid ${color}`, background: 'var(--theme-bg-card,#fff)', flexShrink: 0 }} />
              </div>
              <div style={{ paddingLeft: 20 }}>{!isLeft && <>{banner}{cardEl}</>}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Analytics: Forecast ───────────────────────────────────────────────────
  if (chart_type === 'forecast') {
    const valKey = dataKeys[0] || '';
    const transformed: Record<string, any>[] = data.map(r => ({
      ...r,
      actual:   r.is_forecast ? null : r[valKey],
      forecast: r.is_forecast ? r[valKey] : null,
      upper:    r[`${valKey}_upper`] ?? null,
      lower:    r[`${valKey}_lower`] ?? null,
    }));
    const boundaryLabel = transformed.filter(r => !r['is_forecast']).slice(-1)[0]?.[xKey];
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ComposedChart data={transformed} margin={{ top: 8, right: 24, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="ci-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={seriesColor(0)} stopOpacity={0.18}/>
              <stop offset="95%" stopColor={seriesColor(0)} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={v => formatAxisTick(v, valKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ci-band)" legendType="none" name="Upper bound"/>
          <Line type="monotone" dataKey="actual" stroke={seriesColor(0)} strokeWidth={3} dot={{ r: 3, fill: seriesColor(0) }} name={valKey} connectNulls={false}/>
          <Line type="monotone" dataKey="forecast" stroke={seriesColor(0)} strokeWidth={2} strokeDasharray="7 4" dot={{ r: 4, fill: '#fff', stroke: seriesColor(0), strokeWidth: 2 }} name="Forecast" connectNulls={false}/>
          {boundaryLabel !== undefined && (
            <ReferenceLine x={String(boundaryLabel)} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '▶ Forecast', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}/>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Analytics: Trend decomposition ───────────────────────────────────────
  if (chart_type === 'trend') {
    const trendKeys = Object.keys(data[0] || {}).filter(k =>
      k !== xKey && !['is_forecast', 'momentum_pct', 'is_anomaly', 'deviation_factor'].includes(k)
    );
    const origKey = trendKeys[0] || '';
    const maKeys  = trendKeys.filter(k => k.startsWith('ma_'));
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
          <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={v => formatAxisTick(v, origKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          <Bar dataKey={origKey} fill={`${seriesColor(0)}55`} radius={[3,3,0,0]} name={origKey}/>
          {maKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={seriesColor(i + 1)} strokeWidth={2.5} dot={false} name={k.replace('_', ' ')}/>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Analytics: Pareto ─────────────────────────────────────────────────────
  if (chart_type === 'pareto') {
    const catKey  = _pareto_config?.category_col ?? xKey;
    const valKey2 = _pareto_config?.value_col ?? (dataKeys.find(k => k !== 'cumulative_pct' && k !== catKey) || dataKeys[0] || '');
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 40, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
          <XAxis dataKey={catKey} tick={{ fontSize: 10, fill: tickColor }} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: tickColor }} tickFormatter={v => formatAxisTick(v, valKey2)} axisLine={false} tickLine={false} width={56}/>
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36}/>
          <RTooltip content={ChartTooltip} />
          <Legend content={legend} />
          <Bar yAxisId="left" dataKey={valKey2} radius={[6,6,0,0]} name={valKey2}>
            {data.map((entry: any, idx: number) => (
              <Cell key={idx} fill={entry.is_vital_few ? seriesColor(0) : '#cbd5e1'}/>
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="Cumulative %"/>
          <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 3" label={{ value: '80%', position: 'insideRight', fontSize: 10, fill: '#ef4444' }}/>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Analytics: Holt-Winters timeseries forecast ───────────────────────────
  if (chart_type === 'timeseries') {
    const tsDateKey = _ts_config?.date_col ?? xKey;
    const tsValKey  = _ts_config?.value_col ?? (dataKeys.find(k => k !== 'smoothed' && !k.endsWith('_lower') && !k.endsWith('_upper') && k !== 'is_forecast') ?? dataKeys[0] ?? '');
    const lowerKey  = `${tsValKey}_lower`;
    const upperKey  = `${tsValKey}_upper`;
    const hasCiBands = data.some(r => r[lowerKey] != null);
    const firstForecastIdx = data.findIndex(r => r.is_forecast === true);
    const forecastStartLabel = firstForecastIdx >= 0 ? data[firstForecastIdx]?.[tsDateKey] : null;
    const ciData = data.map(r => ({
      ...r,
      _ci_base:  r[lowerKey] ?? null,
      _ci_width: (r[upperKey] != null && r[lowerKey] != null) ? Math.max(0, Number(r[upperKey]) - Number(r[lowerKey])) : null,
    }));
    return (
      <div style={{ width: '100%' }}>
        {_ts_config?.model_info && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, lineHeight: 1.3, paddingLeft: 2 }}>
            {_ts_config.model_info}
            {_ts_config.mape != null && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>MAPE {_ts_config.mape}%</span>}
          </div>
        )}
        <ResponsiveContainer debounce={1} width="100%" height={height}>
          <ComposedChart data={ciData} margin={{ top: 8, right: 24, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
            <XAxis dataKey={tsDateKey} tick={{ fontSize: 10, fill: tickColor }} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false} tickFormatter={v => formatXAxis(v)}/>
            <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={v => formatAxisTick(v, tsValKey)} axisLine={false} tickLine={false} width={60}/>
            <RTooltip content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              const isFc = payload[0]?.payload?.is_forecast;
              return (
                <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: isFc ? '#8b5cf6' : '#1e293b' }}>{String(label)}{isFc ? ' (forecast)' : ''}</div>
                  {payload.map((p: any) => {
                    if (p.dataKey === '_ci_base' || p.dataKey === '_ci_width') return null;
                    return <div key={p.dataKey} style={{ color: p.color ?? '#64748b' }}>{prettifyCol(p.dataKey)}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong></div>;
                  })}
                  {hasCiBands && payload[0]?.payload?.[lowerKey] != null && (
                    <div style={{ color: '#94a3b8', marginTop: 4, fontSize: 11 }}>95% CI: {payload[0].payload[lowerKey].toLocaleString()} – {payload[0].payload[upperKey]?.toLocaleString()}</div>
                  )}
                </div>
              );
            }}/>
            <Legend content={({ payload }: any) => {
              const items = (payload || []).filter((p: any) => p.dataKey !== '_ci_base' && p.dataKey !== '_ci_width');
              if (items.length < 2) return null;
              return <div className="chart-legend">{items.map((p: any, i: number) => <div key={i} className="cl-item"><span className="cl-dot" style={{ background: p.color }}/><span className="cl-name">{prettifyCol(p.dataKey)}</span></div>)}</div>;
            }}/>
            {forecastStartLabel != null && <ReferenceArea x1={forecastStartLabel} fill="#8b5cf608" stroke="#8b5cf620" strokeDasharray="4 4" label={{ value: 'Forecast', position: 'insideTopLeft', fontSize: 9, fill: '#8b5cf6' }}/>}
            {hasCiBands && (
              <>
                <Area dataKey="_ci_base" stroke="none" fill="transparent" legendType="none" isAnimationActive={false}/>
                <Area dataKey="_ci_width" stroke="none" fill="#8b5cf620" stackId="ci" legendType="none" isAnimationActive={false}/>
              </>
            )}
            <Bar dataKey={tsValKey} radius={[3,3,0,0]} name={tsValKey} isAnimationActive={false}>
              {ciData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.is_forecast ? '#8b5cf640' : seriesColor(0)}/>)}
            </Bar>
            <Line type="monotone" dataKey="smoothed" stroke="#8b5cf6" strokeWidth={2} dot={false} name="smoothed" isAnimationActive={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Analytics: Correlation heatmap ───────────────────────────────────────
  if (chart_type === 'heatmap') {
    const allCols = [...new Set(data.flatMap(r => [String(r.col_a), String(r.col_b)]))];
    const corrMap: Record<string, number> = {};
    data.forEach(r => { corrMap[`${r.col_a}|${r.col_b}`] = Number(r.correlation); });
    const corrColor = (v: number): string => {
      if (v >  0.7) return '#1d4ed8'; if (v >  0.4) return '#3b82f6'; if (v >  0.1) return '#93c5fd';
      if (v >= -0.1) return '#f8fafc'; if (v >= -0.4) return '#fca5a5'; if (v >= -0.7) return '#f87171';
      return '#dc2626';
    };
    const textOnCorr = (v: number): string => Math.abs(v) > 0.4 ? '#fff' : '#334155';
    const cSize = Math.max(36, Math.min(80, 300 / Math.max(allCols.length, 1)));
    return (
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: height + 40, padding: '4px 0' }}>
        <div style={{ display: 'inline-grid', gridTemplateColumns: `80px ${allCols.map(() => `${cSize}px`).join(' ')}`, gap: 3 }}>
          <div/>
          {allCols.map(c => <div key={c} title={c} style={{ width: cSize, fontSize: 9, textAlign: 'center', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px', fontWeight: 600 }}>{c.slice(0, 8)}</div>)}
          {allCols.map(rowCol => (
            <React.Fragment key={rowCol}>
              <div title={rowCol} style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, display: 'flex', alignItems: 'center', paddingRight: 4 }}>{rowCol.slice(0, 12)}</div>
              {allCols.map(colCol => {
                const v = corrMap[`${rowCol}|${colCol}`] ?? 1;
                return <div key={`${rowCol}|${colCol}`} title={`${rowCol} × ${colCol}: ${v.toFixed(2)}`} style={{ width: cSize, height: cSize, background: corrColor(v), borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: textOnCorr(v) }}>{v.toFixed(2)}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // ── Analytics: Anomaly detection ──────────────────────────────────────────
  if (chart_type === 'anomaly') {
    const valKey = dataKeys[0] || '';
    return (
      <ResponsiveContainer debounce={1} width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray={gridDash} stroke={gridStroke} vertical={false}/>
          <XAxis dataKey={xKey} tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={v => formatAxisTick(v, valKey)} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60}/>
          <RTooltip content={AnomalyTooltip} />
          <Legend content={legend} />
          {anomaly_info?.normal_range && (
            <ReferenceArea y1={anomaly_info.normal_range[0]} y2={anomaly_info.normal_range[1]} fill="#10b98108" stroke="#10b98140" strokeDasharray="4 4" label={{ value: 'Normal range', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }}/>
          )}
          <Bar dataKey={valKey} name={valKey} radius={[4,4,0,0]}>
            {data.map((entry: any, idx: number) => <Cell key={idx} fill={entry.is_anomaly ? '#ef4444' : seriesColor(0)}/>)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Analytics: Priority matrix ────────────────────────────────────────────
  if (chart_type === 'priority_matrix') {
    const keys = data[0] ? Object.keys(data[0]) : [];
    const xColKey = matrix_config?.x_col || keys.find(c => !['quadrant','priority_rank'].includes(c) && typeof data[0][c] === 'number') || '';
    const yColKey = matrix_config?.y_col || keys.filter(c => !['quadrant','priority_rank'].includes(c) && typeof data[0][c] === 'number')[1] || '';
    const labelKey = matrix_config?.label_col || keys.find(c => typeof data[0][c] === 'string' && c !== 'quadrant') || '';
    if (!xColKey || !yColKey) return <div className="dp-empty">Priority matrix data unavailable</div>;
    const xVals = data.map(r => Number(r[xColKey]));
    const yVals = data.map(r => Number(r[yColKey]));
    const xMin = Math.min(...xVals); const xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals); const yMax = Math.max(...yVals);
    const xRange = xMax - xMin || 1; const yRange = yMax - yMin || 1;
    const QUAD_COLORS: Record<string,string> = { 'Quick Win': '#10b981', 'Major Project': '#6366f1', 'Fill-In': '#f59e0b', 'Avoid': '#ef4444' };
    const QUAD_BG: Record<string,string>     = { 'Quick Win': '#10b98110', 'Major Project': '#6366f110', 'Fill-In': '#f59e0b10', 'Avoid': '#ef444410' };
    return (
      <div style={{ position: 'relative', width: '100%', height, userSelect: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}>
          {[{ label: '⚡ Quick Win', color: '#10b981', bg: QUAD_BG['Quick Win'] }, { label: '🚀 Major Project', color: '#6366f1', bg: QUAD_BG['Major Project'] }, { label: '📋 Fill-In', color: '#f59e0b', bg: QUAD_BG['Fill-In'] }, { label: '✗ Avoid', color: '#ef4444', bg: QUAD_BG['Avoid'] }].map(q => (
            <div key={q.label} style={{ background: q.bg, border: `1.5px solid ${q.color}30`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: q.color, opacity: 0.9 }}>{q.label}</div>
          ))}
        </div>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {data.map((row, i) => {
            const px = ((Number(row[xColKey]) - xMin) / xRange) * 88 + 6;
            const py = 100 - (((Number(row[yColKey]) - yMin) / yRange) * 88 + 6);
            const qColor = QUAD_COLORS[String(row.quadrant)] || colors[0];
            const lbl = String(row[labelKey] || '').slice(0, 14);
            return (
              <g key={i}>
                <circle cx={`${px}%`} cy={`${py}%`} r={8} fill={qColor} fillOpacity={0.85}/>
                <text x={`${px}%`} y={`${py}%`} dy={-12} textAnchor="middle" fontSize={9} fill="#334155" fontWeight={600}>{lbl}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#94a3b8', pointerEvents: 'none' }}>← {xColKey} (effort) →</div>
        <div style={{ position: 'absolute', top: '50%', left: 0, fontSize: 10, color: '#94a3b8', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center', pointerEvents: 'none' }}>↑ {yColKey}</div>
      </div>
    );
  }

  // ── Default: vertical bar ─────────────────────────────────────────────────
  const numBars = data.length;
  const hasLongLabels = data.some(d => String(d[xKey] ?? '').length > 10);
  const needsAngle = numBars > 7 || hasLongLabels;
  const extraBottom = needsAngle ? 60 : 5;
  const pfx = `vbg-${index ?? 0}`;
  return (
    <ResponsiveContainer debounce={1} width="100%" height={height + (needsAngle ? 28 : 0)}>
      <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: extraBottom }} onClick={handleChartClick} barCategoryGap="28%">
        <defs>
          {visibleDataKeys.map((k, i) => (
            <linearGradient key={k} id={`${pfx}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(i)} stopOpacity={1}/>
              <stop offset="100%" stopColor={seriesColor(i)} stopOpacity={0.62}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey={xKey}
          tickFormatter={(v) => { const s = formatXAxis(v); return needsAngle && s.length > 14 ? s.slice(0, 12) + '…' : s; }}
          tick={needsAngle ? { fontSize: 10, fill: tickColor, angle: -38, textAnchor: 'end', dy: 4 } : { fontSize: 11, fill: tickColor }}
          axisLine={false} tickLine={false}
          interval={numBars > 20 ? Math.floor(numBars / 15) : 0}
        />
        <YAxis tickFormatter={(v) => formatAxisTick(v, dataKeys[0])} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={60} />
        <RTooltip content={ChartTooltip} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
        <Legend content={legend} />
        {visibleDataKeys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={`url(#${pfx}-${i})`} radius={[6,6,0,0]} maxBarSize={52}>
            {numBars <= 8 && dataKeys.length === 1 && (
              <LabelList dataKey={k} position="top" formatter={(v: any) => typeof v === 'number' ? formatAxisTick(v, k) : ''} style={{ fontSize: 10, fill: tickColor, fontWeight: 600 }} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
