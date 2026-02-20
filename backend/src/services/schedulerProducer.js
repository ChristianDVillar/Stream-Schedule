/**
 * Scheduler Producer
 * Smart-monolith architecture: Only detects due content and enqueues jobs.
 * Does NOT publish directly - that's handled by the Worker.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Content, ContentPlatform } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { CONTENT_PLATFORM_STATUS } from '../models/ContentPlatform.js';
import { enqueuePublication } from './publicationQueueService.js';
import logger from '../utils/logger.js';
import { APP_CONFIG } from '../constants/app.js';

const INTERVAL_MS = 30000; // Check every 30 seconds (more frequent for better responsiveness)

/**
 * Find content that is scheduled and due (scheduledFor <= now).
 * Uses ContentPlatform to track per-platform status.
 */
async function getDueContent() {
  const now = new Date();
  
  // Find Content that is SCHEDULED and due, or has ContentPlatform entries that need retry
  const content = await Content.findAll({
    where: {
      deletedAt: null,
      [Op.or]: [
        {
          status: CONTENT_STATUS.SCHEDULED,
          scheduledFor: { [Op.lte]: now }
        },
        {
          status: CONTENT_STATUS.QUEUED
        }
      ]
    },
    include: [{
      model: ContentPlatform,
      as: 'contentPlatforms',
      required: false,
    }],
    order: [['scheduledFor', 'ASC']],
    limit: 100 // Process more items per tick since we're just enqueuing
  });

  // Also find ContentPlatform entries that need retry
  const retryPlatforms = await ContentPlatform.findAll({
    where: {
      status: CONTENT_PLATFORM_STATUS.RETRYING,
      nextRetryAt: {
        [Op.lte]: now
      }
    },
    include: [{
      model: Content,
      as: 'content',
      where: {
        deletedAt: null
      }
    }],
    limit: 50
  });

  return { content, retryPlatforms };
}

/**
 * Ensure ContentPlatform entries exist for all platforms in Content.platforms
 */
async function ensureContentPlatforms(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  
  // Load existing ContentPlatform entries
  const existingPlatforms = await ContentPlatform.findAll({
    where: { contentId: content.id },
  });
  
  const platformMap = new Map();
  existingPlatforms.forEach(cp => {
    if (cp && cp.platform) {
      platformMap.set(cp.platform.toLowerCase(), cp);
    }
  });

  const created = [];
  
  for (const platform of platforms) {
    if (!platform || typeof platform !== 'string') continue;
    
    const normalizedPlatform = platform.toLowerCase();
    
    if (!platformMap.has(normalizedPlatform)) {
      // Create ContentPlatform entry
      const cp = await ContentPlatform.create({
        contentId: content.id,
        platform: normalizedPlatform,
        status: CONTENT_PLATFORM_STATUS.PENDING,
      });
      created.push(cp);
      platformMap.set(normalizedPlatform, cp);
    }
  }
  
  return Array.from(platformMap.values());
}

/**
 * Process one tick: find due content and enqueue publication jobs
 */
async function runTick() {
  try {
    const startTime = Date.now();
    const { content, retryPlatforms } = await getDueContent();
    
    let enqueued = 0;
    let skipped = 0;
    
    // Process retry platforms first
    for (const cp of retryPlatforms) {
      try {
        const queued = await enqueuePublication(
          cp.contentId,
          cp.platform,
          cp.id,
          cp.nextRetryAt || new Date()
        );
        if (queued) {
          enqueued++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error('Error enqueuing retry platform', {
          contentPlatformId: cp.id,
          contentId: cp.contentId,
          platform: cp.platform,
          error: error.message,
        });
      }
    }
    
    // Process new due content
    for (const item of content) {
      try {
        // Ensure ContentPlatform entries exist
        const contentPlatforms = await ensureContentPlatforms(item);
        
        // Enqueue job for each platform that is PENDING
        for (const cp of contentPlatforms) {
          if (cp.status === CONTENT_PLATFORM_STATUS.PENDING) {
            const queued = await enqueuePublication(
              item.id,
              cp.platform,
              cp.id,
              item.scheduledFor
            );
            
            if (queued) {
              // Update ContentPlatform status to QUEUED
              cp.status = CONTENT_PLATFORM_STATUS.QUEUED;
              await cp.save();
              
              // Update Content status to QUEUED if it was SCHEDULED
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

/**
 * Start the scheduler producer (runs every 30 seconds)
 */
export function startSchedulerProducer() {
  if (intervalId) return;
  runTick(); // Run once immediately
  intervalId = setInterval(runTick, INTERVAL_MS);
  logger.info('Scheduler producer started', {
    intervalMs: INTERVAL_MS,
    note: 'Only enqueues jobs, does not publish directly',
  });
}

/**
 * Stop the scheduler producer
 */
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
