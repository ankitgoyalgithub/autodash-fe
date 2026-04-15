import type { ChartSpec, ChartLibrary } from './types';
import { RechartsAdapter } from './adapters/recharts';
import { EChartsAdapter } from './adapters/echarts';
import { D3Adapter } from './adapters/d3';

// ── Types that require a specific adapter ─────────────────────────────────────
const ECHARTS_TYPES = new Set(['bar3d', 'scatter3d', 'pie3d']);
const D3_TYPES      = new Set(['treemap', 'sunburst', 'sankey', 'bump', 'force']);

// ── ChartRenderer ─────────────────────────────────────────────────────────────
// Routes a canonical ChartSpec to the correct adapter.
//
// Usage:
//   <ChartRenderer spec={spec} />                  → auto-select adapter
//   <ChartRenderer spec={spec} library="recharts" /> → force Recharts
//   <ChartRenderer spec={spec} library="echarts" />  → force ECharts (future: highcharts, d3, plotly)
//
// Adding a new library:
//   1. Create src/renderers/adapters/highcharts.tsx implementing ChartAdapterProps
//   2. Import it here and add a case in the switch below
//   3. Pass library="highcharts" from the card or let auto-select route to it

interface ChartRendererProps {
  spec: ChartSpec;
  library?: ChartLibrary;
}

export function ChartRenderer({ spec, library }: ChartRendererProps) {
  // Resolve which adapter to use
  const resolved = resolveLibrary(spec.chart_type, library);

  switch (resolved) {
    case 'echarts':
      return <EChartsAdapter spec={spec} />;
    case 'd3':
      return <D3Adapter spec={spec} />;
    case 'recharts':
    default:
      return <RechartsAdapter spec={spec} />;

    // Stubs for future adapters — uncomment when implemented:
    // case 'highcharts': return <HighchartsAdapter spec={spec} />;
    // case 'plotly':     return <PlotlyAdapter spec={spec} />;
  }
}

// ── Auto-select logic ─────────────────────────────────────────────────────────
function resolveLibrary(chart_type: string, requested?: ChartLibrary): ChartLibrary {
  // Explicit override always wins
  if (requested) return requested;
  // 3D types require ECharts
  if (ECHARTS_TYPES.has(chart_type)) return 'echarts';
  // D3-native types
  if (D3_TYPES.has(chart_type)) return 'd3';
  // Everything else defaults to Recharts
  return 'recharts';
}
