/**
 * Notification Model
 * Admin announcements to users (broadcast or per-user)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Notification = sequelize.define('Notification', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'Null = broadcast to all; set = only this user'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'Notifications',
  indexes: [
    { fields: ['userId'] },
    { fields: ['createdAt'] }
  ]
});

export default Notification;
