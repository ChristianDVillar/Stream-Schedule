import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Stores processed Stripe webhook events to ensure idempotency.
// Stripe can retry events multiple times; we only want to process each event.id once.
const StripeWebhookEvent = sequelize.define(
  'StripeWebhookEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    stripeEventId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'StripeWebhookEvents',
    indexes: [
      { fields: ['stripeEventId'], unique: true },
      { fields: ['type'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default StripeWebhookEvent;

