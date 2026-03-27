/**
 * Public Webhooks API for bots (Streamer.bot, Mix It Up, StreamElements, etc.)
 * Auth via X-API-Key header or body apiKey/key (same key as Settings → Bots / Nightbot).
 * All bots use this single API so one key works for every tool.
 */

import express from 'express';
import {
  User,
  Todo,
  Content,
  StreamItem,
  StreamTimelineEvent,
  Integration,
  sequelize,
  contentService,
  Op,
  logger,
  FRONTEND_URL,
  UPCOMING_STATUSES,
  getUpcomingEvents,
  formatEventForChat,
  formatCountdown,
  sendText,
  getUserByApiKey,
} from './shared.js';
import { announceStreamStarted } from '../../utils/discordAnnounce.js';
import rouletteService from '../../modules/content/application/rouletteService.js';
import { emitRouletteToUser } from '../../services/websocketService.js';

const router = express.Router();

// Centralized webhook request logging (method, path, status, duration)
router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Webhook request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

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
    if (webhookUrl) {
      await announceStreamStarted(webhookUrl, note);
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

/** Shared handler for GET/POST .../add — add stream item (for Nightbot: GET ?text=...&key=API_KEY) */
function addStreamItemHandler(type, paramLabel = 'text') {
  const labels = { idea: 'idea', note: 'note', quote: 'quote', clipidea: 'clip idea' };
  const label = labels[type] || type;
  return async (req, res) => {
    try {
      const user = await getUserByApiKey(req);
      if (!user) {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        return res.status(401).send('Invalid or missing API key. Use the key from Settings → Bots.');
      }
      const raw = type === 'quote'
        ? (req.query?.quote ?? req.query?.text ?? req.body?.quote ?? req.body?.text ?? req.body?.message ?? '')
        : (req.query?.text ?? req.query?.[type] ?? req.body?.text ?? req.body?.message ?? req.body?.[type] ?? '');
      const text = String(raw).trim();
      if (!text) {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        return res.status(400).send(`Missing ${paramLabel}. Use ?${paramLabel}=your text or body: { "${paramLabel}": "your text" }`);
      }
      const truncated = text.length > 1000 ? text.slice(0, 997) + '…' : text;
      if (type === 'quote') {
        const exists = await StreamItem.findOne({
          where: { userId: user.id, type: 'quote', text: truncated },
          attributes: ['id'],
        });
        if (exists) {
          res.set('Content-Type', 'text/plain; charset=utf-8');
          return res.status(200).send('Quote already saved.');
        }
      }
      await StreamItem.create({ userId: user.id, type, text: truncated });
      logger.info('Webhook stream item add created', { userId: user.id, type });
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.status(201).send(`${label.charAt(0).toUpperCase() + label.slice(1)} saved: "${truncated.slice(0, 80)}${truncated.length > 80 ? '…' : ''}"`);
    } catch (err) {
      logger.error(`Webhook ${type}/add error`, { error: err.message });
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.status(500).send(`Could not add ${label}.`);
    }
  };
}

router.get('/quote/add', addStreamItemHandler('quote', 'quote'));
router.post('/quote/add', addStreamItemHandler('quote', 'quote'));
router.get('/idea/add', addStreamItemHandler('idea'));
router.post('/idea/add', addStreamItemHandler('idea'));
router.get('/note/add', addStreamItemHandler('note'));
router.post('/note/add', addStreamItemHandler('note'));
router.get('/clipidea/add', addStreamItemHandler('clipidea'));
router.post('/clipidea/add', addStreamItemHandler('clipidea'));

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

/** GET /api/webhooks/quote/random — random quote for !quote (efficient: count + offset, no ORDER BY RANDOM()) */
router.get('/quote/random', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use !quote random.');
      return;
    }
    const count = await StreamItem.count({
      where: { userId: user.id, type: 'quote' },
    });
    if (count === 0) {
      sendText(res, 'No quotes yet. Use !quote your funny line to add one.');
      return;
    }
    const randomOffset = Math.floor(Math.random() * count);
    const item = await StreamItem.findOne({
      where: { userId: user.id, type: 'quote' },
      order: [['id', 'ASC']],
      offset: randomOffset,
      limit: 1,
      attributes: ['text'],
    });
    sendText(res, item ? `"${item.text}"` : 'No quotes yet. Use !quote your funny line to add one.');
  } catch (err) {
    logger.error('Webhook quote/random error', { error: err.message });
    sendText(res, 'Could not get quote. Try again.');
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

/** GET /api/webhooks/idea/latest — latest idea for overlays / chat suggestion widgets */
router.get('/idea/latest', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use idea overlays.');
      return;
    }
    const item = await StreamItem.findOne({
      where: { userId: user.id, type: 'idea' },
      order: [['createdAt', 'DESC']],
      attributes: ['text', 'createdAt'],
    });
    sendText(res, item ? item.text : '');
  } catch (err) {
    logger.error('Webhook idea/latest error', { error: err.message });
    sendText(res, '');
  }
});

/** GET /api/webhooks/clipidea/random — random clip idea for !randomclipidea */
router.get('/clipidea/random', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use !randomclipidea.');
      return;
    }
    const item = await StreamItem.findOne({
      where: { userId: user.id, type: 'clipidea' },
      order: [sequelize.literal('RANDOM()')],
      attributes: ['text'],
    });
    sendText(res, item ? item.text : 'No clip ideas yet. Use !clipidea your moment to add one.');
  } catch (err) {
    logger.error('Webhook clipidea/random error', { error: err.message });
    sendText(res, 'Could not get clip idea.');
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
      '!nextgame — next planned game/title',
      '!when <game> — next stream for a specific game',
      '!calendar — public schedule page link',
      '!goal — follower/sub goal',
      '!streamcount — number of streams this month',
      '!laststream — last scheduled stream',
      '!streak — streaming streak in days',
      '!myschedule — public schedule link',
      '!streamstats — stream statistics',
      '!quote random — random quote',
      '!quote add <text> — add quote (GET quote/add?quote=text&key=KEY)',
      '!randomidea — random stream idea',
      '!randomclipidea — random clip idea',
      '!contentwheel — random content idea',
      '!idea <text> — save idea (GET idea/add?text=...&key=KEY)',
      '!note <text> — save note (GET note/add?text=...&key=KEY)',
      '!clipidea <text> — save clip idea (GET clipidea/add?text=...&key=KEY)',
      '!voteidea <idea> — vote for idea (GET voteidea?text=...&key=KEY)',
      '!remindme — request reminder (GET remindme?viewer=username&key=KEY)',
      '!challenge <text> — add challenge (GET challenge?text=...&key=KEY)',
      '!suggest your idea — viewers send ideas (see docs for setup)',
    ];
    sendText(res, lines.join('\n'));
  } catch (err) {
    logger.error('Webhook commands error', { error: err.message });
    sendText(res, 'Could not load commands.');
  }
});

/** GET /api/webhooks/nextgame — "Next planned game: Elden Ring — Friday 20:00" */
router.get('/nextgame', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !nextgame.');
      return;
    }
    const events = await getUpcomingEvents(user.id, 1);
    if (events.length === 0) {
      sendText(res, 'No game planned yet.');
      return;
    }
    const { scheduledFor, title } = events[0];
    const formatted = formatEventForChat(scheduledFor, title);
    sendText(res, `Next planned game: ${formatted}`);
  } catch (err) {
    logger.error('Webhook nextgame error', { error: err.message });
    sendText(res, 'Could not load next game.');
  }
});

/** GET /api/webhooks/when — "!when valorant" → "Next Valorant stream: Thursday 19:00" */
router.get('/when', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !when.');
      return;
    }
    const raw = (req.query.game || req.query.q || req.query.text || '').toString().trim();
    if (!raw) {
      sendText(res, 'Usage: !when <game>. Example: !when valorant');
      return;
    }
    const term = raw.slice(0, 80);
    const now = new Date();
    const event = await Content.findOne({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
        title: { [Op.iLike]: `%${term}%` },
      },
      order: [['scheduledFor', 'ASC']],
      attributes: ['title', 'scheduledFor'],
    });
    if (!event) {
      sendText(res, `No upcoming stream found for "${term}".`);
      return;
    }
    const formatted = formatEventForChat(event.scheduledFor, event.title);
    sendText(res, `Next ${term} stream: ${formatted}`);
  } catch (err) {
    logger.error('Webhook when error', { error: err.message });
    sendText(res, 'Could not find stream for that game.');
  }
});

/** GET /api/webhooks/calendar — alias for myschedule, different wording for !calendar */
router.get('/calendar', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !calendar.');
      return;
    }
    const base = FRONTEND_URL.replace(/\/$/, '');
    sendText(res, `Full stream schedule: ${base}/streamer/${encodeURIComponent(user.username)}`);
  } catch (err) {
    logger.error('Webhook calendar error', { error: err.message });
    sendText(res, 'Error.');
  }
});

/** GET /api/webhooks/streamcount — "Streams this month: 14" */
router.get('/streamcount', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !streamcount.');
      return;
    }
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const count = await Content.count({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: firstOfMonth, [Op.lte]: now },
        deletedAt: null,
      },
    });
    sendText(res, `Streams this month: ${count}.`);
  } catch (err) {
    logger.error('Webhook streamcount error', { error: err.message });
    sendText(res, 'Could not load stream count.');
  }
});

/** GET /api/webhooks/laststream — info about the last scheduled/past stream */
router.get('/laststream', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !laststream.');
      return;
    }
    const now = new Date();
    const event = await Content.findOne({
      where: {
        userId: user.id,
        scheduledFor: { [Op.lte]: now },
        deletedAt: null,
      },
      order: [['scheduledFor', 'DESC']],
      attributes: ['title', 'scheduledFor'],
    });
    if (!event) {
      sendText(res, 'No past streams found.');
      return;
    }
    const d = new Date(event.scheduledFor);
    const day = d.toLocaleDateString(undefined, { weekday: 'long' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    sendText(res, `Last stream: ${day} — ${time} — ${event.title}`);
  } catch (err) {
    logger.error('Webhook laststream error', { error: err.message });
    sendText(res, 'Could not load last stream.');
  }
});

/** GET /api/webhooks/streak — "Streaming streak: 5 days in a row" (based on scheduled/past content) */
router.get('/streak', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !streak.');
      return;
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // ~60 days back
    const items = await Content.findAll({
      where: {
        userId: user.id,
        scheduledFor: { [Op.lte]: now, [Op.gte]: thirtyDaysAgo },
        deletedAt: null,
      },
      order: [['scheduledFor', 'DESC']],
      attributes: ['scheduledFor'],
    });
    if (items.length === 0) {
      sendText(res, 'Streaming streak: 0 days in a row.');
      return;
    }
    const daysWithStreams = new Set(
      items.map((c) => {
        const d = new Date(c.scheduledFor);
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
      })
    );
    let streak = 0;
    let cursor = new Date(now);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (!daysWithStreams.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    sendText(res, `Streaming streak: ${streak} day${streak === 1 ? '' : 's'} in a row.`);
  } catch (err) {
    logger.error('Webhook streak error', { error: err.message });
    sendText(res, 'Could not load streak.');
  }
});

/** GET /api/webhooks/contentwheel — random built-in content idea for !contentwheel */
router.get('/contentwheel', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !contentwheel.');
      return;
    }
    const ideas = [
      'Play with inverted controls for one match.',
      'Let chat pick your next game.',
      'Do a \"no HUD\" challenge.',
      'React to your oldest clips.',
      'Try a speedrun of a game you have never speedrun before.',
      'Do a \"one life\" run: if you die, stream switches game.',
      'Play a viewer-recommended indie game.',
      'Do a Just Chatting Q&A about how you started streaming.',
      'Let a random wheel choose your next category.',
      'Play using only voice commands for 5 minutes.',
    ];
    const pick = ideas[Math.floor(Math.random() * ideas.length)];
    sendText(res, `Random stream idea: ${pick}`);
  } catch (err) {
    logger.error('Webhook contentwheel error', { error: err.message });
    sendText(res, 'Could not generate idea.');
  }
});

/**
 * GET/POST /api/webhooks/voteidea — register a vote for an idea (!voteidea horror challenge)
 * GET: ?text=...&key=KEY for Nightbot. POST: body { text }.
 */
async function voteideaHandler(req, res) {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(401).send('Invalid or missing API key.');
    }
    const text = (req.body?.text ?? req.query?.text ?? '').toString().trim();
    if (!text) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('Missing text. Use ?text=your idea&key=KEY');
    }
    const truncated = text.length > 200 ? text.slice(0, 197) + '…' : text;
    await StreamItem.create({ userId: user.id, type: 'idea', text: truncated });
    logger.info('Webhook voteidea', { userId: user.id, username: user.username });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(201).send(`Vote added for: ${truncated}`);
  } catch (err) {
    logger.error('Webhook voteidea error', { error: err.message });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Could not register vote.');
  }
}
router.get('/voteidea', voteideaHandler);
router.post('/voteidea', voteideaHandler);

/** GET /api/webhooks/voteidea/top — "Top chat idea this week: X (12 votes)" */
router.get('/voteidea/top', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key to use !voteidea.');
      return;
    }
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await StreamItem.findAll({
      where: {
        userId: user.id,
        type: 'idea',
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      attributes: [
        'text',
        [sequelize.fn('COUNT', sequelize.col('id')), 'votes'],
      ],
      group: ['text'],
      order: [[sequelize.literal('votes'), 'DESC']],
      limit: 1,
    });
    if (!rows.length) {
      sendText(res, 'No ideas voted this week yet. Use !voteidea your idea to start voting.');
      return;
    }
    const top = rows[0];
    const ideaText = top.get('text');
    const votes = top.get('votes');
    sendText(res, `Top chat idea this week: ${ideaText} (${votes} votes)`);
  } catch (err) {
    logger.error('Webhook voteidea/top error', { error: err.message });
    sendText(res, 'Could not load top idea.');
  }
});

/**
 * GET/POST /api/webhooks/remindme — viewer asks for reminder (!remindme)
 * GET: ?viewer=username&key=KEY or ?username=... for Nightbot.
 */
async function remindmeHandler(req, res) {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(401).send('Invalid or missing API key.');
    }
    const viewer =
      (req.body?.viewer ?? req.query?.viewer ?? req.body?.username ?? req.query?.username ?? '').toString().trim();
    const note = viewer || 'anonymous-viewer';
    await StreamItem.create({ userId: user.id, type: 'note', text: `[remindme] ${note}` });
    logger.info('Webhook remindme', { userId: user.id, viewer: note });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(201).send("You'll get a reminder before the next stream.");
  } catch (err) {
    logger.error('Webhook remindme error', { error: err.message });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Could not register reminder.');
  }
}
router.get('/remindme', remindmeHandler);
router.post('/remindme', remindmeHandler);

/**
 * GET/POST /api/webhooks/challenge — save a challenge (!challenge no map)
 * GET: ?text=...&key=KEY for Nightbot.
 */
async function challengeHandler(req, res) {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(401).send('Invalid or missing API key.');
    }
    const text = (req.body?.text ?? req.query?.text ?? '').toString().trim();
    if (!text) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('Missing text. Use ?text=your challenge&key=KEY');
    }
    const truncated = text.length > 500 ? text.slice(0, 497) + '…' : text;
    await StreamItem.create({ userId: user.id, type: 'note', text: `[challenge] ${truncated}` });
    logger.info('Webhook challenge', { userId: user.id });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(201).send(`Challenge added: ${truncated}`);
  } catch (err) {
    logger.error('Webhook challenge error', { error: err.message });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Could not save challenge.');
  }
}
router.get('/challenge', challengeHandler);
router.post('/challenge', challengeHandler);

/** GET /api/webhooks/nextcollab — "Next collaboration stream: Saturday with StreamerX" */
router.get('/nextcollab', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !nextcollab.');
      return;
    }
    const now = new Date();
    const event = await Content.findOne({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
        title: {
          [Op.iLike]: '%with %',
        },
      },
      order: [['scheduledFor', 'ASC']],
      attributes: ['title', 'scheduledFor'],
    });
    if (!event) {
      sendText(res, 'No collaboration stream scheduled.');
      return;
    }
    const formatted = formatEventForChat(event.scheduledFor, event.title);
    sendText(res, `Next collaboration stream: ${formatted}`);
  } catch (err) {
    logger.error('Webhook nextcollab error', { error: err.message });
    sendText(res, 'Could not load collaboration stream.');
  }
});

/** GET /api/webhooks/raidnext — reuses nextcollab as a simple recommended raid target */
router.get('/raidnext', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !raidnext.');
      return;
    }
    const now = new Date();
    const event = await Content.findOne({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: now },
        status: { [Op.in]: UPCOMING_STATUSES },
        deletedAt: null,
        title: {
          [Op.iLike]: '%with %',
        },
      },
      order: [['scheduledFor', 'ASC']],
      attributes: ['title', 'scheduledFor'],
    });
    if (!event) {
      sendText(res, 'No collaboration streams found to suggest as raid target.');
      return;
    }
    const formatted = formatEventForChat(event.scheduledFor, event.title);
    sendText(res, `Recommended raid target (next collab): ${formatted}`);
  } catch (err) {
    logger.error('Webhook raidnext error', { error: err.message });
    sendText(res, 'Could not load raid suggestion.');
  }
});

/** GET /api/webhooks/uptimeweek — "Total stream time this week: 12h 30m" (approx, based on schedule) */
router.get('/uptimeweek', async (req, res) => {
  try {
    const user = await getUserByApiKey(req);
    if (!user) {
      sendText(res, 'Add your API key in Settings → Bots to use !uptimeweek.');
      return;
    }
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 Sunday ... 6 Saturday
    const diffToMonday = (day + 6) % 7; // days since Monday
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const events = await Content.findAll({
      where: {
        userId: user.id,
        scheduledFor: { [Op.gte]: startOfWeek, [Op.lte]: now },
        deletedAt: null,
      },
      attributes: ['scheduledFor', 'eventEndTime'],
    });

    let totalMs = 0;
    for (const e of events) {
      const start = new Date(e.scheduledFor);
      const end = e.eventEndTime ? new Date(e.eventEndTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2h
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        totalMs += end - start;
      }
    }

    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    sendText(
      res,
      `Total stream time this week: ${totalHours}h ${totalMinutes}m (based on schedule).`
    );
  } catch (err) {
    logger.error('Webhook uptimeweek error', { error: err.message });
    sendText(res, 'Could not load uptime for this week.');
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
          const { TwitchService } = await import('../modules/integrations/application/twitchService.js');
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

/**
 * POST /api/webhooks/roulette/join — add viewer to wheel (bot: when user types !join)
 * Body: { user: "twitch_username" } or query: user=...
 */
router.post('/roulette/join', async (req, res) => {
  try {
    const streamer = await getUserByApiKey(req);
    if (!streamer) {
      return res.status(401).json({ error: 'Invalid or missing API key.' });
    }
    const username = (req.body?.user ?? req.body?.username ?? req.query?.user ?? req.query?.username ?? '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Missing user. Send { "user": "twitch_username" }.' });
    }
    const { added, players } = rouletteService.join(streamer.id, username);
    emitRouletteToUser(streamer.id, 'roulette_players', { players });
    res.json({ ok: true, added, players });
  } catch (err) {
    logger.error('Webhook roulette join error', { error: err.message });
    res.status(500).json({ error: 'Could not add to roulette.' });
  }
});

/**
 * POST /api/webhooks/roulette/leave — remove viewer from wheel (bot: !leave)
 * Body: { user: "twitch_username" }
 */
router.post('/roulette/leave', async (req, res) => {
  try {
    const streamer = await getUserByApiKey(req);
    if (!streamer) {
      return res.status(401).json({ error: 'Invalid or missing API key.' });
    }
    const username = (req.body?.user ?? req.body?.username ?? req.query?.user ?? '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Missing user. Send { "user": "twitch_username" }.' });
    }
    const { removed, players } = rouletteService.leave(streamer.id, username);
    emitRouletteToUser(streamer.id, 'roulette_players', { players });
    res.json({ ok: true, removed, players });
  } catch (err) {
    logger.error('Webhook roulette leave error', { error: err.message });
    res.status(500).json({ error: 'Could not remove from roulette.' });
  }
});

export default router;
