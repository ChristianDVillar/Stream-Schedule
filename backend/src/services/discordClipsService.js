/**
 * Service to publish Twitch clips to user-selected destinations.
 * Destinations:
 * - Discord channel configured in Settings > Platforms
 * - AkoeNet webhook (if enabled in user settings)
 */

import { User } from '../modules/users/infrastructure/models.js';
import { postToDiscordChannel } from '../utils/discordPublish.js';
import logger from '../utils/logger.js';
import { enqueueAkoeNetClip } from './akoeNetWebhookService.js';

/**
 * Publish a Twitch clip to the destinations configured by the user.
 * @param {number} userId - User ID
 * @param {object} clip - Clip data
 * @param {string} clip.title - Clip title
 * @param {string} clip.url - Clip URL (e.g. https://clips.twitch.tv/...)
 * @param {string} [clip.thumbnailUrl] - Thumbnail URL for embed
 * @param {string} [clip.creatorName] - Twitch creator/streamer name
 * @returns {Promise<{ success: boolean, messageId?: string, destinations?: string[], error?: string }>}
 */
export async function publishTwitchClip(userId, clip) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'discordClipsChannelId', 'discordClipsGuildId', 'akoenetSendClips'],
  });
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  const channelId = user.discordClipsChannelId && String(user.discordClipsChannelId).trim();
  const sendToDiscord = !!channelId;
  const sendToAkoenet = user.akoenetSendClips === true;

  if (!sendToDiscord && !sendToAkoenet) {
    return {
      success: false,
      error: 'No destination configured for clips. Configure Discord channel and/or enable AkoeNet clips in Settings.',
    };
  }

  const title = (clip?.title && String(clip.title).trim()) || 'Twitch clip';
  const url = (clip?.url && String(clip.url).trim()) || '';
  const thumbnailUrl = clip?.thumbnailUrl && String(clip.thumbnailUrl).trim() ? String(clip.thumbnailUrl).trim() : null;
  const creatorName = clip?.creatorName && String(clip.creatorName).trim() ? String(clip.creatorName).trim() : null;

  const embed = {
    title: title.slice(0, 256),
    url: url || undefined,
    color: 0x9146ff, // Twitch purple
    ...(thumbnailUrl && { thumbnail: { url: thumbnailUrl } }),
    ...(creatorName && { footer: { text: `Clip by ${creatorName}` } }),
    timestamp: new Date().toISOString(),
  };

  const content = url ? `🔗 ${url}` : 'Twitch clip';

  const destinations = [];
  let discordMessageId;
  let discordError = null;

  if (sendToDiscord) {
    try {
      const message = await postToDiscordChannel(channelId, content, [embed]);
      discordMessageId = message?.id;
      destinations.push('discord');
      logger.info('Twitch clip published to Discord', {
        userId,
        channelId,
        messageId: message?.id,
        clipTitle: title,
      });
    } catch (err) {
      discordError = err;
      logger.error('Failed to publish Twitch clip to Discord', {
        userId,
        channelId,
        error: err.message,
      });
    }
  }

  if (sendToAkoenet) {
    enqueueAkoeNetClip(userId, {
      title,
      url,
      thumbnailUrl,
      creatorName,
    });
    destinations.push('akoenet');
  }

  if (destinations.length === 0) {
    return {
      success: false,
      error: discordError?.message || 'Could not publish clip to selected destinations',
    };
  }

  return {
    success: true,
    messageId: discordMessageId,
    destinations,
  };
}

export async function publishTwitchClipToDiscord(userId, clip) {
  return publishTwitchClip(userId, clip);
}
