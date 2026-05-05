import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const SystemConfig = sequelize.define('SystemConfig', {
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true,
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default SystemConfig;

