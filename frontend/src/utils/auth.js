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
 * Get token payload without verification
 * @param {string} token - JWT token
 * @returns {object|null} - Token payload or null if invalid
 */
export function getTokenPayload(token) {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
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
 * Save authentication data to localStorage
 * @param {string} token - JWT token
 * @param {object} user - User object
 */
export function saveAuth(token, user) {
  if (token) {
    localStorage.setItem('auth_token', token);
  }
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
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
