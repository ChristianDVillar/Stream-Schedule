import express from 'express';
import { Content } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
import { validateBody } from '../middleware/validate.js';
import { contentSchema, updateContentSchema } from '../validators/contentSchemas.js';
import { contentService } from '../services/contentService.js';
import { contentCreationLimiter } from '../middleware/rateLimit.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(checkLicense);

// Create content
// ⏱️ IMPORTANT: Always store dates in UTC in database
// Frontend sends dates as ISO strings (UTC), Sequelize stores them correctly
// Frontend will convert to user's local timezone for display
router.post('/', contentCreationLimiter, validateBody(contentSchema), auditLog('content_created', 'Content'), async (req, res) => {
  try {
    const created = await contentService.createContent(req.user.id, req.body);
    res.status(201).json(created);
  } catch (err) {
    logger.error('Error creating content', {
      error: err.message,
      userId: req.user.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// List all content for user (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const result = await contentService.getUserContent(req.user.id, {
      query: req.query,
      status: req.query.status,
      platform: req.query.platform,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      orderBy: req.query.orderBy,
      order: req.query.order,
    });
    res.json(result);
  } catch (err) {
    logger.error('Error listing content', {
      error: err.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to fetch content', details: err.message });
  }
});

// Get content by id
router.get('/:id', async (req, res) => {
  try {
    const content = await contentService.getContentById(req.params.id, req.user.id);
    res.json(content);
  } catch (err) {
    if (err.message === 'Content not found') {
      return res.status(404).json({ error: 'Not found' });
    }
    logger.error('Error getting content', {
      error: err.message,
      userId: req.user.id,
      contentId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to fetch content', details: err.message });
  }
});

// Update content
router.put('/:id', validateBody(updateContentSchema), auditLog('content_updated', 'Content'), async (req, res) => {
  try {
    const content = await contentService.updateContent(req.params.id, req.user.id, req.body);
    res.json(content);
  } catch (err) {
    if (err.message === 'Content not found') {
      return res.status(404).json({ error: 'Not found' });
    }
    logger.error('Error updating content', {
      error: err.message,
      userId: req.user.id,
      contentId: req.params.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// Delete content
router.delete('/:id', auditLog('content_deleted', 'Content'), async (req, res) => {
  try {
    const result = await contentService.deleteContent(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.message === 'Content not found') {
      return res.status(404).json({ error: 'Not found' });
    }
    logger.error('Error deleting content', {
      error: err.message,
      userId: req.user.id,
      contentId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to delete content', details: err.message });
  }
});

// Export content
router.get('/export', async (req, res) => {
  try {
    const contents = await Content.findAll({ 
      where: { userId: req.user.id },
      order: [['scheduledFor', 'DESC']]
    });
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: req.user.id,
      totalItems: contents.length,
      contents: contents.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content,
        contentType: c.contentType,
        scheduledFor: c.scheduledFor,
        status: c.status,
        platforms: c.platforms,
        hashtags: c.hashtags,
        mentions: c.mentions,
        timezone: c.timezone,
        recurrence: c.recurrence,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="content-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
});

export default router; 