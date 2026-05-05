/**
 * Publication Worker
 * Processes publication jobs from the queue.
 */

import logger from '../../../utils/logger.js';
import { Content, ContentPlatform } from '../../content/infrastructure/models.js';
import { User } from '../../users/infrastructure/models.js';
import { CONTENT_PLATFORM_STATUS } from '../../content/infrastructure/ContentPlatform.model.js';
import { startPublicationWorker } from '../../../services/publicationQueueService.js';
import { refreshIntegrationToken } from './integrationTokenService.js';
import { publishToPlatform } from './platformPublisher.js';

function calculateNextRetry(retryCount) {
  const delays = [
    60000,
    300000,
    900000,
    3600000,
    21600000,
  ];

  const delay = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delay);
}

async function handlePublicationJob(jobData) {
  const { contentId, platform, contentPlatformId } = jobData;

  let contentPlatform = null;
  if (contentPlatformId) {
    contentPlatform = await ContentPlatform.findByPk(contentPlatformId, {
      include: [{ model: Content, as: 'content' }],
    });
  }

  const content = await Content.findByPk(contentId);
  if (!content) {
    throw new Error(`Content ${contentId} not found`);
  }

  if (contentPlatformId) {
    contentPlatform = await ContentPlatform.findByPk(contentPlatformId);
  }

  if (!contentPlatform) {
    contentPlatform = await ContentPlatform.findOne({
      where: { contentId, platform },
    });

    if (!contentPlatform) {
      contentPlatform = await ContentPlatform.create({
        contentId,
        platform,
        status: CONTENT_PLATFORM_STATUS.QUEUED,
      });
    }
  }

  contentPlatform.status = CONTENT_PLATFORM_STATUS.PUBLISHING;
  await contentPlatform.save();

  try {
    const user = await User.findByPk(content.userId);
    if (!user) {
      throw new Error(`User ${content.userId} not found`);
    }

    await refreshIntegrationToken(user.id, platform);
    const result = await publishToPlatform(content, platform, user);

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
    const retryCount = contentPlatform.retryCount + 1;
    const maxRetries = 5;

    if (retryCount >= maxRetries) {
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
      contentPlatform.status = CONTENT_PLATFORM_STATUS.RETRYING;
      contentPlatform.errorMessage = error.message;
      contentPlatform.retryCount = retryCount;
      contentPlatform.nextRetryAt = calculateNextRetry(retryCount);

      const { enqueuePublication } = await import('../../../services/publicationQueueService.js');
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
    throw error;
  }
}

export async function startWorker() {
  return await startPublicationWorker(handlePublicationJob);
}

export async function stopWorker() {
  const { stopPublicationWorker } = await import('../../../services/publicationQueueService.js');
  await stopPublicationWorker();
}

export default {
  startWorker,
  stopWorker,
};

