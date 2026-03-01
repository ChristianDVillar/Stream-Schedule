/**
 * Service to publish Twitch clips to the user's configured Discord channel.
 * User settings: discordClipsGuildId, discordClipsChannelId (stored on User).
 */

import { User } from '../models/index.js';
import { postToDiscordChannel } from '../utils/discordPublish.js';
import logger from '../utils/logger.js';

/**
 * Publish a Twitch clip to the Discord channel configured by the user.
 * @param {number} userId - User ID
 * @param {object} clip - Clip data
 * @param {string} clip.title - Clip title
 * @param {string} clip.url - Clip URL (e.g. https://clips.twitch.tv/...)
 * @param {string} [clip.thumbnailUrl] - Thumbnail URL for embed
 * @param {string} [clip.creatorName] - Twitch creator/streamer name
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function publishTwitchClipToDiscord(userId, clip) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'discordClipsChannelId', 'discordClipsGuildId'],
  });
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  const channelId = user.discordClipsChannelId && String(user.discordClipsChannelId).trim();
  if (!channelId) {
    return { success: false, error: 'No Discord channel configured for clips. Set it in Settings → Platforms.' };
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

  try {
    const message = await postToDiscordChannel(channelId, content, [embed]);
    logger.info('Twitch clip published to Discord', {
      userId,
      channelId,
      messageId: message?.id,
      clipTitle: title,
    });
    return { success: true, messageId: message?.id };
  } catch (err) {
    logger.error('Failed to publish Twitch clip to Discord', {
      userId,
      channelId,
      error: err.message,
    });
    return {
      success: false,
      error: err.message || 'Failed to send message to Discord',
    };
  }
}
