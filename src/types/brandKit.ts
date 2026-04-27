export interface BrandKit {
  // Core palette
  primary_color:   string;
  secondary_color: string;
  accent_color:    string;
  bg_color:        string;
  text_color:      string;
  text_secondary:  string;

  // Semantic colors
  success_color:   string;
  warning_color:   string;
  danger_color:    string;
  info_color:      string;

  // Surface
  surface_color:   string;
  border_color:    string;

  // Typography
  heading_font:    string;
  body_font:       string;
  base_font_size:  number;

  // Chart series palette
  chart_colors:    string[];

  // Styling
  border_radius:   number;
  shadow_style:    'none' | 'subtle' | 'medium' | 'elevated';
  card_style:      'flat' | 'bordered' | 'shadow' | 'glass';
  layout_density:  'compact' | 'comfortable' | 'spacious';

  // Theme
  theme_mode:      'light' | 'dark' | 'auto';

  // Identity
  company_name:    string;
  logo_url:        string;
  favicon_url:     string;

  // Custom CSS
  custom_css:      string;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary_color:   '#6366f1',
  secondary_color: '#10b981',
  accent_color:    '#f59e0b',
  bg_color:        '#ffffff',
  text_color:      '#1e293b',
  text_secondary:  '#64748b',

  success_color:   '#10b981',
  warning_color:   '#f59e0b',
  danger_color:    '#ef4444',
  info_color:      '#3b82f6',

  surface_color:   '#ffffff',
  border_color:    '#e2e8f0',

  heading_font:    'Inter',
  body_font:       'Inter',
  base_font_size:  14,

  chart_colors:    ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'],

  border_radius:   8,
  shadow_style:    'subtle',
  card_style:      'shadow',
  layout_density:  'comfortable',

  theme_mode:      'light',

  company_name:    '',
  logo_url:        '',
  favicon_url:     '',

  custom_css:      '',
};

export const BRAND_FONTS = [
  'Inter', 'Roboto', 'DM Sans', 'Montserrat', 'Playfair Display',
  'Lato', 'Open Sans', 'Nunito', 'Poppins', 'Source Sans 3',
  'JetBrains Mono', 'Space Grotesk', 'Sora', 'Outfit',
];

export const SHADOW_OPTIONS: { value: BrandKit['shadow_style']; label: string; preview: string }[] = [
  { value: 'none',     label: 'None',     preview: 'none' },
  { value: 'subtle',   label: 'Subtle',   preview: '0 1px 4px rgba(0,0,0,0.08)' },
  { value: 'medium',   label: 'Medium',   preview: '0 2px 8px rgba(0,0,0,0.1)' },
  { value: 'elevated', label: 'Elevated', preview: '0 4px 16px rgba(0,0,0,0.14)' },
];

export const CARD_STYLE_OPTIONS: { value: BrandKit['card_style']; label: string }[] = [
  { value: 'flat',     label: 'Flat' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'shadow',   label: 'Shadow' },
  { value: 'glass',    label: 'Glass' },
];

export const DENSITY_OPTIONS: { value: BrandKit['layout_density']; label: string }[] = [
  { value: 'compact',     label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious',    label: 'Spacious' },
];

export const THEME_MODE_OPTIONS: { value: BrandKit['theme_mode']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark',  label: 'Dark' },
  { value: 'auto',  label: 'Auto' },
];

/** Enterprise brand presets — one-click starting points. */
export const BRAND_PRESETS: { id: string; name: string; desc: string; kit: Partial<BrandKit> }[] = [
  {
    id: 'corporate',
    name: 'Corporate',
    desc: 'Clean and professional',
    kit: {
      primary_color: '#1e40af', secondary_color: '#0f766e', accent_color: '#0369a1',
      bg_color: '#f8fafc', text_color: '#0f172a', text_secondary: '#475569',
      surface_color: '#ffffff', border_color: '#cbd5e1',
      heading_font: 'Inter', body_font: 'Inter',
      shadow_style: 'subtle', card_style: 'bordered', border_radius: 6,
      chart_colors: ['#1e40af', '#0f766e', '#0369a1', '#6d28d9', '#0891b2', '#4f46e5', '#0d9488', '#1d4ed8'],
    },
  },
  {
    id: 'fintech',
    name: 'Fintech',
    desc: 'Dark, data-dense',
    kit: {
      primary_color: '#22d3ee', secondary_color: '#a78bfa', accent_color: '#fbbf24',
      bg_color: '#0f172a', text_color: '#e2e8f0', text_secondary: '#94a3b8',
      surface_color: '#1e293b', border_color: '#334155',
      heading_font: 'Space Grotesk', body_font: 'Inter',
      shadow_style: 'none', card_style: 'bordered', border_radius: 8, theme_mode: 'dark',
      chart_colors: ['#22d3ee', '#a78bfa', '#fbbf24', '#f472b6', '#34d399', '#fb923c', '#60a5fa', '#c084fc'],
    },
  },
  {
    id: 'startup',
    name: 'Startup',
    desc: 'Bold and energetic',
    kit: {
      primary_color: '#7c3aed', secondary_color: '#ec4899', accent_color: '#f59e0b',
      bg_color: '#faf5ff', text_color: '#1e1b4b', text_secondary: '#6b21a8',
      surface_color: '#ffffff', border_color: '#ddd6fe',
      heading_font: 'Sora', body_font: 'DM Sans',
      shadow_style: 'medium', card_style: 'shadow', border_radius: 12,
      chart_colors: ['#7c3aed', '#ec4899', '#f59e0b', '#06b6d4', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6'],
    },
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    desc: 'Trust and clarity',
    kit: {
      primary_color: '#0891b2', secondary_color: '#059669', accent_color: '#0284c7',
      bg_color: '#f0fdfa', text_color: '#134e4a', text_secondary: '#115e59',
      surface_color: '#ffffff', border_color: '#99f6e4',
      heading_font: 'Nunito', body_font: 'Open Sans',
      shadow_style: 'subtle', card_style: 'shadow', border_radius: 10,
      chart_colors: ['#0891b2', '#059669', '#0284c7', '#0d9488', '#06b6d4', '#14b8a6', '#0e7490', '#047857'],
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Monochrome elegance',
    kit: {
      primary_color: '#18181b', secondary_color: '#71717a', accent_color: '#a1a1aa',
      bg_color: '#fafafa', text_color: '#18181b', text_secondary: '#52525b',
      surface_color: '#ffffff', border_color: '#e4e4e7',
      heading_font: 'Outfit', body_font: 'Inter',
      shadow_style: 'none', card_style: 'bordered', border_radius: 4,
      chart_colors: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#27272a', '#404040'],
    },
  },
];
