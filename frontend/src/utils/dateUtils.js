/**
 * Utility functions for date formatting
 * Shared across components to avoid code duplication
 */

/**
 * Format a date string to a localized string
 * @param {string|Date} dateString - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Format a date to a short date string (MM/DD/YYYY)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Short date string
 */
export function formatShortDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString();
}

/**
 * Format a date to time only (HH:MM)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Time string
 */
export function formatTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid time';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
