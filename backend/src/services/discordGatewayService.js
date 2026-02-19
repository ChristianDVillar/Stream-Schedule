/**
 * Discord Gateway listener for bidirectional sync.
 * Listens to guildScheduledEventUpdate and guildScheduledEventDelete.
 * When Discord is updated by an admin, we update our DB only (do NOT enqueue sync).
 */

import { Content } from '../models/index.js';
import logger from '../utils/logger.js';

let client = null;

/**
 * Handle event updated in Discord (admin edited). Update our DB and align versions so we don't re-push.
 */
async function handleDiscordEventUpdate(event) {
  if (!event?.id) return;
  try {
    const content = await Content.findOne({
      where: { discordEventId: event.id },
    });
    if (!content) return;

    const updates = {};
    if (event.name != null) updates.title = event.name;
    if (event.description != null) updates.content = event.description;
    const startAt = event.scheduledStartAt ?? (event.scheduledStartTimestamp != null ? new Date(event.scheduledStartTimestamp) : null);
    const endAt = event.scheduledEndAt ?? (event.scheduledEndTimestamp != null ? new Date(event.scheduledEndTimestamp) : null);
    if (startAt != null) updates.scheduledFor = startAt;
    if (endAt != null) updates.eventEndTime = endAt;
    // Align version so we don't re-push to Discord
    updates.discordEventVersion = content.localVersion ?? 1;
    updates.lastSyncedAt = new Date();

    await content.update(updates);
    logger.info('Discord Gateway: content updated from Discord event', {
      contentId: content.id,
      discordEventId: event.id,
    });
  } catch (err) {
    logger.error('Discord Gateway: handle update failed', { eventId: event?.id, error: err.message });
  }
}

/**
 * Handle event deleted in Discord. Mark our content as deleted (soft).
 */
async function handleDiscordEventDelete(event) {
  if (!event?.id) return;
  try {
    const content = await Content.findOne({
      where: { discordEventId: event.id },
    });
    if (!content) return;

    await content.update({
      deletedAt: new Date(),
      discordEventVersion: content.localVersion ?? 1,
      lastSyncedAt: new Date(),
    });
    logger.info('Discord Gateway: content marked deleted from Discord event', {
      contentId: content.id,
      discordEventId: event.id,
    });
  } catch (err) {
    logger.error('Discord Gateway: handle delete failed', { eventId: event?.id, error: err.message });
  }
}

/**
 * Start Discord Gateway client (optional; requires discord.js and DISCORD_BOT_TOKEN).
 */
export async function startDiscordGateway() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.debug('Discord Gateway: no DISCORD_BOT_TOKEN, skipping');
    return null;
  }
  try {
    const { Client, GatewayIntentBits } = await import('discord.js');
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildScheduledEvents,
      ],
    });

    client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
      await handleDiscordEventUpdate(newEvent);
    });
    client.on('guildScheduledEventDelete', async (event) => {
      await handleDiscordEventDelete(event);
    });

    client.once('ready', () => {
      logger.info('Discord Gateway: client ready', { user: client.user?.tag });
    });
    client.on('error', (err) => {
      logger.warn('Discord Gateway: client error', { error: err.message });
    });

    await client.login(token);
    return client;
  } catch (err) {
    logger.warn('Discord Gateway: could not start (discord.js not installed or invalid token)', {
      error: err.message,
    });
    return null;
  }
}

/**
 * Stop Discord Gateway client.
 */
export async function stopDiscordGateway() {
  if (client) {
    client.destroy();
    client = null;
    logger.info('Discord Gateway: client stopped');
  }
}
