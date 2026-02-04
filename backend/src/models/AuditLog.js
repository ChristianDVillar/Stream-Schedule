/**
 * Audit Log Model
 * Tracks important actions for security and compliance
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';

const AuditLog = sequelize.define('AuditLog', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Some actions might not have a user (system actions)
    comment: 'User who performed the action',
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Action performed (e.g., user_created, license_updated, content_deleted)',
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of resource affected (User, Content, Payment, etc.)',
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the affected resource',
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Before/after changes (for updates)',
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the requester',
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User agent string',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata about the action',
  },
}, {
  tableName: 'AuditLogs',
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['resourceType', 'resourceId'] },
    { fields: ['createdAt'] },
  ],
});

export default AuditLog;
