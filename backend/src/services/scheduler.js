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
import { uploadVideoToYouTube } from '../utils/youtubePublish.js';
import { formatTwitterContent, formatDiscordContent, getDiscordEventLocation, formatYouTubeContent, formatInstagramContent, formatTwitchContent } from '../utils/contentFormatter.js';
import { supabase } from '../utils/supabaseClient.js';
import { contentService } from './contentService.js';
import { APP_CONFIG } from '../constants/app.js';
import logger from '../utils/logger.js';
import { checkIdempotency, markPublicationAttempted } from './idempotencyService.js';
import { canPublish, recordPublication } from './rateLimitService.js';
import { isFeatureEnabled } from './featureFlagService.js';
import { enqueuePublication } from './queueService.js';
import platformConfigService from './platformConfigService.js';

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
  // Check if platform is enabled globally
  const isEnabled = await platformConfigService.isPlatformEnabled(platform);
  if (!isEnabled) {
    logger.warn('Platform is disabled globally', {
      contentId: content.id,
      platform
    });
    throw new Error(`Platform ${platform} is currently disabled. Please contact an administrator.`);
  }

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
    let refreshToken = null;
    let integration = await Integration.findOne({
      where: {
        userId: content.userId,
        provider: platform,
        status: 'active'
      }
    });

    if (integration) {
      // For YouTube, we need refreshToken; for others, accessToken
      if (platform === 'youtube') {
        refreshToken = integration.refreshToken;
      } else {
        accessToken = integration.accessToken;
      }
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

    // Check if we have the required token
    if (platform === 'youtube' && !refreshToken) {
      throw new Error(`${platform} not linked. Connect ${platform} in Settings.`);
    } else if (platform !== 'youtube' && !accessToken) {
      throw new Error(`${platform} not linked. Connect ${platform} in Settings.`);
    }

    // Publish based on platform
    if (platform === 'twitter') {
      const text = formatTwitterContent(content);
      logger.info('Posting tweet', { contentId: content.id, contentType: content.contentType, textLength: text.length });
      await postTweet(accessToken, text);
    } else if (platform === 'discord' && content.discordChannelId) {
      // If contentType is "event" or "stream" and we have a guildId, create a Discord scheduled event
      // Discord will automatically show the time in each user's local timezone
      if ((content.contentType === 'event' || content.contentType === 'stream') && content.discordGuildId) {
        try {
          const eventName = content.title || (content.contentType === 'stream' ? 'Stream' : 'Scheduled Event');
          let eventDescription = content.content || '';
          
          // If multiple event dates, include them in description and use first/last for event times
          let eventStartTime = content.scheduledFor;
          let eventEndTime = content.eventEndTime || null;
          
          if (content.contentType === 'event' && content.eventDates && Array.isArray(content.eventDates) && content.eventDates.length > 1) {
            // Sort dates chronologically
            const sortedDates = content.eventDates
              .filter(ed => ed.date && ed.time)
              .map(ed => {
                try {
                  // Ensure date and time are in correct format (YYYY-MM-DD and HH:mm)
                  const dateStr = ed.date.includes('T') ? ed.date.split('T')[0] : ed.date;
                  const timeStr = ed.time.includes('T') ? ed.time.split('T')[1] : ed.time;
                  const datetime = new Date(`${dateStr}T${timeStr}`);
                  if (isNaN(datetime.getTime())) {
                    logger.warn('Invalid event date/time', { date: ed.date, time: ed.time });
                    return null;
                  }
                  return {
                    ...ed,
                    datetime
                  };
                } catch (err) {
                  logger.warn('Error parsing event date', { error: err.message, date: ed.date, time: ed.time });
                  return null;
                }
              })
              .filter(ed => ed !== null)
              .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
            
            if (sortedDates.length > 0) {
              // Use first date as start time
              const firstDateObj = sortedDates[0].datetime;
              if (firstDateObj && !isNaN(firstDateObj.getTime())) {
                eventStartTime = firstDateObj;
              } else {
                logger.error('Invalid first event date', { sortedDates });
                throw new Error('Invalid first event date');
              }
              
              // Use last date's end time or last date's start time as end time
              const lastDate = sortedDates[sortedDates.length - 1];
              if (lastDate.endDate && lastDate.endTime) {
                try {
                  const endDateStr = lastDate.endDate.includes('T') ? lastDate.endDate.split('T')[0] : lastDate.endDate;
                  const endTimeStr = lastDate.endTime.includes('T') ? lastDate.endTime.split('T')[1] : lastDate.endTime;
                  const calculatedEndTime = new Date(`${endDateStr}T${endTimeStr}`);
                  if (!isNaN(calculatedEndTime.getTime()) && calculatedEndTime > eventStartTime) {
                    eventEndTime = calculatedEndTime;
                  } else {
                    // If invalid or before start, use last date start + 1 hour
                    eventEndTime = new Date(lastDate.datetime.getTime() + 60 * 60 * 1000);
                  }
                } catch (err) {
                  logger.warn('Error parsing last date end time', { error: err.message, lastDate });
                  eventEndTime = new Date(lastDate.datetime.getTime() + 60 * 60 * 1000);
                }
              } else {
                // If no end time specified, use last date start + 1 hour as default
                eventEndTime = new Date(lastDate.datetime.getTime() + 60 * 60 * 1000);
              }
              
              // Format dates for description (already formatted in formatDiscordContent, but add here too for event description)
              const datesList = sortedDates.map((ed, idx) => {
                try {
                  const dateStr = ed.datetime.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                  const timeStr = ed.datetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  let dateTimeStr = `${dateStr} at ${timeStr}`;
                  
                  if (ed.endDate && ed.endTime) {
                    try {
                      const endDateStr = ed.endDate.includes('T') ? ed.endDate.split('T')[0] : ed.endDate;
                      const endTimeStr = ed.endTime.includes('T') ? ed.endTime.split('T')[1] : ed.endTime;
                      const endDate = new Date(`${endDateStr}T${endTimeStr}`);
                      if (!isNaN(endDate.getTime())) {
                        const endTimeStrFormatted = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        dateTimeStr += ` - ${endTimeStrFormatted}`;
                      }
                    } catch (err) {
                      logger.warn('Error parsing end date/time', { error: err.message, endDate: ed.endDate, endTime: ed.endTime });
                    }
                  }
                  
                  return `${idx + 1}. ${dateTimeStr}`;
                } catch (err) {
                  logger.warn('Error formatting date for description', { error: err.message, ed });
                  return null;
                }
              }).filter(item => item !== null).join('\n');
              
              eventDescription = eventDescription ? `${eventDescription}\n\n**📅 Event Dates & Times:**\n${datesList}` : `**📅 Event Dates & Times:**\n${datesList}`;
            }
          }
          
          const eventLocation = getDiscordEventLocation(content);
          
          // Get cover image from media items if available
          const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
          const imageItems = rawItems.filter(item => {
            const type = item.type || (String(item.url || item.file_path || '').toLowerCase().includes('video') ? 'video' : 'image');
            return type === 'image';
          });
          let coverImage = null;
          if (imageItems.length > 0) {
            const resolvedImages = await resolveMediaUrls(imageItems);
            if (resolvedImages.length > 0) {
              coverImage = resolvedImages[0].url;
            }
          }
          
          // Ensure eventStartTime is a valid Date object
          let finalStartTime = eventStartTime;
          if (!(finalStartTime instanceof Date)) {
            finalStartTime = new Date(finalStartTime);
          }
          if (isNaN(finalStartTime.getTime())) {
            logger.error('Invalid event start time', { eventStartTime, contentType: content.contentType });
            throw new Error('Invalid event start time');
          }
          
          // Ensure eventEndTime is a valid Date object if provided
          let finalEndTime = eventEndTime;
          if (finalEndTime && !(finalEndTime instanceof Date)) {
            finalEndTime = new Date(finalEndTime);
          }
          if (finalEndTime && isNaN(finalEndTime.getTime())) {
            logger.warn('Invalid event end time, using default', { eventEndTime });
            finalEndTime = null;
          }
          
          // Create the scheduled event (Discord handles timezone conversion automatically)
          await createDiscordScheduledEvent(
            content.discordGuildId,
            eventName,
            finalStartTime, // Already in UTC from database or calculated from eventDates
            {
              description: eventDescription,
              scheduledEndTime: finalEndTime, // Optional end time in UTC
              entityType: 3, // External event (works for streams)
              location: eventLocation,
              image: coverImage
            }
          );
          
          logger.info('Discord scheduled event created', {
            contentId: content.id,
            contentType: content.contentType,
            guildId: content.discordGuildId,
            scheduledFor: content.scheduledFor,
            location: eventLocation
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
      
      // Always publish the message to the channel with formatted content
      const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
      const items = rawItems.length > 0 ? await resolveMediaUrls(rawItems) : [];
      
      // Format Discord message based on contentType
      const discordMessage = formatDiscordContent(content);
      
      // Post formatted message
      if (discordMessage) {
        if (items.length > 0) {
          // Post message with attachments
          await postToDiscordChannelWithAttachments(content.discordChannelId, discordMessage, items);
        } else {
          // Post text-only message
          await postToDiscordChannel(content.discordChannelId, discordMessage);
        }
      } else if (items.length > 0) {
        // Only attachments, no text
        await postToDiscordChannelWithAttachments(content.discordChannelId, '\u200b', items);
      }
    } else if (platform === 'youtube') {
      // YouTube video upload
      const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
      const videoItems = rawItems.filter(item => {
        const type = item.type || (String(item.url || item.file_path || '').toLowerCase().includes('video') ? 'video' : 'image');
        return type === 'video';
      });

      if (videoItems.length === 0) {
        throw new Error('No video file found for YouTube upload. YouTube requires a video file.');
      }

      // Get the first video URL
      const videoItemsResolved = await resolveMediaUrls(videoItems);
      if (videoItemsResolved.length === 0) {
        throw new Error('Could not resolve video URL for YouTube upload');
      }
      
      // Format YouTube content based on contentType
      const youtubeContent = formatYouTubeContent(content);
      const videoUrl = videoItemsResolved[0].url;
      
      // Extract tags from hashtags (convert #hashtag to tag)
      let tags = [];
      if (content.hashtags) {
        tags = content.hashtags.split(',').map(h => {
          const tag = h.trim();
          return tag.startsWith('#') ? tag.substring(1) : tag;
        }).filter(Boolean);
      }
      
      // Upload video to YouTube
      logger.info('Uploading video to YouTube', {
        contentId: content.id,
        contentType: content.contentType,
        title: youtubeContent.title,
        videoUrl
      });

      const result = await uploadVideoToYouTube(refreshToken, videoUrl, {
        title: youtubeContent.title,
        description: youtubeContent.description,
        tags,
        privacyStatus: 'private' // Default to private, can be made configurable
      });

      logger.info('Video uploaded to YouTube successfully', {
        contentId: content.id,
        videoId: result.videoId,
        videoUrl: result.url
      });
    } else if (platform === 'instagram') {
      // Instagram content formatting (when Instagram API is implemented)
      const formattedContent = formatInstagramContent(content);
      logger.info('Instagram content formatted', {
        contentId: content.id,
        contentType: content.contentType,
        formattedLength: formattedContent.length
      });
      // TODO: Implement Instagram API publishing
      throw new Error('Instagram publishing not yet implemented');
    } else if (platform === 'twitch') {
      // Twitch content formatting (when Twitch API is implemented)
      const formattedContent = formatTwitchContent(content);
      logger.info('Twitch content formatted', {
        contentId: content.id,
        contentType: content.contentType,
        formattedLength: formattedContent.length
      });
      // TODO: Implement Twitch API publishing
      throw new Error('Twitch publishing not yet implemented');
    } else {
      throw new Error(`Platform ${platform} not supported`);
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
