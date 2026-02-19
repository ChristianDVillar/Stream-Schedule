/**
 * Discord sync service: single place that talks to Discord for scheduled events.
 * Uses versioning (localVersion vs discordEventVersion), distributed lock, and idempotency.
 * Only this module (and the queue worker) should call create/update/delete Discord events.
 */

import crypto from 'crypto';
import { Content } from '../models/index.js';
import { Op } from 'sequelize';
import { createDiscordScheduledEvent, updateDiscordScheduledEvent, deleteDiscordScheduledEvent } from '../utils/discordPublish.js';
import { getDiscordEventLocation } from '../utils/contentFormatter.js';
import { getRedis } from '../utils/redisConnection.js';
import logger from '../utils/logger.js';

const LOCK_TTL_MS = 30000;
const LOCK_PREFIX = 'lock:discord-sync:';

/**
 * Build event start/end and description from content (mirrors scheduler logic).
 */
function buildEventTimesAndDescription(content) {
  let eventStartTime = content.scheduledFor;
  let eventEndTime = content.eventEndTime || null;
  let eventDescription = content.content || '';

  if (content.eventDates && Array.isArray(content.eventDates) && content.eventDates.length > 1) {
    const sortedDates = content.eventDates
      .filter((ed) => ed.date && ed.time)
      .map((ed) => {
        const dateStr = ed.date.includes('T') ? ed.date.split('T')[0] : ed.date;
        const timeStr = ed.time.includes('T') ? ed.time.split('T')[1] : ed.time;
        const datetime = new Date(`${dateStr}T${timeStr}`);
        return isNaN(datetime.getTime()) ? null : { ...ed, datetime };
      })
      .filter(Boolean)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    if (sortedDates.length > 0) {
      eventStartTime = sortedDates[0].datetime;
      const last = sortedDates[sortedDates.length - 1];
      if (last.endDate && last.endTime) {
        const endStr = last.endDate.includes('T') ? last.endDate.split('T')[0] : last.endDate;
        const endTimeStr = last.endTime.includes('T') ? last.endTime.split('T')[1] : last.endTime;
        eventEndTime = new Date(`${endStr}T${endTimeStr}`);
      } else {
        eventEndTime = new Date(last.datetime.getTime() + 60 * 60 * 1000);
      }
      const datesList = sortedDates
        .map(
          (ed, idx) =>
            `${idx + 1}. ${ed.datetime.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${ed.datetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        )
        .join('\n');
      eventDescription = eventDescription ? `${eventDescription}\n\n**📅 Event Dates & Times:**\n${datesList}` : `**📅 Event Dates & Times:**\n${datesList}`;
    }
  }

  if (!(eventStartTime instanceof Date)) eventStartTime = new Date(eventStartTime);
  if (eventEndTime && !(eventEndTime instanceof Date)) eventEndTime = new Date(eventEndTime);
  if (!eventEndTime || isNaN(eventEndTime.getTime())) {
    eventEndTime = new Date(eventStartTime.getTime() + 60 * 60 * 1000);
  }
  return { eventStartTime, eventEndTime, eventDescription };
}

/**
 * Compute idempotency hash for event payload.
 */
function computeSyncHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

/**
 * Acquire distributed lock. Returns true if acquired.
 */
async function acquireLock(contentId) {
  const redis = await getRedis();
  if (!redis) return true; // no Redis = single instance, proceed
  const key = `${LOCK_PREFIX}${contentId}`;
  const acquired = await redis.set(key, '1', 'PX', LOCK_TTL_MS, 'NX');
  return !!acquired;
}

/**
 * Release distributed lock.
 */
async function releaseLock(contentId) {
  const redis = await getRedis();
  if (!redis) return;
  await redis.del(`${LOCK_PREFIX}${contentId}`).catch(() => {});
}

/**
 * Process sync for one content: create, update, or delete Discord event based on version and state.
 * Called only by the discord-sync queue worker.
 */
export async function processSync(contentId) {
  const content = await Content.findByPk(contentId);
  if (!content) {
    logger.warn('Discord sync: content not found', { contentId });
    return;
  }

  const guildId = content.discordGuildId;
  const isEvent = (content.contentType || '').trim().toLowerCase() === 'event';
  const hasDiscord = Array.isArray(content.platforms) && content.platforms.map((p) => (p || '').trim().toLowerCase()).includes('discord');

  if (!guildId || (!isEvent && !hasDiscord)) {
    logger.debug('Discord sync: skip (not event or no guild)', { contentId, contentType: content.contentType, guildId });
    return;
  }

  const localVersion = content.localVersion ?? 1;
  const discordVersion = content.discordEventVersion ?? null;

  // Version rule: local > discord → push; discord > local → skip (Gateway will have updated us); equal → skip
  if (discordVersion !== null && localVersion <= discordVersion && !content.deletedAt) {
    logger.debug('Discord sync: skip (already synced)', { contentId, localVersion, discordVersion });
    return;
  }

  const acquired = await acquireLock(contentId);
  if (!acquired) {
    logger.warn('Discord sync: lock not acquired, skipping', { contentId });
    return;
  }

  try {
    // Deleted locally or marked deleted → delete on Discord if exists
    if (content.deletedAt) {
      if (content.discordEventId) {
        await deleteDiscordScheduledEvent(guildId, content.discordEventId);
        await content.update({
          discordEventId: null,
          discordEventVersion: localVersion,
          lastSyncedAt: new Date(),
          discordSyncHash: null,
        });
      }
      return;
    }

    const location = getDiscordEventLocation(content) || 'Online Event';
    const { eventStartTime, eventEndTime, eventDescription } = buildEventTimesAndDescription(content);
    const name = (content.title || 'Scheduled Event').slice(0, 100);

    const payload = {
      name,
      description: eventDescription.slice(0, 1000),
      scheduled_start_time: eventStartTime.toISOString(),
      scheduled_end_time: eventEndTime.toISOString(),
      entity_type: 3,
      entity_metadata: { location: location.trim().slice(0, 100) },
      privacy_level: 2,
    };
    const newHash = computeSyncHash(payload);

    if (content.discordEventId) {
      // Update existing event
      await updateDiscordScheduledEvent(guildId, content.discordEventId, {
        name: payload.name,
        description: payload.description,
        scheduled_start_time: payload.scheduled_start_time,
        scheduled_end_time: payload.scheduled_end_time,
        entity_metadata: payload.entity_metadata,
      });
      await content.update({
        discordEventVersion: localVersion,
        discordSyncHash: newHash,
        lastSyncedAt: new Date(),
      });
      logger.info('Discord sync: event updated', { contentId, discordEventId: content.discordEventId });
    } else {
      // Create new event
      const eventData = await createDiscordScheduledEvent(guildId, name, eventStartTime, {
        description: eventDescription,
        scheduledEndTime: eventEndTime,
        entityType: 3,
        location,
        image: null, // optional: could resolve from content.files
      });
      await content.update({
        discordEventId: eventData?.id,
        discordEventVersion: localVersion,
        discordSyncHash: newHash,
        lastSyncedAt: new Date(),
      });
      logger.info('Discord sync: event created', { contentId, discordEventId: eventData?.id });
    }
  } finally {
    await releaseLock(contentId);
  }
}

/**
 * Daily reconciliation: enqueue sync for content that might be out of sync
 * (e.g. discordEventId missing, or lastSyncedAt very old).
 */
export async function runReconciliation() {
  const { enqueueDiscordSync } = await import('./discordQueueService.js');
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const contents = await Content.findAll({
    where: {
      discordGuildId: { [Op.ne]: null },
      [Op.or]: [
        { discordEventId: null },
        { lastSyncedAt: { [Op.lt]: oneDayAgo } },
      ],
      deletedAt: null,
    },
    attributes: ['id'],
    limit: 100,
  });

  for (const c of contents) {
    enqueueDiscordSync(c.id).catch((err) =>
      logger.warn('Reconciliation enqueue failed', { contentId: c.id, error: err.message })
    );
  }
  if (contents.length > 0) {
    logger.info('Discord reconciliation enqueued', { count: contents.length });
  }
}
