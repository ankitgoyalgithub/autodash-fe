// Always use a relative path — Vite proxies /api → Django in dev.
// In production we hit the backend directly to bypass Netlify's 26s proxy timeout.
export const BASE = import.meta.env.PROD ? 'https://13.201.72.131.sslip.io/api' : '/api';

export const PALETTES: Record<string, string[]> = {
  // Maximally distinct first — cool/warm alternating so multi-series charts never clash
  vibrant:   ['#6366f1','#f59e0b','#10b981','#ef4444','#06b6d4','#ec4899','#f97316','#8b5cf6','#22d3ee','#84cc16'],
  // Softer tones that stay readable on white and dark backgrounds
  pastel:    ['#818cf8','#fbbf24','#6ee7b7','#f87171','#67e8f9','#f9a8d4','#fda4af','#a5f3fc','#d9f99d','#c4b5fd'],
  // Vivid but not harsh — good for dark themes
  neon:      ['#a78bfa','#34d399','#fb923c','#22d3ee','#f472b6','#facc15','#60a5fa','#4ade80','#e879f9','#38bdf8'],
  // Serious, dark, high-contrast for corporate reports
  corporate: ['#1e40af','#0f766e','#9a3412','#4c1d95','#064e3b','#831843','#0c4a6e','#365314','#1c1917','#44403c'],
  // Nature-inspired greens and teals with complementary accents
  emerald:   ['#059669','#0891b2','#65a30d','#0d9488','#16a34a','#2563eb','#7c3aed','#ca8a04','#dc2626','#0f766e'],
  // Rich navy/violet palette for executive dashboards
  royal:     ['#1d4ed8','#7c3aed','#0891b2','#0f766e','#b45309','#9333ea','#1e40af','#065f46','#6d28d9','#0369a1'],
  // High-energy neon for dark themes and modern tech dashboards
  cyberpunk: ['#a855f7','#06b6d4','#f472b6','#4ade80','#facc15','#60a5fa','#fb923c','#34d399','#818cf8','#f87171'],
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
