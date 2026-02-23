/**
 * Shared Redis connection for BullMQ and distributed lock.
 * Used by discord queue worker and discordSyncService lock.
 * Upstash (and BullMQ) work best with maxRetriesPerRequest: null and enableReadyCheck: false.
 * For TLS with Upstash use rediss:// in REDIS_URL (no need to set tls: {} manually).
 */

import logger from './logger.js';

let redis = null;

/** Options required for BullMQ / Upstash compatibility */
const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

function getRedisConfig() {
  const url = process.env.REDIS_URL?.trim();
  if (url && (url.startsWith('redis://') || url.startsWith('rediss://'))) {
    return { url, ...REDIS_OPTIONS };
  }
  // In production (e.g. Render) only REDIS_URL is used — never connect to localhost
  if (process.env.NODE_ENV === 'production') return null;
  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim();
  if (host || port) {
    return {
      host: host || 'localhost',
      port: parseInt(port || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      ...REDIS_OPTIONS,
    };
  }
  return null;
}

/**
 * Get shared Redis client (IORedis). Null if Redis not configured.
 * Used for distributed lock, cache, rate limit; BullMQ uses getBullMQConnection().
 */
export async function getRedis() {
  if (redis) return redis;
  const config = getRedisConfig();
  if (!config) return null;
  try {
    const IORedis = (await import('ioredis')).default;
    redis = config.url ? new IORedis(config.url, REDIS_OPTIONS) : new IORedis(config);
    redis.on('error', (err) => {
      const detail = err?.name === 'AggregateError' && Array.isArray(err.errors)
        ? err.errors.map((e) => e?.message || String(e)).join('; ')
        : err?.message;
      logger.warn('Redis connection error', { error: detail || err });
      import('../services/alertService.js').then((m) => m.notifyRedisError(err)).catch(() => {});
    });
    return redis;
  } catch (err) {
    logger.warn('Redis not available', { error: err.message });
    return null;
  }
}

/**
 * Get connection config for BullMQ (url or host/port + Upstash-compatible options).
 */
export function getBullMQConnection() {
  const config = getRedisConfig();
  if (!config) return null;
  return config;
}

export function isRedisAvailable() {
  return !!getRedisConfig();
}
