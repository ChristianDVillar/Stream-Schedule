import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';
import { PAYMENT_STATUS, PAYMENT_STATUS_VALUES } from '../../../constants/paymentStatus.js';

const Payment = sequelize.define('Payment', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: PAYMENT_STATUS.PENDING,
    validate: {
      isIn: [PAYMENT_STATUS_VALUES],
    },
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'stripe',
  },
  reference: {
    type: DataTypes.STRING,
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Subscription ID if this payment is part of a subscription',
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this payment is part of a recurring subscription',
  },
});

export default Payment;

