/**
 * Entitlement Model
 * Granular feature entitlements based on license/subscription
 * More flexible than simple plan flags
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Entitlement = sequelize.define('Entitlement', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  feature: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Feature name (e.g., maxScheduledPosts, platformsAllowed, automationEnabled)'
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Feature value (number, array, boolean, etc.)'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'license',
    validate: {
      isIn: [['license', 'subscription', 'override', 'trial']]
    },
    comment: 'Source: license, subscription, override, trial'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this entitlement expires (null = permanent)'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'feature']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

export default Entitlement;
