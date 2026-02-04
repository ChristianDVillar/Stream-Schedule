/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { randomBytes } from 'crypto';

// In-memory store for CSRF tokens (in production, use Redis)
const tokenStore = new Map();

/**
 * Generate CSRF token
 */
export function generateCsrfToken() {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  tokenStore.set(token, expiresAt);
  
  // Clean expired tokens
  setTimeout(() => {
    tokenStore.delete(token);
  }, 60 * 60 * 1000);
  
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token) {
  if (!token) return false;
  
  const expiresAt = tokenStore.get(token);
  if (!expiresAt) return false;
  
  if (Date.now() > expiresAt) {
    tokenStore.delete(token);
    return false;
  }
  
  return true;
}

/**
 * CSRF protection middleware
 * Skips GET, HEAD, OPTIONS requests
 */
export function csrfProtection(req, res, next) {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip OAuth callbacks (they come from external services)
  if (req.path.includes('/auth/') && req.path.includes('/callback')) {
    return next();
  }
  
  // Skip webhooks (they use signature verification)
  if (req.path.includes('/webhook')) {
    return next();
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!verifyCsrfToken(token)) {
    return res.status(403).json({
      error: 'CSRF token missing or invalid',
      message: 'Please refresh the page and try again',
    });
  }
  
  next();
}

/**
 * Get CSRF token endpoint (for frontend)
 */
export function getCsrfToken(req, res) {
  const token = generateCsrfToken();
  res.json({ csrfToken: token });
}
