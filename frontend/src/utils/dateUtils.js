/**
 * Utility functions for date formatting
 * Shared across components to avoid code duplication
 * 
 * ⏱️ Regla de oro:
 * ✅ Backend / DB → hora del servidor (UTC)
 * ✅ Frontend / UI → hora local del usuario
 * 
 * El backend siempre guarda fechas en UTC (usando toISOString()).
 * Estas funciones convierten automáticamente a la hora local del usuario.
 */

/**
 * Format a date string to a localized string (hora local del usuario)
 * Esta es la función principal para mostrar fechas a usuarios finales.
 * 
 * @param {string|Date} dateString - Date in UTC from backend
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in user's local timezone
 * 
 * @example
 * formatDate('2026-01-29T12:00:00Z') // Shows in user's local time
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
  
  // Automáticamente usa la zona horaria del navegador/usuario
  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Format a date to a short date string (hora local del usuario)
 * @param {string|Date} dateString - Date in UTC from backend
 * @returns {string} Short date string in user's local timezone
 */
export function formatShortDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString();
}

/**
 * Format a date to time only (hora local del usuario)
 * @param {string|Date} dateString - Date in UTC from backend
 * @returns {string} Time string in user's local timezone
 */
export function formatTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid time';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date with date and time style (hora local del usuario)
 * Más controlado y limpio para UI
 * 
 * @param {string|Date} dateString - Date in UTC from backend
 * @param {object} options - dateStyle and timeStyle options
 * @returns {string} Formatted date string in user's local timezone
 * 
 * @example
 * formatDateTime('2026-01-29T12:00:00Z') // "Jan 29, 2026, 1:00 PM" (local time)
 * formatDateTime('2026-01-29T12:00:00Z', { dateStyle: 'short', timeStyle: 'short' })
 */
export function formatDateTime(dateString, options = {}) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options
  };
  
  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Format date for scheduler display (hora local del usuario)
 * Muestra fecha y hora de forma amigable para eventos programados
 * 
 * @param {string|Date} dateString - Date in UTC from backend
 * @returns {string} Formatted string like "2 feb 2026, 21:00"
 */
export function formatScheduledDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date in UTC (SOLO para admin/debug/logs)
 * ⚠️ NO usar para usuarios finales
 * 
 * @param {string|Date} dateString - Date in UTC
 * @returns {string} Formatted date string in UTC
 * 
 * @example
 * formatDateUTC('2026-01-29T12:00:00Z') // "Jan 29, 2026, 12:00 PM UTC"
 */
export function formatDateUTC(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
}

/**
 * Format date with both local and UTC (para usuarios avanzados/admin)
 * Muestra hora local y UTC lado a lado
 * 
 * @param {string|Date} dateString - Date in UTC from backend
 * @returns {object} { local: string, utc: string, timezone: string }
 */
export function formatDateWithUTC(dateString) {
  if (!dateString) return { local: '—', utc: '—', timezone: '' };
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { local: 'Invalid date', utc: 'Invalid date', timezone: '' };
  
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const local = date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const utc = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
  
  return { local, utc, timezone };
}

/**
 * Get user's timezone
 * @returns {string} User's timezone (e.g., "America/New_York")
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
