/**
 * Stream items (ideas, notes, quotes, clip ideas) — from !idea, !note, !quote, !clipidea.
 * GET /api/stream-items — list for current user, optional ?type=idea|note|quote|clipidea, ?sort=recent|votes
 * sort=votes (only for type=idea): order by number of duplicate texts (popularity from !voteidea).
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StreamItem, sequelize } from '../models/index.js';
import logger from '../utils/logger.js';

const router = express.Router();
const TYPES = ['idea', 'note', 'quote', 'clipidea'];

router.get('/', requireAuth, async (req, res) => {
  try {
    const type = (req.query.type || '').trim();
    const sort = (req.query.sort || 'recent').toLowerCase();
    const where = { userId: req.user.id };
    if (type && TYPES.includes(type)) where.type = type;

    if (type === 'idea' && sort === 'votes') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = await sequelize.query(
        `SELECT MAX("id") AS "id", 'idea' AS "type", "text", MAX("createdAt") AS "createdAt", COUNT(*)::int AS "voteCount"
         FROM "StreamItems"
         WHERE "userId" = :userId AND "type" = 'idea' AND "createdAt" >= :since
         GROUP BY "text"
         ORDER BY "voteCount" DESC, MAX("createdAt") DESC
         LIMIT 200`,
        {
          replacements: { userId: req.user.id, since: sevenDaysAgo },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const items = (rows || []).map((r) => ({
        id: r.id,
        type: 'idea',
        text: r.text,
        createdAt: r.createdAt,
        voteCount: Number(r.voteCount) || 1,
      }));
      return res.json(items);
    }

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
