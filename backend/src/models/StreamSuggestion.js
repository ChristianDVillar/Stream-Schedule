/**
 * StreamSuggestion — viewer suggestions for streams (!suggest play Elden Ring).
 * Public POST /streamer/:username/suggest; streamer sees in dashboard.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const StreamSuggestion = sequelize.define('StreamSuggestion', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'Streamer who receives the suggestion',
  },
  text: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  suggestedBy: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Viewer name or identifier from chat',
  },
}, {
  tableName: 'StreamSuggestions',
  indexes: [
    { fields: ['userId'] },
    { fields: ['createdAt'] },
  ],
});

export default StreamSuggestion;
