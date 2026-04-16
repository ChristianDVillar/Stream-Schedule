/**
 * Platform Publisher Service
 * Handles actual publication to external platforms.
 * Used by publication worker.
 */

import logger from '../../../utils/logger.js';
import { Integration } from '../infrastructure/models.js';
import { Content } from '../../content/infrastructure/models.js';
import {
  postToDiscordChannel,
  postToDiscordChannelWithAttachments,
} from '../../../utils/discordPublish.js';
import { postTweet } from '../../../utils/twitterPublish.js';
import { uploadVideoToYouTube } from '../../../utils/youtubePublish.js';
import {
  formatTwitterContent,
  formatDiscordContent,
  formatYouTubeContent,
  formatInstagramContent,
  formatTwitchContent,
} from '../../../utils/contentFormatter.js';
import { resolveMediaUrls } from '../../content/application/scheduler.js';
import { TwitchService } from './twitchService.js';
import { enqueueDiscordSync } from '../../../services/discordQueueService.js';
import platformConfigService from '../../system/application/platformConfigService.js';
import { refreshIntegrationToken } from './integrationTokenService.js';
import { publishToInstagram } from './instagramGraphService.js';

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

  await refreshIntegrationToken(userId, platform);
  await integration.reload();

  return {
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    providerUserId: integration.providerUserId,
  };
}

export async function publishToPlatform(content, platform, user) {
  const startTime = Date.now();

  logger.info('Publishing to platform', {
    contentId: content.id,
    platform,
    contentType: content.contentType,
    userId: user.id,
  });

  const isEnabled = await platformConfigService.isPlatformEnabled(platform);
  if (!isEnabled) {
    throw new Error(`Platform ${platform} is currently disabled`);
  }

  try {
    let accessToken = null;
    let providerUserId = null;
    if (platform !== 'instagram') {
      const tokenData = await getAccessToken(user.id, platform);
      accessToken = tokenData.accessToken;
      providerUserId = tokenData.providerUserId;
    }
    const mediaItems = await resolveMediaUrls(content.files || []);

    let result = { externalId: null, metadata: {} };

    if (platform === 'discord') {
      const contentType = (content.contentType || '').trim().toLowerCase();

      if (contentType === 'event') {
        if (!content.discordGuildId) {
          throw new Error('discordGuildId is required for Discord events');
        }
        await enqueueDiscordSync(content.id);
        result.externalId = content.discordEventId || null;
        result.metadata = { discordGuildId: content.discordGuildId };
      } else {
        if (!content.discordChannelId) {
          throw new Error('discordChannelId is required for Discord messages');
        }

        const formatted = formatDiscordContent(content);
        let message;

        if (mediaItems.length > 0) {
          message = await postToDiscordChannelWithAttachments(content.discordChannelId, formatted, mediaItems);
        } else {
          message = await postToDiscordChannel(content.discordChannelId, formatted);
        }

        result.externalId = message.id;
        result.metadata = {
          channelId: content.discordChannelId,
          messageId: message.id,
        };
      }
    } else if (platform === 'twitter') {
      const formatted = formatTwitterContent(content);
      const tweet = await postTweet(accessToken, formatted);
      result.externalId = tweet.data?.id || tweet.id;
      result.metadata = {
        tweetId: result.externalId,
        url: `https://twitter.com/i/web/status/${result.externalId}`,
      };
    } else if (platform === 'twitch') {
      const twitchService = new TwitchService();
      const contentType = (content.contentType || '').trim().toLowerCase();

      if (contentType === 'event') {
        if (!content.twitchSegmentId) {
          let eventStartTime = content.scheduledFor;
          if (content.eventDates && Array.isArray(content.eventDates) && content.eventDates.length > 0) {
            const first = content.eventDates[0];
            const dateStr = first.date.includes('T') ? first.date.split('T')[0] : first.date;
            const timeStr = first.time.includes('T') ? first.time.split('T')[1] : first.time;
            const dt = new Date(`${dateStr}T${timeStr}`);
            if (!isNaN(dt.getTime())) {
              eventStartTime = dt.toISOString();
            }
          }

          let duration = 120;
          if (content.eventEndTime) {
            const startMs = new Date(eventStartTime).getTime();
            const endMs = new Date(content.eventEndTime).getTime();
            duration = Math.max(60, Math.round((endMs - startMs) / 60000));
          } else if (content.eventDates?.length > 0) {
            const first = content.eventDates[0];
            const last = content.eventDates[content.eventDates.length - 1];
            const startMs = new Date(`${first.date}T${first.time}`).getTime();
            const endMs = (last.endDate && last.endTime)
              ? new Date(`${last.endDate}T${last.endTime}`).getTime()
              : startMs + 120 * 60000;
            duration = Math.max(60, Math.round((endMs - startMs) / 60000));
          }

          const categoryId = content.twitchCategoryId || await twitchService.getGameId(accessToken, 'Just Chatting');
          const twitchResult = await twitchService.createScheduleSegment({
            userAccessToken: accessToken,
            broadcasterId: providerUserId,
            startTime: eventStartTime,
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
      if (mediaItems.length === 0 || mediaItems[0].type !== 'video') {
        throw new Error('YouTube requires a video file');
      }
      const formatted = formatYouTubeContent(content);
      const video = await uploadVideoToYouTube(accessToken, mediaItems[0].url, formatted);
      result.externalId = video.id;
      result.metadata = {
        videoId: video.id,
        url: `https://youtube.com/watch?v=${video.id}`,
      };
    } else if (platform === 'instagram') {
      if (mediaItems.length === 0) {
        throw new Error('Instagram requires at least one media file');
      }
      const formatted = formatInstagramContent(content);
      const ig = await publishToInstagram({
        mediaUrl: mediaItems[0].url,
        caption: formatted,
        contentType: content.contentType,
      });
      result.externalId = ig.mediaId;
      result.metadata = {
        mediaId: ig.mediaId,
        creationId: ig.creationId,
        url: ig.permalink,
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

export default {
  publishToPlatform,
};

