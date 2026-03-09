/**
 * Public Webhooks API for bots (Streamer.bot, Mix It Up, StreamElements, etc.)
 * Auth via X-API-Key header or body apiKey/key (same key as Settings → Bots / Nightbot).
 * All bots use this single API so one key works for every tool.
 */

import express from 'express';
import { User, Todo, Content, StreamItem, StreamTimelineEvent, Integration, sequelize } from '../models/index.js';
import { contentService } from '../services/contentService.js';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const UPCOMING_STATUSES = [
  CONTENT_STATUS.SCHEDULED,
  CONTENT_STATUS.QUEUED,
  CONTENT_STATUS.PUBLISHING,
  CONTENT_STATUS.PUBLISHED,
];

async function getUpcomingEvents(userId, limit = 30) {
  const now = new Date();
  const events = await Content.findAll({
    where: {
      userId,
      scheduledFor: { [Op.gte]: now },
      status: { [Op.in]: UPCOMING_STATUSES },
      deletedAt: null,
    },
    order: [['scheduledFor', 'ASC']],
    limit,
    attributes: ['id', 'title', 'scheduledFor'],
  });
  return events.map((e) => ({
    title: e.title,
    scheduledFor: e.scheduledFor,
  }));
}

function formatEventForChat(scheduledFor, title) {
  const d = new Date(scheduledFor);
  const day = d.toLocaleDateString(undefined, { weekday: 'long' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time} — ${title}`;
}

function sendText(res, text) {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(text || '');
}

function getApiKey(req) {
  const header = (req.headers['x-api-key'] || req.headers['authorization'] || '').trim();
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  if (header) return header;
  const body = (req.body?.apiKey || req.body?.key || '').trim();
  if (body) return body;
  return (req.query?.key || req.query?.apiKey || '').trim();
}

async function getUserByApiKey(req) {
  const key = getApiKey(req);
  if (!key) return null;
  const user = await User.findOne({
    where: { nightbotApiKey: key },
    attributes: ['id', 'username'],
  });
  return user;
}

/**
 * POST /api/webhooks/todo
 * Create a todo from chat bots (e.g. !todo buy new mic).
 * Body: { text } or { title }, or query: text=...
 */
router.post('/todo', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or missing API key. Use the key from Streamer Scheduler → Settings → Bots.' });
    }

    const text = (req.body?.text ?? req.body?.title ?? req.query?.text ?? '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Missing text or title. Send { "text": "your task" } or { "title": "your task" }.' });
    }

    const title = text.length > 500 ? text.slice(0, 497) + '…' : text;
    await Todo.create({
      userId: user.id,
      title,
      order: 0,
    });

    logger.info('Webhook todo created', { userId: user.id, username: user.username, titleLength: title.length });
    res.status(201).json({ ok: true, message: `Todo added: ${title.slice(0, 80)}${title.length > 80 ? '…' : ''}` });
  } catch (err) {
    logger.error('Webhook todo error', { error: err.message });
    res.status(500).json({ error: 'Could not add todo. Try again later.' });
  }
});

/**
 * Create stream event (shared by POST /events and POST /schedule).
 * Body: { title, scheduledFor?, content?, platforms? }
 */
async function handleCreateEvent(req, res) {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or missing API key. Use the key from Streamer Scheduler → Settings → Bots.' });
    }

    const title = (req.body?.title ?? req.body?.event ?? req.body?.text ?? '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Missing title. Send { "title": "Friday 20:00 Minecraft" }.' });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const scheduledFor = req.body?.scheduledFor
      ? new Date(req.body.scheduledFor)
      : oneHourLater;
    if (isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ error: 'scheduledFor must be a valid ISO date string.' });
    }

    const content = (req.body?.content ?? title).trim().slice(0, 10000);
    const platforms = Array.isArray(req.body?.platforms) && req.body.platforms.length > 0
      ? req.body.platforms.filter((p) => ['twitch', 'twitter', 'discord', 'youtube', 'instagram'].includes(p))
      : ['twitch'];

    const contentData = {
      title: title.slice(0, 500),
      content,
      contentType: 'event',
      scheduledFor: scheduledFor.toISOString(),
      platforms,
    };

    const created = await contentService.createContent(user.id, contentData);
    const first = Array.isArray(created) ? created[0] : created;

    logger.info('Webhook event created', {
      userId: user.id,
      username: user.username,
      contentId: first?.id,
      title: contentData.title,
    });
    res.status(201).json({
      ok: true,
      message: 'Event created.',
      id: first?.id,
      title: contentData.title,
      scheduledFor: contentData.scheduledFor,
    });
  } catch (err) {
    logger.error('Webhook events error', { error: err.message });
    res.status(500).json({ error: 'Could not create event. Try again later.' });
  }
}

router.post('/events', handleCreateEvent);
/** POST /api/webhooks/schedule — alias for !schedule (same as /events) */
router.post('/schedule', handleCreateEvent);

/**
 * POST /api/webhooks/stream/start
 * Mark stream started (for future stream timeline / analytics).
 * If user has discordAnnounceWebhookUrl, posts "🔴 Stream started!" to that Discord channel.
 * Body: { note? } optional.
 * Returns 200; can be used by Streamer.bot / Mix It Up when going live.
 */
router.post('/stream/start', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or missing API key.' });
    }

    const note = (req.body?.note ?? req.body?.message ?? '').trim();
    logger.info('Webhook stream/start', { userId: user.id, username: user.username, note: note || undefined });

    const fullUser = await User.findByPk(user.id, { attributes: ['discordAnnounceWebhookUrl'] });
    const webhookUrl = fullUser?.discordAnnounceWebhookUrl?.trim();
    if (webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      try {
        const message = note ? `🔴 Stream started!\n${note}` : '🔴 Stream started!';
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        });
      } catch (e) {
        logger.warn('Discord announce on stream/start failed', { userId: user.id, error: e.message });
      }
    }

    res.json({ ok: true, message: 'Stream start recorded.' });
  } catch (err) {
    logger.error('Webhook stream/start error', { error: err.message });
    res.status(500).json({ error: 'Could not record stream start.' });
  }
});

// --- Stream items: !idea, !note, !quote, !clipidea ---
function createStreamItem(type) {
  return async (req, res) => {
    try {
      const user = await getUserByApiKey(req);
      if (!user) {
        return res.status(401).json({ error: 'Invalid or missing API key.' });
      }
      const text = (req.body?.text ?? req.body?.message ?? req.query?.text ?? '').trim();
      if (!text) {
        return res.status(400).json({ error: `Missing text. Send { "text": "..." } for !${type}.` });
      }
      const truncated = text.length > 1000 ? text.slice(0, 997) + '…' : text;
      await StreamItem.create({ userId: user.id, type, text: truncated });
      logger.info('Webhook stream item created', { userId: user.id, type });
      res.status(201).json({ ok: true, message: `${type} saved.` });
    } catch (err) {
      logger.error(`Webhook ${type} error`, { error: err.message });
      res.status(500).json({ error: `Could not save ${type}.` });
    }
  };
}

router.post('/idea', createStreamItem('idea'));
router.post('/note', createStreamItem('note'));
router.post('/quote', createStreamItem('quote'));
router.post('/clipidea', createStreamItem('clipidea'));

// --- GET endpoints: return text/plain for bot to say in chat (use ?key= or X-API-Key) ---

/** GET /api/webhooks/nextstream — "Next stream: Friday 20:00 Minecraft" */
router.get('/nextstream', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !nextstream.');
      return;
    }
    const events = await getUpcomingEvents(user.id, 1);
    if (events.length === 0) {
      sendText(res, 'No stream scheduled.');
      return;
    }
    const { scheduledFor, title } = events[0];
    sendText(res, `Next stream: ${formatEventForChat(scheduledFor, title)}`);
  } catch (err) {
    logger.error('Webhook nextstream error', { error: err.message });
    sendText(res, 'Could not load schedule.');
  }
});

/** GET /api/webhooks/countdown — "Next stream in: 3h 14m" for !countdown */
function formatCountdown(toDate) {
  const now = new Date();
  const to = new Date(toDate);
  if (to <= now) return null;
  const ms = to - now;
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  return `${s}s`;
}
router.get('/countdown', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !countdown.');
      return;
    }
    const events = await getUpcomingEvents(user.id, 1);
    if (events.length === 0) {
      sendText(res, 'No stream scheduled.');
      return;
    }
    const str = formatCountdown(events[0].scheduledFor);
    sendText(res, str ? `Next stream in: ${str}` : 'Stream should be live now!');
  } catch (err) {
    logger.error('Webhook countdown error', { error: err.message });
    sendText(res, 'Could not load countdown.');
  }
});

/** GET /api/webhooks/week — "This week's streams: Friday — Minecraft ..." — also /schedule alias */
async function handleWeekSchedule(req, res) {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !schedule.');
      return;
    }
    const now = new Date();
    const endOfWeek = new Date(now);
    const daysUntilSaturday = (6 - endOfWeek.getDay() + 7) % 7;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSaturday);
    endOfWeek.setHours(23, 59, 59, 999);
    const events = await Content.findAll({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now, [Op.lte]: endOfWeek },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
      },
      order: [['scheduledFor', 'ASC']],
      limit: 20,
      attributes: ['title', 'scheduledFor'],
    });
    if (events.length === 0) {
      sendText(res, "No streams scheduled this week.");
      return;
    }
    const lines = events.map((e) => {
      const d = new Date(e.scheduledFor);
      const day = d.toLocaleDateString(undefined, { weekday: 'long' });
      return `${day} — ${e.title}`;
    });
    sendText(res, `This week's streams:\n${lines.join('\n')}`);
  } catch (err) {
    logger.error('Webhook week error', { error: err.message });
    sendText(res, 'Could not load schedule.');
  }
}
router.get('/week', handleWeekSchedule);
router.get('/schedule', handleWeekSchedule);

/** GET /api/webhooks/myschedule — "📅 My stream schedule: https://..." */
router.get('/myschedule', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !myschedule.');
      return;
    }
    const base = FRONTEND_URL.replace(/\/$/, '');
    sendText(res, `📅 My stream schedule: ${base}/streamer/${encodeURIComponent(user.username)}`);
  } catch (err) {
    logger.error('Webhook myschedule error', { error: err.message });
    sendText(res, 'Error.');
  }
});

/** GET /api/webhooks/streamstats — "Streams this week: 3. Next stream: Friday 20:00" */
router.get('/streamstats', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !streamstats.');
      return;
    }
    const now = new Date();
    const endOfWeek = new Date(now);
    const daysUntilSat = (6 - endOfWeek.getDay() + 7) % 7;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSat);
    endOfWeek.setHours(23, 59, 59, 999);
    const countThisWeek = await Content.count({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now, [Op.lte]: endOfWeek },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
      },
    });
    const events = await getUpcomingEvents(user.id, 1);
    const nextLine = events.length > 0
      ? `Next stream: ${formatEventForChat(events[0].scheduledFor, events[0].title)}`
      : 'No stream scheduled.';
    sendText(res, `Streams this week: ${countThisWeek}. ${nextLine}`);
  } catch (err) {
    logger.error('Webhook streamstats error', { error: err.message });
    sendText(res, 'Could not load stats.');
  }
});

/** GET /api/webhooks/quote/random — random quote for !quote random */
router.get('/quote/random', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use !quote random.');
      return;
    }
    const item = await StreamItem.findOne({
      where: { userId: user.id, type: 'quote' },
      order: [sequelize.literal('RANDOM()')],
      attributes: ['text'],
    });
    sendText(res, item ? `"${item.text}"` : 'No quotes yet. Use !quote your funny line to add one.');
  } catch (err) {
    logger.error('Webhook quote/random error', { error: err.message });
    sendText(res, 'Could not get quote.');
  }
});

/** GET /api/webhooks/idea/random — random idea for !randomidea */
router.get('/idea/random', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use !randomidea.');
      return;
    }
    const item = await StreamItem.findOne({
      where: { userId: user.id, type: 'idea' },
      order: [sequelize.literal('RANDOM()')],
      attributes: ['text'],
    });
    sendText(res, item ? item.text : 'No ideas yet. Use !idea your idea to add one.');
  } catch (err) {
    logger.error('Webhook idea/random error', { error: err.message });
    sendText(res, 'Could not get idea.');
  }
});

/** GET /api/webhooks/commands — list of available commands for !commands */
router.get('/commands', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !commands.');
      return;
    }
    const lines = [
      'Available commands:',
      '!nextstream — next scheduled stream',
      '!countdown — time until next stream',
      '!schedule or !week — weekly schedule',
      '!goal — follower/sub goal',
      '!myschedule — public schedule link',
      '!streamstats — stream statistics',
      '!quote random — random quote',
      '!randomidea — random stream idea',
    ];
    sendText(res, lines.join('\n'));
  } catch (err) {
    logger.error('Webhook commands error', { error: err.message });
    sendText(res, 'Could not load commands.');
  }
});

/** GET /api/webhooks/goal — "Follower goal: 500. Current: 421" for !goal */
router.get('/goal', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !goal.');
      return;
    }
    const fullUser = await User.findByPk(user.id, {
      attributes: ['streamGoalType', 'streamGoalTarget'],
    });
    const goalType = fullUser?.streamGoalType || null;
    const target = fullUser?.streamGoalTarget ?? null;
    if (!goalType || target == null || target < 1) {
      sendText(res, 'No goal set. Set a follower or sub goal in Streamer Scheduler → Settings.');
      return;
    }
    let current = null;
    if (goalType === 'followers') {
      try {
        const integration = await Integration.findOne({
          where: { userId: user.id, provider: 'twitch', status: 'active' },
        });
        if (integration?.accessToken && integration?.providerUserId) {
          const { TwitchService } = await import('../services/twitchService.js');
          const twitch = new TwitchService();
          const result = await twitch.getChannelFollowers(integration.providerUserId, integration.accessToken);
          current = result?.total ?? null;
        }
      } catch (e) {
        logger.warn('Twitch followers for goal failed', { error: e.message });
      }
    }
    if (current == null) {
      sendText(res, `${goalType === 'followers' ? 'Follower' : 'Sub'} goal: ${target}. Connect Twitch in Settings to see current.`);
      return;
    }
    sendText(res, `${goalType === 'followers' ? 'Follower' : 'Sub'} goal: ${target}. Current: ${current}.`);
  } catch (err) {
    logger.error('Webhook goal error', { error: err.message });
    sendText(res, 'Could not load goal.');
  }
});

/**
 * POST /api/webhooks/timeline — add stream timeline event (stream_start, donation, clip, etc.)
 * Body: { type, payload? } — for Streamer.bot / Mix It Up to log moments.
 */
router.post('/timeline', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or missing API key.' });
    }
    const type = (req.body?.type ?? 'note').trim().slice(0, 50) || 'note';
    const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : null;
    await StreamTimelineEvent.create({ userId: user.id, type, payload });
    res.status(201).json({ ok: true, message: 'Timeline event added.' });
  } catch (err) {
    logger.error('Webhook timeline error', { error: err.message });
    res.status(500).json({ error: 'Could not add timeline event.' });
  }
});

export default router;
