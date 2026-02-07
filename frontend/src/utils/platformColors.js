/**
 * Platform display colors. User can override in Settings (stored in localStorage).
 * Defaults: YouTube red, Discord violet, Instagram black, Twitter light blue.
 */

export const PLATFORM_IDS = ['youtube', 'discord', 'instagram', 'twitter', 'twitch', 'tiktok'];

export const DEFAULT_PLATFORM_COLORS = {
  youtube: '#dc2626',
  discord: '#8B5CF6',
  instagram: '#000000',
  twitter: '#1DA1F2',
  twitch: '#9146FF',
  tiktok: '#000000',
};

const STORAGE_KEY = 'platformColors';

function parseStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object') return null;
    const result = {};
    PLATFORM_IDS.forEach((id) => {
      if (typeof parsed[id] === 'string' && /^#[0-9A-Fa-f]{6}$/.test(parsed[id])) {
        result[id] = parsed[id];
      }
    });
    return Object.keys(result).length ? result : null;
  } catch {
    return null;
  }
}

/**
 * Get current platform colors (user overrides merged with defaults).
 * @returns {{ [platformId: string]: string }}
 */
export function getPlatformColors() {
  const stored = parseStored();
  return { ...DEFAULT_PLATFORM_COLORS, ...stored };
}

/**
 * Set one or more platform colors and persist.
 * @param {{ [platformId: string]: string }} colors - e.g. { twitter: '#1DA1F2' }
 */
export function setPlatformColors(colors) {
  const current = getPlatformColors();
  const next = { ...current };
  Object.entries(colors).forEach(([id, hex]) => {
    if (PLATFORM_IDS.includes(id) && typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
      next[id] = hex;
    }
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // ignore
  }
  return next;
}

/**
 * Reset platform colors to defaults.
 */
export function resetPlatformColors() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_PLATFORM_COLORS };
}

/**
 * Get color for a single platform (hex). Uses first platform if content has multiple.
 */
export function getPlatformColor(platformIdOrPlatforms) {
  const colors = getPlatformColors();
  if (typeof platformIdOrPlatforms === 'string') {
    return colors[platformIdOrPlatforms] || colors.twitch || '#9146FF';
  }
  const arr = Array.isArray(platformIdOrPlatforms) ? platformIdOrPlatforms : [];
  const first = arr[0];
  return first ? (colors[first] || colors.twitch || '#9146FF') : '#6b7280';
}
