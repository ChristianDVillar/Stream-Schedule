import express, { Request, Response, Router } from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ScheduledContent } from '../models/ScheduledContent';
import { ServiceFactory } from '../services/ServiceFactory';

const router: Router = express.Router();
const schedulerService = ServiceFactory.getSchedulerService();

// Get all content logs (admin view)
router.get('/logs', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, status, platform, startDate, endDate } = req.query;
    
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (platform) {
      query.platforms = platform;
    }
    
    if (startDate && endDate) {
      query.scheduledFor = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [content, total] = await Promise.all([
      ScheduledContent.find(query)
        .sort({ scheduledFor: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('userId', 'username email'),
      ScheduledContent.countDocuments(query)
    ]);

    res.json({
      content,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Error fetching logs' });
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

// Get platform connection status for all users
router.get('/platforms/status', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // This would require a User model with platform connections
    // For now, return a placeholder
    res.json({
      message: 'Platform status endpoint - requires User model implementation',
      platforms: ['twitch', 'twitter', 'instagram', 'discord']
    });
  } catch (error) {
    console.error('Get platform status error:', error);
    res.status(500).json({ message: 'Error fetching platform status' });
  }
});

// Get failed content that needs attention
router.get('/failed-content', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const failedContent = await ScheduledContent.find({
      status: 'failed',
      retryCount: { $lt: 3 }
    })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate('userId', 'username email');

    res.json(failedContent);
  } catch (error) {
    console.error('Get failed content error:', error);
    res.status(500).json({ message: 'Error fetching failed content' });
  }
});

// Retry failed content (admin action)
router.post('/retry/:contentId', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contentId } = req.params;
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

// Get system health status
router.get('/health', auth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueStats = await schedulerService.getQueueStats();
    const failedCount = await ScheduledContent.countDocuments({ status: 'failed' });
    const pendingCount = await ScheduledContent.countDocuments({ status: 'scheduled' });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queue: queueStats,
      content: {
        failed: failedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 