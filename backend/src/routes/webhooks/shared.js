/**
 * Shared helpers and deps for webhooks (bots API).
 * Used by webhooks/index.js to keep routes clean.
 */

import { User, Todo, Content, StreamItem, StreamTimelineEvent, Integration, sequelize } from '../../models/index.js';
import { contentService } from '../../services/contentService.js';
import { CONTENT_STATUS } from '../../constants/contentStatus.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

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

export {
  User,
  Todo,
  Content,
  StreamItem,
  StreamTimelineEvent,
  Integration,
  sequelize,
  contentService,
  CONTENT_STATUS,
  Op,
  logger,
  FRONTEND_URL,
  UPCOMING_STATUSES,
  getUpcomingEvents,
  formatEventForChat,
  formatCountdown,
  sendText,
  getApiKey,
  getUserByApiKey,
};
