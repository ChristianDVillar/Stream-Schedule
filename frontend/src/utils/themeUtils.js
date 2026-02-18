import React from 'react';

/**
 * Accent color values (hex) for CSS variables.
 * Used by Settings and App to apply and persist accent color.
 */
export const ACCENT_COLORS = {
  blue: { hex: '#3b82f6', hexHover: '#2563eb' },
  purple: { hex: '#9333ea', hexHover: '#7e22ce' },
  green: { hex: '#22c55e', hexHover: '#16a34a' },
  red: { hex: '#ef4444', hexHover: '#dc2626' },
  orange: { hex: '#f97316', hexHover: '#ea580c' },
};

const STORAGE_KEY = 'accentColor';

export function getStoredAccentColor() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return ACCENT_COLORS[stored] ? stored : 'blue';
  } catch {
    return 'blue';
  }
}

/**
 * Apply accent color to the document and persist to localStorage.
 * @param {keyof ACCENT_COLORS} id - One of 'blue' | 'purple' | 'green' | 'red' | 'orange'
 */
export function applyAccentColor(id) {
  const colors = ACCENT_COLORS[id] || ACCENT_COLORS.blue;
  document.documentElement.style.setProperty('--accent', colors.hex);
  document.documentElement.style.setProperty('--accent-hover', colors.hexHover);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    // ignore
  }
}

/** Event name dispatched when theme (light/dark) is applied. Listen to re-render theme-dependent UI. */
export const THEME_CHANGE_EVENT = 'themechange';

/**
 * Current effective theme: 'dark' if document has .dark class, else 'light'.
 * Matches what the user sees (Settings applies the class for light/dark/auto).
 */
export function getEffectiveTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Hook that returns the current effective theme and updates when theme changes.
 * Theme is applied in Settings; Settings dispatches THEME_CHANGE_EVENT so this hook re-runs.
 */
export function useEffectiveTheme() {
  const [theme, setTheme] = React.useState(getEffectiveTheme);
  React.useEffect(() => {
    const handler = () => setTheme(getEffectiveTheme());
    window.addEventListener(THEME_CHANGE_EVENT, handler);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
  }, []);
  return theme;
}
