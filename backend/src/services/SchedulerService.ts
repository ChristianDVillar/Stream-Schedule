import { BaseService } from './BaseService';
import { ScheduledContent, IScheduledContent } from '../models/ScheduledContent';
import { TaskManager } from './TaskManager';
import { TwitchService } from './TwitchService';
import { TwitterService } from './TwitterService';
import { InstagramService } from './InstagramService';
import { DiscordService } from './DiscordService';

export class SchedulerService extends BaseService {
  private taskManager: TaskManager;
  private twitchService: TwitchService;
  private twitterService: TwitterService;
  private instagramService: InstagramService;
  private discordService: DiscordService;

  protected constructor() {
    super();
    this.taskManager = TaskManager.getInstance();
    this.twitchService = TwitchService.getInstance();
    this.twitterService = TwitterService.getInstance();
    this.instagramService = InstagramService.getInstance();
    this.discordService = DiscordService.getInstance();
  }

  public async scheduleContent(content: IScheduledContent): Promise<void> {
    try {
      await this.taskManager.scheduleContent(content);
      
      content.status = 'scheduled';
      content.logs.push({
        timestamp: new Date(),
        status: 'scheduled',
        message: 'Content scheduled successfully',
      });
      
      await content.save();
    } catch (error) {
      content.status = 'failed';
      content.failureReason = error instanceof Error ? error.message : 'Unknown error';
      content.logs.push({
        timestamp: new Date(),
        status: 'failed',
        message: 'Failed to schedule content',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await content.save();
      throw error;
    }
  }

  public async getScheduledContent(userId: string, filters?: {
    platform?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IScheduledContent[]> {
    const query: any = { userId };
    
    if (filters?.platform) {
      query.platforms = filters.platform;
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.scheduledFor = {};
      if (filters.startDate) {
        query.scheduledFor.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.scheduledFor.$lte = filters.endDate;
      }
    }
    
    return ScheduledContent.find(query).sort({ scheduledFor: 1 });
  }

  public async cancelScheduledContent(contentId: string, userId: string): Promise<boolean> {
    const content = await ScheduledContent.findOne({ _id: contentId, userId });
    if (!content) {
      return false;
    }
    
    content.status = 'cancelled';
    content.logs.push({
      timestamp: new Date(),
      status: 'cancelled',
      message: 'Content cancelled by user',
    });
    
    await content.save();
    await this.taskManager.cancelContent(contentId);
    return true;
  }

  public async retryFailedContent(contentId: string): Promise<boolean> {
    const content = await ScheduledContent.findById(contentId);
    if (!content || content.status !== 'failed') {
      return false;
    }

    await this.taskManager.retryFailedContent(contentId);
    return true;
  }

  public async processScheduledContent(): Promise<void> {
    try {
      const now = new Date();
      const scheduledContent = await ScheduledContent.find({
        scheduledFor: { $lte: now },
        status: 'scheduled',
      });

      for (const content of scheduledContent) {
        try {
          await this.taskManager.scheduleContent(content);
        } catch (error) {
          console.error(`Failed to process content ${content.id}:`, error);
          content.status = 'failed';
          content.failureReason = error instanceof Error ? error.message : 'Unknown error';
          content.logs.push({
            timestamp: new Date(),
            status: 'failed',
            message: 'Failed to process scheduled content',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          await content.save();
        }
      }
    } catch (error) {
      console.error('Error processing scheduled content:', error);
    }
  }

  // Legacy method for backward compatibility
  private async publishContent(content: any) {
    const { platform, content: contentData } = content;

    switch (platform) {
      case 'twitch':
        await this.publishToTwitch(contentData);
        break;
      case 'twitter':
        await this.publishToTwitter(contentData);
        break;
      case 'instagram':
        await this.publishToInstagram(contentData);
        break;
      case 'discord':
        await this.publishToDiscord(contentData);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async publishToTwitch(content: any) {
    // Implementation for Twitch publishing
    console.log('Publishing to Twitch:', content);
  }

  private async publishToTwitter(content: any) {
    // Implementation for Twitter publishing
    console.log('Publishing to Twitter:', content);
  }

  private async publishToInstagram(content: any) {
    // Implementation for Instagram publishing
    console.log('Publishing to Instagram:', content);
  }

  private async publishToDiscord(content: any) {
    const { channelId, message, isEvent, eventData } = content;
    if (isEvent) {
      // await this.discordService.createGuildEvent(channelId, eventData);
    } else {
      // await this.discordService.sendChannelMessage(channelId, message);
    }
  }
} 