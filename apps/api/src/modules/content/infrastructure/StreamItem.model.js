import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';

const TYPES = ['idea', 'note', 'quote', 'clipidea'];

const StreamItem = sequelize.define('StreamItem', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [TYPES] },
    comment: 'idea | note | quote | clipidea',
  },
  text: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    comment: 'Content of the idea, note, quote or clip idea',
  },
}, {
  tableName: 'StreamItems',
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'type'] },
    { fields: ['createdAt'] },
  ],
});

export default StreamItem;
export { TYPES as STREAM_ITEM_TYPES };

