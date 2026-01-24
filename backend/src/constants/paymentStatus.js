/**
 * Payment Status Constants
 * Centralized constants for payment status
 */

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELED: 'canceled'
};

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.COMPLETED]: 'Completed',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.CANCELED]: 'Canceled'
};
