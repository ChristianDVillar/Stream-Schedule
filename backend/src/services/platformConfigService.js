/**
 * Platform Configuration Service
 * Manages which platforms are enabled/disabled globally
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { SystemConfig } from '../models/index.js';
import { PLATFORM_VALUES } from '../constants/platforms.js';
import logger from '../utils/logger.js';

const CONFIG_KEY = 'enabled_platforms';

/**
 * Get enabled platforms (default: all platforms enabled)
 */
export async function getEnabledPlatforms() {
  try {
    const config = await SystemConfig.findByPk(CONFIG_KEY);
    if (config && Array.isArray(config.value)) {
      // Validate that all platforms in config are valid
      return config.value.filter(p => PLATFORM_VALUES.includes(p));
    }
    // Default: all platforms enabled
    return PLATFORM_VALUES;
  } catch (error) {
    logger.error('Error getting enabled platforms', { error: error.message });
    // Fail open: return all platforms if error
    return PLATFORM_VALUES;
  }
}

/**
 * Set enabled platforms
 */
export async function setEnabledPlatforms(platforms) {
  try {
    // Validate platforms
    if (!Array.isArray(platforms)) {
      throw new Error('Platforms must be an array');
    }
    
    // Validate each platform
    const validPlatforms = platforms.filter(p => PLATFORM_VALUES.includes(p));
    if (validPlatforms.length !== platforms.length) {
      const invalid = platforms.filter(p => !PLATFORM_VALUES.includes(p));
      throw new Error(`Invalid platforms: ${invalid.join(', ')}`);
    }

    await SystemConfig.upsert({
      key: CONFIG_KEY,
      value: validPlatforms,
      description: 'Enabled platforms for content publishing'
    });

    logger.info('Enabled platforms updated', { platforms: validPlatforms });
    return validPlatforms;
  } catch (error) {
    logger.error('Error setting enabled platforms', { error: error.message });
    throw error;
  }
}

/**
 * Check if a platform is enabled
 */
export async function isPlatformEnabled(platform) {
  const enabled = await getEnabledPlatforms();
  return enabled.includes(platform);
}

/**
 * Get platform configuration status
 * Always returns all platforms from PLATFORM_VALUES for display
 * Respects the saved configuration - if a platform is not in the saved list, it's disabled
 * Only auto-adds missing platforms if no config exists yet (first time setup)
 */
export async function getPlatformConfig() {
  const savedConfig = await SystemConfig.findByPk(CONFIG_KEY);
  const enabled = await getEnabledPlatforms();
  const config = {};
  
  // Always include all platforms from PLATFORM_VALUES for display
  for (const platform of PLATFORM_VALUES) {
    config[platform] = {
      enabled: enabled.includes(platform),
      label: platform.charAt(0).toUpperCase() + platform.slice(1)
    };
  }
  
  // Only auto-add missing platforms if no config exists yet (first time setup)
  // If config exists, respect the admin's choices - don't auto-add platforms they disabled
  if (!savedConfig || !Array.isArray(savedConfig.value)) {
    // First time: no config exists, so default to all enabled
    // This will be saved when admin first saves the config
    return config;
  }
  
  // Config exists: only add platforms that are truly new (added to codebase after config was saved)
  // We can detect this by checking if the config was created before these platforms existed
  // For now, we'll be conservative: only add if config is empty or if we can verify it's a new platform
  // But we won't auto-add platforms that the admin explicitly disabled
  
  // Actually, the safest approach is to NOT auto-add anything once config exists
  // The admin should explicitly enable new platforms through the UI
  // This prevents the issue where disabled platforms get re-enabled
  
  return config;
}

export default {
  getEnabledPlatforms,
  setEnabledPlatforms,
  isPlatformEnabled,
  getPlatformConfig
};
