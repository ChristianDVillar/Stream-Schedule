function trimTrailingSlash(url = '') {
  return String(url || '').replace(/\/$/, '');
}

function isOnRenderUrl(url = '') {
  return /\.onrender\.com$/i.test(url.replace(/^https?:\/\//i, ''));
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
  if (envPrimary) {
    if (process.env.NODE_ENV === 'production' && isOnRenderUrl(envPrimary)) {
      return 'https://streamautomator.com';
    }
    return envPrimary;
  }

  const envSecondary = trimTrailingSlash(process.env.REACT_APP_PUBLIC_FRONTEND_URL || '');
  if (envSecondary) {
    if (process.env.NODE_ENV === 'production' && isOnRenderUrl(envSecondary)) {
      return 'https://streamautomator.com';
    }
    return envSecondary;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = trimTrailingSlash(window.location.origin);
    if (process.env.NODE_ENV === 'production' && isOnRenderUrl(origin)) {
      return 'https://streamautomator.com';
    }
    return origin;
  }

  return '';
}

