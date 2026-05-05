/**
 * Application-wide constants and configuration
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

export const APP_CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Content limits
  MAX_CONTENT_LENGTH: 5000,
  MAX_TITLE_LENGTH: 200,
  
  // Scheduler (configurable vía SCHEDULER_INTERVAL_MS en env; default 1 min)
  SCHEDULER_INTERVAL_MS: Number(process.env.SCHEDULER_INTERVAL_MS) || 60 * 1000,
  
  // Cache TTL (seconds)
  CACHE_TTL: {
    STATS: 300, // 5 minutes
    USER_PROFILE: 600, // 10 minutes
    CONNECTED_ACCOUNTS: 300, // 5 minutes
    TWITCH_STATS: 60, // 1 minute
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1,
  },
  
  // Rate limiting windows (ms)
  RATE_LIMIT: {
    AUTH_WINDOW: 15 * 60 * 1000, // 15 minutes
    API_WINDOW: 15 * 60 * 1000, // 15 minutes
    UPLOAD_WINDOW: 60 * 60 * 1000, // 1 hour
  },
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_DELAY: 2000, // 2 seconds
  },
  
  // Signed URL expiration
  SIGNED_URL_EXPIRES_SEC: 3600, // 1 hour
};
