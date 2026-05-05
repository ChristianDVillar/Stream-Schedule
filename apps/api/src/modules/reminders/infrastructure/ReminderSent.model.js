import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const ReminderSent = sequelize.define('ReminderSent', {
  streamReminderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'StreamReminders', key: 'id' },
    onDelete: 'CASCADE',
  },
  contentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Contents', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'ReminderSents',
  indexes: [
    { unique: true, fields: ['streamReminderId', 'contentId'] },
  ],
});

export default ReminderSent;

