/**
 * Shared Redis connection for BullMQ and distributed lock.
 * Used by discord queue worker and discordSyncService lock.
 */

import logger from './logger.js';

let redis = null;

function getRedisConfig() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  if (process.env.REDIS_HOST || process.env.REDIS_PORT) {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }
  return null;
}

/**
 * Get shared Redis client (IORedis). Null if Redis not configured.
 * Used for distributed lock and can be passed to BullMQ as connection.
 */
export async function getRedis() {
  if (redis) return redis;
  const config = getRedisConfig();
  if (!config) return null;
  try {
    const IORedis = (await import('ioredis')).default;
    redis = config.url ? new IORedis(config.url) : new IORedis(config);
    redis.on('error', (err) => logger.warn('Redis connection error', { error: err.message }));
    return redis;
  } catch (err) {
    logger.warn('Redis not available', { error: err.message });
    return null;
  }
}

/**
 * Get connection config for BullMQ (host/port/password or url).
 */
export function getBullMQConnection() {
  const config = getRedisConfig();
  if (!config) return null;
  return config;
}

export function isRedisAvailable() {
  return !!getRedisConfig();
}
