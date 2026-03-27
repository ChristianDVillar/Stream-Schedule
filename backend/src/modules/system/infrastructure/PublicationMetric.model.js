import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const PublicationMetric = sequelize.define('PublicationMetric', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  durationMs: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  attemptsMade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ['userId'], name: 'idx_publication_metrics_user' },
    { fields: ['platform'], name: 'idx_publication_metrics_platform' },
    { fields: ['completedAt'], name: 'idx_publication_metrics_completed_at' },
  ],
  updatedAt: false,
});

export default PublicationMetric;

