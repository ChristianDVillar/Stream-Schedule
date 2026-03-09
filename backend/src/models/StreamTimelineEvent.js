/**
 * StreamTimelineEvent — events during a stream (started, donation, clip, etc.).
 * Bots call POST /webhooks/timeline to add events; dashboard can show "Best moments".
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const StreamTimelineEvent = sequelize.define('StreamTimelineEvent', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'stream_start, donation, clip, alert, note, etc.',
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Optional data: message, amount, link, etc.',
  },
}, {
  tableName: 'StreamTimelineEvents',
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'createdAt'] },
  ],
});

export default StreamTimelineEvent;
