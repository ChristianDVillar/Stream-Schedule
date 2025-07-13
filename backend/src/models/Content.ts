import mongoose, { Document, Schema } from 'mongoose';

export interface IContent extends Document {
  userId: string;
  title: string;
  description: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledTime?: Date;
  publishedTime?: Date;
  mediaUrls?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    platform: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
    },
    scheduledTime: { type: Date },
    publishedTime: { type: Date },
    mediaUrls: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Content = mongoose.model<IContent>('Content', ContentSchema); 