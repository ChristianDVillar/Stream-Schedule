/**
 * Dedicated queue for Discord event sync (multi-server safe).
 * Never call Discord API directly for events; always enqueueDiscordSync(contentId).
 */

import logger from '../utils/logger.js';
import { getRedis, getBullMQConnection } from '../utils/redisConnection.js';
import { processSync } from './discordSyncService.js';

const QUEUE_NAME = 'discord-sync';
const LIMITER_MAX = 50;
const LIMITER_DURATION_MS = 1000;

let Queue = null;
let Worker = null;
let discordQueue = null;
let discordWorker = null;
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
    logger.warn('BullMQ not available for Discord sync', { error: e.message });
    return false;
  }
}

function getConnection() {
  // BullMQ accepts IORedis instance or { host, port, password }
  return getBullMQConnection();
}

/**
 * Get or create the discord-sync queue (for adding jobs).
 */
async function getQueue() {
  if (discordQueue) return discordQueue;
  const ok = await ensureBullMQ();
  if (!ok) return null;
  const connection = getConnection();
  if (!connection) return null;
  discordQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
    },
  });
  return discordQueue;
}

/**
 * Enqueue a Discord sync job for the given content.
 * jobId = discord-sync-${contentId} to avoid duplicate concurrent jobs.
 */
export async function enqueueDiscordSync(contentId) {
  const queue = await getQueue();
  if (queue) {
    await queue.add(
      'sync',
      { contentId },
      {
        jobId: `discord-sync-${contentId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
      }
    );
    logger.info('Discord sync enqueued', { contentId });
    return true;
  }
  // Fallback: run sync in-process when Redis/BullMQ not available
  logger.info('Discord sync running in-process (no Redis/BullMQ)', { contentId });
  try {
    await processSync(contentId);
  } catch (err) {
    logger.error('Discord sync in-process failed', { contentId, error: err.message });
    throw err;
  }
  return false;
}

/**
 * Start the Discord sync worker (only one process should run workers in production).
 */
export async function startDiscordSyncWorker() {
  const ok = await ensureBullMQ();
  if (!ok) {
    logger.warn('Discord sync worker not started (BullMQ/Redis unavailable)');
    return null;
  }
  const connection = getConnection();
  if (!connection) return null;

  discordWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { contentId } = job.data;
      logger.info('Discord sync job started', { jobId: job.id, contentId });
      await processSync(contentId);
      logger.info('Discord sync job completed', { jobId: job.id, contentId });
    },
    {
      connection,
      concurrency: 3,
      limiter: {
        max: LIMITER_MAX,
        duration: LIMITER_DURATION_MS,
      },
    }
  );

  discordWorker.on('failed', (job, err) => {
    logger.error('Discord sync job failed', {
      jobId: job?.id,
      contentId: job?.data?.contentId,
      error: err?.message,
    });
  });

  queueEnabled = true;
  logger.info('Discord sync worker started', { queue: QUEUE_NAME });
  return discordWorker;
}

/**
 * Stop the Discord sync worker.
 */
export async function stopDiscordSyncWorker() {
  if (discordWorker) {
    await discordWorker.close();
    discordWorker = null;
    queueEnabled = false;
    logger.info('Discord sync worker stopped');
  }
}

export function isDiscordQueueEnabled() {
  return queueEnabled;
}
