/**
 * Nightbot (and similar chat bots) integration.
 * Custom commands can call these endpoints to create todos from chat.
 * Auth via query param `key` (user's nightbotApiKey).
 */

import express from 'express';
import { User } from '../modules/users/infrastructure/models.js';
import { Todo } from '../modules/content/infrastructure/models.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/nightbot/todo
 * Nightbot Custom Command → Message: $(urlfetch https://YOUR_API/api/nightbot/todo?key=YOUR_KEY&text=$(query)&user=$(user)&channel=$(channel))
 * Creates a todo for the user that owns the key. Responds with a short message for chat.
 */
router.get('/todo', async (req, res) => {
  try {
    const key = (req.query.key || req.query.apiKey || '').trim();
    const text = (req.query.text || req.query.query || '').trim();
    const fromUser = (req.query.user || req.query.from || '').trim();
    const channel = (req.query.channel || '').trim();

    if (!key) {
      res.set('Content-Type', 'text/plain');
      return res.status(400).send('Missing key. Add your key from Streamer Scheduler → Settings → Bots.');
    }
    if (!text) {
      res.set('Content-Type', 'text/plain');
      return res.status(400).send('Usage: !todo your task here');
    }

    const user = await User.findOne({ where: { nightbotApiKey: key }, attributes: ['id'] });
    if (!user) {
      res.set('Content-Type', 'text/plain');
      return res.status(401).send('Invalid key. Regenerate it in Settings → Bots.');
    }

    const title = text.length > 500 ? text.slice(0, 497) + '…' : text;
    await Todo.create({
      userId: user.id,
      title,
      order: 0,
    });

    logger.info('Nightbot todo created', { userId: user.id, fromUser, channel, titleLength: title.length });

    res.set('Content-Type', 'text/plain');
    res.send(`Todo added: ${title.slice(0, 80)}${title.length > 80 ? '…' : ''}`);
  } catch (err) {
    logger.error('Nightbot todo error', { error: err.message });
    res.set('Content-Type', 'text/plain');
    res.status(500).send('Could not add todo. Try again later.');
  }
});

export default router;
