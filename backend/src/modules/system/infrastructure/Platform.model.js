import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';
import { PLATFORM_VALUES } from '../../../constants/platforms.js';

const Platform = sequelize.define('Platform', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [PLATFORM_VALUES],
    },
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  refreshToken: {
    type: DataTypes.STRING,
  },
  expiresAt: {
    type: DataTypes.DATE,
  },
  extra: {
    type: DataTypes.JSONB,
  },
});

export default Platform;

