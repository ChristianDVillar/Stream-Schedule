/**
 * Rate Limit Service
 * Platform-specific rate limiting to prevent API bans
 * Uses Redis if available, falls back to in-memory cache
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';

// Rate limits per platform (posts per time window)
const RATE_LIMITS = {
  twitter: {
    posts: 300,
    windowMs: 3 * 60 * 60 * 1000, // 3 hours
    description: 'Twitter: 300 posts per 3 hours'
  },
  discord: {
    posts: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    description: 'Discord: 50 posts per hour'
  },
  instagram: {
    posts: 25,
    windowMs: 60 * 60 * 1000, // 1 hour
    description: 'Instagram: 25 posts per hour'
  },
  youtube: {
    posts: 6,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    description: 'YouTube: 6 posts per 24 hours'
  }
};

// In-memory cache fallback (if Redis not available)
const memoryCache = new Map();
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

/**
 * Get Redis client if available
 */
async function getRedisClient() {
  try {
    const redis = await import('ioredis');
    if (process.env.REDIS_URL) {
      return new redis.default(process.env.REDIS_URL);
    }
  } catch (error) {
    // Redis not available
  }
  return null;
}

/**
 * Get rate limit key
 */
function getRateLimitKey(userId, platform) {
  return `ratelimit:${userId}:${platform}`;
}

/**
 * Check if user can publish to platform (rate limit check)
 */
export async function canPublish(userId, platform) {
  try {
    const limit = RATE_LIMITS[platform];
    if (!limit) {
      // No rate limit for this platform
      return { allowed: true };
    }

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, platform);
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    if (redis) {
      // Use Redis
      const count = await redis.zcount(key, windowStart, now);
      if (count >= limit.posts) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${limit.description}`,
          resetAt: new Date(now + limit.windowMs)
        };
      }
      return { allowed: true };
    } else {
      // Use in-memory cache
      const cacheKey = `${userId}:${platform}`;
      const cached = memoryCache.get(cacheKey);
      
      if (cached) {
        // Filter out old entries
        const recentPosts = cached.posts.filter(timestamp => timestamp > windowStart);
        
        if (recentPosts.length >= limit.posts) {
          return {
            allowed: false,
            reason: `Rate limit exceeded: ${limit.description}`,
            resetAt: new Date(Math.min(...recentPosts) + limit.windowMs)
          };
        }
        
        // Update cache
        memoryCache.set(cacheKey, {
          posts: recentPosts,
          expiresAt: now + limit.windowMs
        });
      }
      
      return { allowed: true };
    }
  } catch (error) {
    logger.error('Error checking rate limit', {
      userId,
      platform,
      error: error.message
    });
    // Fail open (allow publication) if rate limit check fails
    return { allowed: true };
  }
}

/**
 * Record a publication (increment rate limit counter)
 */
export async function recordPublication(userId, platform) {
  try {
    const limit = RATE_LIMITS[platform];
    if (!limit) return;

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, platform);
    const now = Date.now();

    if (redis) {
      // Use Redis sorted set
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(limit.windowMs / 1000));
    } else {
      // Use in-memory cache
      const cacheKey = `${userId}:${platform}`;
      const cached = memoryCache.get(cacheKey) || { posts: [], expiresAt: now + limit.windowMs };
      cached.posts.push(now);
      memoryCache.set(cacheKey, cached);
    }
  } catch (error) {
    logger.error('Error recording publication', {
      userId,
      platform,
      error: error.message
    });
  }
}

/**
 * Get current rate limit status for user/platform
 */
export async function getRateLimitStatus(userId, platform) {
  try {
    const limit = RATE_LIMITS[platform];
    if (!limit) {
      return { limit: null, current: 0, remaining: null };
    }

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, platform);
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    if (redis) {
      const count = await redis.zcount(key, windowStart, now);
      return {
        limit: limit.posts,
        current: count,
        remaining: Math.max(0, limit.posts - count),
        windowMs: limit.windowMs
      };
    } else {
      const cacheKey = `${userId}:${platform}`;
      const cached = memoryCache.get(cacheKey);
      if (!cached) {
        return {
          limit: limit.posts,
          current: 0,
          remaining: limit.posts,
          windowMs: limit.windowMs
        };
      }
      
      const recentPosts = cached.posts.filter(timestamp => timestamp > windowStart);
      return {
        limit: limit.posts,
        current: recentPosts.length,
        remaining: Math.max(0, limit.posts - recentPosts.length),
        windowMs: limit.windowMs
      };
    }
  } catch (error) {
    logger.error('Error getting rate limit status', {
      userId,
      platform,
      error: error.message
    });
    return { limit: null, current: 0, remaining: null };
  }
}

export default {
  canPublish,
  recordPublication,
  getRateLimitStatus,
  RATE_LIMITS
};
