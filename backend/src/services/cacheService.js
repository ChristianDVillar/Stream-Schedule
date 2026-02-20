/**
 * Cache Service
 * Redis-based caching for frequently accessed data.
 * Falls back to in-memory cache if Redis unavailable.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';
import { getRedis } from '../utils/redisConnection.js';

// In-memory cache fallback
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// Cache TTLs (in seconds)
const CACHE_TTL = {
  DASHBOARD_STATS: 60,        // 1 minute
  TEMPLATES: 300,             // 5 minutes
  PLATFORM_CONFIG: 300,       // 5 minutes
  USER_PROFILE: 300,          // 5 minutes
  CONTENT_LIST: 30,           // 30 seconds
  DEFAULT: 60,                // 1 minute
};

/**
 * Get cache key with prefix
 */
function getCacheKey(prefix, key) {
  return `cache:${prefix}:${key}`;
}

/**
 * Get from cache (Redis or memory)
 */
export async function get(prefix, key) {
  const cacheKey = getCacheKey(prefix, key);
  
  try {
    const redis = await getRedis();
    if (redis) {
      const value = await redis.get(cacheKey);
      if (value) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return null;
    }
  } catch (error) {
    logger.warn('Redis cache get error', { prefix, key, error: error.message });
  }
  
  // Fallback to memory cache
  const memKey = `${prefix}:${key}`;
  const cached = memoryCache.get(memKey);
  if (cached) {
    const ttl = memoryCacheTTL.get(memKey);
    if (ttl && Date.now() < ttl) {
      return cached;
    }
    // Expired, remove
    memoryCache.delete(memKey);
    memoryCacheTTL.delete(memKey);
  }
  
  return null;
}

/**
 * Set cache value (Redis or memory)
 */
export async function set(prefix, key, value, ttlSeconds = null) {
  const cacheKey = getCacheKey(prefix, key);
  const ttl = ttlSeconds || CACHE_TTL[prefix] || CACHE_TTL.DEFAULT;
  
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.setex(cacheKey, ttl, JSON.stringify(value));
      return true;
    }
  } catch (error) {
    logger.warn('Redis cache set error', { prefix, key, error: error.message });
  }
  
  // Fallback to memory cache
  const memKey = `${prefix}:${key}`;
  memoryCache.set(memKey, value);
  memoryCacheTTL.set(memKey, Date.now() + ttl * 1000);
  
  // Cleanup expired memory cache entries periodically
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, expiry] of memoryCacheTTL.entries()) {
      if (now >= expiry) {
        memoryCache.delete(k);
        memoryCacheTTL.delete(k);
      }
    }
  }
  
  return true;
}

/**
 * Delete from cache
 */
export async function del(prefix, key) {
  const cacheKey = getCacheKey(prefix, key);
  
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(cacheKey);
    }
  } catch (error) {
    logger.warn('Redis cache delete error', { prefix, key, error: error.message });
  }
  
  // Remove from memory cache
  const memKey = `${prefix}:${key}`;
  memoryCache.delete(memKey);
  memoryCacheTTL.delete(memKey);
}

/**
 * Invalidate all cache entries with a prefix
 */
export async function invalidatePrefix(prefix) {
  try {
    const redis = await getRedis();
    if (redis) {
      const pattern = getCacheKey(prefix, '*');
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    logger.warn('Redis cache invalidate prefix error', { prefix, error: error.message });
  }
  
  // Remove from memory cache
  const prefixPattern = `${prefix}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefixPattern)) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
}

/**
 * Cache helper for async functions
 */
export async function cached(prefix, key, fn, ttlSeconds = null) {
  // Try cache first
  const cached = await get(prefix, key);
  if (cached !== null) {
    return cached;
  }
  
  // Execute function
  const value = await fn();
  
  // Cache result
  await set(prefix, key, value, ttlSeconds);
  
  return value;
}

export default {
  get,
  set,
  del,
  invalidatePrefix,
  cached,
  TTL: CACHE_TTL,
};
