import express, { Request, Response, Router } from 'express';
import { auth } from '../middleware/auth';
import { DiscordService } from '../services/DiscordService';
import { AuthenticatedRequest } from '../types/auth';
import multer from 'multer';
import { ContentService } from '../services/ContentService';

const router: Router = express.Router();
const discordService = DiscordService.getInstance();
const contentService = ContentService.getInstance();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get user's Discord guilds (servers)
router.get('/guilds', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await contentService.getUser(userId);
    const discordAccessToken = user.getDiscordAccessToken();
    if (!discordAccessToken) {
      res.status(400).json({ message: 'Discord not connected' });
      return;
    }

    const guilds = await discordService.getUserGuilds(discordAccessToken);
    res.json(guilds);
  } catch (error) {
    console.error('Error fetching Discord guilds:', error);
    res.status(500).json({ message: 'Error fetching Discord guilds' });
  }
});

// Get channels in a specific guild
router.get('/guilds/:guildId/channels', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await contentService.getUser(userId);
    const discordAccessToken = user.getDiscordAccessToken();
    if (!discordAccessToken) {
      res.status(400).json({ message: 'Discord not connected' });
      return;
    }

    const { guildId } = req.params;
    const channels = await discordService.getGuildChannels(discordAccessToken, guildId);
    res.json(channels);
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    res.status(500).json({ message: 'Error fetching Discord channels' });
  }
});

// Send content to Discord
router.post('/content', auth, upload.array('media'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await contentService.getUser(userId);
    const discordAccessToken = user.getDiscordAccessToken();
    if (!discordAccessToken) {
      res.status(400).json({ message: 'Discord not connected' });
      return;
    }

    const { channelId, content } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!channelId) {
      res.status(400).json({ message: 'Channel ID is required' });
      return;
    }

    let result;
    if (files && files.length > 0) {
      result = await discordService.uploadFile(
        discordAccessToken,
        channelId,
        files[0].buffer,
        files[0].originalname,
        content
      );
    } else {
      result = await discordService.sendChannelMessage(
        discordAccessToken,
        channelId,
        content
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error sending content to Discord:', error);
    res.status(500).json({ message: 'Error sending content to Discord' });
  }
});

// Get scheduled Discord content
router.get('/content', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const content = await contentService.getScheduledContent(userId, 'discord');
    res.json(content);
  } catch (error) {
    console.error('Error fetching scheduled Discord content:', error);
    res.status(500).json({ message: 'Error fetching scheduled Discord content' });
  }
});

// Delete scheduled Discord content
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
      res.status(404).json({ message: 'Scheduled content not found' });
      return;
    }

    res.json({ message: 'Scheduled content deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled Discord content:', error);
    res.status(500).json({ message: 'Error deleting scheduled Discord content' });
  }
});

export default router; 