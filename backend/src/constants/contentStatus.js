/**
 * Content Status Constants
 * Centralized constants for content status to avoid magic strings
 */

export const CONTENT_STATUS = {
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

export const CONTENT_STATUS_VALUES = Object.values(CONTENT_STATUS);

export const CONTENT_STATUS_LABELS = {
  [CONTENT_STATUS.SCHEDULED]: 'Scheduled',
  [CONTENT_STATUS.PUBLISHED]: 'Published',
  [CONTENT_STATUS.FAILED]: 'Failed',
  [CONTENT_STATUS.CANCELED]: 'Canceled'
};
