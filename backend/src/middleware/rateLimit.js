/**
 * Granular rate limiting middleware
 * Different limits for different endpoint types
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import rateLimit from 'express-rate-limit';
import { APP_CONFIG } from '../constants/app.js';

/**
 * Rate limiter for authentication endpoints (login, register, password reset)
 * Very strict to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.AUTH_WINDOW,
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
    retryAfter: Math.ceil(APP_CONFIG.RATE_LIMIT.AUTH_WINDOW / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Rate limiter for file uploads
 * Prevents abuse of storage resources
 */
export const uploadLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.UPLOAD_WINDOW,
  max: 50, // 50 uploads per hour
  message: {
    error: 'Upload limit exceeded',
    message: 'Too many uploads. Please try again later.',
    retryAfter: Math.ceil(APP_CONFIG.RATE_LIMIT.UPLOAD_WINDOW / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API endpoints
 * More lenient than auth but still protective.
 * Higher limit to avoid 429 on dashboard load (multiple parallel requests + React Strict Mode double-mount).
 */
const isDev = process.env.NODE_ENV === 'development';
export const apiLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.API_WINDOW,
  max: isDev ? 500 : 300, // 500 in dev, 300 per 15 min in production
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please slow down.',
    retryAfter: Math.ceil(APP_CONFIG.RATE_LIMIT.API_WINDOW / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    // Skip for read-only upload stats (avoids 429 when FileUpload + MediaGallery + MediaUpload load)
    if (req.method === 'GET' && req.path && req.path.includes('/upload/stats/')) return true;
    return false;
  },
  handler: (req, res) => {
    // Ensure CORS headers are sent even on rate limit errors
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil(APP_CONFIG.RATE_LIMIT.API_WINDOW / 1000),
    });
  },
});

/**
 * Rate limiter for content creation
 * Prevents spam
 */
export const contentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 content items per hour
  message: {
    error: 'Content creation limit exceeded',
    message: 'Too many content items created. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
