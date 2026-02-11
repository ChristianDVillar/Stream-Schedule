/**
 * Integration Model
 * Separates OAuth integrations (for publishing) from Auth (for login)
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { encryptToken, decryptToken } from '../utils/cryptoUtils.js';

const Integration = sequelize.define('Integration', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Platform provider: twitter, discord, youtube, instagram, etc.'
  },
  providerUserId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID on the provider platform'
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted OAuth access token',
    get() {
      const encrypted = this.getDataValue('accessToken');
      if (!encrypted) return null;
      try {
        return decryptToken(encrypted);
      } catch (error) {
        return null;
      }
    },
    set(value) {
      if (value) {
        this.setDataValue('accessToken', encryptToken(value));
      } else {
        this.setDataValue('accessToken', null);
      }
    }
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted OAuth refresh token',
    get() {
      const encrypted = this.getDataValue('refreshToken');
      if (!encrypted) return null;
      try {
        return decryptToken(encrypted);
      } catch (error) {
        return null;
      }
    },
    set(value) {
      if (value) {
        this.setDataValue('refreshToken', encryptToken(value));
      } else {
        this.setDataValue('refreshToken', null);
      }
    }
  },
  scopes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'OAuth scopes granted'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Token expiration date'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'expired', 'revoked', 'error']]
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional provider-specific metadata'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'provider']
    },
    {
      fields: ['provider', 'status']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

export default Integration;
