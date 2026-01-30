import axios from 'axios';
import { isTokenExpired, clearAuth } from './utils/auth';

// Get API URL from environment variable, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${API_URL}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor: Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    // Check if token is expired before making request
    if (token && isTokenExpired(token)) {
      // Token expired, clear auth and redirect will happen in response interceptor
      clearAuth();
      return Promise.reject(new Error('Token expired'));
    }
    
    // Add token to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors (unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (token expired or invalid)
    // Do NOT clear auth or redirect when the failed request was login/register – let the form show the error
    const isLoginOrRegister = error.config?.url?.includes('/user/login') || error.config?.url?.includes('/user/register');
    if (error.response?.status === 401 && !isLoginOrRegister) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function register({ username, email, password, startWithTrial, licenseOption }) {
  return apiClient.post('/user/register', { username, email, password, startWithTrial, licenseOption });
}

export async function login({ email, password }) {
  return apiClient.post('/user/login', { email, password });
}

export async function forgotPassword({ email }) {
  return apiClient.post('/user/forgot-password', { email });
}

export async function loginWithGoogle() {
  // Redirect to backend OAuth endpoint
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/google`;
}

export async function loginWithTwitch() {
  // Redirect to backend OAuth endpoint
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/twitch`;
}

export async function generateLicense({ userId, token }) {
  return apiClient.post('/user/generate-license', { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAllUsers(token) {
  return apiClient.get('/user/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminGenerateLicense({ userId, licenseType, token }) {
  return apiClient.post('/user/admin/generate-license', { userId, licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminChangeEmail({ userId, newEmail, token }) {
  return apiClient.post('/user/admin/change-email', { userId, newEmail }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminResetPassword({ userId, token }) {
  return apiClient.post('/user/admin/reset-password', { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
} 

export async function adminCreateUser({ username, email, password, isAdmin, token }) {
  return apiClient.post('/user/admin/create', { username, email, password, isAdmin }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminUpdateLicense({ userId, licenseType, token }) {
  return apiClient.post('/user/admin/update-license', { userId, licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminAssignTrial({ userId, token }) {
  return apiClient.post('/user/admin/assign-trial', { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getLicenseStatus(token) {
  return apiClient.get('/user/license', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createCheckout({ licenseType, token }) {
  return apiClient.post('/payments/checkout', { licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function verifyPaymentSession({ sessionId, token }) {
  return apiClient.post('/payments/verify-session', { sessionId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPaymentStats(token) {
  return apiClient.get('/payments/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPaymentConfigStatus() {
  return apiClient.get('/payments/config-status');
}

export async function createSubscription({ licenseType, token }) {
  return apiClient.post('/payments/subscribe', { licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getSubscriptionStatus(token) {
  return apiClient.get('/payments/subscription', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function cancelSubscription(token) {
  return apiClient.post('/payments/subscription/cancel', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPaymentHistory(token) {
  return apiClient.get('/payments/history', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAvailableLicenses() {
  return apiClient.get('/user/available-licenses');
}

export async function getLicenseConfig(token) {
  return apiClient.get('/user/admin/license-config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminExtendTrial({ userId, days, token }) {
  return apiClient.post('/user/admin/extend-trial', { userId, days }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateLicenseConfig({ availableLicenseTypes, token }) {
  return apiClient.post('/user/admin/license-config', { availableLicenseTypes }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function changePassword({ currentPassword, newPassword, token }) {
  return apiClient.put('/user/password', { currentPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPasswordReminder(token) {
  return apiClient.get('/user/admin/password-reminder', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Upload file through backend (secure method using Service Role Key)
 * @param {File} file - The file to upload
 * @param {string} bucket - 'images' or 'videos' (optional, auto-detected)
 * @returns {Promise} API response with upload info and URL
 */
export async function uploadFileThroughBackend(file, bucket) {
  const formData = new FormData();
  formData.append('file', file);
  if (bucket) {
    formData.append('bucket', bucket);
  }
  
  return apiClient.post('/upload/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * Register an upload in the backend
 * This should be called after successfully uploading a file to Supabase Storage
 * @param {Object} params
 * @param {string} params.user_id - User UUID
 * @param {string} params.bucket - 'images' or 'videos'
 * @param {string} params.file_path - Path to the file in Supabase Storage
 * @param {boolean} params.isTrialUser - Whether the user is on trial (optional, will be inferred from user if not provided)
 * @returns {Promise} API response
 */
export async function registerUpload({ user_id, bucket, file_path, isTrialUser }) {
  return apiClient.post('/upload', {
    user_id,
    bucket,
    file_path,
    isTrialUser
  });
}

/**
 * Get upload statistics for a user
 * @param {string} user_id - User UUID
 * @returns {Promise} API response with upload stats
 */
export async function getUploadStats(user_id) {
  return apiClient.get(`/upload/stats/${user_id}`);
}

/**
 * Delete an uploaded file
 * @param {string} upload_id - Upload record ID
 * @returns {Promise} API response
 */
export async function deleteUpload(upload_id) {
  return apiClient.delete(`/upload/${upload_id}`);
}

/**
 * Get a signed URL for a video file
 * @param {string} file_path - Path to the video file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise} API response with signedUrl
 */
export async function getVideoSignedUrl(file_path, expiresIn = 3600) {
  // Use query parameters instead of path parameters to avoid routing issues
  return apiClient.get('/upload/video-url', {
    params: { 
      file_path: file_path, // Axios will encode this automatically
      expiresIn 
    }
  });
}
