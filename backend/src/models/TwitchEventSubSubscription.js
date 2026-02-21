/**
 * Twitch EventSub subscription (e.g. channel.cheer) for a broadcaster.
 * Stores subscription id and secret for webhook verification.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TwitchEventSubSubscription = sequelize.define('TwitchEventSubSubscription', {
  broadcasterUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'One channel.cheer subscription per broadcaster',
  },
  subscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Twitch subscription id after creation',
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Secret for HMAC verification',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'TwitchEventSubSubscriptions',
  timestamps: true,
  indexes: [
    { fields: ['subscriptionId'] },
  ],
});

export default TwitchEventSubSubscription;
