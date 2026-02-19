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
const CUSTOM_COLORS_STORAGE_KEY = 'appearanceCustomColors';

export function getStoredAccentColor() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return ACCENT_COLORS[stored] ? stored : 'blue';
  } catch {
    return 'blue';
  }
}

/**
 * Darken a hex color by a factor (0–1). Used to derive hover from base.
 */
function darkenHex(hex, factor = 0.12) {
  const n = hex.replace(/^#/, '');
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * (1 - factor)));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
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

/** UI parts that can receive a custom color (used in Appearance settings). */
export const COLOR_PARTS = [
  { id: 'accent', labelKey: 'appearance.partAccent', descriptionKey: 'appearance.partAccentDesc', vars: ['--accent', '--accent-hover'] },
  { id: 'links', labelKey: 'appearance.partLinks', descriptionKey: 'appearance.partLinksDesc', vars: ['--color-links'] },
  { id: 'sidebar', labelKey: 'appearance.partSidebar', descriptionKey: 'appearance.partSidebarDesc', vars: ['--color-sidebar'] },
  { id: 'header', labelKey: 'appearance.partHeader', descriptionKey: 'appearance.partHeaderDesc', vars: ['--color-header'] },
  { id: 'focusRing', labelKey: 'appearance.partFocusRing', descriptionKey: 'appearance.partFocusRingDesc', vars: ['--color-focus-ring'] },
  { id: 'calendarEvent', labelKey: 'appearance.partCalendarEvent', descriptionKey: 'appearance.partCalendarEventDesc', vars: ['--color-calendar-event', '--color-calendar-event-hover'] },
];

const DEFAULT_ASSIGNMENTS = {
  accent: 'blue',
  links: 'blue',
  sidebar: 'blue',
  header: 'blue',
  focusRing: 'blue',
  calendarEvent: 'blue',
};

function getHexForColorId(colorId, customSwatches = []) {
  if (ACCENT_COLORS[colorId]) {
    return ACCENT_COLORS[colorId].hex;
  }
  const swatch = customSwatches.find((s) => s.id === colorId);
  return swatch?.hex || ACCENT_COLORS.blue.hex;
}

function getHexHoverForColorId(colorId, customSwatches = []) {
  if (ACCENT_COLORS[colorId]) {
    return ACCENT_COLORS[colorId].hexHover;
  }
  const swatch = customSwatches.find((s) => s.id === colorId);
  const hex = swatch?.hex || ACCENT_COLORS.blue.hex;
  return darkenHex(hex);
}

export function getCustomColorConfig() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (!raw) return { swatches: [], assignments: { ...DEFAULT_ASSIGNMENTS } };
    const parsed = JSON.parse(raw);
    return {
      swatches: Array.isArray(parsed.swatches) ? parsed.swatches : [],
      assignments: { ...DEFAULT_ASSIGNMENTS, ...(parsed.assignments || {}) },
    };
  } catch {
    return { swatches: [], assignments: { ...DEFAULT_ASSIGNMENTS } };
  }
}

export function setCustomColorConfig(config) {
  try {
    localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    // ignore
  }
}

/**
 * Apply custom color config to the document (all parts).
 * Call after applyAccentColor when using custom assignments, or standalone when user changes assignments.
 */
export function applyCustomColors(config) {
  if (!config || typeof document === 'undefined') return;
  const { swatches = [], assignments = {} } = config;
  const parts = COLOR_PARTS;

  parts.forEach((part) => {
    const colorId = assignments[part.id] ?? DEFAULT_ASSIGNMENTS[part.id];
    const hex = getHexForColorId(colorId, swatches);
    const hexHover = getHexHoverForColorId(colorId, swatches);

    part.vars.forEach((v, i) => {
      const value = i === 0 ? hex : hexHover;
      document.documentElement.style.setProperty(v, value);
    });
  });
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
