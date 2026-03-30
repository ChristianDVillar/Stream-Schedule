/**
 * Proxy authenticated Scheduler admins to AkoeNet admin APIs.
 * Uses AKOENET_ADMIN_BEARER (JWT from an AkoeNet admin account) — Scheduler and AkoeNet JWTs are not interchangeable.
 */
import express from 'express';
import logger from '../../utils/logger.js';

const router = express.Router();

function getAkoenetConfig() {
  const base = String(process.env.AKOENET_API_URL || '').trim().replace(/\/$/, '');
  const bearer = String(process.env.AKOENET_ADMIN_BEARER || '').trim();
  return { base, bearer };
}

function isConfigured() {
  const { base, bearer } = getAkoenetConfig();
  return Boolean(base && bearer);
}

export function akoenetProxyEnabled() {
  return isConfigured();
}

/**
 * GET /api/admin/akoenet/status — lightweight check (no AkoeNet round-trip for bearer validation)
 */
router.get('/status', (req, res) => {
  const { base, bearer } = getAkoenetConfig();
  res.json({
    configured: Boolean(base && bearer),
    apiBaseUrl: base || null,
    hasBearer: Boolean(bearer),
  });
});

// All other paths → AkoeNet /admin/...
router.use(async (req, res) => {
  const { base, bearer } = getAkoenetConfig();
  if (!base || !bearer) {
    return res.status(503).json({
      error: 'akoenet_admin_not_configured',
      message:
        'Set AKOENET_API_URL (e.g. http://localhost:3000) and AKOENET_ADMIN_BEARER (JWT from AkoeNet admin login) in Scheduler backend .env.',
    });
  }

  const relative = req.originalUrl.replace(/^\/api\/admin\/akoenet/, '') || '/';
  const akPath = '/admin' + (relative.startsWith('/') ? relative : `/${relative}`);
  const url = `${base}${akPath}`;

  const headers = {
    Authorization: `Bearer ${bearer}`,
    Accept: 'application/json',
  };

  let body;
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
    headers['Content-Type'] = 'application/json';
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const r = await fetch(url, {
      method: req.method,
      headers,
      body: body || undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await r.json();
      return res.status(r.status).json(data);
    }
    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (err) {
    clearTimeout(timeout);
    logger.error('AkoeNet proxy failed', { url, err: err?.message });
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'akoenet_timeout', message: 'AkoeNet did not respond in time.' });
    }
    return res.status(503).json({
      error: 'akoenet_unreachable',
      message: err?.message || 'Could not reach AkoeNet API',
    });
  }
});

export default router;
