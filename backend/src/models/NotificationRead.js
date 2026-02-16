/**
 * NotificationRead Model
 * Tracks which user read which notification
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NotificationRead = sequelize.define('NotificationRead', {
  notificationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Notifications', key: 'id' },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'NotificationReads',
  timestamps: false,
  indexes: [
    { fields: ['notificationId'] },
    { fields: ['userId'] },
    { unique: true, fields: ['notificationId', 'userId'] }
  ]
});

export default NotificationRead;
