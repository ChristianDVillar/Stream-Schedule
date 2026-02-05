/**
 * Scheduler: runs every minute and publishes content whose scheduledFor time has passed.
 * Discord: posts to the selected channel. Other platforms: marked as published (no API yet).
 */

import { Content } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { postToDiscordChannel, postToDiscordChannelWithAttachments } from '../utils/discordPublish.js';
import { supabase } from '../utils/supabaseClient.js';
import { contentService } from './contentService.js';
import { APP_CONFIG } from '../constants/app.js';
import logger from '../utils/logger.js';

const SIGNED_URL_EXPIRES_SEC = APP_CONFIG.SIGNED_URL_EXPIRES_SEC;

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
  return await contentService.getDueContent();
}

/**
 * Publish one content item: Discord if configured, then mark published or failed.
 * Exported for use in queue service.
 */
export async function publishContent(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  const hasDiscord = platforms.includes('discord');
  const channelId = content.discordChannelId || null;

  if (hasDiscord && channelId) {
    try {
      // Construir mensaje: Título (negrita) + Contenido/Comentario
      // Los archivos/media se adjuntan automáticamente después
      const parts = [];
      if (content.title) {
        parts.push(`**${content.title}**`);
      }
      if (content.content) {
        parts.push(content.content);
      }
      const message = parts.join('\n\n') || '';
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
      
      // Notify user via WebSocket
      try {
        const { notifyContentFailed } = await import('./websocketService.js');
        notifyContentFailed(content.userId, content, err);
      } catch (wsError) {
        // WebSocket not available, ignore
      }
      
      return;
    }
  }

  content.status = CONTENT_STATUS.PUBLISHED;
  content.publishedAt = new Date();
  await content.save();
  logger.info('Scheduled content marked as published', { contentId: content.id, userId: content.userId });
  
  // Notify user via WebSocket
  try {
    const { notifyContentPublished } = await import('./websocketService.js');
    notifyContentPublished(content.userId, content);
  } catch (wsError) {
    // WebSocket not available, ignore
  }
  
  // Handle recurrence: create next occurrence if enabled
  if (content.recurrence && content.recurrence.enabled) {
    await processRecurringContent(content);
  }
}

/**
 * Process recurring content: create next occurrence after publishing
 */
async function processRecurringContent(content) {
  try {
    const recurrence = content.recurrence;
    if (!recurrence || !recurrence.enabled) return;
    
    const frequency = recurrence.frequency || 'weekly';
    const count = recurrence.count || 1;
    const currentOccurrence = content.scheduledFor;
    
    // Calculate next occurrence date
    const nextDate = new Date(currentOccurrence);
    if (frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    // Check if we've reached the recurrence limit
    // Count how many times this content has been published (by checking publishedAt)
    // For simplicity, we'll create the next occurrence if it's within the count limit
    const occurrencesCreated = await Content.count({
      where: {
        userId: content.userId,
        title: content.title,
        content: content.content,
        status: CONTENT_STATUS.PUBLISHED,
      },
    });
    
    if (occurrencesCreated < count) {
      // Create next occurrence
      await Content.create({
        title: content.title,
        content: content.content,
        contentType: content.contentType,
        platforms: content.platforms,
        scheduledFor: nextDate,
        userId: content.userId,
        status: CONTENT_STATUS.SCHEDULED,
        files: content.files,
        recurrence: {
          ...recurrence,
          // Keep recurrence enabled for next occurrence
        },
        hashtags: content.hashtags,
        mentions: content.mentions,
        timezone: content.timezone,
        discordChannelId: content.discordChannelId,
      });
      
      logger.info('Recurring content: next occurrence created', {
        originalContentId: content.id,
        nextDate: nextDate.toISOString(),
        occurrencesCreated: occurrencesCreated + 1,
      });
    } else {
      logger.info('Recurring content: limit reached', {
        contentId: content.id,
        occurrencesCreated,
        count,
      });
    }
  } catch (error) {
    logger.error('Error processing recurring content', {
      contentId: content.id,
      error: error.message,
    });
  }
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
