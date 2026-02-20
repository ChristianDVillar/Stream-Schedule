/**
 * Publication Queue Service
 * Smart-monolith architecture: API Server only enqueues jobs, Worker processes them.
 * Uses BullMQ + Redis for scalable job processing.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';
import { getBullMQConnection } from '../utils/redisConnection.js';

const QUEUE_NAME = 'publication';
let Queue = null;
let Worker = null;
let publicationQueue = null;
let publicationWorker = null;
let queueEnabled = false;

/**
 * Initialize BullMQ for publication queue
 */
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
    logger.warn('BullMQ not available for publication queue', { error: e.message });
    return false;
  }
}

/**
 * Get or create the publication queue
 */
async function getQueue() {
  if (publicationQueue) return publicationQueue;
  const ok = await ensureBullMQ();
  if (!ok) return null;
  const connection = getBullMQConnection();
  if (!connection) return null;
  
  publicationQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 minute
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  });
  
  queueEnabled = true;
  logger.info('Publication queue initialized', { queue: QUEUE_NAME });
  return publicationQueue;
}

/**
 * Enqueue a publication job for a ContentPlatform
 * @param {number} contentId - Content ID
 * @param {string} platform - Platform name (discord, twitter, twitch, etc.)
 * @param {number} contentPlatformId - ContentPlatform ID (optional, will be created if not exists)
 * @param {Date} scheduledFor - Scheduled time for idempotency
 */
export async function enqueuePublication(contentId, platform, contentPlatformId = null, scheduledFor = null) {
  const queue = await getQueue();
  if (!queue) {
    // Fallback: return false to indicate queue not available (scheduler will handle)
    logger.warn('Publication queue not available, scheduler will process directly');
    return false;
  }

  const jobId = contentPlatformId 
    ? `publication-${contentPlatformId}`
    : `publication-${contentId}-${platform}-${scheduledFor?.getTime() || Date.now()}`;

  try {
    await queue.add(
      'publish',
      {
        contentId,
        platform,
        contentPlatformId,
        scheduledFor: scheduledFor?.toISOString() || new Date().toISOString(),
      },
      {
        jobId,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1m, 5m, 15m, 1h, 6h
        },
      }
    );
    
    logger.info('Publication job enqueued', {
      jobId,
      contentId,
      platform,
      contentPlatformId,
    });
    
    return true;
  } catch (error) {
    logger.error('Error enqueuing publication', {
      contentId,
      platform,
      error: error.message,
    });
    return false;
  }
}

/**
 * Start the publication worker
 * This should run in a separate process in production
 */
export async function startPublicationWorker(handler) {
  const ok = await ensureBullMQ();
  if (!ok) {
    logger.warn('Publication worker not started (BullMQ/Redis unavailable)');
    return null;
  }
  const connection = getBullMQConnection();
  if (!connection) return null;

  publicationWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { contentId, platform, contentPlatformId } = job.data;
      const startTime = Date.now();
      
      logger.info('Publication job started', {
        jobId: job.id,
        contentId,
        platform,
        contentPlatformId,
        attempt: job.attemptsMade + 1,
      });

      try {
        await handler(job.data);
        
        const duration = Date.now() - startTime;
        logger.info('Publication job completed', {
          jobId: job.id,
          contentId,
          platform,
          duration_ms: duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Publication job failed', {
          jobId: job.id,
          contentId,
          platform,
          attempt: job.attemptsMade + 1,
          error: error.message,
          duration_ms: duration,
        });
        throw error; // Will trigger retry with exponential backoff
      }
    },
    {
      connection,
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // Per minute
      },
    }
  );

  publicationWorker.on('completed', (job) => {
    logger.debug('Publication job completed', {
      jobId: job.id,
      contentId: job.data.contentId,
    });
  });

  publicationWorker.on('failed', (job, err) => {
    logger.error('Publication job failed permanently', {
      jobId: job?.id,
      contentId: job?.data?.contentId,
      platform: job?.data?.platform,
      attempts: job?.attemptsMade,
      error: err?.message,
    });
  });

  queueEnabled = true;
  logger.info('Publication worker started', {
    queue: QUEUE_NAME,
    concurrency: 5,
  });
  
  return publicationWorker;
}

/**
 * Stop the publication worker
 */
export async function stopPublicationWorker() {
  if (publicationWorker) {
    await publicationWorker.close();
    publicationWorker = null;
    queueEnabled = false;
    logger.info('Publication worker stopped');
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const queue = await getQueue();
  if (!queue) {
    return {
      enabled: false,
      note: 'Queue not available (Redis/BullMQ not configured)',
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('Error getting queue stats', { error: error.message });
    return {
      enabled: true,
      error: error.message,
    };
  }
}

/**
 * Check if queue is enabled
 */
export function isQueueEnabled() {
  return queueEnabled;
}

export default {
  enqueuePublication,
  startPublicationWorker,
  stopPublicationWorker,
  getQueueStats,
  isQueueEnabled,
};
