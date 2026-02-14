/**
 * Scheduler: runs every minute and publishes content whose scheduledFor time has passed.
 * Enhanced with:
 * - Fine-grained status tracking (QUEUED, PUBLISHING, RETRYING)
 * - Idempotency checks to prevent duplicates
 * - Rate limiting per platform
 * - Integration model for OAuth tokens (separated from Auth)
 * - Queue support (prepared for BullMQ)
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Content, User, Integration } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { postToDiscordChannel, postToDiscordChannelWithAttachments, createDiscordScheduledEvent } from '../utils/discordPublish.js';
import { postTweet } from '../utils/twitterPublish.js';
import { supabase } from '../utils/supabaseClient.js';
import { contentService } from './contentService.js';
import { APP_CONFIG } from '../constants/app.js';
import logger from '../utils/logger.js';
import { checkIdempotency, markPublicationAttempted } from './idempotencyService.js';
import { canPublish, recordPublication } from './rateLimitService.js';
import { isFeatureEnabled } from './featureFlagService.js';
import { enqueuePublication } from './queueService.js';

const INTERVAL_MS = APP_CONFIG.SCHEDULER_INTERVAL_MS;
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

/**
 * Find content that is scheduled and due (scheduledFor <= now).
 * Also includes QUEUED content that should be processed.
 */
async function getDueContent() {
  const now = new Date();
  return await Content.findAll({
    where: {
      [Op.or]: [
        {
          status: CONTENT_STATUS.SCHEDULED,
          scheduledFor: { [Op.lte]: now }
        },
        {
          status: CONTENT_STATUS.QUEUED
        },
        {
          status: CONTENT_STATUS.RETRYING,
          lastRetryAt: {
            [Op.or]: [
              null,
              { [Op.lt]: new Date(now.getTime() - 5 * 60 * 1000) } // Retry after 5 minutes
            ]
          }
        }
      ]
    },
    order: [['scheduledFor', 'ASC']],
    limit: 50 // Process max 50 items per tick
  });
}

/**
 * Publish one content item to a specific platform.
 * Enhanced with idempotency, rate limiting, and fine-grained status tracking.
 */
async function publishToPlatform(content, platform) {
  // Check idempotency
  const idempotencyCheck = await checkIdempotency(content.id, platform, content.scheduledFor);
  if (idempotencyCheck.isDuplicate) {
    logger.warn('Skipping duplicate publication (idempotency)', {
      contentId: content.id,
      platform,
      reason: idempotencyCheck.reason
    });
    return { success: true, skipped: true };
  }

  // Check rate limit
  const rateLimitCheck = await canPublish(content.userId, platform);
  if (!rateLimitCheck.allowed) {
    logger.warn('Rate limit exceeded, enqueuing for later', {
      contentId: content.id,
      platform,
      userId: content.userId,
      reason: rateLimitCheck.reason,
      resetAt: rateLimitCheck.resetAt
    });
    
    // Enqueue for later instead of failing
    await enqueuePublication(content.id, platform, content.userId, content.scheduledFor);
    content.status = CONTENT_STATUS.QUEUED;
    await content.save();
    return { success: false, reason: 'rate_limit', queued: true };
  }

  // Mark as publishing
  await content.update({ status: CONTENT_STATUS.PUBLISHING });

  try {
    // Get integration token (prefer Integration model, fallback to User for backward compatibility)
    let accessToken = null;
    let integration = await Integration.findOne({
      where: {
        userId: content.userId,
        provider: platform,
        status: 'active'
      }
    });

    if (integration && integration.accessToken) {
      accessToken = integration.accessToken;
    } else {
      // Fallback: check User model for backward compatibility
      const user = await User.findByPk(content.userId, {
        attributes: ['id', `${platform}AccessToken`, `${platform}Id`]
      });
      if (platform === 'twitter' && user?.twitterAccessToken) {
        accessToken = user.twitterAccessToken;
      } else if (platform === 'discord' && user?.discordAccessToken) {
        accessToken = user.discordAccessToken;
      }
    }

    if (!accessToken) {
      throw new Error(`${platform} not linked. Connect ${platform} in Settings.`);
    }

    // Publish based on platform
    if (platform === 'twitter') {
      const text = [content.title, content.content].filter(Boolean).join('\n\n') || ' ';
      logger.info('Posting tweet', { contentId: content.id, textLength: text.length });
      await postTweet(accessToken, text);
    } else if (platform === 'discord' && content.discordChannelId) {
      // If contentType is "event" and we have a guildId, create a Discord scheduled event
      // Discord will automatically show the time in each user's local timezone
      if (content.contentType === 'event' && content.discordGuildId) {
        try {
          const eventName = content.title || 'Scheduled Event';
          const eventDescription = content.content || '';
          const eventLocation = content.content || 'Stream'; // Default location for external events
          
          // Create the scheduled event (Discord handles timezone conversion automatically)
          await createDiscordScheduledEvent(
            content.discordGuildId,
            eventName,
            content.scheduledFor, // Already in UTC from database
            {
              description: eventDescription,
              entityType: 3, // External event (works for streams)
              location: eventLocation
            }
          );
          
          logger.info('Discord scheduled event created', {
            contentId: content.id,
            guildId: content.discordGuildId,
            scheduledFor: content.scheduledFor
          });
        } catch (eventError) {
          logger.error('Failed to create Discord scheduled event', {
            contentId: content.id,
            error: eventError.message,
            guildId: content.discordGuildId
          });
          // Continue to publish message even if event creation fails
        }
      }
      
      // Always publish the message to the channel
      const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
      const items = rawItems.length > 0 ? await resolveMediaUrls(rawItems) : [];
      
      if (content.title) {
        await postToDiscordChannel(content.discordChannelId, `**${content.title}**`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (items.length > 0) {
        await postToDiscordChannelWithAttachments(content.discordChannelId, '\u200b', items);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (content.content) {
        await postToDiscordChannel(content.discordChannelId, content.content);
      }
    }

    // Record successful publication
    await recordPublication(content.userId, platform);
    await markPublicationAttempted(content.id, platform, content.scheduledFor);

    logger.info('Content published successfully', {
      contentId: content.id,
      platform,
      userId: content.userId
    });

    return { success: true };
  } catch (err) {
    logger.error('Platform publication failed', {
      contentId: content.id,
      platform,
      userId: content.userId,
      error: err.message,
      retryCount: content.retryCount
    });

    // Handle retries
    const maxRetries = 3;
    if (content.retryCount < maxRetries) {
      content.status = CONTENT_STATUS.RETRYING;
      content.retryCount = (content.retryCount || 0) + 1;
      content.lastRetryAt = new Date();
      content.publishError = err.message || String(err);
      await content.save();
      
      logger.info('Content marked for retry', {
        contentId: content.id,
        platform,
        retryCount: content.retryCount,
        maxRetries
      });
      
      return { success: false, reason: err.message, willRetry: true };
    } else {
      // Max retries reached, mark as failed
      content.status = CONTENT_STATUS.FAILED;
      content.publishError = err.message || String(err);
      await content.save();
      
      // Notify user
      try {
        const { notifyContentFailed } = await import('./websocketService.js');
        notifyContentFailed(content.userId, content, err);
      } catch (wsError) {
        // ignore
      }
      
      return { success: false, reason: err.message, failed: true };
    }
  }
}

/**
 * Publish one content item: processes all platforms, then marks as published or failed.
 * Exported for use in queue service.
 */
export async function publishContent(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  const channelId = content.discordChannelId || null;

  logger.info('Publish content', {
    contentId: content.id,
    userId: content.userId,
    platforms,
    scheduledFor: content.scheduledFor,
    status: content.status
  });

  // Check if automation is enabled (feature flag)
  const automationEnabled = await isFeatureEnabled('automation_enabled', true);
  if (!automationEnabled) {
    logger.warn('Automation disabled by feature flag', { contentId: content.id });
    content.status = CONTENT_STATUS.QUEUED;
    await content.save();
    return;
  }

  // Update status to QUEUED if it was SCHEDULED
  if (content.status === CONTENT_STATUS.SCHEDULED) {
    content.status = CONTENT_STATUS.QUEUED;
    await content.save();
  }

  const results = {};
  let hasFailures = false;
  let hasQueued = false;

  // Publish to each platform
  for (const platform of platforms) {
    // Skip Discord if no channel specified
    if (platform === 'discord' && !channelId) {
      logger.warn('Discord platform selected but no channel specified', {
        contentId: content.id,
        platform
      });
      continue;
    }

    const result = await publishToPlatform(content, platform);
    results[platform] = result;

    if (result.failed) {
      hasFailures = true;
    } else if (result.queued) {
      hasQueued = true;
    }
  }

  // Update final status based on results
  if (hasQueued) {
    // Some platforms queued, keep as QUEUED
    content.status = CONTENT_STATUS.QUEUED;
  } else if (hasFailures && Object.values(results).some(r => r.willRetry)) {
    // Some platforms will retry
    content.status = CONTENT_STATUS.RETRYING;
  } else if (hasFailures) {
    // All platforms failed
    content.status = CONTENT_STATUS.FAILED;
  } else {
    // All platforms succeeded
    content.status = CONTENT_STATUS.PUBLISHED;
    content.publishedAt = new Date();
    
    // Notify user via WebSocket
    try {
      const { notifyContentPublished } = await import('./websocketService.js');
      notifyContentPublished(content.userId, content);
    } catch (wsError) {
      // WebSocket not available, ignore
    }
    
    // Handle recurrence
    if (content.recurrence && content.recurrence.enabled) {
      await processRecurringContent(content);
    }
  }

  await content.save();
  logger.info('Content publication completed', {
    contentId: content.id,
    status: content.status,
    results
  });
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
 * Run one tick: find due content and process each.
 * Enhanced with queue support and better error handling.
 */
async function runTick() {
  try {
    const now = new Date();
    const due = await getDueContent();
    
    if (due.length === 0) {
      logger.debug('Scheduler: no content due for publishing', { 
        now: now.toISOString(),
        statuses: {
          scheduled: await Content.count({ where: { status: CONTENT_STATUS.SCHEDULED } }),
          queued: await Content.count({ where: { status: CONTENT_STATUS.QUEUED } }),
          retrying: await Content.count({ where: { status: CONTENT_STATUS.RETRYING } })
        }
      });
      return;
    }

    logger.info('Scheduler: processing due content', {
      count: due.length,
      ids: due.map((c) => c.id),
      statuses: due.map((c) => ({ id: c.id, status: c.status, platforms: c.platforms }))
    });

    // Process content items (with concurrency limit)
    const concurrency = 5;
    for (let i = 0; i < due.length; i += concurrency) {
      const batch = due.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(content => publishContent(content))
      );
    }
  } catch (err) {
    logger.error('Scheduler tick error', { 
      error: err.message, 
      stack: err.stack 
    });
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
