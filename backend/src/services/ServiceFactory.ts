import { TwitchService } from './TwitchService';
import { TwitterService } from './TwitterService';
import { InstagramService } from './InstagramService';
import { DiscordService } from './DiscordService';
import { TaskManager } from './TaskManager';
import { SchedulerService } from './SchedulerService';
import { TokenEncryptionService } from './TokenEncryptionService';
import { ContentService } from './ContentService';

export class ServiceFactory {
  private static services = new Map<string, any>();
  
  public static getTwitchService(): TwitchService {
    return TwitchService.getInstance();
  }
  
  public static getTwitterService(): TwitterService {
    return TwitterService.getInstance();
  }
  
  public static getInstagramService(): InstagramService {
    return InstagramService.getInstance();
  }
  
  public static getDiscordService(): DiscordService {
    return DiscordService.getInstance();
  }
  
  public static getTaskManager(): TaskManager {
    return TaskManager.getInstance();
  }
  
  public static getSchedulerService(): SchedulerService {
    return SchedulerService.getInstance();
  }
  
  public static getTokenEncryptionService(): TokenEncryptionService {
    return TokenEncryptionService.getInstance();
  }
  
  public static getContentService(): ContentService {
    return ContentService.getInstance();
  }
  
  // Convenience method to get all platform services
  public static getAllPlatformServices() {
    return {
      twitch: this.getTwitchService(),
      twitter: this.getTwitterService(),
      instagram: this.getInstagramService(),
      discord: this.getDiscordService()
    };
  }
} 