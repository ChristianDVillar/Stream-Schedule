/**
 * Discord stream-started announcement (webhook).
 * Used when /api/webhooks/stream/start is called and user has discordAnnounceWebhookUrl.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from './logger.js';

/**
 * Send "Stream started!" to a Discord webhook URL.
 * @param {string} webhookUrl - Full Discord webhook URL (must start with https://discord.com/api/webhooks/)
 * @param {string} [note] - Optional note to append to the message
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export async function announceStreamStarted(webhookUrl, note = '') {
  const url = (webhookUrl || '').trim();
  if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
    return false;
  }
  try {
    const content = note ? `🔴 Stream started!\n${note}` : '🔴 Stream started!';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      logger.warn('Discord announce webhook returned non-OK', { status: res.status, url: url.slice(0, 50) });
      return false;
    }
    return true;
  } catch (e) {
    logger.warn('Discord announce failed', { error: e.message });
    return false;
  }
}
