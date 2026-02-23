/**
 * Operational alerts via Discord webhooks.
 * Configurable from admin panel (SystemConfig alert_config) with env fallback.
 * Used for: worker crash, Redis error, DB slow, queue backlog/failures.
 * Anti-spam: cooldown in Redis (alert:last:<type> TTL 300s); fallback in-memory if Redis down.
 * Recovery: send "Redis recuperado" when Redis comes back after an incident.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import axios from 'axios';
import { SystemConfig } from '../models/index.js';
import logger from '../utils/logger.js';
import { getRedis } from '../utils/redisConnection.js';

const CONFIG_KEY = 'alert_config';
const ALERT_COOLDOWN_SEC = 300; // 5 min
const ALERT_LAST_PREFIX = 'alert:last:';

const DEFAULT_CONFIG = {
  discordDevWebhook: process.env.DISCORD_DEV_WEBHOOK || '',
  discordStatusWebhook: process.env.DISCORD_STATUS_WEBHOOK || '',
  alertsEnabled: true,
  alertQueueBacklogThreshold: 300,
  alertQueueFailedThreshold: 20,
  alertDbSlowMs: 1000,
};

/** Fallback when Redis unavailable */
const lastAlerted = new Map();
/** When we first sent redis_error (for recovery message duration) */
let redisDownSince = null;

/**
 * Get alert config from DB (SystemConfig) with env fallback.
 * @returns {Promise<{ discordDevWebhook: string, discordStatusWebhook: string, alertsEnabled: boolean, alertQueueBacklogThreshold: number, alertQueueFailedThreshold: number, alertDbSlowMs: number }>}
 */
export async function getAlertConfig() {
  try {
    const row = await SystemConfig.findByPk(CONFIG_KEY);
    const db = (row && row.value) ? row.value : {};
    return {
      discordDevWebhook: db.discordDevWebhook ?? process.env.DISCORD_DEV_WEBHOOK ?? DEFAULT_CONFIG.discordDevWebhook,
      discordStatusWebhook: db.discordStatusWebhook ?? process.env.DISCORD_STATUS_WEBHOOK ?? DEFAULT_CONFIG.discordStatusWebhook,
      alertsEnabled: db.alertsEnabled !== false,
      alertQueueBacklogThreshold: Number(db.alertQueueBacklogThreshold) || DEFAULT_CONFIG.alertQueueBacklogThreshold,
      alertQueueFailedThreshold: Number(db.alertQueueFailedThreshold) || DEFAULT_CONFIG.alertQueueFailedThreshold,
      alertDbSlowMs: Number(db.alertDbSlowMs) || DEFAULT_CONFIG.alertDbSlowMs,
    };
  } catch (err) {
    logger.warn('Alert config load failed, using defaults', { error: err.message });
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save alert config to DB.
 * @param {Partial<{ discordDevWebhook: string, discordStatusWebhook: string, alertsEnabled: boolean, alertQueueBacklogThreshold: number, alertQueueFailedThreshold: number, alertDbSlowMs: number }>} config
 */
export async function saveAlertConfig(config) {
  const current = await getAlertConfig();
  const merged = {
    discordDevWebhook: config.discordDevWebhook !== undefined ? String(config.discordDevWebhook || '') : current.discordDevWebhook,
    discordStatusWebhook: config.discordStatusWebhook !== undefined ? String(config.discordStatusWebhook || '') : current.discordStatusWebhook,
    alertsEnabled: config.alertsEnabled !== undefined ? Boolean(config.alertsEnabled) : current.alertsEnabled,
    alertQueueBacklogThreshold: config.alertQueueBacklogThreshold !== undefined ? Number(config.alertQueueBacklogThreshold) || 300 : current.alertQueueBacklogThreshold,
    alertQueueFailedThreshold: config.alertQueueFailedThreshold !== undefined ? Number(config.alertQueueFailedThreshold) || 20 : current.alertQueueFailedThreshold,
    alertDbSlowMs: config.alertDbSlowMs !== undefined ? Number(config.alertDbSlowMs) || 1000 : current.alertDbSlowMs,
  };
  await SystemConfig.upsert({
    key: CONFIG_KEY,
    value: merged,
    description: 'Discord webhooks and thresholds for operational alerts',
  });
  return merged;
}

/**
 * Check if we should send an alert of this type (cooldown: 5 min in Redis, else in-memory).
 * @param {string} type - e.g. 'redis_error', 'db_slow', 'queue_backlog'
 * @returns {Promise<boolean>}
 */
export async function shouldSendAlert(type) {
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `${ALERT_LAST_PREFIX}${type}`;
      const exists = await redis.get(key);
      if (exists) return false;
      return true;
    }
  } catch (e) {
    logger.debug('Alert cooldown check (Redis unavailable, using memory)', { type });
  }
  const last = lastAlerted.get(type);
  if (last && Date.now() - last < ALERT_COOLDOWN_SEC * 1000) return false;
  return true;
}

/**
 * Record that an alert was sent (so cooldown applies). Call after successful send.
 * @param {string} type
 */
export async function recordAlertSent(type) {
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `${ALERT_LAST_PREFIX}${type}`;
      await redis.setex(key, ALERT_COOLDOWN_SEC, String(Date.now()));
      return;
    }
  } catch (e) {
    // ignore
  }
  lastAlerted.set(type, Date.now());
}

/**
 * Send alert to Discord webhook.
 * Uses Redis cooldown (alert:last:<cooldownKey> TTL 5 min) when available; else in-memory.
 * @param {string} message - Plain text message (Discord allows 2000 chars).
 * @param {'dev'|'status'} type - 'dev' → #dev-internal (technical), 'status' → #status (public).
 * @param {string} [cooldownKey] - If set, only send once per cooldown per key.
 * @returns {Promise<boolean>} true if sent, false if skipped or failed.
 */
export async function sendAlert(message, type = 'dev', cooldownKey = null) {
  const config = await getAlertConfig();
  if (!config.alertsEnabled) return false;

  const webhook = type === 'status' ? config.discordStatusWebhook : config.discordDevWebhook;
  if (!webhook || !webhook.startsWith('https://discord.com/api/webhooks/')) {
    if (cooldownKey) return false;
    logger.debug('Discord alert skipped (no webhook configured)', { type });
    return false;
  }

  if (cooldownKey && !(await shouldSendAlert(cooldownKey))) return false;

  try {
    await axios.post(webhook, {
      content: message.slice(0, 2000),
    }, {
      timeout: 5000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    if (cooldownKey) await recordAlertSent(cooldownKey);
    logger.debug('Discord alert sent', { type, cooldownKey });
    return true;
  } catch (err) {
    logger.warn('Discord alert failed', { type, error: err.message });
    return false;
  }
}

/** Format error for alert message (unwrap AggregateError). */
function formatErrorForAlert(err) {
  if (!err) return 'Unknown error';
  if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
    const parts = err.errors.map((e) => e?.message || String(e));
    return parts.length ? parts.join('; ') : (err.message || 'AggregateError');
  }
  if (err.cause) return `${err.message || err} (cause: ${formatErrorForAlert(err.cause)})`;
  return err.message || String(err);
}

/**
 * Notify Redis error (call from redisConnection error handler).
 * Cooldown via shouldSendAlert/recordAlertSent. Tracks redisDownSince for recovery message.
 */
export async function notifyRedisError(err) {
  const detail = formatErrorForAlert(err);
  const msg = `🚨 Redis error: ${detail}`;
  const sent = await sendAlert(msg, 'dev', 'redis_error');
  if (sent) redisDownSince = redisDownSince ?? Date.now();
}

/**
 * Call from monitor when Redis is reachable. If we had sent redis_error before, send recovery once.
 */
export async function checkRedisRecovery() {
  if (redisDownSince == null) return;
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.ping();
  } catch (e) {
    return;
  }
  const durationMs = Date.now() - redisDownSince;
  const sec = Math.round(durationMs / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const durationStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
  await sendAlert(`✅ Redis recuperado (duró ${durationStr})`, 'dev', 'redis_recovered');
  redisDownSince = null;
}

/**
 * Notify DB slow (call from DB monitor).
 * @param {number} durationMs
 */
export async function notifyDbSlow(durationMs) {
  const config = await getAlertConfig();
  if (!config.alertsEnabled || durationMs < config.alertDbSlowMs) return;
  await sendAlert(`⚠️ DB slow: ${durationMs}ms`, 'dev', 'db_slow');
}

/**
 * Notify queue backlog or high failure count (call from queue monitor).
 * @param {number} waiting
 * @param {number} failed
 */
export async function notifyQueueProblems(waiting, failed) {
  const config = await getAlertConfig();
  if (!config.alertsEnabled) return;
  if (waiting >= config.alertQueueBacklogThreshold) {
    await sendAlert(`🚨 Queue backlog high: ${waiting} jobs waiting`, 'dev', 'queue_backlog');
  }
  if (failed >= config.alertQueueFailedThreshold) {
    await sendAlert(`⚠️ High failure rate: ${failed} failed jobs`, 'dev', 'queue_failed');
  }
}

export default {
  getAlertConfig,
  saveAlertConfig,
  sendAlert,
  shouldSendAlert,
  recordAlertSent,
  notifyRedisError,
  notifyDbSlow,
  notifyQueueProblems,
  checkRedisRecovery,
};
