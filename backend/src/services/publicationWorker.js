/**
 * Publication Worker
 * Processes publication jobs from the queue.
 * This is the worker that actually publishes content to platforms.
 * Can run in a separate process for scalability.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';
import { Content, ContentPlatform, User, Integration } from '../models/index.js';
import { CONTENT_PLATFORM_STATUS } from '../models/ContentPlatform.js';
import { startPublicationWorker } from './publicationQueueService.js';
import { refreshIntegrationToken } from './integrationTokenService.js';
import { publishToPlatform } from './platformPublisher.js';

/**
 * Calculate next retry time using exponential backoff
 * @param {number} retryCount - Current retry count
 * @returns {Date} Next retry time
 */
function calculateNextRetry(retryCount) {
  const delays = [
    60000,      // 1 minute
    300000,     // 5 minutes
    900000,     // 15 minutes
    3600000,    // 1 hour
    21600000,   // 6 hours
  ];
  
  const delay = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delay);
}

/**
 * Handle publication job
 */
async function handlePublicationJob(jobData) {
  const { contentId, platform, contentPlatformId } = jobData;
  
  // Load ContentPlatform (create if doesn't exist)
  let contentPlatform = null;
  if (contentPlatformId) {
    contentPlatform = await ContentPlatform.findByPk(contentPlatformId, {
      include: [{ model: Content, as: 'content' }],
    });
  }
  
  // Load Content first
  const content = await Content.findByPk(contentId);
  if (!content) {
    throw new Error(`Content ${contentId} not found`);
  }
  
  // Load or create ContentPlatform
  if (contentPlatformId) {
    contentPlatform = await ContentPlatform.findByPk(contentPlatformId);
  }
  
  if (!contentPlatform) {
    // Check if ContentPlatform already exists
    contentPlatform = await ContentPlatform.findOne({
      where: { contentId, platform },
    });
    
    if (!contentPlatform) {
      // Create ContentPlatform entry
      contentPlatform = await ContentPlatform.create({
        contentId,
        platform,
        status: CONTENT_PLATFORM_STATUS.QUEUED,
      });
    }
  }
  
  // Update status to PUBLISHING
  contentPlatform.status = CONTENT_PLATFORM_STATUS.PUBLISHING;
  await contentPlatform.save();
  
  try {
    // Get user and integration
    const user = await User.findByPk(content.userId);
    if (!user) {
      throw new Error(`User ${content.userId} not found`);
    }
    
    // Refresh token if needed (proactive refresh)
    await refreshIntegrationToken(user.id, platform);
    
    // Publish to platform
    const result = await publishToPlatform(content, platform, user);
    
    // Update ContentPlatform on success
    contentPlatform.status = CONTENT_PLATFORM_STATUS.PUBLISHED;
    contentPlatform.externalId = result.externalId || null;
    contentPlatform.publishedAt = new Date();
    contentPlatform.errorMessage = null;
    contentPlatform.retryCount = 0;
    contentPlatform.nextRetryAt = null;
    if (result.metadata) {
      contentPlatform.metadata = result.metadata;
    }
    await contentPlatform.save();
    
    logger.info('Publication successful', {
      contentId,
      platform,
      contentPlatformId: contentPlatform.id,
      externalId: result.externalId,
    });
    
    return result;
  } catch (error) {
    // Update ContentPlatform on failure
    const retryCount = contentPlatform.retryCount + 1;
    const maxRetries = 5;
    
    if (retryCount >= maxRetries) {
      // Max retries reached → FAILED
      contentPlatform.status = CONTENT_PLATFORM_STATUS.FAILED;
      contentPlatform.errorMessage = error.message;
      contentPlatform.nextRetryAt = null;
      logger.error('Publication failed permanently', {
        contentId,
        platform,
        retryCount,
        error: error.message,
      });
    } else {
      // Schedule retry
      contentPlatform.status = CONTENT_PLATFORM_STATUS.RETRYING;
      contentPlatform.errorMessage = error.message;
      contentPlatform.retryCount = retryCount;
      contentPlatform.nextRetryAt = calculateNextRetry(retryCount);
      
      // Re-enqueue for retry
      const { enqueuePublication } = await import('./publicationQueueService.js');
      await enqueuePublication(contentId, platform, contentPlatform.id, new Date(contentPlatform.nextRetryAt));
      
      logger.warn('Publication failed, scheduled retry', {
        contentId,
        platform,
        retryCount,
        nextRetryAt: contentPlatform.nextRetryAt,
        error: error.message,
      });
    }
    
    await contentPlatform.save();
    throw error; // Re-throw so BullMQ handles retry
  }
}

/**
 * Start the publication worker
 */
export async function startWorker() {
  return await startPublicationWorker(handlePublicationJob);
}

/**
 * Stop the publication worker
 */
export async function stopWorker() {
  const { stopPublicationWorker } = await import('./publicationQueueService.js');
  await stopPublicationWorker();
}

export default {
  startWorker,
  stopWorker,
};
