import { BaseService } from './BaseService';
import { ScheduledContent } from '../models/ScheduledContent';

export class ContentService extends BaseService {
  public async getUser(userId: string) {
    // Since we removed the User model, this would need to be implemented
    // based on your authentication system (JWT, session, etc.)
    return { id: userId };
  }

  public async scheduleContent(data: {
    userId: string;
    platform: string;
    content: any;
    scheduledFor: Date;
    status: string;
  }) {
    const scheduledContent = new ScheduledContent({
      userId: data.userId,
      platforms: [data.platform],
      contentType: 'text', // Default, should be determined from content
      content: data.content,
      scheduledFor: data.scheduledFor,
      status: data.status,
    });

    await scheduledContent.save();
    return scheduledContent;
  }

  public async getScheduledContent(userId: string, platform: string) {
    return ScheduledContent.find({
      userId: userId,
      platforms: platform,
    }).sort({ scheduledFor: 1 });
  }

  public async deleteScheduledContent(id: string, userId: string) {
    const result = await ScheduledContent.deleteOne({
      _id: id,
      userId: userId,
    });
    return result.deletedCount > 0;
  }
} 