/**
 * AkoeNet discovery — list servers/channels on the user's AkoeNet instance (authenticated).
 * Mirrors /api/discord/guilds pattern for the Settings UI.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../modules/users/infrastructure/models.js';
import logger from '../utils/logger.js';
import {
  deriveAkoenetSchedulerBaseUrl,
  fetchAkoenetServers,
  fetchAkoenetChannels,
} from '../services/akoenetDiscoveryService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const WEBHOOK_PATH = '/integrations/scheduler/webhooks/stream-scheduled';
const SETUP_TOKEN_TTL_SECONDS = 5 * 60;

function resolveWebhookAndSecret(user) {
  const url =
    (user?.akoenetWebhookUrl || '').trim() || (process.env.AKOENET_SCHEDULER_WEBHOOK_URL || '').trim();
  const secret =
    (user?.akoenetWebhookSecret || '').trim() || (process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();
  return { url, secret };
}

function isValidWebhookUrl(url) {
  return !!deriveAkoenetSchedulerBaseUrl(url);
}

function normalizeWebhookUrlFromBase(baseUrl) {
  const raw = String(baseUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/$/, '');
    return `${u.origin}${path}${WEBHOOK_PATH}`;
  } catch {
    return '';
  }
}

/** True when AkoeNet rejected the shared secret or auth (do not echo raw upstream text to clients). */
function isAkoenetDiscoveryAuthFailure(httpStatus, errorMessage) {
  const msg = String(errorMessage || '');
  return (
    httpStatus === 401 ||
    httpStatus === 403 ||
    /invalid.*secret|scheduler webhook secret|unauthorized|forbidden/i.test(msg)
  );
}

function safeAkoenetUpstreamDetail(httpStatus, errorMessage, authFailed) {
  if (authFailed) return undefined;
  const msg = String(errorMessage || '').trim();
  if (!msg) return `HTTP ${httpStatus || 'error'}`;
  if (msg.length > 240 || /<html[\s>]/i.test(msg)) return 'AkoeNet returned an error.';
  return msg;
}

function buildAkoenetAutoConnectUrl(setupToken) {
  const base = (process.env.AKOENET_AUTO_CONNECT_URL || '').trim();
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set('setup_token', setupToken);
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * POST /akoenet/connect/init
 * Create short-lived setup token for AkoeNet auto-connect flow.
 */
router.post('/connect/init', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const nonce = randomBytes(12).toString('hex');
    const setupToken = jwt.sign(
      {
        purpose: 'akoenet_setup',
        userId,
        nonce,
      },
      JWT_SECRET,
      { expiresIn: `${SETUP_TOKEN_TTL_SECONDS}s` }
    );
    const connectUrl = buildAkoenetAutoConnectUrl(setupToken);
    res.json({
      setupToken,
      connectUrl,
      expiresInSeconds: SETUP_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    logger.error('AkoeNet connect init error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Could not start AkoeNet auto-connect flow' });
  }
});

/**
 * POST /akoenet/connect/complete
 * Called by AkoeNet backend after validating setup token.
 * Body:
 * - setupToken (required)
 * - webhookUrl (optional if akoenetBaseUrl is provided)
 * - akoenetBaseUrl (optional, used to build webhookUrl)
 * - webhookSecret (optional; generated if omitted)
 * - channelId, serverId, sendClips (optional)
 */
router.post('/connect/complete', async (req, res) => {
  try {
    const {
      setupToken,
      webhookUrl,
      webhookSecret,
      channelId,
      serverId,
      sendClips,
      akoenetBaseUrl,
    } = req.body || {};

    if (!setupToken || typeof setupToken !== 'string') {
      return res.status(400).json({ error: 'setupToken is required' });
    }

    let payload;
    try {
      payload = jwt.verify(setupToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired setupToken' });
    }
    if (payload?.purpose !== 'akoenet_setup' || !payload?.userId) {
      return res.status(401).json({ error: 'Invalid setupToken payload' });
    }

    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const finalWebhookUrl =
      (webhookUrl && String(webhookUrl).trim()) ||
      normalizeWebhookUrlFromBase(akoenetBaseUrl);
    if (!finalWebhookUrl || !isValidWebhookUrl(finalWebhookUrl)) {
      return res.status(400).json({
        error: 'Invalid webhook URL',
        details: `Must end with ${WEBHOOK_PATH}`,
      });
    }

    /** Prefer explicit body, then same shared secret as host env (matches AkoeNet SCHEDULER_WEBHOOK_SECRET), else random. */
    const finalSecret =
      (webhookSecret && String(webhookSecret).trim()) ||
      String(process.env.SCHEDULER_WEBHOOK_SECRET || '').trim() ||
      randomBytes(24).toString('hex');

    user.akoenetWebhookUrl = finalWebhookUrl;
    user.akoenetWebhookSecret = finalSecret;
    if (channelId !== undefined) {
      user.akoenetAnnounceChannelId = channelId ? String(channelId).trim() : null;
    }
    if (serverId !== undefined) {
      user.akoenetServerId = serverId ? String(serverId).trim() : null;
    }
    if (sendClips !== undefined) {
      user.akoenetSendClips = sendClips === true;
    }
    await user.save();

    const plain = user.get ? user.get({ plain: true }) : user;
    const hadExplicitBodySecret = !!(webhookSecret && String(webhookSecret).trim());
    const hadHostEnvSecret = String(process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();
    const generatedSecret =
      !hadExplicitBodySecret && !hadHostEnvSecret;

    res.json({
      ok: true,
      user: {
        id: plain.id,
        akoenetWebhookUrl: plain.akoenetWebhookUrl || null,
        akoenetAnnounceChannelId: plain.akoenetAnnounceChannelId || null,
        akoenetServerId: plain.akoenetServerId || null,
        akoenetWebhookSecretSet: !!(plain.akoenetWebhookSecret && String(plain.akoenetWebhookSecret).trim()),
        akoenetSendClips: plain.akoenetSendClips === true,
      },
      generatedSecret,
      webhookSecret: generatedSecret ? finalSecret : undefined,
    });
  } catch (err) {
    logger.error('AkoeNet connect complete error', { error: err.message });
    res.status(500).json({ error: 'Could not complete AkoeNet auto-connect flow' });
  }
});

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
      const authFailed = isAkoenetDiscoveryAuthFailure(httpStatus, errorMessage);
      if (authFailed) {
        logger.warn('AkoeNet discovery auth failed (check SCHEDULER_WEBHOOK_SECRET alignment)', {
          userId: req.user?.id,
          httpStatus,
        });
      } else if (httpStatus >= 400) {
        logger.warn('AkoeNet discovery upstream error', {
          userId: req.user?.id,
          httpStatus,
          preview: String(errorMessage || '').slice(0, 120),
        });
      }
      return res.status(503).json({
        code: 'akoenet_fetch_failed',
        reason: authFailed ? 'secret_mismatch' : 'upstream_error',
        error: 'Could not load AkoeNet servers',
        details: safeAkoenetUpstreamDetail(httpStatus, errorMessage, authFailed),
      });
    }

    res.json({ guilds });
  } catch (err) {
    logger.error('AkoeNet guilds error', { error: err.message, userId: req.user?.id });
    const aborted = err.name === 'AbortError';
    res.status(503).json({
      code: 'akoenet_error',
      reason: 'network_or_server',
      error: 'Failed to list AkoeNet servers',
      details: aborted ? 'Request timed out' : undefined,
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
      const authFailed = isAkoenetDiscoveryAuthFailure(httpStatus, errorMessage);
      if (authFailed) {
        logger.warn('AkoeNet channels discovery auth failed (check SCHEDULER_WEBHOOK_SECRET alignment)', {
          userId: req.user?.id,
          httpStatus,
        });
      }
      return res.status(503).json({
        code: 'akoenet_fetch_failed',
        reason: authFailed ? 'secret_mismatch' : 'upstream_error',
        error: 'Could not load AkoeNet channels',
        details: safeAkoenetUpstreamDetail(httpStatus, errorMessage, authFailed),
      });
    }

    res.json({ channels });
  } catch (err) {
    logger.error('AkoeNet channels error', { error: err.message, userId: req.user?.id });
    const aborted = err.name === 'AbortError';
    res.status(503).json({
      code: 'akoenet_error',
      reason: 'network_or_server',
      error: 'Failed to list AkoeNet channels',
      details: aborted ? 'Request timed out' : undefined,
    });
  }
});

export default router;
