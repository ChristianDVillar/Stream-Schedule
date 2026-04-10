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

/** Default query for shared public schedule links (brand attribution). Override with REACT_APP_PUBLIC_SHARE_LINK_QUERY (e.g. ref=mybrand). */
const DEFAULT_PUBLIC_SHARE_LINK_QUERY = 'ref=streamautomator';

/**
 * Query string (without leading ?) appended to shared /streamer/ and /embed/streamer/ URLs.
 */
export function getPublicShareLinkQueryString() {
  const raw = (process.env.REACT_APP_PUBLIC_SHARE_LINK_QUERY || DEFAULT_PUBLIC_SHARE_LINK_QUERY).trim();
  return raw.replace(/^\?/, '');
}

/**
 * Full URL to the public schedule page as users copy/share it (includes brand query).
 */
export function getPublicStreamerShareUrl(username) {
  const origin = getPublicFrontendOrigin();
  if (!origin || username == null || username === '') return '';
  const q = getPublicShareLinkQueryString();
  return `${origin}/streamer/${encodeURIComponent(String(username))}?${q}`;
}

/**
 * Full embed URL for panels/iframes (includes same brand query as the main share link).
 */
export function getPublicEmbedStreamerShareUrl(username) {
  const origin = getPublicFrontendOrigin();
  if (!origin || username == null || username === '') return '';
  const q = getPublicShareLinkQueryString();
  return `${origin}/embed/streamer/${encodeURIComponent(String(username))}?${q}`;
}

