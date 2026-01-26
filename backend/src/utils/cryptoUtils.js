/**
 * Cryptographic Utilities
 * Secure random generation for passwords, tokens, and license keys
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string in bytes (will be doubled for hex)
 * @returns {string} Random hex string
 */
export function generateRandomString(length = 16) {
  return crypto.randomBytes(length).toString('hex').toUpperCase();
}

/**
 * Generate a secure license key with optional prefix
 * @param {string} prefix - Optional prefix (e.g., 'TRIAL', 'MONTHLY')
 * @param {number} length - Length of random part in bytes
 * @returns {string} License key
 */
export function generateLicenseKey(prefix = '', length = 12) {
  const randomPart = generateRandomString(length);
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

/**
 * Generate a secure temporary password
 * @param {number} length - Length in bytes (default: 12 = 24 hex chars)
 * @returns {string} Temporary password
 */
export function generateTemporaryPassword(length = 12) {
  return generateRandomString(length);
}

/**
 * Generate a secure random username suffix
 * @param {number} length - Length in bytes (default: 3 = 6 hex chars)
 * @returns {string} Random suffix
 */
export function generateUsernameSuffix(length = 3) {
  return generateRandomString(length).toLowerCase();
}
