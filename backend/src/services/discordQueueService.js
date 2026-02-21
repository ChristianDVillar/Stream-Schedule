/**
 * Dedicated queue for Discord event sync (multi-server safe).
 * Never call Discord API directly for events; always enqueueDiscordSync(contentId).
 * When Redis/BullMQ is not available, uses an in-memory queue with serial processing
 * and delay between jobs to avoid Discord 429 rate limits.
 */

import logger from '../utils/logger.js';
import { getRedis, getBullMQConnection } from '../utils/redisConnection.js';
import { processSync } from './discordSyncService.js';
import { DiscordRateLimitError } from '../utils/discordPublish.js';

const QUEUE_NAME = 'discord-sync';
const LIMITER_MAX = 50;
const LIMITER_DURATION_MS = 1000;

/** In-memory fallback when Redis/BullMQ not available */
const IN_MEMORY_DELAY_MS = 1200; // delay between Discord API calls to avoid 429
const pendingJobs = [];
let inMemoryProcessing = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Process the in-memory queue one job at a time with delay to avoid Discord 429.
 */
async function processInMemoryQueue() {
  if (inMemoryProcessing || pendingJobs.length === 0) return;
  inMemoryProcessing = true;
  while (pendingJobs.length > 0) {
    const { contentId } = pendingJobs.shift();
    try {
      await processSync(contentId);
      logger.info('Discord sync in-memory completed', { contentId });
    } catch (err) {
      if (err instanceof DiscordRateLimitError) {
        const waitMs = Math.ceil((err.retryAfterSeconds || 11) * 1000);
        logger.warn('Discord 429 in-memory queue, waiting then re-queuing', { contentId, waitMs });
        await delay(waitMs);
        if (!pendingJobs.some((j) => j.contentId === contentId)) {
          pendingJobs.push({ contentId });
        }
      } else {
        logger.error('Discord sync in-process failed', { contentId, error: err.message });
      }
    }
    await delay(IN_MEMORY_DELAY_MS);
  }
  inMemoryProcessing = false;
}

/**
 * Enqueue a Discord sync job for the given content.
 * jobId = discord-sync-${contentId} to avoid duplicate concurrent jobs.
 * When Redis/BullMQ is not available, adds to in-memory queue (serial + delay) to avoid 429.
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
  // Fallback: in-memory queue with serial processing and delay to avoid 429
  if (!pendingJobs.some((j) => j.contentId === contentId)) {
    pendingJobs.push({ contentId });
    logger.info('Discord sync added to in-memory queue', { contentId, queueLength: pendingJobs.length });
  }
  processInMemoryQueue().catch((err) => {
    logger.error('Discord in-memory queue processor error', { error: err.message });
    inMemoryProcessing = false;
  });
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
