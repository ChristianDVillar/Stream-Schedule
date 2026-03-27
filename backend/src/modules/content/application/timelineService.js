import { Op } from 'sequelize';
import { StreamTimelineEvent } from '../infrastructure/models.js';

export async function getTimelineEvents(userId, hours = 24) {
  const normalizedHours = Math.min(24 * 7, Math.max(1, parseInt(hours, 10) || 24));
  const since = new Date(Date.now() - normalizedHours * 60 * 60 * 1000);
  return StreamTimelineEvent.findAll({
    where: {
      userId,
      createdAt: { [Op.gte]: since },
    },
    order: [['createdAt', 'DESC']],
    limit: 200,
    attributes: ['id', 'type', 'payload', 'createdAt'],
  });
}

