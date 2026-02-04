/**
 * Redis Cache Implementation
 * Distributed caching for multi-instance deployments
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Note: Requires Redis. Install: npm install ioredis
 * Configure REDIS_URL in environment variables
 */

import logger from './logger.js';

let redis = null;
let cacheAvailable = false;

// Try to initialize Redis
try {
  const RedisModule = await import('ioredis');
  const RedisClass = RedisModule.default || RedisModule;
  
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    redis = new RedisClass({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ...(process.env.REDIS_URL && { url: process.env.REDIS_URL }),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    
    redis.on('connect', () => {
      cacheAvailable = true;
      logger.info('Redis cache connected');
    });
    
    redis.on('error', (err) => {
      cacheAvailable = false;
      logger.warn('Redis cache error', { error: err.message });
    });
    
    cacheAvailable = true;
  }
} catch (error) {
  logger.warn('Redis not available, using in-memory cache', {
    error: error.message,
  });
}

export class RedisCache {
  /**
   * Get value from cache
   */
  async get(key) {
    if (!cacheAvailable || !redis) {
      return null;
    }
    
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
    if (!cacheAvailable || !redis) {
      return false;
    }
    
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
    if (!cacheAvailable || !redis) {
      return false;
    }
    
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.warn('Redis delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear() {
    if (!cacheAvailable || !redis) {
      return false;
    }
    
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      logger.warn('Redis clear error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return cacheAvailable;
  }
}

export const redisCache = new RedisCache();
