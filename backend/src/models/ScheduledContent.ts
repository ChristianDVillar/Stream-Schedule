import mongoose, { Document, Schema } from 'mongoose';

export interface MediaFile {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface ContentData {
  text?: string;
  media?: MediaFile[];
  hashtags?: string[];
  mentions?: string[];
  platformSpecific?: {
    [platform: string]: any;
  };
}

export interface ContentLog {
  timestamp: Date;
  status: 'scheduled' | 'published' | 'failed' | 'retrying';
  message: string;
  error?: string;
  platform?: string;
}

export interface IScheduledContent extends Document {
  userId: string;
  platforms: string[];
  contentType: 'text' | 'image' | 'video' | 'stream' | 'carousel';
  content: ContentData;
  scheduledFor: Date;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  publishedAt?: Date;
  failureReason?: string;
  logs: ContentLog[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaFileSchema = new Schema<MediaFile>({
  id: { type: String, required: true },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, required: true },
});

const ContentLogSchema = new Schema<ContentLog>({
  timestamp: { type: Date, required: true },
  status: { type: String, required: true },
  message: { type: String, required: true },
  error: { type: String },
  platform: { type: String },
});

const ScheduledContentSchema = new Schema<IScheduledContent>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  platforms: {
    type: [String],
    required: true,
    enum: ['twitch', 'twitter', 'instagram', 'discord'],
  },
  contentType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'stream', 'carousel'],
  },
  content: {
    text: { type: String },
    media: [MediaFileSchema],
    hashtags: [String],
    mentions: [String],
    platformSpecific: { type: Schema.Types.Mixed },
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'published', 'failed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  publishedAt: {
    type: Date,
  },
  failureReason: {
    type: String,
  },
  logs: [ContentLogSchema],
}, {
  timestamps: true,
});

// Indexes for better query performance
ScheduledContentSchema.index({ userId: 1, scheduledFor: 1 });
ScheduledContentSchema.index({ status: 1, scheduledFor: 1 });
ScheduledContentSchema.index({ platforms: 1, status: 1 });

export const ScheduledContent = mongoose.model<IScheduledContent>('ScheduledContent', ScheduledContentSchema); 