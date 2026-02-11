/**
 * Queue Service
 * Decoupled scheduler: enqueue jobs instead of direct execution
 * Prepared for BullMQ + Redis integration
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';

// Queue configuration
const QUEUE_CONFIG = {
  publish: {
    name: 'publish-content',
    concurrency: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
};

// In-memory queue fallback (if BullMQ not available)
const memoryQueue = {
  publish: []
};

let queueEnabled = false;
let Queue = null;
let Worker = null;

/**
 * Initialize queue system (BullMQ if Redis available, fallback to memory)
 */
export async function initializeQueues() {
  try {
    // Try to use BullMQ if Redis is available
    if (process.env.REDIS_URL) {
      try {
        const bullmq = await import('bullmq');
        Queue = bullmq.Queue;
        Worker = bullmq.Worker;
        queueEnabled = true;
        logger.info('Queue system initialized with BullMQ', {
          redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured'
        });
      } catch (error) {
        logger.warn('BullMQ not available, using memory queue fallback', {
          error: error.message
        });
      }
    }
  } catch (error) {
    logger.warn('Queue initialization failed, using memory fallback', {
      error: error.message
    });
  }
}

/**
 * Add content publication job to queue
 */
export async function enqueuePublication(contentId, platform, userId, scheduledFor) {
  try {
    const jobData = {
      contentId,
      platform,
      userId,
      scheduledFor: scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor,
      timestamp: Date.now()
    };

    if (queueEnabled && Queue) {
      // Use BullMQ
      const queue = new Queue(QUEUE_CONFIG.publish.name, {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
        }
      });

      await queue.add('publish', jobData, {
        attempts: QUEUE_CONFIG.publish.attempts,
        backoff: QUEUE_CONFIG.publish.backoff,
        jobId: `${contentId}-${platform}-${Date.now()}`
      });

      logger.info('Publication job enqueued (BullMQ)', {
        contentId,
        platform,
        userId
      });
    } else {
      // Use memory queue fallback
      memoryQueue.publish.push({
        ...jobData,
        id: `${contentId}-${platform}-${Date.now()}`,
        attempts: 0,
        maxAttempts: QUEUE_CONFIG.publish.attempts
      });

      logger.info('Publication job enqueued (memory)', {
        contentId,
        platform,
        userId,
        queueSize: memoryQueue.publish.length
      });
    }
  } catch (error) {
    logger.error('Error enqueuing publication', {
      contentId,
      platform,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process queue jobs (worker function)
 * This should be called by a separate worker process in production
 */
export async function processQueueJobs(handler) {
  if (queueEnabled && Worker) {
    // BullMQ worker
    const worker = new Worker(
      QUEUE_CONFIG.publish.name,
      async (job) => {
        logger.info('Processing publication job', {
          jobId: job.id,
          contentId: job.data.contentId,
          platform: job.data.platform
        });

        try {
          await handler(job.data);
          logger.info('Publication job completed', {
            jobId: job.id,
            contentId: job.data.contentId
          });
        } catch (error) {
          logger.error('Publication job failed', {
            jobId: job.id,
            contentId: job.data.contentId,
            error: error.message,
            attempts: job.attemptsMade
          });
          throw error; // Will trigger retry
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
        },
        concurrency: QUEUE_CONFIG.publish.concurrency
      }
    );

    worker.on('completed', (job) => {
      logger.debug('Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      logger.error('Job failed permanently', {
        jobId: job?.id,
        error: err.message
      });
    });

    return worker;
  } else {
    // Memory queue processor (for development/testing)
    logger.warn('Using memory queue processor (not recommended for production)');
    
    const processMemoryQueue = async () => {
      if (memoryQueue.publish.length === 0) return;

      const job = memoryQueue.publish.shift();
      
      try {
        logger.info('Processing memory queue job', {
          jobId: job.id,
          contentId: job.contentId
        });

        await handler({
          contentId: job.contentId,
          platform: job.platform,
          userId: job.userId,
          scheduledFor: job.scheduledFor
        });

        logger.info('Memory queue job completed', {
          jobId: job.id
        });
      } catch (error) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          // Retry
          memoryQueue.publish.push(job);
          logger.warn('Memory queue job failed, retrying', {
            jobId: job.id,
            attempts: job.attempts
          });
        } else {
          logger.error('Memory queue job failed permanently', {
            jobId: job.id,
            error: error.message
          });
        }
      }
    };

    // Process queue every 5 seconds
    setInterval(processMemoryQueue, 5000);
    
    return { processMemoryQueue };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  if (queueEnabled && Queue) {
    const queue = new Queue(QUEUE_CONFIG.publish.name, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  } else {
    return {
      waiting: memoryQueue.publish.length,
      active: 0,
      completed: 0,
      failed: 0,
      total: memoryQueue.publish.length,
      note: 'Using memory queue (not recommended for production)'
    };
  }
}

// Initialize on module load
initializeQueues().catch(err => {
  logger.error('Failed to initialize queues', {
    error: err.message
  });
});

export default {
  initializeQueues,
  enqueuePublication,
  processQueueJobs,
  getQueueStats
};
