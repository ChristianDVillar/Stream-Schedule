/**
 * Outgoing webhooks to AkoeNet (same URL as stream-scheduled; payload includes webhook_event).
 * Uses per-user URL + secret from Settings when set; otherwise env AKOENET_SCHEDULER_WEBHOOK_URL + SCHEDULER_WEBHOOK_SECRET.
 */

import { User } from '../modules/users/infrastructure/models.js';
import { Integration } from '../modules/integrations/infrastructure/models.js';
import { twitchService } from '../modules/integrations/application/twitchService.js';
import logger from '../utils/logger.js';
import { buildPublicStreamerShareUrl } from '../utils/publicStreamerShareUrl.js';

/** Scheduled streams and calendar events → AkoeNet (not generic posts). */
function shouldNotifyAkoeNetSchedule(content) {
  const t = (content?.contentType || '').toLowerCase();
  return t === 'event' || t === 'stream';
}

function pickPrimaryPlatform(platforms) {
  const list = Array.isArray(platforms) ? platforms.map((p) => (p || '').toLowerCase().trim()) : [];
  const order = ['twitch', 'youtube', 'kick', 'discord'];
  for (const p of order) {
    if (list.includes(p)) return p;
  }
  return list[0] || 'twitch';
}

function parseAnnounceChannelIdFromEnv() {
  const raw = (process.env.SCHEDULER_ANNOUNCE_CHANNEL_ID || '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (Number.isSafeInteger(n)) return n;
  return raw;
}

function parseAnnounceChannelIdFromUser(userRow) {
  const raw = (userRow?.akoenetAnnounceChannelId || '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (Number.isSafeInteger(n)) return n;
  return raw;
}

async function resolveTwitchLogin(providerUserId) {
  if (!providerUserId) return null;
  try {
    const info = await twitchService.getUserInfo(providerUserId);
    return info?.login || null;
  } catch {
    return null;
  }
}

function buildStreamUrl({ user, content, platform, twitchLogin }) {
  const loc = (content.eventLocationUrl || '').trim();
  if (/^https?:\/\//i.test(loc)) return loc;

  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

  if (platform === 'twitch' && twitchLogin) {
    return `https://www.twitch.tv/${twitchLogin}`;
  }
  if (platform === 'youtube') {
    return loc || buildPublicStreamerShareUrl(base, user.username);
  }
  return buildPublicStreamerShareUrl(base, user.username);
}

async function postAkoeNetWebhook(url, secret, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-scheduler-webhook-secret': secret,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn('AkoeNet webhook failed', {
      status: res.status,
      webhook_event: payload.webhook_event,
      bodyPreview: text.slice(0, 200),
    });
    return false;
  }
  return true;
}

/**
 * @param {number} userId
 * @param {import('sequelize').Model} content - Content instance
 */
export async function notifyAkoeNetStreamScheduled(userId, content) {
  if (!shouldNotifyAkoeNetSchedule(content)) return;

  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'akoenetWebhookUrl', 'akoenetWebhookSecret', 'akoenetAnnounceChannelId'],
  });
  if (!user) {
    logger.warn('AkoeNet webhook: user not found', { userId });
    return;
  }

  const url =
    (user.akoenetWebhookUrl || '').trim() || (process.env.AKOENET_SCHEDULER_WEBHOOK_URL || '').trim();
  const secret =
    (user.akoenetWebhookSecret || '').trim() || (process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();
  if (!url || !secret) return;

  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  const platform = pickPrimaryPlatform(platforms);

  const twitchIntegration = await Integration.findOne({
    where: { userId, provider: 'twitch', status: 'active' },
    attributes: ['providerUserId'],
  });
  const twitchLogin = await resolveTwitchLogin(twitchIntegration?.providerUserId);

  const streamUrl = buildStreamUrl({
    user,
    content,
    platform,
    twitchLogin,
  });

  const scheduled = content.scheduledFor instanceof Date ? content.scheduledFor : new Date(content.scheduledFor);
  if (isNaN(scheduled.getTime())) {
    logger.warn('AkoeNet webhook: invalid scheduledFor', { contentId: content.id });
    return;
  }

  const slug = user.username;
  const contentType = (content.contentType || '').toLowerCase();
  const payload = {
    webhook_event: 'schedule',
    scheduler_content_type: contentType,
    streamer: slug,
    /** Explicit public slug (same as streamer); helps AkoeNet map without ambiguity. */
    scheduler_slug: slug,
    title: (content.title || 'Scheduled stream').slice(0, 500),
    starts_at: scheduled.toISOString(),
    url: streamUrl,
    platform,
  };
  if (twitchLogin) {
    payload.twitch_login = twitchLogin;
  }

  const channelId = parseAnnounceChannelIdFromUser(user) ?? parseAnnounceChannelIdFromEnv();
  if (channelId !== undefined) {
    payload.channel_id = channelId;
  }

  const ok = await postAkoeNetWebhook(url, secret, payload);
  if (!ok) return;

  logger.info('AkoeNet webhook sent', { contentId: content.id, userId, webhook_event: 'schedule' });
}

/**
 * Notify AkoeNet about a Twitch clip (after Discord publish, if enabled).
 * @param {number} userId
 * @param {{ title?: string, url?: string, thumbnailUrl?: string | null, creatorName?: string | null }} clip
 */
export async function notifyAkoeNetClip(userId, clip) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'akoenetWebhookUrl', 'akoenetWebhookSecret', 'akoenetAnnounceChannelId', 'akoenetSendClips'],
  });
  if (!user || !user.akoenetSendClips) return;

  const url =
    (user.akoenetWebhookUrl || '').trim() || (process.env.AKOENET_SCHEDULER_WEBHOOK_URL || '').trim();
  const secret =
    (user.akoenetWebhookSecret || '').trim() || (process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();
  if (!url || !secret) return;

  const twitchIntegration = await Integration.findOne({
    where: { userId, provider: 'twitch', status: 'active' },
    attributes: ['providerUserId'],
  });
  const twitchLogin = await resolveTwitchLogin(twitchIntegration?.providerUserId);

  const title = (clip?.title && String(clip.title).trim()) || 'Twitch clip';
  const clipUrl = (clip?.url && String(clip.url).trim()) || '';
  const slug = user.username;

  const payload = {
    webhook_event: 'twitch_clip',
    streamer: slug,
    scheduler_slug: slug,
    title: title.slice(0, 500),
    url: clipUrl.slice(0, 2000),
    platform: 'twitch',
  };
  if (clip?.thumbnailUrl) {
    payload.thumbnail_url = String(clip.thumbnailUrl).trim().slice(0, 2000);
  }
  if (clip?.creatorName) {
    payload.creator_name = String(clip.creatorName).trim().slice(0, 200);
  }
  if (twitchLogin) {
    payload.twitch_login = twitchLogin;
  }

  const channelId = parseAnnounceChannelIdFromUser(user) ?? parseAnnounceChannelIdFromEnv();
  if (channelId !== undefined) {
    payload.channel_id = channelId;
  }

  const ok = await postAkoeNetWebhook(url, secret, payload);
  if (ok) {
    logger.info('AkoeNet clip webhook sent', { userId });
  }
}

export function enqueueAkoeNetClip(userId, clip) {
  notifyAkoeNetClip(userId, clip).catch((err) => {
    logger.warn('AkoeNet clip webhook error', { error: err.message, userId });
  });
}

/**
 * Fire-and-forget; logs errors without rejecting the caller.
 * @param {number} userId
 * @param {import('sequelize').Model} content
 */
export function enqueueAkoeNetStreamScheduled(userId, content) {
  notifyAkoeNetStreamScheduled(userId, content).catch((err) => {
    logger.warn('AkoeNet webhook error', { error: err.message, contentId: content?.id });
  });
}
