import dotenv from 'dotenv';

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config();

// Import database configuration from centralized config
import { sequelize } from '../config/database.js';
import User from '../modules/users/infrastructure/User.model.js';
import Content from '../modules/content/infrastructure/Content.model.js';
import Media from '../modules/content/infrastructure/Media.model.js';
import ContentMedia from '../modules/content/infrastructure/ContentMedia.model.js';
import Platform from '../modules/system/infrastructure/Platform.model.js';
import Payment from '../modules/payments/infrastructure/Payment.model.js';
import SystemConfig from '../modules/system/infrastructure/SystemConfig.model.js';
import FeatureFlag from '../modules/system/infrastructure/FeatureFlag.model.js';
import Entitlement from '../modules/system/infrastructure/Entitlement.model.js';
import PublicationMetric from '../modules/system/infrastructure/PublicationMetric.model.js';
import Message from '../modules/system/infrastructure/Message.model.js';
import MessageReply from '../modules/system/infrastructure/MessageReply.model.js';
import Notification from '../modules/system/infrastructure/Notification.model.js';
import NotificationRead from '../modules/system/infrastructure/NotificationRead.model.js';
import AuditLog from '../modules/system/infrastructure/AuditLog.model.js';
import ContentTemplate from '../modules/content/infrastructure/ContentTemplate.model.js';
import Integration from '../modules/integrations/infrastructure/Integration.model.js';
import ContentPlatform from '../modules/content/infrastructure/ContentPlatform.model.js';
import TwitchBitEvent from '../modules/integrations/infrastructure/TwitchBitEvent.model.js';
import TwitchEventSubSubscription from '../modules/integrations/infrastructure/TwitchEventSubSubscription.model.js';
import Todo from '../modules/content/infrastructure/Todo.model.js';
import StripeWebhookEvent from '../modules/payments/infrastructure/StripeWebhookEvent.model.js';
import StreamReminder from '../modules/reminders/infrastructure/StreamReminder.model.js';
import StreamItem from '../modules/content/infrastructure/StreamItem.model.js';
import StreamSuggestion from '../modules/content/infrastructure/StreamSuggestion.model.js';
import StreamTimelineEvent from '../modules/content/infrastructure/StreamTimelineEvent.model.js';
import ReminderSent from '../modules/reminders/infrastructure/ReminderSent.model.js';

// 👤 User and 📝 Content are now defined in module infrastructure files.

// 🌐 Platform and 💳 Payment are now defined in module infrastructure files.

// 📁 Media and 🔗 ContentMedia are now defined in module infrastructure files.

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

User.hasMany(Todo, { foreignKey: 'userId', onDelete: 'CASCADE' });
Todo.belongsTo(User, { foreignKey: 'userId' });

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

// Define relationships for new models (after all models are defined)
User.hasMany(Integration, { foreignKey: 'userId', as: 'integrations' });
Integration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Content.hasMany(ContentPlatform, { foreignKey: 'contentId', as: 'contentPlatforms' });
ContentPlatform.belongsTo(Content, { foreignKey: 'contentId', as: 'content' });

User.hasMany(Entitlement, { foreignKey: 'userId', as: 'entitlements' });
Entitlement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.belongsTo(User, { foreignKey: 'repliedBy', as: 'repliedByUser' });
Message.belongsTo(User, { foreignKey: 'readBy', as: 'readByUser' });
Message.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolvedByUser' });

Message.hasMany(MessageReply, { foreignKey: 'messageId', as: 'replies' });
MessageReply.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
MessageReply.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'targetUser' });
Notification.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Notification.hasMany(NotificationRead, { foreignKey: 'notificationId', as: 'reads' });
NotificationRead.belongsTo(Notification, { foreignKey: 'notificationId' });
NotificationRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'targetedNotifications' });
User.hasMany(Notification, { foreignKey: 'createdBy', as: 'createdNotifications' });
User.hasMany(NotificationRead, { foreignKey: 'userId', as: 'notificationReads' });
User.hasMany(PublicationMetric, { foreignKey: 'userId', as: 'publicationMetrics' });
PublicationMetric.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(StreamReminder, { foreignKey: 'userId', onDelete: 'CASCADE' });
StreamReminder.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(StreamItem, { foreignKey: 'userId', onDelete: 'CASCADE' });
StreamItem.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(StreamSuggestion, { foreignKey: 'userId', onDelete: 'CASCADE' });
StreamSuggestion.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(StreamTimelineEvent, { foreignKey: 'userId', onDelete: 'CASCADE' });
StreamTimelineEvent.belongsTo(User, { foreignKey: 'userId' });
StreamReminder.hasMany(ReminderSent, { foreignKey: 'streamReminderId', onDelete: 'CASCADE' });
ReminderSent.belongsTo(StreamReminder, { foreignKey: 'streamReminderId' });
Content.hasMany(ReminderSent, { foreignKey: 'contentId', onDelete: 'CASCADE' });
ReminderSent.belongsTo(Content, { foreignKey: 'contentId' });

// ⚙️ SystemConfig is now defined in module infrastructure files.

export {
  sequelize,
  User,
  Content,
  ContentPlatform,
  Platform,
  Payment,
  Media,
  ContentMedia,
  SystemConfig,
  AuditLog,
  ContentTemplate,
  Integration,
  FeatureFlag,
  Entitlement,
  Message,
  MessageReply,
  Notification,
  NotificationRead,
  TwitchBitEvent,
  TwitchEventSubSubscription,
  PublicationMetric,
  Todo,
  StreamReminder,
  StreamItem,
  StreamSuggestion,
  StreamTimelineEvent,
  ReminderSent,
  StripeWebhookEvent,
};