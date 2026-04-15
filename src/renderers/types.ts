// ── Canonical chart spec — library-agnostic ───────────────────────────────────
// The AI backend emits these canonical type names. Adapters translate them to
// whatever the target library expects internally.

export type CanonicalChartType =
  // Standard
  | 'bar' | 'horizontal_bar' | 'stacked_bar'
  | 'line' | 'area'
  | 'pie'
  | 'scatter'
  | 'table'
  | 'timeline'
  // Combo
  | 'combo_bar_line'
  // Analytics
  | 'forecast' | 'timeseries' | 'trend' | 'pareto'
  | 'heatmap' | 'anomaly' | 'priority_matrix'
  // 3D (ECharts)
  | 'bar3d' | 'scatter3d' | 'pie3d'
  // D3-native
  | 'treemap' | 'sunburst' | 'sankey' | 'bump' | 'force'
  // Fallback
  | string;

// Metadata the analytics engine attaches to specific chart types
export interface TSConfig {
  date_col: string;
  value_col: string;
  horizon: number;
  model_info?: string;
  mape?: number | null;
}

export interface ParetoConfig {
  category_col: string;
  value_col: string;
}

export interface MatrixConfig {
  x_col: string;
  y_col: string;
  label_col: string;
}

export interface AnomalyInfo {
  anomalies: any[];
  normal_range: [number, number];
  severity: 'low' | 'medium' | 'high';
  anomaly_count: number;
  mean: number;
}

// ── The canonical spec passed from ChartRenderer → adapter ────────────────────
export interface ChartSpec {
  chart_type: CanonicalChartType;

  // Data — already filtered and sorted by InsightCard
  data: Record<string, any>[];
  xKey: string;         // categorical / x-axis column
  dataKeys: string[];   // numeric / y-axis columns (series)

  // Appearance
  colors: string[];
  height: number;
  index?: number;       // card position in dashboard, used for color offset
  isPoster?: boolean;
  gridStroke?: string;
  gridDash?: string;

  // Interactivity — controlled by InsightCard state
  hiddenSeries: Set<string>;
  onToggleSeries: (key: string) => void;
  onDrillDown?: (dimension: string, value: string | number) => void;
  onChartClick?: (payload: any) => void;

  // Analytics metadata (optional, only present on analytics cards)
  anomaly_info?: AnomalyInfo;
  matrix_config?: MatrixConfig;
  _ts_config?: TSConfig;
  _pareto_config?: ParetoConfig;
}

// ── Adapter contract — every adapter must accept this ─────────────────────────
export interface ChartAdapterProps {
  spec: ChartSpec;
}

// ── Library selector ──────────────────────────────────────────────────────────
export type ChartLibrary = 'recharts' | 'echarts' | 'highcharts' | 'd3' | 'plotly';
