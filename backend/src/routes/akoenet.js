/**
 * AkoeNet discovery — list servers/channels on the user's AkoeNet instance (authenticated).
 * Mirrors /api/discord/guilds pattern for the Settings UI.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../modules/users/infrastructure/models.js';
import logger from '../utils/logger.js';
import {
  deriveAkoenetSchedulerBaseUrl,
  fetchAkoenetServers,
  fetchAkoenetChannels,
} from '../services/akoenetDiscoveryService.js';

const router = express.Router();

function resolveWebhookAndSecret(user) {
  const url =
    (user?.akoenetWebhookUrl || '').trim() || (process.env.AKOENET_SCHEDULER_WEBHOOK_URL || '').trim();
  const secret =
    (user?.akoenetWebhookSecret || '').trim() || (process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();
  return { url, secret };
}

/**
 * GET /akoenet/guilds
 */
router.get('/guilds', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'akoenetWebhookUrl', 'akoenetWebhookSecret'],
    });
    const { url, secret } = resolveWebhookAndSecret(user);
    if (!url || !secret) {
      return res.status(400).json({
        code: 'akoenet_not_configured',
        error: 'Configure AkoeNet webhook URL and shared secret first',
        details: 'Save URL and secret under Settings → Bots → AkoeNet, or set AKOENET_SCHEDULER_WEBHOOK_URL and SCHEDULER_WEBHOOK_SECRET on the server.',
      });
    }
    const base = deriveAkoenetSchedulerBaseUrl(url);
    if (!base) {
      return res.status(400).json({
        code: 'akoenet_invalid_webhook_url',
        error: 'Webhook URL must end with /integrations/scheduler/webhooks/stream-scheduled',
        details: 'Fix the AkoeNet URL in Settings so the scheduler can discover servers.',
      });
    }

    const { guilds, httpStatus, errorMessage } = await fetchAkoenetServers(base, secret);
    if (httpStatus === 404) {
      return res.status(503).json({
        code: 'akoenet_discovery_not_implemented',
        error: 'AkoeNet did not expose the server list',
        details:
          'Expected GET {base}/integrations/scheduler/servers with header x-scheduler-webhook-secret. Implement this route on AkoeNet or update AkoeNet.',
      });
    }
    if (httpStatus >= 400 || (guilds.length === 0 && errorMessage)) {
      return res.status(503).json({
        code: 'akoenet_fetch_failed',
        error: 'Could not load AkoeNet servers',
        details: errorMessage || `HTTP ${httpStatus || 'error'}`,
      });
    }

    res.json({ guilds });
  } catch (err) {
    logger.error('AkoeNet guilds error', { error: err.message, userId: req.user?.id });
    const aborted = err.name === 'AbortError';
    res.status(503).json({
      code: 'akoenet_error',
      error: 'Failed to list AkoeNet servers',
      details: aborted ? 'Request timed out' : err.message,
    });
  }
});

/**
 * GET /akoenet/guilds/:guildId/channels
 */
router.get('/guilds/:guildId/channels', requireAuth, async (req, res) => {
  try {
    const guildId = String(req.params.guildId || '').trim();
    if (!guildId) {
      return res.status(400).json({ error: 'Missing server id' });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'akoenetWebhookUrl', 'akoenetWebhookSecret'],
    });
    const { url, secret } = resolveWebhookAndSecret(user);
    if (!url || !secret) {
      return res.status(400).json({
        code: 'akoenet_not_configured',
        error: 'Configure AkoeNet webhook URL and shared secret first',
      });
    }
    const base = deriveAkoenetSchedulerBaseUrl(url);
    if (!base) {
      return res.status(400).json({
        code: 'akoenet_invalid_webhook_url',
        error: 'Invalid AkoeNet webhook URL',
      });
    }

    const { channels, httpStatus, errorMessage } = await fetchAkoenetChannels(base, secret, guildId);
    if (httpStatus === 404) {
      return res.status(503).json({
        code: 'akoenet_discovery_not_implemented',
        error: 'AkoeNet did not expose channels for this server',
        details:
          'Expected GET {base}/integrations/scheduler/servers/:serverId/channels with x-scheduler-webhook-secret.',
      });
    }
    if (httpStatus >= 400 || (channels.length === 0 && errorMessage)) {
      return res.status(503).json({
        code: 'akoenet_fetch_failed',
        error: 'Could not load AkoeNet channels',
        details: errorMessage || `HTTP ${httpStatus || 'error'}`,
      });
    }

    res.json({ channels });
  } catch (err) {
    logger.error('AkoeNet channels error', { error: err.message, userId: req.user?.id });
    const aborted = err.name === 'AbortError';
    res.status(503).json({
      code: 'akoenet_error',
      error: 'Failed to list AkoeNet channels',
      details: aborted ? 'Request timed out' : err.message,
    });
  }
});

export default router;
