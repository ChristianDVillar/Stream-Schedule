/**
 * Twitch Bit Event (cheer) from EventSub channel.cheer.
 * Stored for chronological bits download.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TwitchBitEvent = sequelize.define('TwitchBitEvent', {
  broadcasterUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Twitch broadcaster (channel) user id',
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Twitch user id who cheered',
  },
  user_login: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  message_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Twitch-Eventsub-Message-Id for deduplication',
  },
}, {
  tableName: 'TwitchBitEvents',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['broadcasterUserId', 'createdAt'] },
    { fields: ['message_id'] },
  ],
});

export default TwitchBitEvent;
