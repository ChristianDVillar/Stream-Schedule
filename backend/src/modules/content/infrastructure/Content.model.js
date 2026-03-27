import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';
import { CONTENT_STATUS, CONTENT_STATUS_VALUES } from '../../../constants/contentStatus.js';
import { CONTENT_TYPE_VALUES } from '../../../constants/contentTypes.js';

const Content = sequelize.define('Content', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [CONTENT_TYPE_VALUES],
    },
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  eventEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End time for events (optional, used for Discord scheduled events)',
  },
  eventDates: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of event dates/times for events with multiple occurrences [{date, time, endDate?, endTime?}]',
  },
  eventLocationUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'External URL for Discord events (e.g. Twitch stream URL, YouTube link) - used as event location',
  },
  hashtags: {
    type: DataTypes.STRING,
  },
  mentions: {
    type: DataTypes.STRING,
  },
  platforms: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  timezone: {
    type: DataTypes.STRING,
  },
  recurrence: {
    type: DataTypes.JSONB,
  },
  files: {
    type: DataTypes.JSONB,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  discordGuildId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord server (guild) ID when platforms includes discord',
  },
  discordChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord channel ID where to publish when platforms includes discord',
  },
  discordAnnouncementChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Optional Discord channel ID to post an announcement when event is created',
  },
  discordEventId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord scheduled event ID after creation; link: https://discord.com/events/{guildId}/{eventId}',
  },
  twitchSegmentId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Twitch schedule segment ID after creating segment via Helix API',
  },
  localVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Internal version; incremented on every local edit (panel)',
  },
  discordEventVersion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Last version known to be synced to Discord',
  },
  discordSyncHash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hash of payload for idempotency / change detection',
  },
  lastSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last successful sync with Discord',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete (Discord or local deletion)',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: CONTENT_STATUS.SCHEDULED,
    validate: {
      isIn: [CONTENT_STATUS_VALUES],
    },
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the content was successfully published',
  },
  publishError: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Error message when publication failed',
  },
  idempotencyKeys: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Map of platform -> idempotency_key for publication tracking',
  },
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of retry attempts for failed publications',
  },
  lastRetryAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last retry attempt',
  },
});

export default Content;

