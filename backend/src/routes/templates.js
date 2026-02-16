/**
 * Content Templates Routes
 * Manage reusable content templates
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { templateService } from '../services/templateService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import platformConfigService from '../services/platformConfigService.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Template schemas
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  title: Joi.string().max(500).allow('', null).optional(),
  content: Joi.string().min(1).max(10000).required(),
  contentType: Joi.string().valid('post', 'stream', 'event', 'reel').required(),
  platforms: Joi.array().items(Joi.string().valid('twitch', 'twitter', 'instagram', 'discord', 'youtube')).min(1).required(),
  hashtags: Joi.string().max(500).allow('', null).optional(),
  mentions: Joi.string().max(500).allow('', null).optional(),
  variables: Joi.object().optional(),
  isPublic: Joi.boolean().optional().default(false),
});

const updateTemplateSchema = templateSchema.fork(['name', 'content', 'contentType', 'platforms'], (schema) => schema.optional());

// Create template
router.post('/', requireAuth, validateBody(templateSchema), auditLog('template_created', 'ContentTemplate'), async (req, res) => {
  try {
    // Validate that all platforms are enabled
    if (Array.isArray(req.body.platforms) && req.body.platforms.length > 0) {
      const enabledPlatforms = await platformConfigService.getEnabledPlatforms();
      const disabledPlatforms = req.body.platforms.filter(p => !enabledPlatforms.includes(p));
      if (disabledPlatforms.length > 0) {
        return res.status(400).json({
          error: `The following platforms are currently disabled: ${disabledPlatforms.join(', ')}. Please contact an administrator.`,
          details: 'platforms',
          disabledPlatforms
        });
      }
    }
    
    const template = await templateService.createTemplate(req.user.id, req.body);
    res.status(201).json(template);
  } catch (err) {
    logger.error('Error creating template', {
      error: err.message,
      userId: req.user.id,
    });
    res.status(400).json({ error: 'Failed to create template', details: err.message });
  }
});

// Get user templates
router.get('/', requireAuth, async (req, res) => {
  try {
    const includePublic = req.query.includePublic === 'true';
    const templates = await templateService.getUserTemplates(req.user.id, includePublic);
    res.json(templates);
  } catch (err) {
    logger.error('Error fetching templates', {
      error: err.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id, req.user.id);
    res.json(template);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Update template
router.put('/:id', requireAuth, validateBody(updateTemplateSchema), auditLog('template_updated', 'ContentTemplate'), async (req, res) => {
  try {
    // Validate that all platforms are enabled (if platforms are being updated)
    if (Array.isArray(req.body.platforms) && req.body.platforms.length > 0) {
      const enabledPlatforms = await platformConfigService.getEnabledPlatforms();
      const disabledPlatforms = req.body.platforms.filter(p => !enabledPlatforms.includes(p));
      if (disabledPlatforms.length > 0) {
        return res.status(400).json({
          error: `The following platforms are currently disabled: ${disabledPlatforms.join(', ')}. Please contact an administrator.`,
          details: 'platforms',
          disabledPlatforms
        });
      }
    }
    
    const template = await templateService.updateTemplate(req.params.id, req.user.id, req.body);
    res.json(template);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(400).json({ error: 'Failed to update template', details: err.message });
  }
});

// Delete template
router.delete('/:id', requireAuth, auditLog('template_deleted', 'ContentTemplate'), async (req, res) => {
  try {
    const result = await templateService.deleteTemplate(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete template', details: err.message });
  }
});

// Create content from template
router.post('/:id/create-content', requireAuth, validateBody(Joi.object({
  scheduledFor: Joi.date().iso().required(),
  variables: Joi.object().optional(),
})), auditLog('content_created_from_template', 'Content'), async (req, res) => {
  try {
    const content = await templateService.createContentFromTemplate(
      req.params.id,
      req.user.id,
      req.body.scheduledFor,
      req.body.variables
    );
    res.status(201).json(content);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    logger.error('Error creating content from template', {
      error: err.message,
      userId: req.user.id,
      templateId: req.params.id,
    });
    res.status(400).json({ error: 'Failed to create content from template', details: err.message });
  }
});

export default router;
