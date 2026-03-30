export interface BrandKit {
  primary_color:   string;
  secondary_color: string;
  bg_color:        string;
  text_color:      string;
  heading_font:    string;
  body_font:       string;
  border_radius:   number;
  shadow_style:    'none' | 'subtle' | 'elevated';
  logo_url:        string;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary_color:   '#6366f1',
  secondary_color: '#10b981',
  bg_color:        '#ffffff',
  text_color:      '#1e293b',
  heading_font:    'Inter',
  body_font:       'Inter',
  border_radius:   8,
  shadow_style:    'subtle',
  logo_url:        '',
};

export const BRAND_FONTS = [
  'Inter', 'Roboto', 'DM Sans', 'Montserrat', 'Playfair Display',
  'Lato', 'Open Sans', 'Nunito', 'Poppins', 'Source Sans 3',
  'JetBrains Mono',
];

export const SHADOW_OPTIONS: { value: BrandKit['shadow_style']; label: string; preview: string }[] = [
  { value: 'none',     label: 'None',     preview: 'none' },
  { value: 'subtle',   label: 'Subtle',   preview: '0 1px 4px rgba(0,0,0,0.08)' },
  { value: 'elevated', label: 'Elevated', preview: '0 4px 16px rgba(0,0,0,0.14)' },
];
