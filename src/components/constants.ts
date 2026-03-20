export const BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api'
    : 'https://13.201.72.131.sslip.io/api';

export const PALETTES: Record<string, string[]> = {
  vibrant:   ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#f97316','#06b6d4','#84cc16'],
  pastel:    ['#a5b4fc','#c4b5fd','#f9a8d4','#fcd34d','#6ee7b7','#93c5fd','#fca5a5','#fdba74','#67e8f9','#bef264'],
  neon:      ['#00f2ff','#7000ff','#ff00d9','#fffb00','#00ff40','#ff8c00','#ff0055','#4dff00','#0077ff','#bc00ff'],
  corporate: ['#1e293b','#334155','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#0f172a','#1e1b4b','#312e81'],
  emerald:   ['#059669','#10b981','#34d399','#6ee7b7','#a7f3d0','#064e3b','#065f46','#047857','#059669','#10b981'],
  royal:     ['#1e3a8a','#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#eff6ff','#1e3a8a'],
  cyberpunk: ['#ff0055','#00ff9f','#00b8ff','#f000ff','#fffb00','#ff8c00','#00f2ff','#bc00ff','#7000ff','#ff00d9'],
};

export const COLORS = PALETTES.vibrant;

export const FONTS = [
  { id: 'inter',      name: 'Inter (Clean)',       value: "'Inter', sans-serif" },
  { id: 'roboto',     name: 'Roboto (System)',      value: "'Roboto', sans-serif" },
  { id: 'playfair',   name: 'Playfair (Elegant)',   value: "'Playfair Display', serif" },
  { id: 'montserrat', name: 'Montserrat (Modern)',  value: "'Montserrat', sans-serif" },
  { id: 'jetbrains',  name: 'JetBrains Mono',       value: "'JetBrains Mono', monospace" },
];

export const THEMES = [
  { id: 'light',          name: 'Light',          color: '#ffffff', class: '' },
  { id: 'dark-pro',       name: 'Dark Pro',        color: '#1e293b', class: 'theme-dark-pro' },
  { id: 'midnight',       name: 'Midnight',        color: '#030712', class: 'theme-midnight' },
  { id: 'glassmorphism',  name: 'Glassmorphism',   color: '#ebedee', class: 'theme-glassmorphism' },
  { id: 'corporate',      name: 'Corporate',       color: '#0f172a', class: 'theme-corporate' },
  { id: 'sunset',         name: 'Sunset',          color: '#f97316', class: 'theme-sunset' },
  { id: 'ocean',          name: 'Ocean',           color: '#06b6d4', class: 'theme-ocean' },
  { id: 'neon',           name: 'Neon',            color: '#a855f7', class: 'theme-neon' },
  { id: 'canva',          name: 'Canva Pro',       color: '#7d2ae8', class: 'theme-canva' },
];

export const EMOJIS = ['📊','📈','📉','🗂️','💡','🚀','🏆','💰','🌍','⚡','🎯','📦'];

export const INFOGRAPHIC_TEMPLATES = [
  {
    id: 'annual-report',
    name: 'Annual Report',
    icon: '📋',
    desc: 'Clean corporate layout with professional typography',
    posterTheme: 'light' as const,
    accent: '#2563eb',
    preview: ['#f8fafc', '#ffffff', '#2563eb'],
  },
  {
    id: 'exec-brief',
    name: 'Executive Brief',
    icon: '📊',
    desc: 'Dark, authoritative — boardroom ready',
    posterTheme: 'dark' as const,
    accent: '#6366f1',
    preview: ['#0f172a', '#1e293b', '#6366f1'],
  },
  {
    id: 'brand-story',
    name: 'Brand Story',
    icon: '✨',
    desc: 'Vivid gradient for social and marketing decks',
    posterTheme: 'branded' as const,
    accent: '#a855f7',
    preview: ['#2d1b6e', '#3b1f8e', '#a855f7'],
  },
  {
    id: 'press-release',
    name: 'Press Release',
    icon: '📰',
    desc: 'Editorial newspaper style with bold headlines',
    posterTheme: 'newspaper' as const,
    accent: '#1f2937',
    preview: ['#faf8f4', '#f3f0e8', '#1f2937'],
  },
  {
    id: 'campaign-recap',
    name: 'Campaign Recap',
    icon: '🎯',
    desc: 'High-energy marketing performance report',
    posterTheme: 'branded' as const,
    accent: '#ec4899',
    preview: ['#1a0030', '#2d0052', '#ec4899'],
  },
  {
    id: 'data-digest',
    name: 'Data Digest',
    icon: '🔬',
    desc: 'Technical deep-dive with a cyberpunk edge',
    posterTheme: 'dark' as const,
    accent: '#06b6d4',
    preview: ['#030712', '#0c1222', '#06b6d4'],
  },
];

export const TEMPLATES = [
  { id: 'sales',      emoji: '💰', name: 'Sales Leader',        desc: 'Revenue trends, top customers, product breakdown',       prompt: 'Build me a comprehensive Sales Leader Dashboard' },
  { id: 'marketing',  emoji: '📣', name: 'Marketing Analyst',   desc: 'Customer acquisition, retention, regional reach',         prompt: 'Build me a Marketing Analytics Dashboard' },
  { id: 'finance',    emoji: '📊', name: 'Finance Overview',    desc: 'Revenue vs targets, margins, outstanding invoices',       prompt: 'Build me a Finance Overview Dashboard' },
  { id: 'operations', emoji: '⚙️', name: 'Operations Hub',      desc: 'Inventory flow, order volume, fulfillment speed',         prompt: 'Build me an Operations Hub Dashboard' },
  { id: 'hr',         emoji: '👥', name: 'HR People Analytics', desc: 'Headcount trends, department mix, tenure analysis',       prompt: 'Build me an HR People Analytics Dashboard' },
];
