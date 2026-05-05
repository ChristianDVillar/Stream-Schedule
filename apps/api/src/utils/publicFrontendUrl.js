/**
 * Canonical browser origin for the React app (OAuth redirects, /admin redirect from API host).
 * Prefer PUBLIC_FRONTEND_URL when API is on api.* and SPA on www / apex.
 */

export function getPublicFrontendOrigin() {
  const raw = (process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return raw.replace(/\/$/, '');
  }
}

/** Full URL to the admin dashboard SPA route (no trailing slash before /admin). */
export function getPublicAdminDashboardUrl() {
  const o = getPublicFrontendOrigin();
  if (!o) return null;
  return `${o.replace(/\/$/, '')}/admin`;
}
