/**
 * GeoMapChart — choropleth map for geographic data. Detects whether the
 * location column holds US states or world countries, lazy-loads the matching
 * GeoJSON (bundled in /public/geo), registers it with echarts, and renders a
 * value-shaded map. Used for chart_type === 'map'.
 */

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { ChartAdapterProps } from '../types';
import { prettifyCol, formatAxisTick, isCurrencyKey } from '../utils';

// US states — code → canonical GeoJSON name.
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};
const US_NAME_SET = new Set(Object.values(US_STATES).map(s => s.toLowerCase()));

// Common country aliases → the canonical name used in world-countries.geojson.
const COUNTRY_ALIAS: Record<string, string> = {
  'usa': 'United States of America', 'us': 'United States of America',
  'united states': 'United States of America', 'u.s.': 'United States of America',
  'u.s.a.': 'United States of America', 'america': 'United States of America',
  'uk': 'United Kingdom', 'u.k.': 'United Kingdom', 'great britain': 'United Kingdom',
  'britain': 'United Kingdom', 'england': 'United Kingdom',
  'uae': 'United Arab Emirates', 'south korea': 'South Korea', 'korea': 'South Korea',
  'russia': 'Russia', 'czech republic': 'Czechia', 'czechia': 'Czechia',
  'ivory coast': "Côte d'Ivoire", 'drc': 'Dem. Rep. Congo',
  'democratic republic of the congo': 'Dem. Rep. Congo',
  'tanzania': 'Tanzania', 'burma': 'Myanmar', 'bolivia': 'Bolivia',
};

const _registered: Record<string, boolean> = {};
async function ensureMap(name: string, url: string): Promise<boolean> {
  if (_registered[name]) return true;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    echarts.registerMap(name, await res.json());
    _registered[name] = true;
    return true;
  } catch {
    return false;
  }
}

function toTitle(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/** Decide US-states vs world-countries and normalize each location to the
 *  GeoJSON's canonical name. */
function prepare(data: any[], locKey: string) {
  const raw = data.map(r => String(r[locKey] ?? '').trim()).filter(Boolean);
  let usHits = 0;
  for (const v of raw) {
    const up = v.toUpperCase();
    if (US_STATES[up] || US_NAME_SET.has(v.toLowerCase())) usHits++;
  }
  const isUS = raw.length > 0 && usHits / raw.length >= 0.5;
  const normalize = (v: string): string => {
    const t = v.trim();
    if (isUS) {
      const up = t.toUpperCase();
      if (US_STATES[up]) return US_STATES[up];
      return toTitle(t);
    }
    const alias = COUNTRY_ALIAS[t.toLowerCase()];
    return alias || t;
  };
  return {
    isUS,
    mapName: isUS ? 'us-states' : 'world-countries',
    mapUrl: isUS ? '/geo/us-states.geojson' : '/geo/world-countries.geojson',
    normalize,
  };
}

export function GeoMapChart({ spec }: ChartAdapterProps) {
  const { data, xKey, dataKeys, height } = spec;
  const keys = data.length ? Object.keys(data[0]) : [];
  const locKey = xKey || keys[0] || 'location';
  const valKey = dataKeys[0] || keys.find(k => k !== locKey) || 'value';

  const { mapName, mapUrl, normalize } = prepare(data, locKey);
  const [ready, setReady] = useState<boolean>(!!_registered[mapName]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    ensureMap(mapName, mapUrl).then(ok => { if (alive) { setReady(ok); setFailed(!ok); } });
    return () => { alive = false; };
  }, [mapName, mapUrl]);

  if (failed) return <div className="dp-empty">Map data unavailable.</div>;
  if (!ready) return <div className="dp-empty" style={{ height }}>Loading map…</div>;

  const seriesData = data
    .map(r => ({ name: normalize(String(r[locKey] ?? '')), value: Number(r[valKey]) }))
    .filter(d => d.name && Number.isFinite(d.value));
  const vals = seriesData.map(d => d.value);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const curr = isCurrencyKey(valKey);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const v = p.value;
        const disp = Number.isFinite(v) ? (curr ? '$' : '') + formatAxisTick(v, valKey) : 'No data';
        return `<strong>${p.name}</strong><br/>${prettifyCol(valKey)}: ${disp}`;
      },
    },
    visualMap: {
      min, max, left: 'left', bottom: 8, calculable: true,
      text: ['High', 'Low'], textStyle: { fontSize: 10, color: '#64748b' },
      inRange: { color: ['#eef2ff', '#c7d2fe', '#818cf8', '#6366f1', '#4338ca'] },
    },
    series: [{
      type: 'map', map: mapName, roam: false,
      scaleLimit: { min: 1, max: 4 },
      label: { show: false },
      itemStyle: { borderColor: '#ffffff', borderWidth: 0.5, areaColor: '#f1f5f9' },
      emphasis: { label: { show: false }, itemStyle: { areaColor: '#a5b4fc' } },
      data: seriesData,
    }],
  };

  return <ReactECharts option={option} notMerge lazyUpdate style={{ height, width: '100%' }} />;
}

export default GeoMapChart;
