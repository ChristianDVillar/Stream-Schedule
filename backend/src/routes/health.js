/**
 * Health Check Endpoint
 * Provides system health metrics and queue status.
 * Useful for monitoring and observability.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { getQueueStats } from '../services/publicationQueueService.js';
import { Content, ContentPlatform } from '../models/index.js';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { CONTENT_PLATFORM_STATUS } from '../models/ContentPlatform.js';
import logger from '../utils/logger.js';
import { isRedisAvailable } from '../utils/redisConnection.js';

const router = express.Router();

/**
 * GET /api/health
 * Returns system health status
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    // Queue stats
    try {
      const queueStats = await getQueueStats();
      health.queue = queueStats;
    } catch (error) {
      health.queue = {
        error: error.message,
      };
    }

    // Database stats
    try {
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
        content: {
          total: totalContent,
          scheduled: scheduledContent,
          queued: queuedContent,
          published: publishedContent,
          failed: failedContent,
        },
        platforms: {
          pending: pendingPlatforms,
          publishing: publishingPlatforms,
          published: publishedPlatforms,
          failed: failedPlatforms,
          retrying: retryingPlatforms,
        },
      };
    } catch (error) {
      health.database = {
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Redis status
    health.redis = {
      available: isRedisAvailable(),
    };

    // Response time
    health.responseTime_ms = Date.now() - startTime;

    // Determine overall status
    if (health.database?.error) {
      health.status = 'degraded';
    }
    if (health.queue?.error && health.queue?.enabled) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
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
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error('Queue stats error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
