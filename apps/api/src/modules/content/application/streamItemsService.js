import { StreamItem } from '../infrastructure/models.js';
import { sequelize } from '../../users/infrastructure/models.js';

const TYPES = ['idea', 'note', 'quote', 'clipidea'];

export async function getStreamItems(userId, { type = '', sort = 'recent' } = {}) {
  const normalizedType = String(type || '').trim();
  const normalizedSort = String(sort || 'recent').toLowerCase();
  const where = { userId };
  if (normalizedType && TYPES.includes(normalizedType)) where.type = normalizedType;

  if (normalizedType === 'idea' && normalizedSort === 'votes') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await sequelize.query(
      `SELECT MAX("id") AS "id", 'idea' AS "type", "text", MAX("createdAt") AS "createdAt", COUNT(*)::int AS "voteCount"
       FROM "StreamItems"
       WHERE "userId" = :userId AND "type" = 'idea' AND "createdAt" >= :since
       GROUP BY "text"
       ORDER BY "voteCount" DESC, MAX("createdAt") DESC
       LIMIT 200`,
      {
        replacements: { userId, since: sevenDaysAgo },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return (rows || []).map((r) => ({
      id: r.id,
      type: 'idea',
      text: r.text,
      createdAt: r.createdAt,
      voteCount: Number(r.voteCount) || 1,
    }));
  }

  return StreamItem.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 200,
    attributes: ['id', 'type', 'text', 'createdAt'],
  });
}

export async function deleteStreamItemById(userId, itemId) {
  const item = await StreamItem.findOne({
    where: { id: itemId, userId },
  });
  if (!item) return false;
  await item.destroy();
  return true;
}

