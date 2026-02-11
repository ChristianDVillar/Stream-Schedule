/**
 * MessageReply Model
 * Multiple replies in a conversation thread
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const MessageReply = sequelize.define('MessageReply', {
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Messages',
      key: 'id'
    },
    comment: 'Parent message ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who sent the reply (can be user or admin)'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 10000]
    },
    comment: 'Reply content'
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment URLs/paths'
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this reply is from an admin'
  }
}, {
  tableName: 'MessageReplies',
  indexes: [
    { fields: ['messageId'] },
    { fields: ['userId'] },
    { fields: ['createdAt'] }
  ]
});

export default MessageReply;
