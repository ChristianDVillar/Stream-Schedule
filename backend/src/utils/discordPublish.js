/**
 * Publish message to a Discord channel using the bot token.
 * Used by the API route and by the scheduled content job.
 * Supports text, embeds (image/video URLs), and file attachments (download from URL and upload).
 */

import FormData from 'form-data';
import logger from './logger.js';
import { compressImage, compressVideoQueued } from './compressMedia.js';

const DISCORD_API = 'https://discord.com/api/v10';
const MAX_ATTACHMENTS = 10;
// Discord API limit for bots is 8MB per message (25MB is for user client only)
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per image
const MAX_VIDEO_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per video (Discord bot API limit)
const MAX_REQUEST_BODY_BYTES = 8 * 1024 * 1024; // 8MB total request (Discord bot API)

/** Read response body once into a Buffer (avoids "Body has already been read"). */
async function responseToBuffer(res) {
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function getBotToken() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  return token;
}

function throwOnDiscordError(res, errData) {
  if (res.status === 403) {
    const err = new Error('Bot does not have permission in this channel');
    err.status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('Channel not found');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(errData?.message || 'Discord API error');
    err.status = res.status;
    err.details = errData;
    throw err;
  }
}

/**
 * Post a message to a Discord channel (bot token only).
 * @param {string} channelId - Discord channel ID
 * @param {string} [content] - Message text (max 2000)
 * @param {object[]} [embeds] - Optional embeds (max 10)
 * @returns {Promise<{ id: string }>} Message object from Discord
 * @throws {Error} On API error (403, 404, 5xx)
 */
export async function postToDiscordChannel(channelId, content, embeds = []) {
  const botToken = getBotToken();
  if (!botToken) {
    throw new Error('Discord bot not configured');
  }
  const body = {};
  if (content) body.content = String(content).slice(0, 2000);
  if (embeds && Array.isArray(embeds) && embeds.length > 0) body.embeds = embeds.slice(0, 10);
  if (!body.content && !(body.embeds && body.embeds.length)) {
    throw new Error('Message content or embeds required');
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  throwOnDiscordError(res, data);
  return data;
}

/**
 * Infer filename and extension from URL or type (image/video).
 */
function inferFilename(url, type, index) {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').pop() || `file-${index}`;
    if (base.includes('.')) return base;
  } catch (_) {}
  const ext = type === 'video' ? 'mp4' : 'png';
  return `file-${index}.${ext}`;
}

/**
 * Post a message to Discord with file attachments by downloading from URLs and uploading as multipart.
 * Use this when embeds don't show (e.g. Supabase Storage URLs blocked by Discord).
 * @param {string} channelId - Discord channel ID
 * @param {string} [content] - Message text (max 2000)
 * @param {Array<{ url: string, type?: string, fileName?: string }>} [items] - Media items (url required)
 * @returns {Promise<{ id: string }>} Message object from Discord
 */
export async function postToDiscordChannelWithAttachments(channelId, content, items = []) {
  const botToken = getBotToken();
  if (!botToken) {
    throw new Error('Discord bot not configured');
  }

  const payload = { content: content ? String(content).slice(0, 2000) : undefined };
  if (!payload.content && (!items || items.length === 0)) {
    throw new Error('Message content or attachments required');
  }

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));

  let appendedCount = 0;
  let lastDownloadError = null;
  const slice = (Array.isArray(items) ? items : []).slice(0, MAX_ATTACHMENTS);
  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const url = typeof item === 'string' ? item : item?.url;
    if (!url || typeof url !== 'string') continue;
    const type = (typeof item === 'object' && item?.type) || (String(url).toLowerCase().includes('video') ? 'video' : 'image');
    const maxSize = type === 'video' ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    logger.info('Discord publish: fetching attachment', { index: i, type });
    try {
      const mediaRes = await fetch(url, { redirect: 'follow' });
      const buf = await responseToBuffer(mediaRes);
      if (!mediaRes.ok) {
        const text = buf.toString('utf8').slice(0, 200);
        lastDownloadError = `Attachment fetch failed: ${mediaRes.status} ${mediaRes.statusText}${text ? ` - ${text}` : ''}`;
        logger.warn('Discord publish: failed to fetch attachment', { status: mediaRes.status, statusText: mediaRes.statusText, type, bodyPreview: text });
        continue;
      }
      let finalBuf = buf;
      // Siempre intentar comprimir vídeos que superen el límite; imágenes solo si pasan
      if (buf.length > maxSize) {
        logger.info('Discord publish: compressing attachment over limit', { type, sizeMB: (buf.length / 1024 / 1024).toFixed(2), maxMB: maxSize / 1024 / 1024 });
        try {
          const compressed = type === 'video'
            ? await compressVideoQueued(buf, maxSize)
            : await compressImage(buf, maxSize);
          if (compressed && compressed.length > 0 && compressed.length <= maxSize) {
            finalBuf = compressed;
            logger.info('Discord publish: compression succeeded', { type, resultMB: (finalBuf.length / 1024 / 1024).toFixed(2) });
          } else {
            lastDownloadError = type === 'video'
              ? `Video too large (${(buf.length / 1024 / 1024).toFixed(1)}MB). Compression failed or unavailable. Use a video under 8MB.`
              : `Attachment too large: ${(buf.length / 1024 / 1024).toFixed(1)}MB (max ${maxSize / 1024 / 1024}MB for ${type})`;
            logger.warn('Discord publish: attachment too large (compression failed or unavailable)', { type, sizeMB: (buf.length / 1024 / 1024).toFixed(1) });
            continue;
          }
        } catch (compressErr) {
          lastDownloadError = `Compression error: ${compressErr.message}`;
          logger.warn('Discord publish: compression threw', { type, error: compressErr.message });
          continue;
        }
      }
      // Red de seguridad: nunca adjuntar archivo > límite
      if (finalBuf.length > maxSize) {
        logger.warn('Discord publish: skipping attachment over limit after processing', { type, sizeMB: (finalBuf.length / 1024 / 1024).toFixed(2) });
        lastDownloadError = `Attachment too large: ${(finalBuf.length / 1024 / 1024).toFixed(1)}MB (max ${maxSize / 1024 / 1024}MB)`;
        continue;
      }
      const filename = (typeof item === 'object' && item?.fileName) || inferFilename(url, type, i);
      form.append(`files[${appendedCount}]`, finalBuf, { filename });
      logger.info('Discord publish: appended file', { index: appendedCount, filename, sizeBytes: finalBuf.length, type });
      appendedCount++;
    } catch (err) {
      lastDownloadError = `Download error: ${err.message}`;
      logger.warn('Discord publish: error downloading attachment', { type, error: err.message, stack: err.stack });
    }
  }

  if (!payload.content && appendedCount === 0) {
    const msg = lastDownloadError
      ? `Could not download any attachment. Last error: ${lastDownloadError}`
      : 'Could not download any attachment; message content or at least one valid attachment URL required';
    throw new Error(msg);
  }

  const formBuffer = form.getBuffer();
  const payloadMB = (formBuffer.length / 1024 / 1024).toFixed(2);
  if (formBuffer.length > MAX_REQUEST_BODY_BYTES) {
    throw new Error(`Total message size (${payloadMB}MB) exceeds Discord bot limit (8MB). Video could not be compressed. Use a shorter/smaller video.`);
  }
  const headers = {
    Authorization: `Bot ${botToken}`,
    ...form.getHeaders(),
    'Content-Length': String(formBuffer.length),
  };
  logger.info('Discord publish: sending to Discord', { appendedCount, payloadSizeMB: (formBuffer.length / 1024 / 1024).toFixed(2) });

  const controller = new AbortController();
  const timeoutMs = formBuffer.length > 10 * 1024 * 1024 ? 120000 : 30000; // 2 min for >10MB, else 30s
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers,
      body: formBuffer,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const bodyText = await res.text();
  let data = {};
  try {
    if (bodyText && bodyText.trim()) data = JSON.parse(bodyText);
  } catch (e) {
    logger.warn('Discord publish: parse response failed', { status: res.status, error: e?.message });
  }
  if (!res.ok) {
    logger.warn('Discord publish: API error', { status: res.status, data });
    throwOnDiscordError(res, data);
  }
  logger.info('Discord publish: success', { messageId: data?.id });
  return data;
}

/**
 * Create a scheduled event in a Discord guild (server).
 * Discord automatically converts the UTC timestamp to each user's local timezone.
 * 
 * @param {string} guildId - Discord guild (server) ID
 * @param {string} name - Event name (max 100 chars)
 * @param {string|Date} scheduledStartTime - Start time in UTC (ISO 8601 string or Date object)
 * @param {object} options - Additional options
 * @param {string} [options.description] - Event description (max 1000 chars)
 * @param {string|Date} [options.scheduledEndTime] - End time in UTC (ISO 8601 string or Date object, optional)
 * @param {number} [options.entityType] - Entity type: 1=Stage, 2=Voice, 3=External (default: 3)
 * @param {string} [options.channelId] - Channel ID (required for Stage/Voice, optional for External)
 * @param {string} [options.location] - Location (required for External, max 100 chars)
 * @param {string} [options.image] - Cover image URL
 * @returns {Promise<{ id: string, ... }>} Event object from Discord
 * @throws {Error} On API error
 */
export async function createDiscordScheduledEvent(guildId, name, scheduledStartTime, options = {}) {
  const botToken = getBotToken();
  if (!botToken) {
    throw new Error('Discord bot not configured');
  }

  // Ensure scheduledStartTime is in ISO 8601 format (UTC)
  let startTimeISO;
  if (scheduledStartTime instanceof Date) {
    startTimeISO = scheduledStartTime.toISOString();
  } else if (typeof scheduledStartTime === 'string') {
    // Validate it's a valid ISO string
    const date = new Date(scheduledStartTime);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid scheduledStartTime: must be ISO 8601 UTC string or Date object');
    }
    startTimeISO = date.toISOString();
  } else {
    throw new Error('scheduledStartTime must be ISO 8601 UTC string or Date object');
  }

  const {
    description = '',
    scheduledEndTime = null,
    entityType = 3, // External event (most common for streams)
    channelId = null,
    location = null,
    image = null
  } = options;

  // Validate name length
  if (!name || name.length > 100) {
    throw new Error('Event name is required and must be 100 characters or less');
  }

  // Handle scheduled end time if provided
  let endTimeISO = null;
  if (scheduledEndTime) {
    if (scheduledEndTime instanceof Date) {
      endTimeISO = scheduledEndTime.toISOString();
    } else if (typeof scheduledEndTime === 'string') {
      const date = new Date(scheduledEndTime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid scheduledEndTime: must be ISO 8601 UTC string or Date object');
      }
      endTimeISO = date.toISOString();
    } else {
      throw new Error('scheduledEndTime must be ISO 8601 UTC string or Date object');
    }
    // Validate end time is after start time
    if (new Date(endTimeISO) <= new Date(startTimeISO)) {
      throw new Error('Event end time must be after start time');
    }
  }

  // Build request body based on entity type
  // Ensure entityType is a number (Discord requires it as integer)
  const entityTypeNumber = typeof entityType === 'string' ? parseInt(entityType, 10) : Number(entityType);
  
  const body = {
    name: name.slice(0, 100),
    scheduled_start_time: startTimeISO, // Discord expects ISO 8601 UTC
    entity_type: entityTypeNumber, // Ensure it's a number, not a string
    privacy_level: 2 // Required: 2 = GUILD_ONLY (events are only visible to server members)
  };

  if (description) {
    body.description = description.slice(0, 1000);
  }

  if (endTimeISO) {
    body.scheduled_end_time = endTimeISO;
  }

  // Entity type specific fields
  if (entityType === 1 || entityType === 2) {
    // Stage or Voice channel event
    if (!channelId) {
      throw new Error(`channelId is required for entity type ${entityType} (Stage/Voice)`);
    }
    body.channel_id = channelId;
  } else if (entityType === 3) {
    // External event - entity_metadata.location is REQUIRED for external events
    // Also scheduled_end_time is required for external events
    if (!endTimeISO) {
      throw new Error('scheduled_end_time is required for external events (entity_type = 3)');
    }
    if (!location || !location.trim()) {
      throw new Error('location is required for external events (entity_type = 3). Provide eventLocationUrl or ensure platform is set.');
    }
    body.entity_metadata = { location: location.trim().slice(0, 100) };
  }

  if (image) {
    body.image = image;
  }

  // VERSION CHECK: This log confirms we're running the updated code
  logger.info('VERSION 19-02-2026 FIX APPLIED - privacy_level included');

  logger.info('Creating Discord scheduled event', {
    guildId,
    name,
    scheduledStartTime: startTimeISO,
    scheduledEndTime: endTimeISO,
    entityType,
    privacyLevel: body.privacy_level
  });

  // Log the complete body to verify privacy_level is included
  logger.info('DISCORD EVENT FINAL PAYLOAD', {
    body: body,
    bodyStringified: JSON.stringify(body),
    hasPrivacyLevel: 'privacy_level' in body,
    privacyLevelValue: body.privacy_level
  });

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/scheduled-events`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    logger.error('Discord scheduled event creation failed', {
      status: res.status,
      data,
      guildId,
      name
    });
    throwOnDiscordError(res, data);
  }

  logger.info('Discord scheduled event created successfully', {
    eventId: data?.id,
    guildId,
    name
  });

  return data;
}
