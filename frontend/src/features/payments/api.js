import { apiClient } from '../../shared/api/client';

export async function createCheckout({ licenseType, token }) {
  return apiClient.post('/payments/checkout', { licenseType }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function createCustomerPortal(token) {
  return apiClient.post('/payments/customer-portal', {}, { headers: { Authorization: `Bearer ${token}` } });
}

export async function verifyPaymentSession({ sessionId, token }) {
  return apiClient.post('/payments/verify-session', { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function getLicenseStatus(token) {
  return apiClient.get('/user/license', { headers: { Authorization: `Bearer ${token}` } });
}

export async function getAvailableLicenses() {
  return apiClient.get('/user/available-licenses');
}

export async function getPaymentConfigStatus() {
  return apiClient.get('/payments/config-status');
}

export async function createSubscription({ licenseType, token }) {
  return apiClient.post('/payments/subscribe', { licenseType }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function getSubscriptionStatus(token) {
  return apiClient.get('/payments/subscription', { headers: { Authorization: `Bearer ${token}` } });
}

export async function cancelSubscription(token) {
  return apiClient.post('/payments/subscription/cancel', {}, { headers: { Authorization: `Bearer ${token}` } });
}

export async function getPaymentHistory(token) {
  return apiClient.get('/payments/history', { headers: { Authorization: `Bearer ${token}` } });
}

