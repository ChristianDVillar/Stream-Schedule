/**
 * Query optimization utilities
 * Prevents N+1 queries with eager loading
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { User, Content, Platform, Payment } from '../models/index.js';

/**
 * Get content with user information (eager loading)
 * Prevents N+1 queries
 */
export async function getContentWithUser(contentId, userId) {
  return await Content.findOne({
    where: { id: contentId, userId },
    include: [{
      model: User,
      attributes: ['id', 'username', 'email'],
      required: false,
    }],
  });
}

/**
 * Get user content with related data
 * Optimized to prevent N+1 queries
 */
export async function getUserContentOptimized(userId, options = {}) {
  const include = [];
  
  // Only include relations if needed
  if (options.includeUser) {
    include.push({
      model: User,
      attributes: ['id', 'username', 'email'],
      required: false,
    });
  }
  
  return await Content.findAll({
    where: { userId },
    include,
    order: [['scheduledFor', 'DESC']],
    limit: options.limit,
    offset: options.offset,
  });
}

/**
 * Get user with platforms (for connected accounts)
 */
export async function getUserWithPlatforms(userId) {
  return await User.findByPk(userId, {
    include: [{
      model: Platform,
      attributes: ['id', 'platform', 'accessToken', 'expiresAt'],
      required: false,
    }],
  });
}
