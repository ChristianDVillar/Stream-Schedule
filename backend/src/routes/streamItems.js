/**
 * Stream items (ideas, notes, quotes, clip ideas) — from !idea, !note, !quote, !clipidea.
 * GET /api/stream-items — list for current user, optional ?type=idea|note|quote|clipidea
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StreamItem } from '../models/index.js';
import logger from '../utils/logger.js';

const router = express.Router();
const TYPES = ['idea', 'note', 'quote', 'clipidea'];

router.get('/', requireAuth, async (req, res) => {
  try {
    const type = (req.query.type || '').trim();
    const where = { userId: req.user.id };
    if (type && TYPES.includes(type)) where.type = type;

    const items = await StreamItem.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 200,
      attributes: ['id', 'type', 'text', 'createdAt'],
    });
    res.json(items);
  } catch (err) {
    logger.error('Stream items list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load stream items' });
  }
});

export default router;
