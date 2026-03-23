/**
 * Instagram Business via Meta Graph API (server-side page token).
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const _gv = process.env.FACEBOOK_GRAPH_API_VERSION || 'v25.0';
const GRAPH_VERSION = _gv.startsWith('v') ? _gv : `v${_gv}`;
const IG_USER_ID = (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '').trim();
const PAGE_ACCESS_TOKEN = (process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || '').trim();

function graphBase() {
  return `https://graph.facebook.com/${GRAPH_VERSION}`;
}

export function isInstagramGraphConfigured() {
  return !!(IG_USER_ID && PAGE_ACCESS_TOKEN);
}

/**
 * @param {string} path - e.g. "1784.../media" (no leading slash)
 * @param {Record<string, string | number | undefined>} params
 */
async function graphGet(path, params = {}) {
  const url = `${graphBase()}/${path.replace(/^\//, '')}`;
  const res = await axios.get(url, {
    params: {
      ...params,
      access_token: PAGE_ACCESS_TOKEN,
    },
    timeout: 20000,
    validateStatus: () => true,
  });
  const data = res.data;

  if (res.status >= 400) {
    const msg = data?.error?.message || `Graph API HTTP ${res.status}`;
    const err = new Error(msg);
    err.graphError = data?.error || { message: msg, status: res.status };
    err.statusCode = res.status === 401 || data?.error?.code === 190 ? 401 : 502;
    throw err;
  }

  if (data?.error) {
    const msg = data.error.message || 'Graph API error';
    const err = new Error(msg);
    err.graphError = data.error;
    err.statusCode = data.error.code === 190 ? 401 : 502;
    throw err;
  }

  return data;
}

export async function getInstagramAccountInfo() {
  return graphGet(IG_USER_ID, {
    fields: 'id,username,followers_count,media_count',
  });
}

export async function getInstagramRecentMedia(limit = 5) {
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 25);
  const data = await graphGet(`${IG_USER_ID}/media`, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count',
    limit: safeLimit,
  });
  return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Insights depend on media type and app permissions; caller may receive Graph errors for unsupported metrics.
 */
export async function getInstagramMediaInsights(mediaId) {
  const metrics = process.env.INSTAGRAM_INSIGHTS_METRICS || 'impressions,reach,engagement,saved';
  return graphGet(`${mediaId}/insights`, { metric: metrics });
}

export function logInstagramConfigError(err) {
  logger.warn('Instagram Graph request failed', {
    message: err.message,
    graphCode: err.graphError?.code,
    graphSubcode: err.graphError?.error_subcode,
  });
}
