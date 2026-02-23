/**
 * Redis Cache Implementation
 * Uses the shared Redis connection from redisConnection.js (same config as queues, locks, cacheService).
 * Distributed caching for multi-instance deployments.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from './logger.js';
import { getRedis, isRedisAvailable } from './redisConnection.js';

export class RedisCache {
  /**
   * Get value from cache
   */
  async get(key) {
    const redis = await getRedis();
    if (!redis) return null;
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Redis get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttlSeconds = 30) {
    const redis = await getRedis();
    if (!redis) return false;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn('Redis set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    const redis = await getRedis();
    if (!redis) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.warn('Redis delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear only cache keys (prefix cache:*). Does NOT touch BullMQ, locks or rate limits.
   * Safe for production (e.g. Upstash) where Redis is shared.
   */
  async clear() {
    const redis = await getRedis();
    if (!redis) return false;
    try {
      const keys = await redis.keys('cache:*');
      if (keys.length === 0) return true;
      const batchSize = 500;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await redis.del(...batch);
      }
      return true;
    } catch (error) {
      logger.warn('Redis clear error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if Redis is configured (may still be connecting or fail later).
   */
  isAvailable() {
    return isRedisAvailable();
  }
}

export const redisCache = new RedisCache();
