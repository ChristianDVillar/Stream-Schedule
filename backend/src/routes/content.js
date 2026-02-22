import express from 'express';
import { Content, User } from '../models/index.js';
import { Op } from 'sequelize';
import checkLicense from '../middleware/checkLicense.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { contentSchema, updateContentSchema } from '../validators/contentSchemas.js';
import { TWITTER_MAX_CHARS } from '../constants/platforms.js';
import { contentService } from '../services/contentService.js';
import { contentCreationLimiter } from '../middleware/rateLimit.js';
import { auditLog } from '../middleware/audit.js';
import { postTweet } from '../utils/twitterPublish.js';
import platformConfigService from '../services/platformConfigService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Create content (requires valid license)
// Frontend sends dates as ISO strings (UTC), Sequelize stores them correctly
router.post('/', requireAuth, checkLicense, contentCreationLimiter, validateBody(contentSchema), auditLog('content_created', 'Content'), async (req, res) => {
  try {
    const platforms = req.body?.platforms;
    const content = req.body?.content;
    
    // Validate that all platforms are enabled
    if (Array.isArray(platforms) && platforms.length > 0) {
      const enabledPlatforms = await platformConfigService.getEnabledPlatforms();
      const disabledPlatforms = platforms.filter(p => !enabledPlatforms.includes(p));
      if (disabledPlatforms.length > 0) {
        return res.status(400).json({
          error: `The following platforms are currently disabled: ${disabledPlatforms.join(', ')}. Please contact an administrator.`,
          details: 'platforms',
          disabledPlatforms
        });
      }
    }
    
    if (Array.isArray(platforms) && platforms.includes('twitter') && typeof content === 'string' && content.length > TWITTER_MAX_CHARS) {
      return res.status(400).json({
        error: 'For X (Twitter), content must be 280 characters or less.',
        details: 'content',
        maxLength: TWITTER_MAX_CHARS,
      });
    }
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

// List all content for user (with pagination and filters) - allowed without license so Dashboard can load
router.get('/', requireAuth, async (req, res) => {
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
    const msg = err.message || '';
    const isSchemaError = /does not exist|column .* not found|undefined column/i.test(msg);
    logger.error('Error listing content', {
      error: msg,
      userId: req.user.id,
      isSchemaError,
    });
    if (isSchemaError) {
      return res.status(503).json({
        error: 'Database schema is outdated',
        details: 'Run migrations in the backend: npm run migrate',
        code: 'RUN_MIGRATIONS',
      });
    }
    res.status(500).json({ error: 'Failed to fetch content', details: msg });
  }
});

// Get content by id - allowed without license (read-only)
router.get('/:id', requireAuth, async (req, res) => {
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

// Update content (requires valid license)
router.put('/:id', requireAuth, checkLicense, validateBody(updateContentSchema), auditLog('content_updated', 'Content'), async (req, res) => {
  try {
    const platforms = req.body?.platforms;
    const contentBody = req.body?.content;
    
    // Validate that all platforms are enabled (if platforms are being updated)
    if (Array.isArray(platforms) && platforms.length > 0) {
      const enabledPlatforms = await platformConfigService.getEnabledPlatforms();
      const disabledPlatforms = platforms.filter(p => !enabledPlatforms.includes(p));
      if (disabledPlatforms.length > 0) {
        return res.status(400).json({
          error: `The following platforms are currently disabled: ${disabledPlatforms.join(', ')}. Please contact an administrator.`,
          details: 'platforms',
          disabledPlatforms
        });
      }
    }
    
    if (Array.isArray(platforms) && platforms.includes('twitter') && typeof contentBody === 'string' && contentBody.length > TWITTER_MAX_CHARS) {
      return res.status(400).json({
        error: 'For X (Twitter), content must be 280 characters or less.',
        details: 'content',
        maxLength: TWITTER_MAX_CHARS,
      });
    }
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

// Delete content (requires valid license)
router.delete('/:id', requireAuth, checkLicense, auditLog('content_deleted', 'Content'), async (req, res) => {
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

// Debug endpoint: Check scheduled content and Twitter status
router.get('/debug-scheduled', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    const scheduled = await Content.findAll({
      where: {
        userId,
        status: 'scheduled',
      },
      order: [['scheduledFor', 'ASC']],
      limit: 10,
    });
    
    const due = await Content.findAll({
      where: {
        userId,
        status: 'scheduled',
        scheduledFor: { [Op.lte]: now },
      },
      order: [['scheduledFor', 'ASC']],
      limit: 10,
    });
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'twitterId', 'twitterAccessToken', 'twitterRefreshToken'],
    });
    
    res.json({
      now: now.toISOString(),
      scheduledCount: scheduled.length,
      dueCount: due.length,
      scheduled: scheduled.map((c) => ({
        id: c.id,
        platforms: c.platforms,
        hasTwitter: Array.isArray(c.platforms) && c.platforms.includes('twitter'),
        scheduledFor: c.scheduledFor,
        isDue: new Date(c.scheduledFor) <= now,
      })),
      due: due.map((c) => ({
        id: c.id,
        platforms: c.platforms,
        hasTwitter: Array.isArray(c.platforms) && c.platforms.includes('twitter'),
        scheduledFor: c.scheduledFor,
      })),
      twitterStatus: {
        hasTwitterId: !!user?.twitterId,
        hasAccessToken: !!user?.twitterAccessToken,
        accessTokenLength: user?.twitterAccessToken?.length || 0,
      },
    });
  } catch (err) {
    logger.error('Debug scheduled content error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Test endpoint: Publish a test tweet (for debugging)
router.post('/test-twitter', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const testText = req.body.text || 'Test tweet from Streamer Scheduler';
    
    logger.info('Test Twitter publish request', { userId, textLength: testText.length });
    
    const user = await User.findByPk(userId, { 
      attributes: ['id', 'twitterId', 'twitterAccessToken', 'twitterRefreshToken', 'oauthProvider', 'oauthId'] 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User Twitter status', {
      userId,
      hasTwitterId: !!user.twitterId,
      twitterId: user.twitterId,
      hasAccessToken: !!user.twitterAccessToken,
      accessTokenLength: user.twitterAccessToken?.length || 0,
      hasRefreshToken: !!user.twitterRefreshToken,
      oauthProvider: user.oauthProvider,
      oauthId: user.oauthId
    });
    
    if (!user.twitterAccessToken) {
      return res.status(400).json({ 
        error: 'Twitter access token missing',
        hasTwitterId: !!user.twitterId,
        message: user.twitterId 
          ? 'Twitter account linked but access token missing. Please reconnect X (Twitter) in Settings.'
          : 'Twitter not linked. Connect X (Twitter) in Settings.'
      });
    }
    
    logger.info('Attempting to post tweet', { userId, textPreview: testText.slice(0, 50) });
    const result = await postTweet(user.twitterAccessToken, testText);
    
    logger.info('Test tweet posted successfully', { userId, tweetId: result.id });
    res.json({ 
      success: true, 
      tweetId: result.id,
      text: result.text,
      message: 'Tweet posted successfully'
    });
  } catch (err) {
    logger.error('Test Twitter publish failed', {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Failed to publish tweet',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router; 