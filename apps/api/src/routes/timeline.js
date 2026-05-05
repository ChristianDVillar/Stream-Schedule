/**
 * Stream timeline — list events logged via POST /api/webhooks/timeline.
 * GET /api/timeline — list for current user (today or last N hours).
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTimelineEvents } from '../modules/content/application/timelineService.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function listTimeline(req, res) {
  try {
    const events = await getTimelineEvents(req.user.id, req.query.hours);
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
