/**
 * Rate Limit Service
 * Platform-specific rate limiting to prevent API bans.
 */

import logger from '../../../utils/logger.js';
import { getRedis } from '../../../utils/redisConnection.js';

const RATE_LIMITS = {
  twitter: {
    posts: 300,
    windowMs: 3 * 60 * 60 * 1000,
    description: 'Twitter: 300 posts per 3 hours',
  },
  discord: {
    posts: 50,
    windowMs: 60 * 60 * 1000,
    description: 'Discord: 50 posts per hour',
  },
  instagram: {
    posts: 25,
    windowMs: 60 * 60 * 1000,
    description: 'Instagram: 25 posts per hour',
  },
  youtube: {
    posts: 6,
    windowMs: 24 * 60 * 60 * 1000,
    description: 'YouTube: 6 posts per 24 hours',
  },
};

const memoryCache = new Map();
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

async function getRedisClient() {
  try {
    return await getRedis();
  } catch (error) {
    return null;
  }
}

function getRateLimitKey(userId, platform) {
  return `ratelimit:${userId}:${platform}`;
}

export async function canPublish(userId, platform) {
  try {
    const limit = RATE_LIMITS[platform];
    if (!limit) {
      return { allowed: true };
    }

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, platform);
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    if (redis) {
      const count = await redis.zcount(key, windowStart, now);
      if (count >= limit.posts) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${limit.description}`,
          resetAt: new Date(now + limit.windowMs),
        };
      }
      return { allowed: true };
    }

    const cacheKey = `${userId}:${platform}`;
    const cached = memoryCache.get(cacheKey);

    if (cached) {
      const recentPosts = cached.posts.filter((timestamp) => timestamp > windowStart);

      if (recentPosts.length >= limit.posts) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${limit.description}`,
          resetAt: new Date(Math.min(...recentPosts) + limit.windowMs),
        };
      }

      memoryCache.set(cacheKey, {
        posts: recentPosts,
        expiresAt: now + limit.windowMs,
      });
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Error checking rate limit', {
      userId,
      platform,
      error: error.message,
    });
    return { allowed: true };
  }
}

export async function recordPublication(userId, platform) {
  try {
    const limit = RATE_LIMITS[platform];
    if (!limit) return;

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, platform);
    const now = Date.now();

    if (redis) {
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(limit.windowMs / 1000));
      return;
    }

    const cacheKey = `${userId}:${platform}`;
    const cached = memoryCache.get(cacheKey) || { posts: [], expiresAt: now + limit.windowMs };
    cached.posts.push(now);
    memoryCache.set(cacheKey, cached);
  } catch (error) {
    logger.error('Error recording publication', {
      userId,
      platform,
      error: error.message,
    });
  }
}

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
        windowMs: limit.windowMs,
      };
    }

    const cacheKey = `${userId}:${platform}`;
    const cached = memoryCache.get(cacheKey);
    if (!cached) {
      return {
        limit: limit.posts,
        current: 0,
        remaining: limit.posts,
        windowMs: limit.windowMs,
      };
    }

    const recentPosts = cached.posts.filter((timestamp) => timestamp > windowStart);
    return {
      limit: limit.posts,
      current: recentPosts.length,
      remaining: Math.max(0, limit.posts - recentPosts.length),
      windowMs: limit.windowMs,
    };
  } catch (error) {
    logger.error('Error getting rate limit status', {
      userId,
      platform,
      error: error.message,
    });
    return { limit: null, current: 0, remaining: null };
  }
}

export default {
  canPublish,
  recordPublication,
  getRateLimitStatus,
  RATE_LIMITS,
};

