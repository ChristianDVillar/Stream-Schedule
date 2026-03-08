/**
 * Public streamer page API — no auth.
 * GET /api/streamer/:username/events — upcoming streams for a user (by username).
 * Used by /streamer/:username and /embed/streamer/:username.
 */

import express from 'express';
import { Content, User, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import logger from '../utils/logger.js';

const router = express.Router();

const UPCOMING_STATUSES = [
  CONTENT_STATUS.SCHEDULED,
  CONTENT_STATUS.QUEUED,
  CONTENT_STATUS.PUBLISHING,
  CONTENT_STATUS.PUBLISHED,
];

/**
 * GET /api/streamer/:username/events
 * Returns streamer profile (username, profileImageUrl) and upcoming events (title, scheduledFor, contentType, platforms).
 * Events: scheduledFor >= now, status in scheduled/queued/publishing/published, order asc, limit 30.
 */
router.get('/:username/events', async (req, res) => {
  try {
    const username = (req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), username.toLowerCase()),
      attributes: ['id', 'username', 'profileImageUrl'],
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

    res.json({
      username: user.username,
      profileImageUrl: user.profileImageUrl || null,
      events: eventsJson,
    });
  } catch (err) {
    logger.error('Public streamer events error', { error: err.message, username: req.params.username });
    res.status(500).json({ error: 'Failed to load schedule' });
  }
});

export default router;
