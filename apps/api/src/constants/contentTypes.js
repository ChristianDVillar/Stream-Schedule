/**
 * Content Type Constants
 * Centralized constants for content types to avoid magic strings
 */

export const CONTENT_TYPES = {
  POST: 'post',
  STREAM: 'stream',
  EVENT: 'event',
  REEL: 'reel'
};

export const CONTENT_TYPE_VALUES = Object.values(CONTENT_TYPES);

export const CONTENT_TYPE_LABELS = {
  [CONTENT_TYPES.POST]: 'Post',
  [CONTENT_TYPES.STREAM]: 'Stream',
  [CONTENT_TYPES.EVENT]: 'Event',
  [CONTENT_TYPES.REEL]: 'Reel'
};
