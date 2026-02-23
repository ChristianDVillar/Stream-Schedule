/**
 * Publication Metric Service
 * Records job executions and provides admin cost/usage metrics.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { PublicationMetric, User, Media } from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const REDIS_MONTHLY_COST_EUR = Number(process.env.REDIS_MONTHLY_COST_EUR) || 0;

/**
 * Record one publication job execution (call from worker on success or final failure).
 * @param {number} userId
 * @param {string} platform
 * @param {number} durationMs
 * @param {number} attemptsMade - 1-based (first attempt = 1)
 * @param {boolean} success
 */
export async function recordPublicationMetric(userId, platform, durationMs, attemptsMade, success) {
  try {
    await PublicationMetric.create({
      userId,
      platform,
      completedAt: new Date(),
      durationMs,
      attemptsMade: attemptsMade || 1,
      success: !!success,
    });
  } catch (err) {
    logger.error('Failed to record publication metric', {
      userId,
      platform,
      error: err.message,
    });
  }
}

/**
 * Get cost/usage metrics for admin dashboard.
 * Returns per-user: storage MB, jobs executed, avg execution ms, estimated Redis cost.
 * Returns per-platform: retry rate.
 */
export async function getCostMetricsForAdmin() {
  const users = await User.findAll({
    attributes: ['id', 'username', 'email'],
    order: [['id', 'ASC']],
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    return {
      byUser: [],
      byPlatform: [],
      totalJobs: 0,
      redisMonthlyCostEur: REDIS_MONTHLY_COST_EUR,
    };
  }

  const [storageByUser, metricsByUser, platformStats] = await Promise.all([
    getStorageMbByUser(userIds),
    getJobMetricsByUser(userIds),
    getRetryRateByPlatform(),
  ]);

  const totalJobs = Object.values(metricsByUser).reduce(
    (sum, m) => sum + (m.jobsExecuted || 0),
    0
  );

  const byUser = users.map((u) => {
    const m = metricsByUser[u.id] || { jobsExecuted: 0, totalDurationMs: 0 };
    const jobsExecuted = m.jobsExecuted || 0;
    const avgExecutionMs =
      jobsExecuted > 0 ? Math.round(m.totalDurationMs / jobsExecuted) : null;
    const storageMb = storageByUser[u.id] ?? 0;
    const redisCostEur =
      totalJobs > 0 && REDIS_MONTHLY_COST_EUR > 0
        ? Number(((jobsExecuted / totalJobs) * REDIS_MONTHLY_COST_EUR).toFixed(4))
        : null;

    return {
      userId: u.id,
      username: u.username,
      email: u.email || '',
      storageMb: Math.round(storageMb * 100) / 100,
      jobsExecuted,
      avgExecutionMs,
      redisCostEur,
    };
  });

  return {
    byUser,
    byPlatform: platformStats,
    totalJobs,
    redisMonthlyCostEur: REDIS_MONTHLY_COST_EUR,
  };
}

async function getStorageMbByUser(userIds) {
  const rows = await Media.findAll({
    attributes: ['userId', [Media.sequelize.fn('SUM', Media.sequelize.col('size')), 'totalBytes']],
    where: { userId: { [Op.in]: userIds } },
    group: ['userId'],
    raw: true,
  });
  const out = {};
  for (const r of rows) {
    out[r.userId] = (Number(r.totalBytes) || 0) / (1024 * 1024);
  }
  return out;
}

async function getJobMetricsByUser(userIds) {
  const rows = await PublicationMetric.findAll({
    attributes: [
      'userId',
      [PublicationMetric.sequelize.fn('COUNT', PublicationMetric.sequelize.col('id')), 'jobsExecuted'],
      [PublicationMetric.sequelize.fn('SUM', PublicationMetric.sequelize.col('durationMs')), 'totalDurationMs'],
    ],
    where: { userId: { [Op.in]: userIds } },
    group: ['userId'],
    raw: true,
  });
  const out = {};
  for (const r of rows) {
    out[r.userId] = {
      jobsExecuted: Number(r.jobsExecuted) || 0,
      totalDurationMs: Number(r.totalDurationMs) || 0,
    };
  }
  return out;
}

async function getRetryRateByPlatform() {
  const rows = await PublicationMetric.findAll({
    attributes: ['platform', 'attemptsMade'],
    raw: true,
  });

  const byPlatform = {};
  for (const r of rows) {
    const p = r.platform;
    if (!byPlatform[p]) byPlatform[p] = { total: 0, retries: 0 };
    byPlatform[p].total += 1;
    if (r.attemptsMade > 1) byPlatform[p].retries += 1;
  }

  return Object.entries(byPlatform).map(([platform, { total, retries }]) => ({
    platform,
    total,
    retries,
    retryRatePercent: total > 0 ? Math.round((retries / total) * 10000) / 100 : 0,
  }));
}

export default {
  recordPublicationMetric,
  getCostMetricsForAdmin,
};
