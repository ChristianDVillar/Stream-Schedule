/**
 * Content Service - Business logic for content management
 */

import { Content } from '../infrastructure/models.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../../../constants/contentStatus.js';
import logger from '../../../utils/logger.js';
import { parsePagination, formatPaginatedResponse } from '../../../utils/pagination.js';
import { enqueueDiscordSync } from '../../../services/discordQueueService.js';
import { enqueueAkoeNetStreamScheduled } from '../../../services/akoeNetWebhookService.js';

function isDiscordEventContent(content) {
  const platforms = Array.isArray(content.platforms) ? content.platforms : [];
  const hasDiscord = platforms.some((p) => (p || '').trim().toLowerCase() === 'discord');
  const isEvent = (content.contentType || '').trim().toLowerCase() === 'event';
  return hasDiscord && (isEvent || !!content.discordGuildId);
}

export class ContentService {
  async createContent(userId, contentData) {
    const scheduledFor = new Date(contentData.scheduledFor);
    const eventEndTime = contentData.eventEndTime ? new Date(contentData.eventEndTime) : null;
    const occurrences = this.buildOccurrences(scheduledFor, contentData.recurrence);

    const { mediaUrls, mediaItems, eventDates, eventLocationUrl, ...restData } = contentData;
    let filesData = null;
    if (mediaItems && mediaItems.length > 0) {
      filesData = { items: mediaItems };
    } else if (mediaUrls && mediaUrls.length > 0) {
      filesData = { items: mediaUrls.map((url) => ({ url })) };
    }

    const created = await Promise.all(
      occurrences.map((date) => {
        let occurrenceEventEndTime = null;
        if (eventEndTime) {
          const timeDiff = eventEndTime.getTime() - scheduledFor.getTime();
          occurrenceEventEndTime = new Date(date.getTime() + timeDiff);
        }

        return Content.create({
          ...restData,
          scheduledFor: date,
          eventEndTime: occurrenceEventEndTime,
          eventDates: eventDates || null,
          eventLocationUrl: eventLocationUrl || null,
          userId,
          files: filesData,
        });
      })
    );

    logger.info('Content created via service', {
      userId,
      contentCount: created.length,
      contentType: contentData.contentType,
    });

    for (const c of created) {
      if (isDiscordEventContent(c)) {
        enqueueDiscordSync(c.id).catch((err) =>
          logger.warn('Enqueue Discord sync after create failed', { contentId: c.id, error: err.message })
        );
      }
      enqueueAkoeNetStreamScheduled(userId, c);
    }

    return created;
  }

  async getUserContent(userId, options = {}) {
    const { page, limit, offset } = parsePagination(options.query || {});
    const where = { userId, deletedAt: null };

    if (options.status) where.status = options.status;
    if (options.platform) where.platforms = { [Op.contains]: [options.platform] };

    if (options.dateFrom || options.dateTo) {
      where.scheduledFor = {};
      if (options.dateFrom) where.scheduledFor[Op.gte] = new Date(options.dateFrom);
      if (options.dateTo) where.scheduledFor[Op.lte] = new Date(options.dateTo);
    }

    if (options.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${options.search}%` } },
        { content: { [Op.iLike]: `%${options.search}%` } },
      ];
    }

    const findOptions = {
      where,
      limit,
      offset,
      order: [[options.orderBy || 'scheduledFor', options.order || 'DESC']],
    };

    try {
      const { count, rows } = await Content.findAndCountAll(findOptions);
      return formatPaginatedResponse(rows, count, page, limit);
    } catch (err) {
      const msg = (err && err.message) || '';
      if (/deletedAt.*does not exist|column.*deletedAt/i.test(msg)) {
        logger.warn('Content list: deletedAt column missing, listing without soft-delete filter. Run: npm run migrate', { userId });
        delete where.deletedAt;
        const { count, rows } = await Content.findAndCountAll({
          ...findOptions,
          where,
          attributes: { exclude: ['deletedAt'] },
        });
        return formatPaginatedResponse(rows, count, page, limit);
      }
      throw err;
    }
  }

  async getContentById(contentId, userId) {
    const content = await Content.findOne({
      where: { id: contentId, userId, deletedAt: null },
    });
    if (!content) throw new Error('Content not found');
    return content;
  }

  async updateContent(contentId, userId, updateData) {
    const content = await this.getContentById(contentId, userId);
    const { mediaUrls, mediaItems, ...restData } = updateData;
    let filesData = content.files;

    if (mediaItems !== undefined) {
      filesData = mediaItems.length > 0 ? { items: mediaItems } : null;
    } else if (mediaUrls !== undefined) {
      filesData = mediaUrls.length > 0 ? { items: mediaUrls.map((url) => ({ url })) } : null;
    }

    if (filesData !== undefined) restData.files = filesData;

    if (isDiscordEventContent({ ...content.toJSON(), ...restData })) {
      restData.localVersion = (content.localVersion ?? 1) + 1;
    }

    await content.update(restData);

    logger.info('Content updated via service', { userId, contentId });

    if (isDiscordEventContent(content)) {
      enqueueDiscordSync(content.id).catch((err) =>
        logger.warn('Enqueue Discord sync after update failed', { contentId, error: err.message })
      );
    }
    enqueueAkoeNetStreamScheduled(userId, content);

    return content;
  }

  async deleteContent(contentId, userId) {
    const content = await this.getContentById(contentId, userId);
    if (content.discordEventId && content.discordGuildId) {
      await content.update({ deletedAt: new Date() });
      enqueueDiscordSync(contentId).catch((err) =>
        logger.warn('Enqueue Discord sync after delete failed', { contentId, error: err.message })
      );
      logger.info('Content soft-deleted (Discord sync enqueued)', { userId, contentId });
    } else {
      await content.destroy();
      logger.info('Content deleted via service', { userId, contentId });
    }
    return { message: 'Content deleted successfully' };
  }

  buildOccurrences(baseDate, recurrence) {
    if (!recurrence || !recurrence.enabled) return [baseDate];

    const occurrences = [];
    const count = Math.max(1, Math.min(Number(recurrence.count || 1), 50));
    const frequency = recurrence.frequency || 'weekly';

    for (let i = 0; i < count; i += 1) {
      const date = new Date(baseDate);
      if (frequency === 'daily') date.setDate(date.getDate() + i);
      else if (frequency === 'weekly') date.setDate(date.getDate() + i * 7);
      else if (frequency === 'monthly') date.setMonth(date.getMonth() + i);
      else date.setDate(date.getDate() + i);
      occurrences.push(date);
    }
    return occurrences;
  }

  async getDueContent() {
    const now = new Date();
    return Content.findAll({
      where: {
        deletedAt: null,
        [Op.or]: [
          {
            status: CONTENT_STATUS.SCHEDULED,
            scheduledFor: { [Op.lte]: now },
          },
          { status: CONTENT_STATUS.QUEUED },
          {
            status: CONTENT_STATUS.RETRYING,
            lastRetryAt: {
              [Op.or]: [null, { [Op.lt]: new Date(now.getTime() - 5 * 60 * 1000) }],
            },
          },
        ],
      },
      order: [['scheduledFor', 'ASC']],
      limit: 100,
    });
  }
}

export const contentService = new ContentService();

