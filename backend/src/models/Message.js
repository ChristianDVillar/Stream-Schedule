/**
 * Message Model
 * Messages from users to administrators
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Message = sequelize.define('Message', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who sent the message'
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 255]
    },
    comment: 'Message subject'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 10000]
    },
    comment: 'Message content'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unread',
    validate: {
      isIn: [['unread', 'read', 'replied', 'archived']]
    },
    comment: 'Message status: unread, read, replied, archived'
  },
  adminReply: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin reply to the message'
  },
  repliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When admin replied'
  },
  repliedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin user who replied'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When message was first read by admin'
  },
  readBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin user who read the message'
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'normal',
    validate: {
      isIn: [['low', 'normal', 'high', 'urgent']]
    },
    comment: 'Message priority'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['support', 'bug', 'feature', 'billing', 'account', 'other', null]]
    },
    comment: 'Message category'
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment URLs/paths (from user)'
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the conversation is resolved/closed'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the conversation was marked as resolved'
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin user who resolved the conversation'
  }
}, {
  tableName: 'Messages',
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['category'] },
    { fields: ['createdAt'] },
    { fields: ['readAt'] }
  ]
});

export default Message;
