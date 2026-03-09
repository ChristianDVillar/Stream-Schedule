/**
 * Authentication utilities
 * Handles token validation, storage, and refresh logic
 */

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is expired or invalid
 */
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return true;
    
    // Check if token expires in less than 1 minute (buffer time)
    const now = Math.floor(Date.now() / 1000);
    return exp < (now + 60);
  } catch (error) {
    return true;
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

/**
 * Get stored authentication data
 * @returns {{token: string|null, user: object|null}}
 */
export function getStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch (error) {
    return { token: null, user: null };
  }
}
