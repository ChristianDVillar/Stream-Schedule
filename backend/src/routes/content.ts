import express, { Request, Response, Router } from 'express';
import { SchedulerService } from '../services/SchedulerService';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import multer from 'multer';
import path from 'path';

const router: Router = express.Router();
const schedulerService = SchedulerService.getInstance();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Schedule new content
router.post('/schedule', auth, upload.array('media', 5), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      platforms,
      contentType,
      text,
      hashtags,
      mentions,
      scheduledFor,
      platformSpecific
    } = req.body;

    // Validate required fields
    if (!platforms || !contentType || !scheduledFor) {
      res.status(400).json({ message: 'Platforms, content type, and scheduled time are required' });
      return;
    }

    // Parse platforms array
    const platformArray = Array.isArray(platforms) ? platforms : JSON.parse(platforms);
    
    // Process uploaded files
    const mediaFiles = req.files ? (req.files as Express.Multer.File[]).map(file => ({
      id: file.filename,
      filename: file.originalname,
      url: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    })) : [];

    // Parse platform-specific data
    const platformSpecificData = platformSpecific ? JSON.parse(platformSpecific) : {};

    const contentData = {
      userId,
      platforms: platformArray,
      contentType,
      content: {
        text,
        media: mediaFiles,
        hashtags: hashtags ? JSON.parse(hashtags) : [],
        mentions: mentions ? JSON.parse(mentions) : [],
        platformSpecific: platformSpecificData
      },
      scheduledFor: new Date(scheduledFor)
    };

    const content = await schedulerService.scheduleContent(contentData);

    res.status(201).json({
      message: 'Content scheduled successfully',
      content
    });
  } catch (error) {
    console.error('Schedule content error:', error);
    res.status(500).json({ 
      message: 'Error scheduling content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's scheduled content
router.get('/', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { status, platform, limit, offset } = req.query;
    
    const options = {
      status: status as string,
      platform: platform as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    };

    const result = await schedulerService.getScheduledContent(userId, options);

    res.json({
      content: result.content,
      total: result.total,
      limit: options.limit,
      offset: options.offset
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'Error fetching content' });
  }
});

// Get specific content by ID
router.get('/:contentId', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const content = await schedulerService.getContentById(contentId);
    
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    // Ensure user can only access their own content
    if (content.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json(content);
  } catch (error) {
    console.error('Get content by ID error:', error);
    res.status(500).json({ message: 'Error fetching content' });
  }
});

// Update scheduled content
router.put('/:contentId', auth, upload.array('media', 5), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const content = await schedulerService.getContentById(contentId);
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    if (content.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Only allow updates to scheduled content
    if (content.status !== 'scheduled') {
      res.status(400).json({ message: 'Can only update scheduled content' });
      return;
    }

    const updates: any = {};

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const mediaFiles = (req.files as Express.Multer.File[]).map(file => ({
        id: file.filename,
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      }));
      updates['content.media'] = mediaFiles;
    }

    // Update other fields
    if (req.body.text !== undefined) updates['content.text'] = req.body.text;
    if (req.body.hashtags !== undefined) updates['content.hashtags'] = JSON.parse(req.body.hashtags);
    if (req.body.mentions !== undefined) updates['content.mentions'] = JSON.parse(req.body.mentions);
    if (req.body.scheduledFor !== undefined) updates.scheduledFor = new Date(req.body.scheduledFor);
    if (req.body.platformSpecific !== undefined) updates['content.platformSpecific'] = JSON.parse(req.body.platformSpecific);

    const updatedContent = await schedulerService.updateContent(contentId, updates);

    res.json({
      message: 'Content updated successfully',
      content: updatedContent
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ 
      message: 'Error updating content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel scheduled content
router.delete('/:contentId', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const content = await schedulerService.getContentById(contentId);
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    if (content.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const success = await schedulerService.cancelContent(contentId);

    if (success) {
      res.json({ message: 'Content cancelled successfully' });
    } else {
      res.status(400).json({ message: 'Could not cancel content' });
    }
  } catch (error) {
    console.error('Cancel content error:', error);
    res.status(500).json({ message: 'Error cancelling content' });
  }
});

// Retry failed content
router.post('/:contentId/retry', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const content = await schedulerService.getContentById(contentId);
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    if (content.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const success = await schedulerService.retryFailedContent(contentId);

    if (success) {
      res.json({ message: 'Content retry scheduled successfully' });
    } else {
      res.status(400).json({ message: 'Could not retry content' });
    }
  } catch (error) {
    console.error('Retry content error:', error);
    res.status(500).json({ message: 'Error retrying content' });
  }
});

// Get queue statistics
router.get('/stats/queue', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await schedulerService.getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ message: 'Error fetching queue statistics' });
  }
});

export default router; 