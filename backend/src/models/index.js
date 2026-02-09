import dotenv from 'dotenv';

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config();

import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';
import { LICENSE_TYPES, LICENSE_TYPE_VALUES } from '../constants/licenseTypes.js';
import { CONTENT_STATUS, CONTENT_STATUS_VALUES } from '../constants/contentStatus.js';
import { CONTENT_TYPES, CONTENT_TYPE_VALUES } from '../constants/contentTypes.js';
import { PLATFORMS, PLATFORM_VALUES } from '../constants/platforms.js';
import { PAYMENT_STATUS, PAYMENT_STATUS_VALUES } from '../constants/paymentStatus.js';
// Import database configuration from centralized config
import { sequelize, usePostgres, nodeEnv, enableLogging, isProduction, requireSSL } from '../config/database.js';
import AuditLog from './AuditLog.js';
import ContentTemplate from './ContentTemplate.js';

// 👤 User
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true, // null for Twitter/X-only users (Twitter often does not provide email)
    validate: { isEmail: true }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true // Allow null for OAuth users
  },
  oauthProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['google', 'twitch', 'discord', 'twitter', null]]
    }
  },
  oauthId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Google OAuth user id (for account linking)'
  },
  twitchId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Twitch OAuth user id (for account linking)'
  },
  discordId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth user id (for account linking)'
  },
  twitterId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth user id via Supabase (for account linking)'
  },
  twitterAccessToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth2 access token for publishing tweets. Never expose to frontend.'
  },
  twitterRefreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth2 refresh token. Never expose to frontend.'
  },
  discordAccessToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth access token (user token, for listing guilds). Never expose to frontend.'
  },
  discordRefreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth refresh token. Never expose to frontend.'
  },
  licenseKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: LICENSE_TYPES.NONE,
    validate: {
      isIn: [LICENSE_TYPE_VALUES]
    }
  },
  licenseExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  merchandisingLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hasUsedTrial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  trialExtensions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the trial has been extended (max 2)'
  },
  lastPasswordChange: {
    type: DataTypes.DATE,
    allowNull: true
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Customer ID for subscriptions'
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Subscription ID for recurring payments'
  },
  subscriptionStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Subscription status: active, canceled, past_due, etc.'
  },
  dashboardShowTwitchSubs: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Show Twitch subscriptions on dashboard'
  },
  dashboardShowTwitchBits: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Show Twitch bits on dashboard'
  },
  dashboardShowTwitchDonations: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Show Twitch donations on dashboard'
  },
  profileImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL of user profile/avatar image (e.g. from uploads)'
  }
});

// 📝 Content
const Content = sequelize.define('Content', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [CONTENT_TYPE_VALUES]
    }
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: false
  },
  hashtags: {
    type: DataTypes.STRING
  },
  mentions: {
    type: DataTypes.STRING
  },
  platforms: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING
  },
  recurrence: {
    type: DataTypes.JSONB
  },
  files: {
    type: DataTypes.JSONB
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  discordGuildId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord server (guild) ID when platforms includes discord'
  },
  discordChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord channel ID where to publish when platforms includes discord'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: CONTENT_STATUS.SCHEDULED,
    validate: {
      isIn: [CONTENT_STATUS_VALUES]
    }
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the content was successfully published'
  },
  publishError: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Error message when publication failed'
  }
});

// 🌐 Platform
const Platform = sequelize.define('Platform', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [PLATFORM_VALUES]
    }
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.STRING
  },
  expiresAt: {
    type: DataTypes.DATE
  },
  extra: {
    type: DataTypes.JSONB
  }
});

// 💳 Payment
const Payment = sequelize.define('Payment', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: PAYMENT_STATUS.PENDING,
    validate: {
      isIn: [PAYMENT_STATUS_VALUES]
    }
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'stripe'
  },
  reference: {
    type: DataTypes.STRING
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Subscription ID if this payment is part of a subscription'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this payment is part of a recurring subscription'
  }
});

// 📁 Media
const Media = sequelize.define('Media', {
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER, // bytes
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false // URL en Supabase Storage o CDN
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false // Ruta en Supabase Storage
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true // width, height, duration, etc.
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

// 🔗 ContentMedia (Many-to-Many relationship)
const ContentMedia = sequelize.define('ContentMedia', {
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // Para ordenar media en un contenido
  }
});

// 🔗 Relaciones
User.hasMany(Content, { foreignKey: 'userId', onDelete: 'CASCADE' });
Content.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Platform, { foreignKey: 'userId', onDelete: 'CASCADE' });
Platform.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Payment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Media, { foreignKey: 'userId', onDelete: 'CASCADE' });
Media.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ContentTemplate, { foreignKey: 'userId', onDelete: 'CASCADE' });
ContentTemplate.belongsTo(User, { foreignKey: 'userId' });

// Many-to-Many: Content <-> Media
Content.belongsToMany(Media, { 
  through: ContentMedia, 
  foreignKey: 'contentId',
  otherKey: 'mediaId',
  onDelete: 'CASCADE'
});
Media.belongsToMany(Content, { 
  through: ContentMedia, 
  foreignKey: 'mediaId',
  otherKey: 'contentId',
  onDelete: 'CASCADE'
});

// ⚙️ System Configuration
const SystemConfig = sequelize.define('SystemConfig', {
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

export { sequelize, User, Content, Platform, Payment, Media, ContentMedia, SystemConfig, AuditLog, ContentTemplate };