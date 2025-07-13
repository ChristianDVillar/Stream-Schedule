import express, { Request, Response, Router } from 'express';
import { auth } from '../middleware/auth';
import { TwitterService } from '../services/TwitterService';
import { AuthenticatedRequest } from '../types/auth';
import multer from 'multer';
import { ContentService } from '../services/ContentService';

const router: Router = express.Router();
const twitterService = TwitterService.getInstance();
const contentService = ContentService.getInstance();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Schedule Twitter post
router.post('/content', auth, upload.array('media'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { text, scheduledTime } = req.body;
    const files = req.files as Express.Multer.File[];

    // Get user's Twitter access token
    const user = await contentService.getUser(userId);
    const twitterConnection = user.platformConnections.find(
      conn => conn.platform === 'twitter'
    );

    if (!twitterConnection?.accessToken) {
      res.status(400).json({ error: 'Twitter not connected' });
      return;
    }

    // Upload media if provided
    let mediaIds: string[] = [];
    if (files && files.length > 0) {
      mediaIds = await Promise.all(
        files.map(async (file) => {
          const mediaId = await twitterService.uploadMedia(
            twitterConnection.accessToken,
            file.buffer,
            file.mimetype
          );
          return mediaId;
        })
      );
    }

    // Create tweet
    const tweet = await twitterService.createTweet(
      twitterConnection.accessToken,
      text,
      mediaIds
    );

    // Schedule the content
    const scheduledPost = await contentService.scheduleContent({
      userId,
      platform: 'twitter',
      content: {
        tweetId: tweet.id,
        text,
        mediaIds,
      },
      scheduledFor: new Date(scheduledTime),
      status: 'scheduled',
    });

    res.json(scheduledPost);
  } catch (error) {
    console.error('Error scheduling Twitter post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Get scheduled Twitter posts
router.get('/content', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const posts = await contentService.getScheduledContent(userId, 'twitter');
    res.json(posts);
  } catch (error) {
    console.error('Error fetching scheduled Twitter posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Delete scheduled Twitter post
router.delete('/content/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const deleted = await contentService.deleteScheduledContent(id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Scheduled post not found' });
      return;
    }

    res.json({ message: 'Scheduled post deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled Twitter post:', error);
    res.status(500).json({ error: 'Failed to delete scheduled post' });
  }
});

export default router; 