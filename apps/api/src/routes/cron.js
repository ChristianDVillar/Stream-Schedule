/**
 * Cron / internal endpoints for stream reminder emails.
 * - Recommended: Redis/BullMQ queue. Producer enqueues jobs (scheduler or GET /api/cron/send-stream-reminders); worker process sends emails.
 * - Fallback: ENABLE_STREAM_REMINDER_CRON=true runs job in API process every 15 min; or external cron calls this endpoint.
 */
import express from 'express';
import logger from '../utils/logger.js';
import { getReminderQueue } from '../services/reminderQueueService.js';
import { enqueueStreamReminderJobs, runStreamReminders } from '../modules/reminders/application/jobs/reminderOrchestrator.js';

const router = express.Router();
const CRON_SECRET = process.env.CRON_SECRET || process.env.INTERNAL_CRON_SECRET || '';

function requireCronSecret(req, res, next) {
  const secret = req.query.secret || req.headers['x-cron-secret'] || '';
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/cron/send-stream-reminders?secret=...
 * If Redis/BullMQ available: enqueues reminder jobs (workers send emails). Returns jobsEnqueued.
 * Otherwise: runs runStreamReminders() in-process (fallback).
 */
router.get('/send-stream-reminders', requireCronSecret, async (req, res) => {
  try {
    const queue = await getReminderQueue();
    if (queue) {
      const result = await enqueueStreamReminderJobs();
      return res.json({ ok: true, ...result });
    }
    const result = await runStreamReminders();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('Cron send-stream-reminders error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
export { runStreamReminders, enqueueStreamReminderJobs };
