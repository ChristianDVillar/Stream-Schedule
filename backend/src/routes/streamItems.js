/**
 * Stream items (ideas, notes, quotes, clip ideas) — from !idea, !note, !quote, !clipidea.
 * GET /api/stream-items — list for current user, optional ?type=idea|note|quote|clipidea, ?sort=recent|votes
 * sort=votes (only for type=idea): order by number of duplicate texts (popularity from !voteidea).
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStreamItems, deleteStreamItemById } from '../modules/content/application/streamItemsService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await getStreamItems(req.user.id, {
      type: req.query.type,
      sort: req.query.sort,
    });
    res.json(items);
  } catch (err) {
    logger.error('Stream items list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load stream items' });
  }
});

/**
 * DELETE /api/stream-items/:id — delete one stream item (idea, note, quote, clip idea).
 * User can only delete their own items.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteStreamItemById(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found or you do not own it.' });
    }
    res.status(200).json({ ok: true, message: 'Deleted.' });
  } catch (err) {
    logger.error('Stream item delete error', { error: err.message, userId: req.user?.id, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

export default router;
