/**
 * Content Template Model
 * Reusable content templates
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';
import { CONTENT_TYPE_VALUES } from '../constants/contentTypes.js';

const ContentTemplate = sequelize.define('ContentTemplate', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Template name',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Template title (can contain variables like {{date}}, {{time}})',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Template content (can contain variables)',
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [CONTENT_TYPE_VALUES],
    },
  },
  platforms: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Default platforms for this template',
  },
  hashtags: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mentions: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  variables: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Available variables and their descriptions',
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether template is shared publicly',
  },
}, {
  tableName: 'ContentTemplates',
  indexes: [
    { fields: ['userId'] },
    { fields: ['isPublic'] },
    { fields: ['name'] },
  ],
});

export default ContentTemplate;
