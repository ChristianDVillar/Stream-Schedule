/**
 * Stream Reminder Queue Service
 * Uses BullMQ + Redis: producer enqueues one job per (contentId, streamReminderId), worker sends email.
 * Replaces in-process cron for scalability.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';
import { getBullMQConnection } from '../utils/redisConnection.js';

const QUEUE_NAME = 'stream-reminders';

let Queue = null;
let Worker = null;
let reminderQueue = null;
let reminderWorker = null;
let queueEnabled = false;

async function ensureBullMQ() {
  if (Queue && Worker) return true;
  const config = getBullMQConnection();
  if (!config) return false;
  try {
    const bullmq = await import('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
    return true;
  } catch (e) {
    logger.warn('BullMQ not available for reminder queue', { error: e.message });
    return false;
  }
}

/**
 * Get or create the stream-reminders queue
 */
export async function getReminderQueue() {
  if (reminderQueue) return reminderQueue;
  const ok = await ensureBullMQ();
  if (!ok) return null;
  const connection = getBullMQConnection();
  if (!connection) return null;

  reminderQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 200,
    },
  });

  queueEnabled = true;
  logger.info('Reminder queue initialized', { queue: QUEUE_NAME });
  return reminderQueue;
}

/**
 * Enqueue a single reminder job (one email to send)
 * @param {number} contentId - Content (stream) ID
 * @param {number} streamReminderId - StreamReminder ID
 */
export async function enqueueReminder(contentId, streamReminderId) {
  const queue = await getReminderQueue();
  if (!queue) return false;

  const jobId = `reminder-${contentId}-${streamReminderId}`;
  try {
    await queue.add(
      'send',
      { contentId, streamReminderId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
    logger.debug('Reminder job enqueued', { contentId, streamReminderId });
    return true;
  } catch (error) {
    logger.error('Error enqueuing reminder', {
      contentId,
      streamReminderId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Start the reminder worker (run in worker process)
 * @param {Function} handler - async (job) => {} receives job.data { contentId, streamReminderId }
 */
export async function startReminderWorker(handler) {
  const ok = await ensureBullMQ();
  if (!ok) {
    logger.warn('Reminder worker not started (BullMQ/Redis unavailable)');
    return null;
  }
  const connection = getBullMQConnection();
  if (!connection) return null;

  reminderWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { contentId, streamReminderId } = job.data;
      logger.debug('Reminder job started', { jobId: job.id, contentId, streamReminderId });
      try {
        await handler(job.data);
        logger.debug('Reminder job completed', { jobId: job.id, contentId, streamReminderId });
      } catch (error) {
        logger.error('Reminder job failed', {
          jobId: job.id,
          contentId,
          streamReminderId,
          error: error.message,
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 200,
        duration: 60000,
      },
    }
  );

  reminderWorker.on('failed', (job, err) => {
    logger.error('Reminder job failed permanently', {
      jobId: job?.id,
      contentId: job?.data?.contentId,
      streamReminderId: job?.data?.streamReminderId,
      error: err?.message,
    });
  });

  reminderWorker.on('error', (err) => {
    logger.error('Reminder worker error', { error: err?.message });
    import('./alertService.js').then((m) => m.sendAlert(`🚨 Reminder worker error: ${err?.message || err}`, 'dev')).catch(() => {});
  });

  queueEnabled = true;
  logger.info('Reminder worker started', { queue: QUEUE_NAME, concurrency: 10 });
  return reminderWorker;
}

export async function stopReminderWorker() {
  if (reminderWorker) {
    await reminderWorker.close();
    reminderWorker = null;
    queueEnabled = false;
    logger.info('Reminder worker stopped');
  }
}

/**
 * Get reminder queue stats (for monitoring)
 */
export async function getReminderQueueStats() {
  const queue = await getReminderQueue();
  if (!queue) {
    return { enabled: false, note: 'Reminder queue not available (Redis/BullMQ not configured)' };
  }
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  } catch (error) {
    logger.error('Error getting reminder queue stats', { error: error.message });
    return { enabled: true, error: error.message };
  }
}

export function isReminderQueueEnabled() {
  return queueEnabled;
}
