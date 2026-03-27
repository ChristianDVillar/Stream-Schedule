import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const Media = sequelize.define('Media', {
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

export default Media;

