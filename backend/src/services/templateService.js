/**
 * Template Service
 * Manages content templates
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import ContentTemplate from '../models/ContentTemplate.js';
import { contentService } from './contentService.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

export class TemplateService {
  /**
   * Create template
   */
  async createTemplate(userId, templateData) {
    const template = await ContentTemplate.create({
      ...templateData,
      userId,
    });
    
    logger.info('Template created', {
      userId,
      templateId: template.id,
    });
    
    return template;
  }

  /**
   * Get user templates
   */
  async getUserTemplates(userId, includePublic = false) {
    const where = includePublic
      ? {
          [Op.or]: [
            { userId },
            { isPublic: true },
          ],
        }
      : { userId };
    
    return await ContentTemplate.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, userId) {
    const template = await ContentTemplate.findOne({
      where: {
        id: templateId,
        [Op.or]: [
          { userId },
          { isPublic: true },
        ],
      },
    });
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, userId, updateData) {
    const template = await this.getTemplateById(templateId, userId);
    
    // Only owner can update
    if (template.userId !== userId) {
      throw new Error('Not authorized to update this template');
    }
    
    await template.update(updateData);
    
    logger.info('Template updated', {
      userId,
      templateId,
    });
    
    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    const template = await this.getTemplateById(templateId, userId);
    
    // Only owner can delete
    if (template.userId !== userId) {
      throw new Error('Not authorized to delete this template');
    }
    
    await template.destroy();
    
    logger.info('Template deleted', {
      userId,
      templateId,
    });
    
    return { message: 'Template deleted successfully' };
  }

  /**
   * Render template with variables
   */
  renderTemplate(template, variables = {}) {
    let title = template.title || '';
    let content = template.content || '';
    
    // Replace variables
    const varMap = {
      date: variables.date || new Date().toLocaleDateString(),
      time: variables.time || new Date().toLocaleTimeString(),
      datetime: variables.datetime || new Date().toLocaleString(),
      username: variables.username || '',
      ...variables,
    };
    
    for (const [key, value] of Object.entries(varMap)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      title = title.replace(regex, value);
      content = content.replace(regex, value);
    }
    
    return {
      title,
      content,
      contentType: template.contentType,
      platforms: template.platforms,
      hashtags: template.hashtags,
      mentions: template.mentions,
    };
  }

  /**
   * Create content from template
   */
  async createContentFromTemplate(templateId, userId, scheduledFor, variables = {}) {
    const template = await this.getTemplateById(templateId, userId);
    const rendered = this.renderTemplate(template, variables);
    
    // Create content using content service
    const content = await contentService.createContent(userId, {
      ...rendered,
      scheduledFor,
    });
    
    logger.info('Content created from template', {
      userId,
      templateId,
      contentId: content[0]?.id,
    });
    
    return content;
  }
}

export const templateService = new TemplateService();
