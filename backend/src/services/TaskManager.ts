import { BaseService } from './BaseService';
import Queue from 'bull';
import { ScheduledContent } from '../models/ScheduledContent';
import { TwitchService } from './TwitchService';
import { TwitterService } from './TwitterService';
import { InstagramService } from './InstagramService';
import { DiscordService } from './DiscordService';
import { config } from '../config/config';

export interface TaskData {
  contentId: string;
  platform: string;
  scheduledFor: Date;
}

export interface TaskResult {
  success: boolean;
  platform: string;
  message: string;
  error?: string;
}

export class TaskManager extends BaseService {
  private contentQueue: Queue.Queue;
  private twitchService: TwitchService;
  private twitterService: TwitterService;
  private instagramService: InstagramService;
  private discordService: DiscordService;

  protected constructor() {
    super();
    this.contentQueue = new Queue('content-publishing', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
    });

    this.twitchService = TwitchService.getInstance();
    this.twitterService = TwitterService.getInstance();
    this.instagramService = InstagramService.getInstance();
    this.discordService = DiscordService.getInstance();

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    // Process content publishing
    this.contentQueue.process('publish-content', async (job) => {
      const { contentId } = job.data;
      const content = await ScheduledContent.findById(contentId);
      
      if (!content) {
        throw new Error(`Content with ID ${contentId} not found`);
      }

      const results: TaskResult[] = [];

      for (const platform of content.platforms) {
        try {
          await this.publishToPlatform(content, platform);
          results.push({
            success: true,
            platform,
            message: `Successfully published to ${platform}`,
          });
        } catch (error) {
          results.push({
            success: false,
            platform,
            message: `Failed to publish to ${platform}`,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update content status based on results
      const allSuccessful = results.every(result => result.success);
      const anySuccessful = results.some(result => result.success);

      if (allSuccessful) {
        content.status = 'published';
        content.publishedAt = new Date();
      } else if (anySuccessful) {
        content.status = 'failed';
        content.failureReason = 'Partial failure - some platforms failed';
      } else {
        content.status = 'failed';
        content.failureReason = 'All platforms failed';
      }

      // Add logs
      results.forEach(result => {
        content.logs.push({
          timestamp: new Date(),
          status: result.success ? 'published' : 'failed',
          message: result.message,
          error: result.error,
          platform: result.platform,
        });
      });

      await content.save();
      return results;
    });

    // Process retry jobs
    this.contentQueue.process('retry-content', async (job) => {
      const { contentId } = job.data;
      const content = await ScheduledContent.findById(contentId);
      
      if (!content) {
        throw new Error(`Content with ID ${contentId} not found`);
      }

      content.retryCount += 1;
      content.status = 'scheduled';
      content.logs.push({
        timestamp: new Date(),
        status: 'retrying',
        message: `Retry attempt ${content.retryCount}`,
      });

      await content.save();
      await this.scheduleContent(content);
    });
  }

  public async scheduleContent(content: any): Promise<void> {
    const delay = content.scheduledFor.getTime() - Date.now();
    
    if (delay <= 0) {
      // Content is due now, process immediately
      await this.contentQueue.add('publish-content', { contentId: content._id });
    } else {
      // Schedule for later
      await this.contentQueue.add('publish-content', { contentId: content._id }, { delay });
    }
  }

  public async retryFailedContent(contentId: string): Promise<void> {
    const content = await ScheduledContent.findById(contentId);
    if (!content || content.status !== 'failed') {
      throw new Error('Content not found or not in failed status');
    }

    if (content.retryCount >= content.maxRetries) {
      throw new Error('Maximum retry attempts reached');
    }

    await this.contentQueue.add('retry-content', { contentId }, { delay: 5000 }); // 5 second delay
  }

  public async cancelContent(contentId: string): Promise<void> {
    const jobs = await this.contentQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find(j => j.data.contentId === contentId);
    
    if (job) {
      await job.remove();
    }
  }

  public async getQueueStats(): Promise<any> {
    const waiting = await this.contentQueue.getWaiting();
    const active = await this.contentQueue.getActive();
    const completed = await this.contentQueue.getCompleted();
    const failed = await this.contentQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  private async publishToPlatform(content: any, platform: string): Promise<void> {
    const { contentType, content: contentData } = content;

    switch (platform) {
      case 'twitch':
        await this.publishToTwitch(contentData, contentType);
        break;
      case 'twitter':
        await this.publishToTwitter(contentData, contentType);
        break;
      case 'instagram':
        await this.publishToInstagram(contentData, contentType);
        break;
      case 'discord':
        await this.publishToDiscord(contentData, contentType);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async publishToTwitch(contentData: any, contentType: string): Promise<void> {
    if (contentType === 'stream') {
      await this.twitchService.createStream(
        contentData.title,
        contentData.category,
        contentData.tags || []
      );
    }
  }

  private async publishToTwitter(contentData: any, contentType: string): Promise<void> {
    if (contentType === 'text') {
      await this.twitterService.createTweet(contentData.text, contentData.mediaIds);
    }
  }

  private async publishToInstagram(contentData: any, contentType: string): Promise<void> {
    if (contentType === 'image') {
      await this.instagramService.createPost(contentData.caption, contentData.mediaUrl);
    } else if (contentType === 'video') {
      await this.instagramService.createReel(contentData.mediaUrl, contentData.caption);
    }
  }

  private async publishToDiscord(contentData: any, contentType: string): Promise<void> {
    if (contentType === 'text') {
      await this.discordService.sendChannelMessage(contentData.channelId, contentData.message);
    }
  }
} 