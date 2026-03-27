function trimTrailingSlash(url = '') {
  return String(url || '').replace(/\/$/, '');
}

/**
 * Returns the canonical public frontend origin for share links.
 * Priority:
 * 1) REACT_APP_FRONTEND_URL
 * 2) REACT_APP_PUBLIC_FRONTEND_URL
 * 3) current window origin
 */
export function getPublicFrontendOrigin() {
  const envPrimary = trimTrailingSlash(process.env.REACT_APP_FRONTEND_URL || '');
  if (envPrimary) return envPrimary;

  const envSecondary = trimTrailingSlash(process.env.REACT_APP_PUBLIC_FRONTEND_URL || '');
  if (envSecondary) return envSecondary;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return '';
}

