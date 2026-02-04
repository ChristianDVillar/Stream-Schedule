/**
 * Content Service - Business logic for content management
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Content } from '../models/index.js';
import { Op } from 'sequelize';
import { CONTENT_STATUS } from '../constants/contentStatus.js';
import logger from '../utils/logger.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';

export class ContentService {
  /**
   * Create content with recurrence support
   */
  async createContent(userId, contentData) {
    const scheduledFor = new Date(contentData.scheduledFor);
    const occurrences = this.buildOccurrences(scheduledFor, contentData.recurrence);
    
    const { mediaUrls, mediaItems, ...restData } = contentData;
    let filesData = null;
    if (mediaItems && mediaItems.length > 0) {
      filesData = { items: mediaItems };
    } else if (mediaUrls && mediaUrls.length > 0) {
      filesData = { items: mediaUrls.map((url) => ({ url })) };
    }
    
    const created = await Promise.all(
      occurrences.map(date => Content.create({
        ...restData,
        scheduledFor: date,
        userId,
        files: filesData,
      }))
    );
    
    logger.info('Content created via service', {
      userId,
      contentCount: created.length,
      contentType: contentData.contentType,
    });
    
    return created;
  }

  /**
   * Get paginated content for user
   */
  async getUserContent(userId, options = {}) {
    const { page, limit, offset } = parsePagination(options.query || {});
    
    const where = { userId };
    
    // Apply filters
    if (options.status) {
      where.status = options.status;
    }
    
    if (options.platform) {
      where.platforms = { [Op.contains]: [options.platform] };
    }
    
    if (options.dateFrom || options.dateTo) {
      where.scheduledFor = {};
      if (options.dateFrom) {
        where.scheduledFor[Op.gte] = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        where.scheduledFor[Op.lte] = new Date(options.dateTo);
      }
    }
    
    // Search query (full-text search)
    if (options.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${options.search}%` } },
        { content: { [Op.iLike]: `%${options.search}%` } },
      ];
    }
    
    const { count, rows } = await Content.findAndCountAll({
      where,
      limit,
      offset,
      order: [[options.orderBy || 'scheduledFor', options.order || 'DESC']],
    });
    
    return formatPaginatedResponse(rows, count, page, limit);
  }

  /**
   * Get single content by ID
   */
  async getContentById(contentId, userId) {
    const content = await Content.findOne({
      where: { id: contentId, userId },
    });
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    return content;
  }

  /**
   * Update content
   */
  async updateContent(contentId, userId, updateData) {
    const content = await this.getContentById(contentId, userId);
    
    const { mediaUrls, mediaItems, ...restData } = updateData;
    let filesData = content.files;
    
    if (mediaItems !== undefined) {
      filesData = mediaItems.length > 0 ? { items: mediaItems } : null;
    } else if (mediaUrls !== undefined) {
      filesData = mediaUrls.length > 0 ? { items: mediaUrls.map((url) => ({ url })) } : null;
    }
    
    if (filesData !== undefined) {
      restData.files = filesData;
    }
    
    await content.update(restData);
    
    logger.info('Content updated via service', {
      userId,
      contentId,
    });
    
    return content;
  }

  /**
   * Delete content
   */
  async deleteContent(contentId, userId) {
    const content = await this.getContentById(contentId, userId);
    await content.destroy();
    
    logger.info('Content deleted via service', {
      userId,
      contentId,
    });
    
    return { message: 'Content deleted successfully' };
  }

  /**
   * Build recurrence occurrences
   */
  buildOccurrences(baseDate, recurrence) {
    if (!recurrence || !recurrence.enabled) {
      return [baseDate];
    }

    const occurrences = [];
    const count = Math.max(1, Math.min(Number(recurrence.count || 1), 50));
    const frequency = recurrence.frequency || 'weekly';

    for (let i = 0; i < count; i += 1) {
      const date = new Date(baseDate);
      if (frequency === 'daily') {
        date.setDate(date.getDate() + i);
      } else if (frequency === 'weekly') {
        date.setDate(date.getDate() + i * 7);
      } else if (frequency === 'monthly') {
        date.setMonth(date.getMonth() + i);
      } else {
        date.setDate(date.getDate() + i);
      }
      occurrences.push(date);
    }

    return occurrences;
  }

  /**
   * Get content due for publishing
   */
  async getDueContent() {
    const now = new Date();
    return await Content.findAll({
      where: {
        status: CONTENT_STATUS.SCHEDULED,
        scheduledFor: { [Op.lte]: now },
      },
      order: [['scheduledFor', 'ASC']],
    });
  }
}

export const contentService = new ContentService();
