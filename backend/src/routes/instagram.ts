import express, { Request, Response, Router } from 'express';
import { auth } from '../middleware/auth';
import { InstagramService } from '../services/InstagramService';
import { AuthenticatedRequest } from '../types/auth';
import multer from 'multer';
import { ContentService } from '../services/ContentService';
import axios from 'axios';

const router: Router = express.Router();
const instagramService = InstagramService.getInstance();
const contentService = ContentService.getInstance();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Schedule Instagram post
router.post('/content', auth, upload.array('media'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { caption, mediaType, scheduledTime } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No media files provided' });
      return;
    }

    // Get user's Instagram access token
    const user = await contentService.getUser(userId);
    const instagramConnection = user.platformConnections.find(
      conn => conn.platform === 'instagram'
    );

    if (!instagramConnection?.accessToken) {
      res.status(400).json({ error: 'Instagram not connected' });
      return;
    }

    // Upload media to Instagram
    const mediaIds = await Promise.all(
      files.map(async (file) => {
        const mediaId = await instagramService.uploadMedia(
          instagramConnection.accessToken,
          file.buffer,
          mediaType.toLowerCase() as 'image' | 'video'
        );
        return mediaId;
      })
    );

    // Create post or carousel
    let postId;
    if (mediaType === 'CAROUSEL_ALBUM' && mediaIds.length > 1) {
      postId = await instagramService.createCarousel(
        instagramConnection.accessToken,
        mediaIds,
        caption
      );
    } else {
      // For single media posts, we need to publish them
      const mediaId = mediaIds[0];
      const publishResponse = await axios.post(
        'https://graph.facebook.com/v18.0/me/media_publish',
        {
          creation_id: mediaId,
          access_token: instagramConnection.accessToken,
        }
      );
      postId = publishResponse.data.id;
    }

    // Schedule the content
    const scheduledPost = await contentService.scheduleContent({
      userId,
      platform: 'instagram',
      content: {
        postId,
        mediaIds,
        caption,
        mediaType,
      },
      scheduledFor: new Date(scheduledTime),
      status: 'scheduled',
    });

    res.json(scheduledPost);
  } catch (error) {
    console.error('Error scheduling Instagram post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Get scheduled Instagram posts
router.get('/content', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const posts = await contentService.getScheduledContent(userId, 'instagram');
    res.json(posts);
  } catch (error) {
    console.error('Error fetching scheduled Instagram posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Delete scheduled Instagram post
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
    console.error('Error deleting scheduled Instagram post:', error);
    res.status(500).json({ error: 'Failed to delete scheduled post' });
  }
});

export default router; 