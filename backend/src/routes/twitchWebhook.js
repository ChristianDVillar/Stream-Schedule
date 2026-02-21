/**
 * Twitch EventSub webhook handler (channel.cheer for bits).
 * Must use express.raw({ type: 'application/json' }) so we can verify HMAC and parse body.
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';
import { TwitchBitEvent, TwitchEventSubSubscription } from '../models/index.js';

const HMAC_PREFIX = 'sha256=';

function getHmacMessage(messageId, timestamp, rawBody) {
  return messageId + timestamp + (typeof rawBody === 'string' ? rawBody : rawBody?.toString?.('utf8') || '');
}

function verifySignature(secret, message, signature) {
  const hmac = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const expected = HMAC_PREFIX + hmac;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/twitch/eventsub
 * Twitch sends: webhook_callback_verification (challenge), notification (event), revocation.
 */
export async function handleTwitchEventSub(req, res) {
  const rawBody = req.body;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return res.status(400).send('Bad request');
  }

  const msgId = req.headers['twitch-eventsub-message-id'];
  const msgTimestamp = req.headers['twitch-eventsub-message-timestamp'];
  const msgSignature = req.headers['twitch-eventsub-message-signature'];
  const msgType = req.headers['twitch-eventsub-message-type'];

  if (!msgId || !msgTimestamp || !msgSignature || !msgType) {
    return res.status(400).send('Missing EventSub headers');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    return res.status(400).send('Invalid JSON');
  }

  // webhook_callback_verification: return challenge to enable subscription
  if (msgType === 'webhook_callback_verification') {
    const challenge = payload.challenge;
    if (!challenge) return res.status(400).send('Missing challenge');
    const subId = payload.subscription?.id;
    const broadcasterUserId = payload.subscription?.condition?.broadcaster_user_id;
    if (subId && broadcasterUserId) {
      const row = await TwitchEventSubSubscription.findOne({
        where: { broadcasterUserId: String(broadcasterUserId), subscriptionId: null },
        order: [['createdAt', 'DESC']],
      });
      if (row) await row.update({ subscriptionId: subId, status: 'enabled' });
    }
    res.set('Content-Type', 'text/plain').status(200).send(challenge);
    return;
  }

  // revocation: log and optionally update our record
  if (msgType === 'revocation') {
    const subId = payload.subscription?.id;
    if (subId) {
      await TwitchEventSubSubscription.update({ status: 'revoked' }, { where: { subscriptionId: subId } }).catch(() => {});
    }
    logger.info('Twitch EventSub subscription revoked', { subscriptionId: subId, reason: payload.subscription?.status });
    return res.status(204).end();
  }

  // notification: verify signature then process
  if (msgType !== 'notification') {
    return res.status(400).send('Unknown message type');
  }

  const subId = payload.subscription?.id;
  const subRow = await TwitchEventSubSubscription.findOne({ where: { subscriptionId: subId } });
  if (!subRow) {
    logger.warn('Twitch EventSub notification for unknown subscription', { subscriptionId: subId });
    return res.status(200).end();
  }

  const message = getHmacMessage(msgId, msgTimestamp, rawBody);
  if (!verifySignature(subRow.secret, message, msgSignature)) {
    return res.status(403).send('Invalid signature');
  }

  const subscriptionType = payload.subscription?.type;
  if (subscriptionType === 'channel.cheer') {
    const ev = payload.event;
    if (!ev) return res.status(200).end();
    const broadcasterUserId = ev.broadcaster_user_id || payload.subscription?.condition?.broadcaster_user_id;
    const bits = Number(ev.bits) || 0;
    if (!broadcasterUserId || bits <= 0) return res.status(200).end();

    // Dedupe by message id
    const existing = await TwitchBitEvent.findOne({ where: { message_id: msgId } });
    if (existing) return res.status(200).end();

    await TwitchBitEvent.create({
      broadcasterUserId: String(broadcasterUserId),
      user_id: String(ev.user_id || ''),
      user_login: ev.user_login || null,
      user_name: ev.user_name || null,
      bits,
      message_id: msgId,
    });
    logger.debug('Twitch cheer stored', { broadcasterUserId, bits, message_id: msgId });
  }

  res.status(200).end();
}
