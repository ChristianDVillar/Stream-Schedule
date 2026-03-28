/**
 * Public streamer page API — no auth.
 * GET /api/streamer/:username/events — upcoming streams (same JSON as /upcoming).
 * GET /api/streamer/:username/upcoming — alias for integrations (e.g. AkoeNet).
 * GET /api/public/streamer/:username/upcoming — legacy path some .env templates use.
 * POST /api/streamer/:username/remind — subscribe to stream reminders (email).
 * Used by /streamer/:username and /embed/streamer/:username.
 *
 * Response includes both `events` and `upcoming` (same array) for compatibility.
 */

import express from 'express';
import { Content, User, Integration, StreamReminder, StreamSuggestion, sequelize } from '../modules/streamerPublic/infrastructure/models.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import logger from '../utils/logger.js';
import { TwitchService } from '../modules/integrations/application/twitchService.js';

const router = express.Router();
const twitchService = new TwitchService();

const UPCOMING_STATUSES = [
  CONTENT_STATUS.SCHEDULED,
  CONTENT_STATUS.QUEUED,
  CONTENT_STATUS.PUBLISHING,
  CONTENT_STATUS.PUBLISHED,
];

/**
 * Shared handler: GET .../events and .../upcoming (public).
 */
async function handlePublicStreamerEvents(req, res) {
  try {
    const username = (req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), username.toLowerCase()),
      attributes: [
        'id',
        'username',
        'profileImageUrl',
        'publicPageBannerUrl',
        'publicPageBannerPosition',
        'twitterId',
        'discordId',
      ],
    });
    if (!user) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    const now = new Date();
    const events = await Content.findAll({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
      },
      order: [['scheduledFor', 'ASC']],
      limit: 30,
      attributes: ['id', 'title', 'scheduledFor', 'eventEndTime', 'contentType', 'platforms'],
    });

    const eventsJson = events.map((e) => {
      const plain = e.get ? e.get({ plain: true }) : e;
      return {
        id: plain.id,
        title: plain.title,
        scheduledFor: plain.scheduledFor,
        eventEndTime: plain.eventEndTime || null,
        contentType: plain.contentType,
        platforms: Array.isArray(plain.platforms) ? plain.platforms : [],
      };
    });

    const integrations = await Integration.findAll({
      where: { userId: user.id, status: 'active' },
      attributes: ['provider', 'providerUserId', 'metadata'],
    });
    const integrationsByProvider = integrations.reduce((acc, integration) => {
      acc[integration.provider] = integration;
      return acc;
    }, {});

    let liveOnTwitch = false;
    let twitchStreamUrl = null;
    let twitchStreamTitle = null;
    let twitchProfileUrl = null;

    try {
      const integration = integrationsByProvider.twitch;
      if (integration?.providerUserId) {
        const twitchUser = await twitchService.getUserInfo(integration.providerUserId);
        if (twitchUser?.login) {
          twitchProfileUrl = `https://www.twitch.tv/${twitchUser.login}`;
        }
        const stream = await twitchService.getStreamByUserId(integration.providerUserId);
        if (stream.live) {
          liveOnTwitch = true;
          twitchStreamUrl = stream.user_name
            ? `https://www.twitch.tv/${stream.user_name}`
            : (twitchProfileUrl || null);
          twitchStreamTitle = stream.title || null;
        }
      }
    } catch (twitchErr) {
      logger.warn('Twitch live check failed for public streamer page', {
        username,
        error: twitchErr.message,
      });
    }

    const socialLinks = [];
    if (twitchProfileUrl) {
      socialLinks.push({ platform: 'twitch', label: 'Twitch', url: twitchProfileUrl });
    }
    if (user.twitterId) {
      socialLinks.push({ platform: 'twitter', label: 'X', url: `https://x.com/i/user/${user.twitterId}` });
    }
    if (user.discordId) {
      socialLinks.push({ platform: 'discord', label: 'Discord', url: `https://discord.com/users/${user.discordId}` });
    }
    const youtubeIntegration = integrationsByProvider.youtube;
    const youtubeChannelId = youtubeIntegration?.providerUserId || youtubeIntegration?.metadata?.channelId;
    if (youtubeChannelId) {
      socialLinks.push({ platform: 'youtube', label: 'YouTube', url: `https://www.youtube.com/channel/${youtubeChannelId}` });
    }
    const instagramIntegration = integrationsByProvider.instagram;
    const instagramUsername = instagramIntegration?.metadata?.username;
    if (instagramUsername) {
      socialLinks.push({ platform: 'instagram', label: 'Instagram', url: `https://www.instagram.com/${instagramUsername}` });
    }

    res.json({
      username: user.username,
      profileImageUrl: user.profileImageUrl || null,
      publicPageBannerUrl: user.publicPageBannerUrl || null,
      publicPageBannerPosition: user.publicPageBannerPosition || 'top',
      events: eventsJson,
      upcoming: eventsJson,
      liveOnTwitch,
      twitchStreamUrl,
      twitchStreamTitle,
      socialLinks,
    });
  } catch (err) {
    logger.error('Public streamer events error', { error: err.message, username: req.params.username });
    res.status(500).json({ error: 'Failed to load schedule' });
  }
}

router.get('/:username/events', handlePublicStreamerEvents);
router.get('/:username/upcoming', handlePublicStreamerEvents);

/** Same handler mounted at /api/public/streamer for legacy integrator URLs. */
export const publicStreamerUpcomingRouter = express.Router();
publicStreamerUpcomingRouter.get('/:username/upcoming', handlePublicStreamerEvents);

/**
 * POST /api/streamer/:username/remind
 * Public: subscribe to reminders for the next stream (email). Rate-limited by IP.
 */
router.post('/:username/remind', async (req, res) => {
  try {
    const username = (req.params.username || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), username.toLowerCase()),
      attributes: ['id'],
    });
    if (!user) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    const existing = await StreamReminder.findOne({
      where: { userId: user.id, email },
    });
    if (existing) {
      return res.json({ message: 'You are already subscribed to reminders.', subscribed: true });
    }

    await StreamReminder.create({
      userId: user.id,
      email,
    });

    logger.info('Stream reminder subscribed', { username, email });
    res.status(201).json({ message: "We'll notify you before the next stream.", subscribed: true });
  } catch (err) {
    logger.error('Stream remind error', { error: err.message, username: req.params?.username });
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * POST /api/streamer/:username/suggest
 * Public: viewers suggest stream ideas (!suggest play Elden Ring). No auth.
 */
router.post('/:username/suggest', async (req, res) => {
  try {
    const username = (req.params.username || '').trim();
    const text = (req.body?.text ?? req.body?.suggestion ?? '').trim();
    const suggestedBy = (req.body?.suggestedBy ?? req.body?.from ?? '').trim().slice(0, 200) || null;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'Suggestion text required (max 500 chars).' });
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), username.toLowerCase()),
      attributes: ['id'],
    });
    if (!user) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    await StreamSuggestion.create({
      userId: user.id,
      text: text.slice(0, 500),
      suggestedBy,
    });

    res.status(201).json({ message: 'Suggestion received!', ok: true });
  } catch (err) {
    logger.error('Stream suggest error', { error: err.message, username: req.params?.username });
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

export default router;
