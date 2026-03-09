/**
 * Stream timeline — list events logged via POST /api/webhooks/timeline.
 * GET /api/timeline — list for current user (today or last N hours).
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StreamTimelineEvent } from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const router = express.Router();

async function listTimeline(req, res) {
  try {
    const hours = Math.min(24 * 7, Math.max(1, parseInt(req.query.hours, 10) || 24));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const events = await StreamTimelineEvent.findAll({
      where: {
        userId: req.user.id,
        createdAt: { [Op.gte]: since },
      },
      order: [['createdAt', 'DESC']],
      limit: 200,
      attributes: ['id', 'type', 'payload', 'createdAt'],
    });
    res.json(events);
  } catch (err) {
    logger.error('Timeline list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load timeline' });
  }
}

// GET /api/timeline and GET /api/timeline/ (mounted at /api/timeline; some setups pass '' or '/')
router.get('/', requireAuth, listTimeline);
router.get('', requireAuth, listTimeline);

export default router;
