/**
 * Admin: operational alerts config (Discord webhooks, thresholds).
 * GET /api/admin/alert-config, PUT /api/admin/alert-config, POST /api/admin/alert-config/test
 */

import express from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { getAlertConfig, saveAlertConfig, sendAlert } from '../../services/alertService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

export async function getAlertConfigHandler(req, res) {
  try {
    const config = await getAlertConfig();
    res.json({
      discordDevWebhook: config.discordDevWebhook,
      discordStatusWebhook: config.discordStatusWebhook,
      alertsEnabled: config.alertsEnabled,
      alertQueueBacklogThreshold: config.alertQueueBacklogThreshold,
      alertQueueFailedThreshold: config.alertQueueFailedThreshold,
      alertDbSlowMs: config.alertDbSlowMs,
    });
  } catch (err) {
    logger.error('Get alert config failed', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Failed to load alert config' });
  }
}

export async function putAlertConfigHandler(req, res) {
  try {
    const updated = await saveAlertConfig(req.body);
    res.json({
      message: 'Alert config updated',
      discordDevWebhook: updated.discordDevWebhook,
      discordStatusWebhook: updated.discordStatusWebhook,
      alertsEnabled: updated.alertsEnabled,
      alertQueueBacklogThreshold: updated.alertQueueBacklogThreshold,
      alertQueueFailedThreshold: updated.alertQueueFailedThreshold,
      alertDbSlowMs: updated.alertDbSlowMs,
    });
  } catch (err) {
    logger.error('Save alert config failed', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Failed to save alert config' });
  }
}

export async function postAlertConfigTestHandler(req, res) {
  try {
    const type = req.body?.type === 'status' ? 'status' : 'dev';
    const message = `✅ Test alert (${type}) – Streamer Scheduler – ${new Date().toISOString()}`;
    const sent = await sendAlert(message, type);
    if (sent) {
      res.json({ message: `Test alert sent to ${type} webhook`, sent: true });
    } else {
      // Return 200 so the UI can show an info message instead of error
      res.json({
        message: type === 'status'
          ? 'Configure the Status webhook URL above, enable alerts and save, then try again.'
          : 'Configure the Dev webhook URL above, enable alerts and save, then try again.',
        sent: false,
      });
    }
  } catch (err) {
    logger.error('Test alert failed', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Failed to send test alert' });
  }
}

router.get('/alert-config', requireAdmin, getAlertConfigHandler);
router.put('/alert-config', requireAdmin, putAlertConfigHandler);
router.post('/alert-config/test', requireAdmin, postAlertConfigTestHandler);

export default router;
