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
