/**
 * Health Check Endpoint
 * - GET /api/health/live  → 200 OK only (for Render / load balancers).
 * - GET /api/health/ready → DB + Redis check; 200 if both OK, else 503.
 * - GET /api/health       → Full status: status, redis, db, dbResponseTimeMs, memoryUsageMb, queue, uptime.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { sequelize } from '../models/index.js';
import { getQueueStats } from '../services/publicationQueueService.js';
import { Content, ContentPlatform } from '../models/index.js';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { CONTENT_PLATFORM_STATUS } from '../models/ContentPlatform.js';
import logger from '../utils/logger.js';
import { getRedis, isRedisAvailable } from '../utils/redisConnection.js';

const router = express.Router();

/** Cache queue stats to reduce Redis calls (Upstash free tier limit). TTL 30s. */
const QUEUE_STATS_CACHE_MS = 30000;
let queueStatsCache = { value: null, at: 0 };
async function getQueueStatsCached() {
  const now = Date.now();
  if (queueStatsCache.value !== null && now - queueStatsCache.at < QUEUE_STATS_CACHE_MS) {
    return queueStatsCache.value;
  }
  const value = await getQueueStats();
  queueStatsCache = { value, at: now };
  return value;
}

/**
 * GET /api/health/live
 * Liveness: process is up. Returns 200 only (for Render, K8s liveness).
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * GET /api/health/ready
 * Readiness: DB + Redis reachable. 200 if ready, 503 if not.
 */
router.get('/ready', async (req, res) => {
  let redisStatus = 'not_configured';
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.ping();
        redisStatus = 'connected';
      }
    } catch (e) {
      redisStatus = 'error';
    }
  }

  let dbStatus = 'error';
  let dbResponseTimeMs = null;
  try {
    const dbStart = Date.now();
    await sequelize.query('SELECT 1');
    dbResponseTimeMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (e) {
    dbResponseTimeMs = null;
  }

  const ready = dbStatus === 'connected' && (redisStatus === 'connected' || redisStatus === 'not_configured');
  const body = {
    status: ready ? 'ok' : 'error',
    redis: redisStatus,
    db: dbStatus,
    dbResponseTimeMs,
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };
  res.status(ready ? 200 : 503).json(body);
});

/**
 * GET /api/health
 * Full health: status, redis, db, dbResponseTimeMs, memoryUsageMb, queue, uptime.
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    };

    // Redis
    let redisStatus = 'unavailable';
    if (isRedisAvailable()) {
      try {
        const redis = await getRedis();
        if (redis) {
          await redis.ping();
          redisStatus = 'connected';
        }
      } catch (e) {
        redisStatus = 'unavailable';
      }
    }
    health.redis = redisStatus;

    // DB: ping time then full counts
    let dbStatus = 'error';
    health.dbResponseTimeMs = null;
    try {
      const dbStart = Date.now();
      await sequelize.query('SELECT 1');
      health.dbResponseTimeMs = Date.now() - dbStart;
      const [totalContent, scheduledContent, queuedContent, publishedContent, failedContent] = await Promise.all([
        Content.count({ where: { deletedAt: null } }),
        Content.count({ where: { status: CONTENT_STATUS.SCHEDULED, deletedAt: null } }),
        Content.count({ where: { status: CONTENT_STATUS.QUEUED, deletedAt: null } }),
        Content.count({ where: { status: CONTENT_STATUS.PUBLISHED, deletedAt: null } }),
        Content.count({ where: { status: CONTENT_STATUS.FAILED, deletedAt: null } }),
      ]);
      const [pendingPlatforms, publishingPlatforms, publishedPlatforms, failedPlatforms, retryingPlatforms] = await Promise.all([
        ContentPlatform.count({ where: { status: CONTENT_PLATFORM_STATUS.PENDING } }),
        ContentPlatform.count({ where: { status: CONTENT_PLATFORM_STATUS.PUBLISHING } }),
        ContentPlatform.count({ where: { status: CONTENT_PLATFORM_STATUS.PUBLISHED } }),
        ContentPlatform.count({ where: { status: CONTENT_PLATFORM_STATUS.FAILED } }),
        ContentPlatform.count({ where: { status: CONTENT_PLATFORM_STATUS.RETRYING } }),
      ]);
      health.database = {
        content: { total: totalContent, scheduled: scheduledContent, queued: queuedContent, published: publishedContent, failed: failedContent },
        platforms: { pending: pendingPlatforms, publishing: publishingPlatforms, published: publishedPlatforms, failed: failedPlatforms, retrying: retryingPlatforms },
      };
      dbStatus = 'connected';
    } catch (error) {
      health.database = { error: error.message };
      health.status = 'degraded';
    }
    health.db = dbStatus;

    // Queue (cached to reduce Redis requests)
    let queueStatus = 'unavailable';
    try {
      const queueStats = await getQueueStatsCached();
      health.queue = queueStats;
      if (queueStats.enabled) queueStatus = queueStats.error ? 'degraded' : 'healthy';
    } catch (error) {
      health.queue = { error: error.message };
    }
    health.queueStatus = queueStatus;

    health.responseTime_ms = Date.now() - startTime;
    if (health.queue?.error && health.queue?.enabled) health.status = 'degraded';

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      redis: 'unavailable',
      db: 'unavailable',
      queue: 'unavailable',
      uptimeSeconds: Math.round(process.uptime()),
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/queue
 * Returns detailed queue statistics
 */
router.get('/queue', async (req, res) => {
  try {
    const stats = await getQueueStatsCached();
    res.json(stats);
  } catch (error) {
    logger.error('Queue stats error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
