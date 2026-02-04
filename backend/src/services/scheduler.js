/**
 * Scheduler: runs every minute and publishes content whose scheduledFor time has passed.
 * Discord: posts to the selected channel. Other platforms: marked as published (no API yet).
 */

import { Content } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { postToDiscordChannel, postToDiscordChannelWithAttachments } from '../utils/discordPublish.js';
import { supabase } from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';

const SIGNED_URL_EXPIRES_SEC = 3600;

/**
 * Resolve media items to have a usable url. Prefer file_path (fresh signed URL from Supabase) over stored url (often expired).
 * @param {Array<{ url?: string, file_path?: string, type?: string, fileName?: string }>} items
 * @returns {Promise<Array<{ url: string, type?: string, fileName?: string }>>}
 */
function inferBucket(item) {
  if (item.type === 'video') return 'videos';
  if (item.type === 'image') return 'images';
  const path = item.file_path || item.url || '';
  if (String(path).toLowerCase().includes('video') || /\.(mp4|webm|mov|avi)$/i.test(path)) return 'videos';
  return 'images';
}

async function resolveMediaUrls(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const resolved = [];
  for (const item of items) {
    let urlToUse = null;
    if (item.file_path && supabase) {
      const bucket = inferBucket(item);
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(item.file_path, SIGNED_URL_EXPIRES_SEC);
        if (!error && data?.signedUrl) {
          urlToUse = data.signedUrl;
          logger.info('Scheduler: resolved file_path to signed URL', { file_path: item.file_path, bucket });
        } else {
          logger.warn('Scheduler: could not get signed URL for attachment', { file_path: item.file_path, bucket, error: error?.message });
        }
      } catch (err) {
        logger.warn('Scheduler: signed URL error', { file_path: item.file_path, error: err.message });
      }
    }
    if (!urlToUse && item.url && typeof item.url === 'string') {
      urlToUse = item.url;
    }
    if (urlToUse) {
      const type = item.type || (inferBucket(item) === 'videos' ? 'video' : 'image');
      resolved.push({ url: urlToUse, type, fileName: item.fileName });
    } else {
      logger.warn('Scheduler: no URL for item', { hasFilePath: !!item.file_path, hasUrl: !!item.url });
    }
  }
  return resolved;
}

const INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Find content that is scheduled and due (scheduledFor <= now).
 */
async function getDueContent() {
  const now = new Date();
  const rows = await Content.findAll({
    where: {
      status: CONTENT_STATUS.SCHEDULED,
      scheduledFor: { [Op.lte]: now },
    },
    order: [['scheduledFor', 'ASC']],
  });
  return rows;
}

/**
 * Publish one content item: Discord if configured, then mark published or failed.
 */
async function publishContent(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  const hasDiscord = platforms.includes('discord');
  const channelId = content.discordChannelId || null;

  if (hasDiscord && channelId) {
    try {
      const message = (content.title ? `**${content.title}**\n\n` : '') + (content.content || '');
      const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
      logger.info('Scheduler: publishing content', {
        contentId: content.id,
        rawItemsCount: rawItems.length,
        rawItems: rawItems.map((i) => ({ hasUrl: !!i?.url, hasFilePath: !!i?.file_path, type: i?.type, file_path: i?.file_path })),
        supabaseConfigured: !!supabase,
      });
      const items = rawItems.length > 0 ? await resolveMediaUrls(rawItems) : [];
      logger.info('Scheduler: resolved media', { contentId: content.id, resolvedCount: items.length, resolvedHasUrls: items.every((i) => i?.url) });
      const hasAttachments = items.length > 0;
      if (hasAttachments) {
        await postToDiscordChannelWithAttachments(channelId, message, items);
      } else {
        await postToDiscordChannel(channelId, message);
      }
      logger.info('Scheduled content published to Discord', {
        contentId: content.id,
        userId: content.userId,
        channelId,
      });
    } catch (err) {
      logger.error('Scheduled content Discord publish failed', {
        contentId: content.id,
        userId: content.userId,
        channelId,
        error: err.message,
      });
      content.status = CONTENT_STATUS.FAILED;
      content.publishError = err.message || String(err);
      await content.save();
      return;
    }
  }

  content.status = CONTENT_STATUS.PUBLISHED;
  content.publishedAt = new Date();
  await content.save();
  logger.info('Scheduled content marked as published', { contentId: content.id, userId: content.userId });
}

/**
 * Run one tick: find due content and publish each.
 */
async function runTick() {
  try {
    const due = await getDueContent();
    if (due.length === 0) return;
    for (const content of due) {
      await publishContent(content);
    }
  } catch (err) {
    logger.error('Scheduler tick error', { error: err.message, stack: err.stack });
  }
}

let intervalId = null;

/**
 * Start the scheduler (runs every minute).
 */
export function startScheduler() {
  if (intervalId) return;
  runTick(); // run once immediately
  intervalId = setInterval(runTick, INTERVAL_MS);
  logger.info('Scheduler started', { intervalMs: INTERVAL_MS });
}

/**
 * Stop the scheduler.
 */
export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Scheduler stopped');
  }
}
