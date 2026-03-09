/**
 * Cron / internal endpoints and in-process job for stream reminder emails.
 * Set ENABLE_STREAM_REMINDER_CRON=true to run the job every 15 minutes inside the app.
 * Or call GET /api/cron/send-stream-reminders?secret=CRON_SECRET from an external cron.
 */
import express from 'express';
import { Content, User, StreamReminder, ReminderSent } from '../models/index.js';
import { sendStreamReminderEmail } from '../utils/notifications.js';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

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
 * GET /api/cron/send-stream-reminders?secret=...
 * Finds streams starting in ~1 hour, sends reminder emails to subscribers, records ReminderSent.
 */
router.get('/send-stream-reminders', requireCronSecret, async (req, res) => {
  try {
    const result = await runStreamReminders();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('Cron send-stream-reminders error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
