/**
 * Cryptographic Utilities
 * Secure random generation for passwords, tokens, and license keys
 * Token encryption/decryption for OAuth tokens
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment variable
 * Falls back to JWT_SECRET if TOKEN_ENCRYPTION_KEY not set (not recommended for production)
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set for token encryption');
  }
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a token using AES-256-GCM
 * @param {string} plaintext - Token to encrypt
 * @returns {string} Encrypted token (base64 encoded)
 */
export function encryptToken(plaintext) {
  if (!plaintext) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Derive additional key material from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
    const derivedCipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    
    let encrypted = derivedCipher.update(plaintext, 'utf8', 'base64');
    encrypted += derivedCipher.final('base64');
    
    const tag = derivedCipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Token encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a token using AES-256-GCM
 * @param {string} encryptedToken - Encrypted token (base64 encoded)
 * @returns {string} Decrypted token
 */
export function decryptToken(encryptedToken) {
  if (!encryptedToken) return null;
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedToken, 'base64');
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);
    
    // Derive key from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Token decryption failed: ${error.message}`);
  }
}

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

/**
 * Generate an idempotency key for content publication
 * Format: contentId-platform-scheduledForTimestamp
 * @param {number} contentId - Content ID
 * @param {string} platform - Platform name
 * @param {Date|string} scheduledFor - Scheduled date/time
 * @returns {string} Idempotency key
 */
export function generateIdempotencyKey(contentId, platform, scheduledFor) {
  const timestamp = scheduledFor instanceof Date 
    ? scheduledFor.getTime() 
    : new Date(scheduledFor).getTime();
  return `${contentId}-${platform}-${timestamp}`;
}
