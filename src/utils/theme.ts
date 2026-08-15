// App-wide light/dark theme. Sets data-theme on <html>; the CSS in App.css +
// tokens.css keys off it. Persisted to localStorage; first load respects the
// OS preference.
export type ThemeMode = 'light' | 'dark';

const KEY = 'lr_theme';

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // Light is the default; dark is opt-in via the toggle (we don't follow the
  // OS preference, so first-time visitors always get the polished light theme).
  return 'light';
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', mode);
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
}

/** Set the initial theme before first paint (call from main.tsx). */
export function initTheme(): void {
  document.documentElement.setAttribute('data-theme', getTheme());
}

/** Flip and persist; returns the new mode. */
export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
