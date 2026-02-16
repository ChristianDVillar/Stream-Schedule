/**
 * Entitlement Service
 * Manages user entitlements (features) based on license/subscription
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Entitlement, User } from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * Default entitlements by license type
 */
const DEFAULT_ENTITLEMENTS = {
  none: {
    maxScheduledPosts: 0,
    platformsAllowed: [],
    automationEnabled: false,
    maxUploadSizeMB: 0,
    canScheduleRecurring: false
  },
  trial: {
    maxScheduledPosts: 10,
    platformsAllowed: ['twitter', 'discord'],
    automationEnabled: true,
    maxUploadSizeMB: 10,
    canScheduleRecurring: false
  },
  monthly: {
    maxScheduledPosts: 100,
    platformsAllowed: ['twitter', 'discord', 'instagram', 'youtube'],
    automationEnabled: true,
    maxUploadSizeMB: 50,
    canScheduleRecurring: true
  },
  quarterly: {
    maxScheduledPosts: 300,
    platformsAllowed: ['twitter', 'discord', 'instagram', 'youtube'],
    automationEnabled: true,
    maxUploadSizeMB: 100,
    canScheduleRecurring: true
  },
  lifetime: {
    maxScheduledPosts: -1, // Unlimited
    platformsAllowed: ['twitter', 'discord', 'instagram', 'youtube', 'twitch'],
    automationEnabled: true,
    maxUploadSizeMB: 500,
    canScheduleRecurring: true
  },
  temporary: {
    maxScheduledPosts: 50,
    platformsAllowed: ['twitter', 'discord'],
    automationEnabled: true,
    maxUploadSizeMB: 25,
    canScheduleRecurring: false
  }
};

/**
 * Get user entitlements, calculating from license if not cached
 */
export async function getUserEntitlements(userId) {
  try {
    // Check for cached entitlements
    const cached = await Entitlement.findAll({
      where: {
        userId,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (cached.length > 0) {
      const entitlements = {};
      cached.forEach(ent => {
        entitlements[ent.feature] = ent.value;
      });
      return entitlements;
    }

    // Calculate from license
    const user = await User.findByPk(userId, {
      attributes: ['id', 'licenseType', 'licenseExpiresAt']
    });

    if (!user) {
      return DEFAULT_ENTITLEMENTS.none;
    }

    const licenseType = (user.licenseType || 'none').toLowerCase();
    const entitlements = DEFAULT_ENTITLEMENTS[licenseType] || DEFAULT_ENTITLEMENTS.none;

    // Cache entitlements
    await syncEntitlementsFromLicense(userId, user.licenseType, user.licenseExpiresAt);

    return entitlements;
  } catch (error) {
    logger.error('Error getting user entitlements', {
      userId,
      error: error.message
    });
    return DEFAULT_ENTITLEMENTS.none;
  }
}

/**
 * Sync entitlements from user license
 */
export async function syncEntitlementsFromLicense(userId, licenseType, licenseExpiresAt) {
  try {
    const licenseTypeLower = (licenseType || 'none').toLowerCase();
    const entitlements = DEFAULT_ENTITLEMENTS[licenseTypeLower] || DEFAULT_ENTITLEMENTS.none;

    for (const [feature, value] of Object.entries(entitlements)) {
      await Entitlement.upsert({
        userId,
        feature,
        value,
        source: 'license',
        expiresAt: licenseExpiresAt
      }, {
        conflictFields: ['userId', 'feature']
      });
    }

    logger.info('Entitlements synced from license', {
      userId,
      licenseType,
      features: Object.keys(entitlements)
    });
  } catch (error) {
    logger.error('Error syncing entitlements', {
      userId,
      licenseType,
      error: error.message
    });
  }
}

/**
 * Check if user has a specific entitlement
 */
export async function hasEntitlement(userId, feature) {
  const entitlements = await getUserEntitlements(userId);
  return entitlements[feature] !== undefined && entitlements[feature] !== null;
}

/**
 * Get specific entitlement value
 */
export async function getEntitlement(userId, feature, defaultValue = null) {
  const entitlements = await getUserEntitlements(userId);
  return entitlements[feature] !== undefined ? entitlements[feature] : defaultValue;
}

/**
 * Override entitlement (admin function)
 */
export async function setEntitlement(userId, feature, value, expiresAt = null) {
  try {
    await Entitlement.upsert({
      userId,
      feature,
      value,
      source: 'override',
      expiresAt
    }, {
      conflictFields: ['userId', 'feature']
    });

    logger.info('Entitlement override set', {
      userId,
      feature,
      value
    });
  } catch (error) {
    logger.error('Error setting entitlement override', {
      userId,
      feature,
      error: error.message
    });
    throw error;
  }
}

export default {
  getUserEntitlements,
  syncEntitlementsFromLicense,
  hasEntitlement,
  getEntitlement,
  setEntitlement
};
