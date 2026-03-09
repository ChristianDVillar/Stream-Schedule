/**
 * StreamReminder Model
 * Viewers subscribe with email to get reminded before a streamer's next stream.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const StreamReminder = sequelize.define('StreamReminder', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'Streamer (creator) whose stream we remind about',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Subscriber email for reminders',
  },
}, {
  tableName: 'StreamReminders',
  indexes: [
    { fields: ['userId'] },
    { unique: true, fields: ['userId', 'email'] },
  ],
});

export default StreamReminder;
