/**
 * Operational alerts via Discord webhooks.
 * Configurable from admin panel (SystemConfig alert_config) with env fallback.
 * Used for: worker crash, Redis error, DB slow, queue backlog/failures.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import axios from 'axios';
import { SystemConfig } from '../models/index.js';
import logger from '../utils/logger.js';

const CONFIG_KEY = 'alert_config';
const DEFAULT_CONFIG = {
  discordDevWebhook: process.env.DISCORD_DEV_WEBHOOK || '',
  discordStatusWebhook: process.env.DISCORD_STATUS_WEBHOOK || '',
  alertsEnabled: true,
  alertQueueBacklogThreshold: 1000,
  alertQueueFailedThreshold: 50,
  alertDbSlowMs: 2000,
};

/** Cooldown between same alert type (ms) to avoid spam */
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const lastAlerted = new Map();

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
    alertQueueBacklogThreshold: config.alertQueueBacklogThreshold !== undefined ? Number(config.alertQueueBacklogThreshold) || 1000 : current.alertQueueBacklogThreshold,
    alertQueueFailedThreshold: config.alertQueueFailedThreshold !== undefined ? Number(config.alertQueueFailedThreshold) || 50 : current.alertQueueFailedThreshold,
    alertDbSlowMs: config.alertDbSlowMs !== undefined ? Number(config.alertDbSlowMs) || 2000 : current.alertDbSlowMs,
  };
  await SystemConfig.upsert({
    key: CONFIG_KEY,
    value: merged,
    description: 'Discord webhooks and thresholds for operational alerts',
  });
  return merged;
}

/**
 * Send alert to Discord webhook.
 * @param {string} message - Plain text message (Discord allows 2000 chars).
 * @param {'dev'|'status'} type - 'dev' → #dev-internal, 'status' → #status (public).
 * @param {string} [cooldownKey] - If set, only send once per ALERT_COOLDOWN_MS per key.
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

  if (cooldownKey) {
    const last = lastAlerted.get(cooldownKey);
    if (last && Date.now() - last < ALERT_COOLDOWN_MS) return false;
  }

  try {
    await axios.post(webhook, {
      content: message.slice(0, 2000),
    }, {
      timeout: 5000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    if (cooldownKey) lastAlerted.set(cooldownKey, Date.now());
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
 * Uses cooldown key 'redis_error' to avoid spamming on repeated connection errors.
 */
export function notifyRedisError(err) {
  const detail = formatErrorForAlert(err);
  const msg = `🚨 Redis error: ${detail}`;
  sendAlert(msg, 'dev', 'redis_error').catch(() => {});
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
  notifyRedisError,
  notifyDbSlow,
  notifyQueueProblems,
};
