/**
 * Queue Service (Bull/BullMQ)
 * Background job processing for content publishing
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Note: Requires Redis. Install: npm install bull ioredis
 * Configure REDIS_URL in environment variables
 */

import logger from '../utils/logger.js';

// Check if Bull is available
let Queue = null;
let Redis = null;
let publishQueue = null;

try {
  // Dynamic import to avoid errors if not installed
  const bullModule = await import('bull');
  Queue = bullModule.default || bullModule.Queue;
  
  const redisModule = await import('ioredis');
  Redis = redisModule.default || redisModule;
  
  if (Queue && process.env.REDIS_URL) {
    publishQueue = new Queue('content-publish', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        ...(process.env.REDIS_URL && { url: process.env.REDIS_URL }),
      },
    });
    
    // Process jobs
    publishQueue.process(async (job) => {
      const { contentId } = job.data;
      logger.info('Processing content publish job', { contentId, jobId: job.id });
      
      // Import here to avoid circular dependency
      const { Content } = await import('../models/index.js');
      const content = await Content.findByPk(contentId);
      
      if (content) {
        const { publishContent } = await import('../services/scheduler.js');
        await publishContent(content);
      } else {
        logger.error('Content not found for job', { contentId });
      }
    });
    
    logger.info('Queue service initialized with Redis');
  }
} catch (error) {
  logger.warn('Queue service not available (Redis/Bull not configured)', {
    error: error.message,
  });
}

export class QueueService {
  /**
   * Add content to publish queue
   */
  static async addPublishJob(contentId, options = {}) {
    if (!publishQueue) {
      logger.warn('Queue not available, publishing synchronously', { contentId });
      // Fallback to synchronous publishing
      const { publishContent } = await import('../services/scheduler.js');
      return await publishContent({ id: contentId });
    }
    
    return await publishQueue.add(
      'publish',
      { contentId },
      {
        attempts: options.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: options.delay || 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }

  /**
   * Get queue stats
   */
  static async getStats() {
    if (!publishQueue) {
      return { available: false };
    }
    
    const [waiting, active, completed, failed] = await Promise.all([
      publishQueue.getWaitingCount(),
      publishQueue.getActiveCount(),
      publishQueue.getCompletedCount(),
      publishQueue.getFailedCount(),
    ]);
    
    return {
      available: true,
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Check if queue is available
   */
  static isAvailable() {
    return !!publishQueue;
  }
}

export default QueueService;
