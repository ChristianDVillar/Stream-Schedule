/**
 * Feature Flag Service
 * Manages feature flags for gradual rollouts and A/B testing.
 */

import { FeatureFlag } from '../infrastructure/models.js';
import logger from '../../../utils/logger.js';

let flagCache = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function isFeatureEnabled(key, defaultValue = false) {
  try {
    const now = Date.now();
    if (now < cacheExpiry && flagCache[key] !== undefined) {
      return flagCache[key];
    }

    if (now >= cacheExpiry) {
      await refreshFlagCache();
    }

    return flagCache[key] !== undefined ? flagCache[key] : defaultValue;
  } catch (error) {
    logger.error('Error checking feature flag', { key, error: error.message });
    return defaultValue;
  }
}

async function refreshFlagCache() {
  try {
    const flags = await FeatureFlag.findAll({
      attributes: ['key', 'enabled'],
    });

    flagCache = {};
    flags.forEach((flag) => {
      flagCache[flag.key] = flag.enabled;
    });

    cacheExpiry = Date.now() + CACHE_TTL;

    logger.debug('Feature flag cache refreshed', {
      count: flags.length,
      flags: Object.keys(flagCache),
    });
  } catch (error) {
    logger.error('Error refreshing feature flag cache', { error: error.message });
  }
}

export async function setFeatureFlag(key, enabled, description = null, metadata = null) {
  try {
    const [flag, created] = await FeatureFlag.upsert(
      {
        key,
        enabled,
        description,
        metadata,
      },
      {
        conflictFields: ['key'],
      }
    );

    cacheExpiry = 0;
    flagCache[key] = enabled;

    logger.info('Feature flag updated', {
      key,
      enabled,
      created,
    });

    return flag;
  } catch (error) {
    logger.error('Error setting feature flag', {
      key,
      enabled,
      error: error.message,
    });
    throw error;
  }
}

export async function getAllFeatureFlags() {
  try {
    return await FeatureFlag.findAll({
      order: [['key', 'ASC']],
    });
  } catch (error) {
    logger.error('Error getting all feature flags', { error: error.message });
    throw error;
  }
}

refreshFlagCache().catch((err) => {
  logger.error('Failed to initialize feature flag cache', { error: err.message });
});

export default {
  isFeatureEnabled,
  setFeatureFlag,
  getAllFeatureFlags,
};

