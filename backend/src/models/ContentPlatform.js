/**
 * ContentPlatform Model
 * Tracks publication status per platform for each Content item.
 * Enables independent retries, better metrics, and scalability.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PLATFORM_VALUES } from '../constants/platforms.js';

const CONTENT_PLATFORM_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
  RETRYING: 'retrying',
  CANCELED: 'canceled'
};

const ContentPlatform = sequelize.define('ContentPlatform', {
  contentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Contents',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Reference to Content'
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [PLATFORM_VALUES]
    },
    comment: 'Platform name: discord, twitter, twitch, youtube, instagram'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: CONTENT_PLATFORM_STATUS.PENDING,
    validate: {
      isIn: [Object.values(CONTENT_PLATFORM_STATUS)]
    },
    comment: 'Publication status for this platform'
  },
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID returned by the platform (e.g. tweet ID, Discord message ID, Twitch segment ID)'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if publication failed'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of retry attempts'
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Next retry time (exponential backoff)'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When successfully published on this platform'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Platform-specific metadata (e.g. Discord event ID, Twitter tweet URL)'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['contentId', 'platform'],
      name: 'content_platform_unique'
    },
    {
      fields: ['status'],
      name: 'idx_content_platform_status'
    },
    {
      fields: ['nextRetryAt'],
      name: 'idx_content_platform_retry'
    },
    {
      fields: ['contentId'],
      name: 'idx_content_platform_content'
    },
    {
      fields: ['platform', 'status'],
      name: 'idx_content_platform_platform_status'
    }
  ],
  comment: 'Tracks publication status per platform for each content item'
});

export const CONTENT_PLATFORM_STATUS_VALUES = Object.values(CONTENT_PLATFORM_STATUS);
export { CONTENT_PLATFORM_STATUS };
export default ContentPlatform;
