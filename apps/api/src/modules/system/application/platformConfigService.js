/**
 * Platform Configuration Service
 * Manages which platforms are enabled/disabled globally.
 */

import { SystemConfig } from '../infrastructure/models.js';
import { PLATFORM_VALUES } from '../../../constants/platforms.js';
import logger from '../../../utils/logger.js';

const CONFIG_KEY = 'enabled_platforms';
const DEFAULT_ENABLED_PLATFORMS = PLATFORM_VALUES.filter((p) => p !== 'instagram');

export async function getEnabledPlatforms() {
  try {
    const config = await SystemConfig.findByPk(CONFIG_KEY);
    if (config && Array.isArray(config.value)) {
      return config.value.filter((p) => PLATFORM_VALUES.includes(p));
    }
    return DEFAULT_ENABLED_PLATFORMS;
  } catch (error) {
    logger.error('Error getting enabled platforms', { error: error.message });
    return DEFAULT_ENABLED_PLATFORMS;
  }
}

export async function setEnabledPlatforms(platforms) {
  try {
    if (!Array.isArray(platforms)) {
      throw new Error('Platforms must be an array');
    }

    const normalized = platforms.map((p) => (typeof p === 'string' ? p.toLowerCase() : p));
    const validPlatforms = normalized.filter((p) => PLATFORM_VALUES.includes(p));
    if (validPlatforms.length !== normalized.length) {
      const invalid = normalized.filter((p) => !PLATFORM_VALUES.includes(p));
      throw new Error(`Invalid platforms: ${invalid.join(', ')}`);
    }

    await SystemConfig.upsert({
      key: CONFIG_KEY,
      value: validPlatforms,
      description: 'Enabled platforms for content publishing',
    });

    logger.info('Enabled platforms updated', { platforms: validPlatforms });
    return validPlatforms;
  } catch (error) {
    logger.error('Error setting enabled platforms', { error: error.message });
    throw error;
  }
}

export async function isPlatformEnabled(platform) {
  const enabled = await getEnabledPlatforms();
  return enabled.includes(platform);
}

export async function getPlatformConfig() {
  const savedConfig = await SystemConfig.findByPk(CONFIG_KEY);
  const enabled = await getEnabledPlatforms();
  const config = {};

  for (const platform of PLATFORM_VALUES) {
    config[platform] = {
      enabled: enabled.includes(platform),
      label: platform.charAt(0).toUpperCase() + platform.slice(1),
    };
  }

  if (!savedConfig || !Array.isArray(savedConfig.value)) {
    return config;
  }

  return config;
}

export default {
  getEnabledPlatforms,
  setEnabledPlatforms,
  isPlatformEnabled,
  getPlatformConfig,
};

