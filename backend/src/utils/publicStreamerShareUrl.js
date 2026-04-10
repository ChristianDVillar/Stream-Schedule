/**
 * Public schedule page URLs as shared with viewers (includes brand attribution query).
 * Keep in sync with frontend shared/config/publicUrls.js (PUBLIC_SHARE_LINK_QUERY / ref).
 */

const DEFAULT_QUERY = 'ref=streamautomator';

function shareQueryString() {
  const raw = (process.env.PUBLIC_SHARE_LINK_QUERY || DEFAULT_QUERY).trim();
  return raw.replace(/^\?/, '');
}

/**
 * @param {string} frontendBase - FRONTEND_URL origin (no trailing slash)
 * @param {string} username
 * @returns {string}
 */
export function buildPublicStreamerShareUrl(frontendBase, username) {
  const base = String(frontendBase || '').replace(/\/$/, '');
  const q = shareQueryString();
  return `${base}/streamer/${encodeURIComponent(username)}?${q}`;
}
