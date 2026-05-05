/**
 * Resolve AkoeNet scheduler integration base URL and fetch server/channel lists
 * for Settings UI (same auth as outbound webhook: x-scheduler-webhook-secret).
 *
 * AkoeNet must implement:
 *   GET {base}/integrations/scheduler/servers
 *   GET {base}/integrations/scheduler/servers/:serverId/channels
 * with header x-scheduler-webhook-secret (same value as webhook POST).
 */

import logger from '../utils/logger.js';

const FETCH_TIMEOUT_MS = 15000;

/**
 * @param {string} webhookUrl - Full POST URL ending in .../webhooks/stream-scheduled
 * @returns {string | null} - Origin + path through /integrations/scheduler (no trailing slash)
 */
export function deriveAkoenetSchedulerBaseUrl(webhookUrl) {
  const raw = String(webhookUrl || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    let path = u.pathname.replace(/\/$/, '');
    if (path.endsWith('/webhooks/stream-scheduled')) {
      path = path.slice(0, -'/webhooks/stream-scheduled'.length);
      return `${u.origin}${path}`;
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchWithSecret(url, secret) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-scheduler-webhook-secret': secret,
      },
      signal: controller.signal,
    });
    clearTimeout(tid);
    return res;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

function normalizeServerList(json) {
  const raw = json?.servers ?? json?.guilds ?? json?.data?.servers;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const id = row?.id != null ? String(row.id) : row?.server_id != null ? String(row.server_id) : '';
      const name = row?.name != null ? String(row.name) : id || 'Server';
      if (!id) return null;
      return { id, name };
    })
    .filter(Boolean);
}

function normalizeChannelList(json) {
  const raw = json?.channels ?? json?.data?.channels;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const id = row?.id != null ? String(row.id) : row?.channel_id != null ? String(row.channel_id) : '';
      const name = row?.name != null ? String(row.name) : id || 'Channel';
      if (!id) return null;
      return { id, name };
    })
    .filter(Boolean);
}

/**
 * @param {string} baseUrl - From deriveAkoenetSchedulerBaseUrl
 * @param {string} secret
 * @returns {Promise<{ guilds: Array<{ id: string, name: string }> }>}
 */
export async function fetchAkoenetServers(baseUrl, secret) {
  const url = `${baseUrl.replace(/\/$/, '')}/servers`;
  const res = await fetchWithSecret(url, secret);
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    logger.warn('AkoeNet servers: invalid JSON', { status: res.status, preview: text.slice(0, 120) });
    if (res.ok) {
      return { guilds: [], httpStatus: res.status };
    }
    return { guilds: [], httpStatus: res.status, rawBody: text };
  }
  if (!res.ok) {
    logger.warn('AkoeNet servers: HTTP error', { status: res.status, preview: text.slice(0, 200) });
    return { guilds: [], httpStatus: res.status, errorMessage: json?.error || json?.message };
  }
  return { guilds: normalizeServerList(json), httpStatus: res.status };
}

/**
 * @param {string} baseUrl
 * @param {string} secret
 * @param {string} serverId
 * @returns {Promise<{ channels: Array<{ id: string, name: string }> }>}
 */
export async function fetchAkoenetChannels(baseUrl, secret, serverId) {
  const enc = encodeURIComponent(serverId);
  const url = `${baseUrl.replace(/\/$/, '')}/servers/${enc}/channels`;
  const res = await fetchWithSecret(url, secret);
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    logger.warn('AkoeNet channels: invalid JSON', { status: res.status, preview: text.slice(0, 120) });
    if (res.ok) {
      return { channels: [], httpStatus: res.status };
    }
    return { channels: [], httpStatus: res.status, rawBody: text };
  }
  if (!res.ok) {
    logger.warn('AkoeNet channels: HTTP error', { status: res.status, preview: text.slice(0, 200) });
    return { channels: [], httpStatus: res.status, errorMessage: json?.error || json?.message };
  }
  return { channels: normalizeChannelList(json), httpStatus: res.status };
}
