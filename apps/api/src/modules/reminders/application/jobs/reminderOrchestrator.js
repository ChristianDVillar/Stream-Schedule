import { Op } from 'sequelize';
import { Content, User, StreamReminder, ReminderSent } from '../../infrastructure/models.js';
import { sendStreamReminderEmail } from '../../../../utils/notifications.js';
import logger from '../../../../utils/logger.js';
import { enqueueReminder, getReminderQueue } from '../../../../services/reminderQueueService.js';
import { getReminderStatuses, getReminderWindow } from '../../domain/reminderWindow.js';

export async function runStreamReminders() {
  const { from, to } = getReminderWindow();
  const statuses = getReminderStatuses();

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
        await sendStreamReminderEmail(reminder.email, content.title || 'Stream', content.scheduledFor, user.username);
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

export async function enqueueStreamReminderJobs() {
  const queue = await getReminderQueue();
  if (!queue) {
    return { streamsChecked: 0, jobsEnqueued: 0, queueAvailable: false };
  }

  const { from, to } = getReminderWindow();
  const statuses = getReminderStatuses();

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

