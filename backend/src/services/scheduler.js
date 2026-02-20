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
import { postToDiscordChannel, postToDiscordChannelWithAttachments } from '../utils/discordPublish.js';
import { enqueueDiscordSync } from './discordQueueService.js';
import { postTweet } from '../utils/twitterPublish.js';
import { uploadVideoToYouTube } from '../utils/youtubePublish.js';
import { formatTwitterContent, formatDiscordContent, formatYouTubeContent, formatInstagramContent, formatTwitchContent } from '../utils/contentFormatter.js';
import { supabase } from '../utils/supabaseClient.js';
import { contentService } from './contentService.js';
import { APP_CONFIG } from '../constants/app.js';
import logger from '../utils/logger.js';
import { checkIdempotency, markPublicationAttempted } from './idempotencyService.js';
import { canPublish, recordPublication } from './rateLimitService.js';
import { isFeatureEnabled } from './featureFlagService.js';
import { enqueuePublication } from './publicationQueueService.js';
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
      deletedAt: null,
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
  // Log at start of publishToPlatform
  logger.info('PUBLISH TO PLATFORM START', {
    contentId: content.id,
    platform,
    contentType: content.contentType,
    platforms: content.platforms,
    normalizedContentType: (content.contentType || '').trim().toLowerCase(),
    normalizedPlatforms: (content.platforms || []).map(p => (p || '').trim().toLowerCase())
  });

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
    // Note: Using publicationQueueService which requires ContentPlatform, but scheduler is legacy
    // This will create ContentPlatform entry if needed
    await enqueuePublication(content.id, platform, null, content.scheduledFor);
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
    } else if (platform === 'discord') {
      // Normalize platform name for comparison
      const normalizedPlatform = (platform || '').trim().toLowerCase();
      
      // Normalize contentType for consistent comparison
      const contentType = (content.contentType || '').trim().toLowerCase();
      
      // Normalize platforms array
      const normalizedPlatforms = (content.platforms || []).map(p => 
        (p || '').trim().toLowerCase()
      );
      
      // Log entry into Discord block
      logger.info('DISCORD BLOCK ENTERED', {
        contentId: content.id,
        contentType: content.contentType,
        normalizedContentType: contentType,
        discordGuildId: content.discordGuildId,
        discordChannelId: content.discordChannelId,
        platforms: content.platforms,
        normalizedPlatforms
      });
      
      // ⚠️ CRITICAL: Evaluate contentType FIRST before checking discordChannelId
      // Events should ONLY create scheduled events, never post messages to channels
      
      if (contentType === 'event') {
        // Events: sync via dedicated queue (versioned, rate-limited, no direct API)
        if (!content.discordGuildId || typeof content.discordGuildId !== 'string' || content.discordGuildId.trim() === '') {
          logger.error('Invalid discordGuildId for event', { contentId: content.id, discordGuildId: content.discordGuildId });
          throw new Error('discordGuildId is required and must be a non-empty string for events');
        }
        await enqueueDiscordSync(content.id);
        logger.info('Discord event sync enqueued', { contentId: content.id, guildId: content.discordGuildId });
        return { success: true };
      }
      
      // For streams/posts/reels: sync scheduled event via queue if applicable, then post message
      if ((content.contentType === 'stream' || content.contentType === 'post' || content.contentType === 'reel') && content.discordGuildId) {
        enqueueDiscordSync(content.id).catch((err) =>
          logger.warn('Enqueue Discord sync for stream/post failed', { contentId: content.id, error: err.message })
        );
      }
      
      // Publish message to channel (only for non-event content types)
      // Note: Events are handled above and return early, so this code only runs for streams/posts/reels
      if (!content.discordChannelId) {
        logger.error('Discord channel required for non-event content', {
          contentId: content.id,
          contentType: content.contentType,
          normalizedContentType: contentType
        });
        throw new Error('Discord channel is required for non-event content types');
      }
      
      logger.info('PUBLISHING DISCORD MESSAGE', {
        contentId: content.id,
        contentType: content.contentType,
        channelId: content.discordChannelId,
        hasFiles: !!(content.files?.items?.length || content.files?.urls?.length)
      });
      
      const rawItems = content.files?.items ?? (content.files?.urls ? content.files.urls.map((u) => ({ url: u })) : []) ?? [];
      const items = rawItems.length > 0 ? await resolveMediaUrls(rawItems) : [];
      
      // Format Discord message based on contentType
      const discordMessage = formatDiscordContent(content);
      
      // Post formatted message
      if (discordMessage) {
        if (items.length > 0) {
          // Post message with attachments
          await postToDiscordChannelWithAttachments(content.discordChannelId, discordMessage, items);
          logger.info('Discord message posted with attachments', {
            contentId: content.id,
            channelId: content.discordChannelId,
            attachmentsCount: items.length
          });
        } else {
          // Post text-only message
          await postToDiscordChannel(content.discordChannelId, discordMessage);
          logger.info('Discord message posted (text only)', {
            contentId: content.id,
            channelId: content.discordChannelId
          });
        }
      } else if (items.length > 0) {
        // Only attachments, no text
        await postToDiscordChannelWithAttachments(content.discordChannelId, '\u200b', items);
        logger.info('Discord message posted (attachments only)', {
          contentId: content.id,
          channelId: content.discordChannelId,
          attachmentsCount: items.length
        });
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
      if (!integration) {
        throw new Error('Twitch not linked. Connect Twitch in Settings (Twitch connect for publishing).');
      }
      const { TwitchService } = await import('./twitchService.js');
      const twitchService = new TwitchService();

      // Refresh token if expired or expiring within 1 minute
      const expiresAt = integration.expiresAt ? new Date(integration.expiresAt).getTime() : 0;
      if (integration.refreshToken && expiresAt < Date.now() + 60000) {
        try {
          const newTokens = await twitchService.refreshUserAccessToken(integration.refreshToken);
          integration.accessToken = newTokens.accessToken;
          integration.refreshToken = newTokens.refreshToken;
          integration.expiresAt = newTokens.expiresAt;
          await integration.save();
          accessToken = integration.accessToken;
        } catch (refreshErr) {
          logger.warn('Twitch token refresh failed', { contentId: content.id, error: refreshErr.message });
        }
      }

      const broadcasterId = integration.providerUserId || await twitchService.getBroadcasterId(accessToken);
      const contentTypeNorm = (content.contentType || '').trim().toLowerCase();

      if (contentTypeNorm === 'event') {
        const startTime = content.scheduledFor;
        let duration = 120;
        if (content.eventEndTime) {
          const start = new Date(content.scheduledFor).getTime();
          const end = new Date(content.eventEndTime).getTime();
          duration = Math.max(60, Math.round((end - start) / 60000));
        } else if (content.eventDates && content.eventDates.length > 0) {
          const first = content.eventDates[0];
          const last = content.eventDates[content.eventDates.length - 1];
          const start = new Date(`${first.date}T${first.time}`).getTime();
          const end = (last.endDate && last.endTime)
            ? new Date(`${last.endDate}T${last.endTime}`).getTime()
            : start + 120 * 60000;
          duration = Math.max(60, Math.round((end - start) / 60000));
        }
        const timezone = content.timezone || 'UTC';
        const title = (content.title || 'Scheduled Stream').slice(0, 140);
        const result = await twitchService.createScheduleSegment({
          userAccessToken: accessToken,
          broadcasterId,
          startTime,
          timezone,
          duration,
          title,
          categoryId: content.twitchCategoryId || null,
        });
        if (result.segmentId) {
          await Content.update(
            { twitchSegmentId: result.segmentId },
            { where: { id: content.id } }
          );
        }
        logger.info('Twitch schedule segment created', {
          contentId: content.id,
          segmentId: result.segmentId,
        });
      } else {
        const formatted = formatTwitchContent(content);
        const title = (formatted && formatted.split('\n\n')[0]) ? formatted.split('\n\n')[0].trim().slice(0, 140) : (content.title || '').slice(0, 140);
        await twitchService.updateChannelInfo({
          userAccessToken: accessToken,
          broadcasterId,
          title: title || content.title || 'Stream',
        });
        logger.info('Twitch channel title updated', { contentId: content.id });
      }
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

  // Normalize platforms for consistent comparison
  const normalizedPlatforms = (platforms || []).map(p => 
    (p || '').trim().toLowerCase()
  );
  
  // Normalize contentType for consistent comparison
  const normalizedContentType = (content.contentType || '').trim().toLowerCase();

  // Publish to each platform
  for (const platform of platforms) {
    // Normalize platform name for comparison
    const normalizedPlatform = (platform || '').trim().toLowerCase();
    
    // For Discord: validate requirements based on content type
    if (normalizedPlatform === 'discord') {
      // CHECK 1: Verify contentType normalization
      logger.info('CHECK 1: contentType', {
        contentId: content.id,
        raw: content.contentType,
        normalized: normalizedContentType,
        isEvent: normalizedContentType === 'event'
      });
      
      // CHECK 2: Verify platforms normalization
      logger.info('CHECK 2: platforms', {
        contentId: content.id,
        raw: platforms,
        normalized: normalizedPlatforms,
        includesDiscord: normalizedPlatforms.includes('discord'),
        currentPlatform: normalizedPlatform
      });
      
      // Events only need discordGuildId, not discordChannelId
      if (normalizedContentType === 'event') {
        // CHECK 3: Verify discordGuildId
        logger.info('CHECK 3: discordGuildId', {
          contentId: content.id,
          value: content.discordGuildId,
          exists: !!content.discordGuildId,
          type: typeof content.discordGuildId,
          isValid: typeof content.discordGuildId === 'string' && content.discordGuildId.trim() !== ''
        });
        
        if (!content.discordGuildId || 
            typeof content.discordGuildId !== 'string' || 
            content.discordGuildId.trim() === '') {
          logger.error('Discord platform selected for event but no valid guild specified', {
            contentId: content.id,
            platform,
            contentType: content.contentType,
            normalizedContentType,
            discordGuildId: content.discordGuildId
          });
          results[platform] = { success: false, reason: 'discordGuildId required and must be a non-empty string for events', failed: true };
          hasFailures = true;
          continue;
        }
        // Events don't need channel, proceed to publishToPlatform
      } else {
        // Non-events require discordChannelId
        if (!channelId) {
          logger.warn('Discord platform selected but no channel specified', {
            contentId: content.id,
            platform,
            contentType: content.contentType,
            normalizedContentType
          });
          results[platform] = { success: false, reason: 'discordChannelId required for non-event content', failed: true };
          hasFailures = true;
          continue;
        }
      }
    }

    try {
      const result = await publishToPlatform(content, platform);
      results[platform] = result;

      if (result.failed) {
        hasFailures = true;
      } else if (result.queued) {
        hasQueued = true;
      } else if (!result.success) {
        // If result doesn't have success: true, consider it a failure
        hasFailures = true;
        if (!result.failed) {
          results[platform] = { ...result, failed: true };
        }
      }
    } catch (error) {
      // If publishToPlatform throws an error, mark as failed
      logger.error('Platform publication threw error', {
        contentId: content.id,
        platform,
        error: error.message
      });
      results[platform] = { 
        success: false, 
        failed: true, 
        reason: error.message,
        error: error.message
      };
      hasFailures = true;
    }
  }

  // Check if all platforms actually succeeded
  const allPlatforms = Object.keys(results);
  const successfulPlatforms = allPlatforms.filter(p => 
    results[p]?.success === true && !results[p]?.failed && !results[p]?.skipped
  );
  const failedPlatforms = allPlatforms.filter(p => 
    results[p]?.failed === true || (results[p]?.success === false && !results[p]?.queued)
  );

  // Update final status based on results
  if (hasQueued) {
    // Some platforms queued, keep as QUEUED
    content.status = CONTENT_STATUS.QUEUED;
  } else if (hasFailures && Object.values(results).some(r => r.willRetry)) {
    // Some platforms will retry
    content.status = CONTENT_STATUS.RETRYING;
  } else if (hasFailures || failedPlatforms.length > 0) {
    // Some or all platforms failed - only mark as PUBLISHED if at least one succeeded
    if (successfulPlatforms.length > 0 && failedPlatforms.length < allPlatforms.length) {
      // Partial success - mark as published but log the failures
      content.status = CONTENT_STATUS.PUBLISHED;
      content.publishedAt = new Date();
      logger.warn('Content published with some platform failures', {
        contentId: content.id,
        successfulPlatforms,
        failedPlatforms,
        results
      });
    } else {
      // All platforms failed
      content.status = CONTENT_STATUS.FAILED;
      logger.error('All platforms failed to publish', {
        contentId: content.id,
        failedPlatforms,
        results
      });
    }
  } else if (successfulPlatforms.length === allPlatforms.length && allPlatforms.length > 0) {
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
