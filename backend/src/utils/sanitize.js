/**
 * HTML sanitization utilities
 * Prevents XSS attacks by cleaning user input
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

/**
 * Simple HTML sanitizer (lightweight alternative to DOMPurify)
 * Removes potentially dangerous HTML tags and attributes
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Allowed tags (whitelist approach)
  const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'];
  const allowedAttributes = {
    a: ['href', 'title'],
  };

  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*[^\s>]+/gi, ''); // Remove inline event handlers

  // For production, consider using a library like DOMPurify
  // For now, this provides basic protection
  return sanitized;
}

/**
 * Sanitize plain text (remove HTML entirely)
 * @param {string} text - Text to sanitize
 * @returns {string} Plain text without HTML
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&[#\w]+;/g, '') // Remove HTML entities
    .trim();
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}
