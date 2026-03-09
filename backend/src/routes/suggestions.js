/**
 * Viewer suggestions (!suggest) — list and delete for streamer.
 * GET /api/suggestions — list for current user
 * DELETE /api/suggestions/:id — delete (streamer only)
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StreamSuggestion } from '../models/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const suggestions = await StreamSuggestion.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: ['id', 'text', 'suggestedBy', 'createdAt'],
    });
    res.json(suggestions);
  } catch (err) {
    logger.error('Suggestions list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await StreamSuggestion.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ error: 'Suggestion not found' });
    res.status(204).end();
  } catch (err) {
    logger.error('Suggestion delete error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
