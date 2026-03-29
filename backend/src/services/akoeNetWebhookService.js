/**
 * Outgoing webhook to AkoeNet: announces scheduled stream events (POST stream-scheduled).
 * Uses per-user URL + secret from Settings when set; otherwise env AKOENET_SCHEDULER_WEBHOOK_URL + SCHEDULER_WEBHOOK_SECRET.
 */

import { User } from '../modules/users/infrastructure/models.js';
import { Integration } from '../modules/integrations/infrastructure/models.js';
import { twitchService } from '../modules/integrations/application/twitchService.js';
import logger from '../utils/logger.js';

function isEventContent(content) {
  return (content?.contentType || '').toLowerCase() === 'event';
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
    return loc || `${base}/streamer/${encodeURIComponent(user.username)}`;
  }
  return `${base}/streamer/${encodeURIComponent(user.username)}`;
}

/**
 * @param {number} userId
 * @param {import('sequelize').Model} content - Content instance
 */
export async function notifyAkoeNetStreamScheduled(userId, content) {
  if (!isEventContent(content)) return;

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
  const payload = {
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
      contentId: content.id,
      bodyPreview: text.slice(0, 200),
    });
    return;
  }

  logger.info('AkoeNet webhook sent', { contentId: content.id, userId });
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
