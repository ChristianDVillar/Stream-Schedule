/**
 * Notifications Routes
 * Admin announcements to users (broadcast or per-user); users list and mark as read
 */

import express from 'express';
import { Notification, NotificationRead } from '../modules/system/infrastructure/models.js';
import { User } from '../modules/users/infrastructure/models.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const router = express.Router();

const NOTIFICATION_LIST_DEFAULT = 100;
const NOTIFICATION_LIST_MAX = 200;

function parseNotificationListPaging(query) {
  let limit = parseInt(String(query?.limit ?? ''), 10);
  if (Number.isNaN(limit) || limit < 1) limit = NOTIFICATION_LIST_DEFAULT;
  limit = Math.min(NOTIFICATION_LIST_MAX, limit);
  let offset = parseInt(String(query?.offset ?? ''), 10);
  if (Number.isNaN(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

// Create notification (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, content, broadcast, userId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }
    const targetUserId = broadcast ? null : (userId || null);
    const notification = await Notification.create({
      userId: targetUserId,
      title: String(title).trim(),
      content: String(content).trim(),
      createdBy: req.user.id
    });
    const withCreator = await Notification.findByPk(notification.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
    });
    logger.info('Notification created', {
      notificationId: notification.id,
      adminId: req.user.id,
      broadcast: !!broadcast,
      userId: targetUserId
    });
    res.status(201).json({ message: 'Notification sent', data: withCreator });
  } catch (error) {
    logger.error('Error creating notification', { error: error.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// List notifications for current user (broadcast + targeted to this user)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit, offset } = parseNotificationListPaging(req.query);
    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [{ userId: null }, { userId: req.user.id }],
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, as: 'creator', attributes: ['id', 'username'], required: false }],
    });
    const ids = notifications.map((n) => n.id);
    const readRows =
      ids.length === 0
        ? []
        : await NotificationRead.findAll({
            where: { userId: req.user.id, notificationId: { [Op.in]: ids } },
            attributes: ['notificationId'],
          });
    const readSet = new Set(readRows.map((r) => r.notificationId));
    const list = notifications.map((n) => ({
      ...n.toJSON(),
      read: readSet.has(n.id),
    }));
    res.json({ notifications: list, limit, offset });
  } catch (error) {
    logger.error('Error fetching notifications', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Unread count for current user
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const [row] = await sequelize.query(
      `SELECT CAST(COUNT(*) AS INTEGER) AS "count" FROM "Notifications" AS n
       WHERE (n."userId" IS NULL OR n."userId" = :uid)
       AND NOT EXISTS (
         SELECT 1 FROM "NotificationReads" AS r
         WHERE r."notificationId" = n.id AND r."userId" = :uid
       )`,
      { replacements: { uid }, type: QueryTypes.SELECT }
    );
    const unreadCount = Number(row?.count ?? 0) || 0;
    res.json({ unreadCount });
  } catch (error) {
    logger.error('Error fetching unread count', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read (user)
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'User id not found' });
    }
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const canRead = notification.userId === null || notification.userId === userId;
    if (!canRead) {
      return res.status(403).json({ error: 'Not allowed to read this notification' });
    }
    let read = await NotificationRead.findOne({
      where: { notificationId: id, userId }
    });
    if (!read) {
      read = await NotificationRead.create({
        notificationId: id,
        userId,
        readAt: new Date()
      });
    }
    res.json({ message: 'Marked as read', data: read });
  } catch (error) {
    logger.error('Error marking notification read', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
