/**
 * Stream Reminder Worker
 * Processes one job from the stream-reminders queue: send email and record ReminderSent.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Content, User, StreamReminder, ReminderSent } from '../models/index.js';
import { sendStreamReminderEmail } from '../utils/notifications.js';
import logger from '../utils/logger.js';

/**
 * Handle a single reminder job
 * @param {{ contentId: number, streamReminderId: number }} data
 */
export async function handleReminderJob(data) {
  const { contentId, streamReminderId } = data;

  const content = await Content.findByPk(contentId, {
    include: [{ model: User, attributes: ['id', 'username'], required: true }],
    attributes: ['id', 'userId', 'title', 'scheduledFor'],
  });
  if (!content || !content.User) {
    logger.warn('Reminder job: content or user not found', { contentId });
    return;
  }

  const reminder = await StreamReminder.findByPk(streamReminderId, {
    attributes: ['id', 'userId', 'email'],
  });
  if (!reminder) {
    logger.warn('Reminder job: StreamReminder not found', { streamReminderId });
    return;
  }

  if (reminder.userId !== content.userId) {
    logger.warn('Reminder job: reminder does not belong to content user', {
      contentId,
      streamReminderId,
    });
    return;
  }

  const existing = await ReminderSent.findOne({
    where: { streamReminderId, contentId },
  });
  if (existing) {
    logger.debug('Reminder already sent, skipping', { contentId, streamReminderId });
    return;
  }

  await sendStreamReminderEmail(
    reminder.email,
    content.title || 'Stream',
    content.scheduledFor,
    content.User.username
  );
  await ReminderSent.create({ streamReminderId, contentId });
  logger.info('Stream reminder email sent', {
    contentId,
    streamReminderId,
    email: reminder.email,
  });
}
