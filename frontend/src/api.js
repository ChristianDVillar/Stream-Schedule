import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api'
});

export async function register({ username, email, password }) {
  return apiClient.post('/user/register', { username, email, password });
}

export async function login({ email, password }) {
  return apiClient.post('/user/login', { email, password });
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
