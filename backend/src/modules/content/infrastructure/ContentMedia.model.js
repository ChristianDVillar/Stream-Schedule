import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const ContentMedia = sequelize.define('ContentMedia', {
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

export default ContentMedia;

