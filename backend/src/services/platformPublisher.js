/**
 * Platform Publisher Service
 * Handles actual publication to external platforms.
 * Used by publication worker.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';
import { Integration, Content } from '../models/index.js';
import { postToDiscordChannel, postToDiscordChannelWithAttachments, createDiscordScheduledEvent, updateDiscordScheduledEvent, deleteDiscordScheduledEvent } from '../utils/discordPublish.js';
import { postTweet } from '../utils/twitterPublish.js';
import { uploadVideoToYouTube } from '../utils/youtubePublish.js';
import { formatTwitterContent, formatDiscordContent, formatYouTubeContent, formatInstagramContent, formatTwitchContent } from '../utils/contentFormatter.js';
import { resolveMediaUrls } from './scheduler.js';
import { TwitchService } from './twitchService.js';
import { enqueueDiscordSync } from './discordQueueService.js';
import platformConfigService from './platformConfigService.js';
import { refreshIntegrationToken } from './integrationTokenService.js';

/**
 * Get access token for platform (from Integration model)
 */
async function getAccessToken(userId, platform) {
  const integration = await Integration.findOne({
    where: {
      userId,
      provider: platform,
      status: 'active',
    },
  });

  if (!integration) {
    throw new Error(`No active integration found for platform ${platform}`);
  }

  // Refresh token if needed (proactive refresh)
  await refreshIntegrationToken(userId, platform);

  // Reload integration to get refreshed token
  await integration.reload();

  return {
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    providerUserId: integration.providerUserId,
  };
}

/**
 * Publish content to a specific platform
 * @param {Content} content - Content instance
 * @param {string} platform - Platform name
 * @param {User} user - User instance
 * @returns {Promise<{externalId: string, metadata?: object}>}
 */
export async function publishToPlatform(content, platform, user) {
  const startTime = Date.now();
  
  logger.info('Publishing to platform', {
    contentId: content.id,
    platform,
    contentType: content.contentType,
    userId: user.id,
  });

  // Check if platform is enabled
  const isEnabled = await platformConfigService.isPlatformEnabled(platform);
  if (!isEnabled) {
    throw new Error(`Platform ${platform} is currently disabled`);
  }

  try {
    // Get tokens
    const { accessToken, providerUserId } = await getAccessToken(user.id, platform);

    // Resolve media URLs
    const mediaItems = await resolveMediaUrls(content.files || []);

    let result = { externalId: null, metadata: {} };

    if (platform === 'discord') {
      // Discord: Check if event or message
      const contentType = (content.contentType || '').trim().toLowerCase();
      
      if (contentType === 'event') {
        // Events: use Discord sync queue (versioned, rate-limited)
        if (!content.discordGuildId) {
          throw new Error('discordGuildId is required for Discord events');
        }
        await enqueueDiscordSync(content.id);
        result.externalId = content.discordEventId || null;
        result.metadata = { discordGuildId: content.discordGuildId };
      } else {
        // Messages: publish directly
        if (!content.discordChannelId) {
          throw new Error('discordChannelId is required for Discord messages');
        }
        
        const formatted = formatDiscordContent(content);
        let message;
        
        if (mediaItems.length > 0) {
          message = await postToDiscordChannelWithAttachments(
            content.discordChannelId,
            formatted,
            mediaItems
          );
        } else {
          message = await postToDiscordChannel(
            content.discordChannelId,
            formatted
          );
        }
        
        result.externalId = message.id;
        result.metadata = {
          channelId: content.discordChannelId,
          messageId: message.id,
        };
      }
    } else if (platform === 'twitter') {
      // Twitter: publish tweet
      const formatted = formatTwitterContent(content);
      const tweet = await postTweet(accessToken, formatted);
      result.externalId = tweet.data?.id || tweet.id;
      result.metadata = {
        tweetId: result.externalId,
        url: `https://twitter.com/i/web/status/${result.externalId}`,
      };
    } else if (platform === 'twitch') {
      // Twitch: create schedule segment or update channel
      const twitchService = new TwitchService();
      const contentType = (content.contentType || '').trim().toLowerCase();
      
      if (contentType === 'event') {
        // Create schedule segment (adds event to Twitch calendar)
        if (!content.twitchSegmentId) {
          let duration = 120;
          const startTime = content.scheduledFor;
          if (content.eventEndTime) {
            const start = new Date(startTime).getTime();
            const end = new Date(content.eventEndTime).getTime();
            duration = Math.max(60, Math.round((end - start) / 60000));
          } else if (content.eventDates?.length > 0) {
            const first = content.eventDates[0];
            const last = content.eventDates[content.eventDates.length - 1];
            const start = new Date(`${first.date}T${first.time}`).getTime();
            const end = (last.endDate && last.endTime)
              ? new Date(`${last.endDate}T${last.endTime}`).getTime()
              : start + 120 * 60000;
            duration = Math.max(60, Math.round((end - start) / 60000));
          }
          const categoryId = content.twitchCategoryId
            || await twitchService.getGameId(accessToken, 'Just Chatting');
          const twitchResult = await twitchService.createScheduleSegment({
            userAccessToken: accessToken,
            broadcasterId: providerUserId,
            startTime,
            timezone: content.timezone || 'UTC',
            duration,
            title: (content.title || 'Scheduled Stream').slice(0, 140),
            categoryId,
          });
          result.externalId = twitchResult.segmentId;
          result.metadata = { segmentId: twitchResult.segmentId };
          if (twitchResult.segmentId) {
            await Content.update(
              { twitchSegmentId: twitchResult.segmentId },
              { where: { id: content.id } }
            );
          }
        } else {
          result.externalId = content.twitchSegmentId;
          result.metadata = { segmentId: content.twitchSegmentId };
        }
      } else {
        // Update channel title
        const formatted = formatTwitchContent(content);
        const title = (formatted?.title || formatted?.split?.('\n\n')?.[0]?.trim?.() || content.title || 'Stream').slice(0, 140);
        await twitchService.updateChannelInfo({
          userAccessToken: accessToken,
          broadcasterId: providerUserId,
          title,
        });
        result.externalId = providerUserId;
        result.metadata = { channelId: providerUserId };
      }
    } else if (platform === 'youtube') {
      // YouTube: upload video
      if (mediaItems.length === 0 || !mediaItems[0].type === 'video') {
        throw new Error('YouTube requires a video file');
      }
      const formatted = formatYouTubeContent(content);
      const video = await uploadVideoToYouTube(
        accessToken,
        mediaItems[0].url,
        formatted
      );
      result.externalId = video.id;
      result.metadata = {
        videoId: video.id,
        url: `https://youtube.com/watch?v=${video.id}`,
      };
    } else {
      throw new Error(`Platform ${platform} not implemented`);
    }

    const duration = Date.now() - startTime;
    logger.info('Publication successful', {
      contentId: content.id,
      platform,
      externalId: result.externalId,
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Publication failed', {
      contentId: content.id,
      platform,
      error: error.message,
      duration_ms: duration,
    });
    throw error;
  }
}
