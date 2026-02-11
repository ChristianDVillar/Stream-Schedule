/**
 * Feature Flag Model
 * Allows enabling/disabling features without code deployment
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const FeatureFlag = sequelize.define('FeatureFlag', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Feature flag key (e.g., youtube_publish, bulk_upload)'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the feature is enabled'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this feature flag controls'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional configuration for the feature'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['key']
    },
    {
      fields: ['enabled']
    }
  ]
});

export default FeatureFlag;
