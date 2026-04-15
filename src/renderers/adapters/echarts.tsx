import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import type { ChartAdapterProps } from '../types';
import { prettifyCol } from '../utils';

// ── ECharts adapter — 3D chart types ─────────────────────────────────────────
// Handles: bar3d | scatter3d | pie3d
// All other types fall through to the Recharts adapter.

export function EChartsAdapter({ spec }: ChartAdapterProps) {
  const { chart_type, data, xKey, dataKeys, colors, height } = spec;

  // ── 3D Bar ────────────────────────────────────────────────────────────────
  if (chart_type === 'bar3d') {
    const categories = data.map(r => String(r[xKey] ?? ''));
    const seriesData = dataKeys.map((k, ki) => ({
      type: 'bar3D' as const,
      name: prettifyCol(k),
      data: data.map((r, i) => [i, ki, typeof r[k] === 'number' ? r[k] : 0]),
      shading: 'lambert',
      itemStyle: { color: colors[ki % colors.length] + 'dd' },
      emphasis: { itemStyle: { color: colors[ki % colors.length] } },
      label: { show: false },
    }));
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' as const },
      grid3D: {
        boxWidth: 200,
        boxDepth: dataKeys.length * 40 + 20,
        boxHeight: 80,
        viewControl: { projection: 'perspective', autoRotate: false, distance: 250, beta: 28, alpha: 18 },
        light: { main: { intensity: 1.3 }, ambient: { intensity: 0.3 } },
      },
      xAxis3D: {
        type: 'category' as const,
        data: categories,
        axisLabel: { fontSize: 10, interval: categories.length > 10 ? Math.ceil(categories.length / 10) - 1 : 0 },
      },
      yAxis3D: { type: 'category' as const, data: dataKeys.map(k => prettifyCol(k)), axisLabel: { fontSize: 10 } },
      zAxis3D: { type: 'value' as const, axisLabel: { fontSize: 10 } },
      series: seriesData,
    };
    return <ReactECharts option={option} style={{ height: Math.max(height + 60, 340), width: '100%' }} />;
  }

  // ── 3D Scatter ────────────────────────────────────────────────────────────
  if (chart_type === 'scatter3d') {
    const keys = Object.keys(data[0] || {});
    const k0 = keys[0]; const k1 = keys[1]; const k2 = keys[2] || keys[1];
    const scData = data.map(r => [
      typeof r[k0] === 'number' ? r[k0] : 0,
      typeof r[k1] === 'number' ? r[k1] : 0,
      typeof r[k2] === 'number' ? r[k2] : 0,
    ]);
    const option = {
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: any) => `${prettifyCol(k0)}: ${p.value[0]}<br/>${prettifyCol(k1)}: ${p.value[1]}<br/>${prettifyCol(k2)}: ${p.value[2]}` },
      grid3D: {
        viewControl: { autoRotate: false, distance: 200, beta: 30, alpha: 20 },
        light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } },
      },
      xAxis3D: { name: prettifyCol(k0), type: 'value' as const, axisLabel: { fontSize: 10 } },
      yAxis3D: { name: prettifyCol(k1), type: 'value' as const, axisLabel: { fontSize: 10 } },
      zAxis3D: { name: prettifyCol(k2), type: 'value' as const, axisLabel: { fontSize: 10 } },
      series: [{
        type: 'scatter3D' as const,
        data: scData,
        symbolSize: 8,
        itemStyle: { color: colors[0], opacity: 0.8 },
      }],
    };
    return <ReactECharts option={option} style={{ height: Math.max(height + 60, 340), width: '100%' }} />;
  }

  // ── 3D Pie (depth shadow effect via ECharts) ──────────────────────────────
  if (chart_type === 'pie3d') {
    const PIE3D_MAX = 8;
    let pieData = data;
    if (data.length > PIE3D_MAX) {
      const sorted = [...data].sort((a, b) => (b[dataKeys[0]] || 0) - (a[dataKeys[0]] || 0));
      const otherVal = sorted.slice(PIE3D_MAX - 1).reduce((s: number, r: any) => s + (typeof r[dataKeys[0]] === 'number' ? r[dataKeys[0]] : 0), 0);
      pieData = [...sorted.slice(0, PIE3D_MAX - 1), { [xKey]: 'Other', [dataKeys[0]]: otherVal }];
    }
    const tickColor = '#64748b';
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical' as const, right: 10, top: 20, textStyle: { fontSize: 11, color: tickColor } },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        center: ['42%', '52%'],
        data: pieData.map((r: any, i: number) => ({
          value: typeof r[dataKeys[0]] === 'number' ? r[dataKeys[0]] : 0,
          name: String(r[xKey] ?? ''),
          itemStyle: {
            color: colors[i % colors.length],
            shadowBlur: 14,
            shadowColor: colors[i % colors.length] + '55',
            shadowOffsetY: 6,
          },
        })),
        label: { fontSize: 11, formatter: '{b}\n{d}%' },
        emphasis: { itemStyle: { shadowBlur: 24, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
      }],
    };
    return <ReactECharts option={option} style={{ height, width: '100%' }} />;
  }

  return <div className="dp-empty">Unsupported ECharts type: {chart_type}</div>;
}
