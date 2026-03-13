/**
 * Cron / internal endpoints for stream reminder emails.
 * - Recommended: Redis/BullMQ queue. Producer enqueues jobs (scheduler or GET /api/cron/send-stream-reminders); worker process sends emails.
 * - Fallback: ENABLE_STREAM_REMINDER_CRON=true runs job in API process every 15 min; or external cron calls this endpoint.
 */
import express from 'express';
import { Content, User, StreamReminder, ReminderSent } from '../models/index.js';
import { sendStreamReminderEmail } from '../utils/notifications.js';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { enqueueReminder, getReminderQueue } from '../services/reminderQueueService.js';

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
 * Run the stream reminder job: find streams in ~1 hour, email subscribers, record ReminderSent.
 * Exported for in-process cron (setInterval) and used by the HTTP endpoint.
 */
export async function runStreamReminders() {
  const now = new Date();
  const from = new Date(now.getTime() + 50 * 60 * 1000);
  const to = new Date(now.getTime() + 70 * 60 * 1000);
  const statuses = [CONTENT_STATUS.SCHEDULED, CONTENT_STATUS.QUEUED];

  const contents = await Content.findAll({
    where: {
      scheduledFor: { [Op.gte]: from, [Op.lte]: to },
      status: { [Op.in]: statuses },
      deletedAt: null,
    },
    include: [{ model: User, attributes: ['id', 'username'], required: true }],
    attributes: ['id', 'userId', 'title', 'scheduledFor'],
  });

  let sent = 0;
  for (const content of contents) {
    const user = content.User;
    if (!user) continue;
    const reminders = await StreamReminder.findAll({
      where: { userId: content.userId },
      attributes: ['id', 'email'],
    });
    for (const reminder of reminders) {
      const existing = await ReminderSent.findOne({
        where: { streamReminderId: reminder.id, contentId: content.id },
      });
      if (existing) continue;
      try {
        await sendStreamReminderEmail(
          reminder.email,
          content.title || 'Stream',
          content.scheduledFor,
          user.username
        );
        await ReminderSent.create({ streamReminderId: reminder.id, contentId: content.id });
        sent++;
      } catch (e) {
        logger.warn('Stream reminder email failed', { reminderId: reminder.id, contentId: content.id, error: e.message });
      }
    }
  }
  if (contents.length > 0 || sent > 0) {
    logger.info('Stream reminders job', { streamsChecked: contents.length, remindersSent: sent });
  }
  return { streamsChecked: contents.length, remindersSent: sent };
}

/**
 * Producer: find streams in ~1 hour window and enqueue one job per (contentId, streamReminderId).
 * Returns { streamsChecked, jobsEnqueued }. Workers (workerServer) will send emails.
 */
export async function enqueueStreamReminderJobs() {
  const queue = await getReminderQueue();
  if (!queue) {
    return { streamsChecked: 0, jobsEnqueued: 0, queueAvailable: false };
  }

  const now = new Date();
  const from = new Date(now.getTime() + 50 * 60 * 1000);
  const to = new Date(now.getTime() + 70 * 60 * 1000);
  const statuses = [CONTENT_STATUS.SCHEDULED, CONTENT_STATUS.QUEUED];

  const contents = await Content.findAll({
    where: {
      scheduledFor: { [Op.gte]: from, [Op.lte]: to },
      status: { [Op.in]: statuses },
      deletedAt: null,
    },
    attributes: ['id', 'userId'],
  });

  let jobsEnqueued = 0;
  for (const content of contents) {
    const reminders = await StreamReminder.findAll({
      where: { userId: content.userId },
      attributes: ['id'],
    });
    for (const reminder of reminders) {
      const existing = await ReminderSent.findOne({
        where: { streamReminderId: reminder.id, contentId: content.id },
      });
      if (existing) continue;
      const ok = await enqueueReminder(content.id, reminder.id);
      if (ok) jobsEnqueued++;
    }
  }
  if (contents.length > 0 || jobsEnqueued > 0) {
    logger.info('Stream reminder jobs enqueued', { streamsChecked: contents.length, jobsEnqueued });
  }
  return { streamsChecked: contents.length, jobsEnqueued, queueAvailable: true };
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
