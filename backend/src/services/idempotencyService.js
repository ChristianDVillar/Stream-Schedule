/**
 * Idempotency Service
 * Prevents duplicate publications on retries
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Content } from '../models/index.js';
import { generateIdempotencyKey } from '../utils/cryptoUtils.js';
import logger from '../utils/logger.js';

/**
 * Check if publication was already attempted (idempotency check)
 */
export async function checkIdempotency(contentId, platform, scheduledFor) {
  try {
    const content = await Content.findByPk(contentId, {
      attributes: ['id', 'idempotencyKeys', 'status']
    });

    if (!content) {
      return { isDuplicate: false };
    }

    const idempotencyKey = generateIdempotencyKey(contentId, platform, scheduledFor);
    const keys = content.idempotencyKeys || {};

    // Check if this exact publication was already attempted
    if (keys[platform] === idempotencyKey) {
      logger.warn('Duplicate publication attempt detected (idempotency)', {
        contentId,
        platform,
        idempotencyKey
      });
      return {
        isDuplicate: true,
        reason: 'This publication was already attempted'
      };
    }

    return { isDuplicate: false, idempotencyKey };
  } catch (error) {
    logger.error('Error checking idempotency', {
      contentId,
      platform,
      error: error.message
    });
    // Fail open - allow publication if idempotency check fails
    return { isDuplicate: false };
  }
}

/**
 * Mark publication as attempted (store idempotency key)
 */
export async function markPublicationAttempted(contentId, platform, scheduledFor) {
  try {
    const content = await Content.findByPk(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const idempotencyKey = generateIdempotencyKey(contentId, platform, scheduledFor);
    const keys = content.idempotencyKeys || {};
    keys[platform] = idempotencyKey;

    await content.update({
      idempotencyKeys: keys
    });

    logger.debug('Publication marked as attempted', {
      contentId,
      platform,
      idempotencyKey
    });
  } catch (error) {
    logger.error('Error marking publication as attempted', {
      contentId,
      platform,
      error: error.message
    });
    throw error;
  }
}

/**
 * Clear idempotency keys for a content item (for retries)
 */
export async function clearIdempotencyKeys(contentId) {
  try {
    const content = await Content.findByPk(contentId);
    if (!content) {
      return;
    }

    await content.update({
      idempotencyKeys: null
    });

    logger.debug('Idempotency keys cleared', {
      contentId
    });
  } catch (error) {
    logger.error('Error clearing idempotency keys', {
      contentId,
      error: error.message
    });
  }
}

export default {
  checkIdempotency,
  markPublicationAttempted,
  clearIdempotencyKeys
};
