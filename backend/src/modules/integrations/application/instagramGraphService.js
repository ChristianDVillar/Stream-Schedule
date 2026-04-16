/**
 * Instagram Business via Meta Graph API (server-side page token).
 */

import axios from 'axios';
import logger from '../../../utils/logger.js';

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

export async function getInstagramMediaInsights(mediaId) {
  const metrics = process.env.INSTAGRAM_INSIGHTS_METRICS || 'impressions,reach,engagement,saved';
  return graphGet(`${mediaId}/insights`, { metric: metrics });
}

async function graphPost(path, payload = {}) {
  const url = `${graphBase()}/${path.replace(/^\//, '')}`;
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined && v !== null)),
    access_token: PAGE_ACCESS_TOKEN,
  });
  const res = await axios.post(url, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
    validateStatus: () => true,
  });
  const data = res.data;

  if (res.status >= 400 || data?.error) {
    const msg = data?.error?.message || `Graph API HTTP ${res.status}`;
    const err = new Error(msg);
    err.graphError = data?.error || { message: msg, status: res.status };
    err.statusCode = res.status === 401 || data?.error?.code === 190 ? 401 : 502;
    throw err;
  }

  return data;
}

async function waitForContainerReady(containerId, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await graphGet(containerId, { fields: 'id,status_code,status' });
    const code = String(status?.status_code || '').toUpperCase();
    if (code === 'FINISHED' || code === 'PUBLISHED') return status;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`Instagram media container failed with status ${code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Instagram media container timed out before publishing');
}

export async function publishToInstagram({ mediaUrl, caption = '', contentType = 'post' }) {
  if (!isInstagramGraphConfigured()) {
    throw new Error('Instagram Graph API is not configured on the server');
  }
  if (!mediaUrl || typeof mediaUrl !== 'string') {
    throw new Error('Instagram publishing requires a media URL');
  }

  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl) || String(contentType).toLowerCase() === 'reel';
  const creation = await graphPost(`${IG_USER_ID}/media`, isVideo
    ? { media_type: 'REELS', video_url: mediaUrl, caption }
    : { image_url: mediaUrl, caption }
  );

  const creationId = creation?.id;
  if (!creationId) {
    throw new Error('Instagram did not return a media creation id');
  }

  if (isVideo) {
    await waitForContainerReady(creationId);
  }

  const published = await graphPost(`${IG_USER_ID}/media_publish`, { creation_id: creationId });
  const mediaId = published?.id;
  if (!mediaId) {
    throw new Error('Instagram did not return a published media id');
  }

  let permalink = null;
  try {
    const media = await graphGet(mediaId, { fields: 'id,permalink,media_type' });
    permalink = media?.permalink || null;
  } catch {
    permalink = null;
  }

  return {
    mediaId,
    creationId,
    permalink,
  };
}

export function logInstagramConfigError(err) {
  logger.warn('Instagram Graph request failed', {
    message: err.message,
    graphCode: err.graphError?.code,
    graphSubcode: err.graphError?.error_subcode,
  });
}

