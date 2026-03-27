/**
 * Scheduler Producer
 * Only detects due content and enqueues jobs.
 */

import { Content, ContentPlatform } from '../infrastructure/models.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../../../constants/contentStatus.js';
import { CONTENT_PLATFORM_STATUS } from '../infrastructure/ContentPlatform.model.js';
import { enqueuePublication } from '../../../services/publicationQueueService.js';
import logger from '../../../utils/logger.js';
import { APP_CONFIG } from '../../../constants/app.js';

const INTERVAL_MS = APP_CONFIG.SCHEDULER_INTERVAL_MS;

async function getDueContent() {
  const now = new Date();

  const content = await Content.findAll({
    where: {
      deletedAt: null,
      [Op.or]: [
        {
          status: CONTENT_STATUS.SCHEDULED,
          scheduledFor: { [Op.lte]: now },
        },
        {
          status: CONTENT_STATUS.QUEUED,
        },
      ],
    },
    include: [
      {
        model: ContentPlatform,
        as: 'contentPlatforms',
        required: false,
      },
    ],
    order: [['scheduledFor', 'ASC']],
    limit: 100,
  });

  const retryPlatforms = await ContentPlatform.findAll({
    where: {
      status: CONTENT_PLATFORM_STATUS.RETRYING,
      nextRetryAt: {
        [Op.lte]: now,
      },
    },
    include: [
      {
        model: Content,
        as: 'content',
        where: {
          deletedAt: null,
        },
      },
    ],
    limit: 50,
  });

  return { content, retryPlatforms };
}

async function ensureContentPlatforms(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];

  const existingPlatforms = await ContentPlatform.findAll({
    where: { contentId: content.id },
  });

  const platformMap = new Map();
  existingPlatforms.forEach((cp) => {
    if (cp && cp.platform) {
      platformMap.set(cp.platform.toLowerCase(), cp);
    }
  });

  for (const platform of platforms) {
    if (!platform || typeof platform !== 'string') continue;
    const normalizedPlatform = platform.toLowerCase();

    if (!platformMap.has(normalizedPlatform)) {
      const cp = await ContentPlatform.create({
        contentId: content.id,
        platform: normalizedPlatform,
        status: CONTENT_PLATFORM_STATUS.PENDING,
      });
      platformMap.set(normalizedPlatform, cp);
    }
  }

  return Array.from(platformMap.values());
}

async function runTick() {
  try {
    const startTime = Date.now();
    const { content, retryPlatforms } = await getDueContent();

    let enqueued = 0;
    let skipped = 0;

    for (const cp of retryPlatforms) {
      try {
        const queued = await enqueuePublication(cp.contentId, cp.platform, cp.id, cp.nextRetryAt || new Date());
        if (queued) enqueued++;
        else skipped++;
      } catch (error) {
        logger.error('Error enqueuing retry platform', {
          contentPlatformId: cp.id,
          contentId: cp.contentId,
          platform: cp.platform,
          error: error.message,
        });
      }
    }

    for (const item of content) {
      try {
        const contentPlatforms = await ensureContentPlatforms(item);

        for (const cp of contentPlatforms) {
          if (cp.status === CONTENT_PLATFORM_STATUS.PENDING) {
            const queued = await enqueuePublication(item.id, cp.platform, cp.id, item.scheduledFor);

            if (queued) {
              cp.status = CONTENT_PLATFORM_STATUS.QUEUED;
              await cp.save();

              if (item.status === CONTENT_STATUS.SCHEDULED) {
                item.status = CONTENT_STATUS.QUEUED;
                await item.save();
              }

              enqueued++;
            } else {
              skipped++;
            }
          }
        }
      } catch (error) {
        logger.error('Error processing due content', {
          contentId: item.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    if (enqueued > 0 || retryPlatforms.length > 0) {
      logger.info('Scheduler producer tick completed', {
        enqueued,
        skipped,
        retries: retryPlatforms.length,
        contentProcessed: content.length,
        duration_ms: duration,
      });
    } else {
      logger.debug('Scheduler producer: no content to enqueue', {
        duration_ms: duration,
      });
    }
  } catch (err) {
    logger.error('Scheduler producer tick error', {
      error: err.message,
      stack: err.stack,
    });
  }
}

let intervalId = null;

export function startSchedulerProducer() {
  if (intervalId) return;
  runTick();
  intervalId = setInterval(runTick, INTERVAL_MS);
  logger.info('Scheduler producer started', {
    intervalMs: INTERVAL_MS,
    note: 'Only enqueues jobs, does not publish directly',
  });
}

export function stopSchedulerProducer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Scheduler producer stopped');
  }
}

export default {
  startSchedulerProducer,
  stopSchedulerProducer,
};

