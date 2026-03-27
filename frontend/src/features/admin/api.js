import { apiClient } from '../../shared/api/client';

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getAllUsers = (token) => apiClient.get('/user/admin/users', auth(token));
export const adminDeleteUser = ({ userId, token }) => apiClient.delete(`/user/admin/users/${userId}`, auth(token));
export const adminSetUserDisabled = ({ userId, disabled, token }) =>
  apiClient.post(`/user/admin/users/${userId}/disabled`, { disabled }, auth(token));
export const adminGenerateLicense = ({ userId, licenseType, token }) =>
  apiClient.post('/user/admin/generate-license', { userId, licenseType }, auth(token));
export const adminChangeEmail = ({ userId, newEmail, token }) =>
  apiClient.post('/user/admin/change-email', { userId, newEmail }, auth(token));
export const adminResetPassword = ({ userId, token }) =>
  apiClient.post('/user/admin/reset-password', { userId }, auth(token));
export const adminCreateUser = ({ username, email, password, isAdmin, token }) =>
  apiClient.post('/user/admin/create', { username, email, password, isAdmin }, auth(token));
export const adminUpdateLicense = ({ userId, licenseType, token }) =>
  apiClient.post('/user/admin/update-license', { userId, licenseType }, auth(token));
export const adminAssignTrial = ({ userId, token }) =>
  apiClient.post('/user/admin/assign-trial', { userId }, auth(token));
export const getPaymentStats = (token) => apiClient.get('/payments/admin/stats', auth(token));
export const getLicenseConfig = (token) => apiClient.get('/user/admin/license-config', auth(token));
export const updateLicenseConfig = ({ availableLicenseTypes, token }) =>
  apiClient.post('/user/admin/license-config', { availableLicenseTypes }, auth(token));
export const getPasswordReminder = (token) => apiClient.get('/user/admin/password-reminder', auth(token));
export const adminExtendTrial = ({ userId, days, token }) =>
  apiClient.post('/user/admin/extend-trial', { userId, days }, auth(token));
export const getAdminMessages = (params) => apiClient.get('/messages/admin', { params, ...auth(params.token) });
export const getUnreadMessageCount = (token) => apiClient.get('/messages/admin/unread-count', auth(token));
export const getAdminMessage = (messageId, token) => apiClient.get(`/messages/admin/${messageId}`, auth(token));
export const updateMessageStatus = ({ messageId, status, token }) =>
  apiClient.patch('/messages/admin/status', { messageId, status }, auth(token));
export const deleteMessage = (messageId, token) => apiClient.delete(`/messages/admin/${messageId}`, auth(token));
export const resolveMessage = (messageId, token) => apiClient.post('/messages/admin/resolve', { messageId }, auth(token));
export const reopenMessage = (messageId, token) => apiClient.post('/messages/admin/reopen', { messageId }, auth(token));
export const getAdminPaymentsList = ({ limit, offset, status, from, to, token }) =>
  apiClient.get('/payments/admin/list', { params: { limit, offset, status, from, to }, ...auth(token) });
export const getAdminPaymentsExportBlob = async ({ format, status, from, to, token }) => {
  const res = await apiClient.get('/payments/admin/export', {
    params: { format: format || 'csv', status, from, to },
    responseType: 'blob',
    ...auth(token),
  });
  return res.data;
};
export const sendNotification = ({ title, content, broadcast = true, userId, token }) =>
  apiClient.post('/notifications', { title, content, broadcast, userId }, auth(token));
export const getPlatformConfig = (token) => apiClient.get('/admin/platforms/config', auth(token));
export const updatePlatformConfig = ({ platforms, token }) => apiClient.put('/admin/platforms/config', { platforms }, auth(token));
export const getFixedCosts = (token) => apiClient.get('/user/admin/fixed-costs', auth(token));
export const updateFixedCosts = ({ fixedCosts, token }) => apiClient.post('/user/admin/fixed-costs', { fixedCosts }, auth(token));
export const getUsdToEurRate = (token) => apiClient.get('/admin/exchange-rate-usd-eur', auth(token)).then((r) => r.data);
export const getAlertConfig = (token) => apiClient.get('/user/admin/alert-config', auth(token));
export const updateAlertConfig = ({ config, token }) => apiClient.put('/user/admin/alert-config', config, auth(token));
export const testAlertConfig = ({ type, token }) => apiClient.post('/user/admin/alert-config/test', { type: type || 'dev' }, auth(token));
export const getCostMetrics = (token) => apiClient.get('/user/admin/cost-metrics', auth(token));
export const getTrialExtensionConfig = (token) => apiClient.get('/user/admin/trial-extension-config', auth(token));
export const updateTrialExtensionConfig = ({ trialExtensionConfig, token }) =>
  apiClient.post('/user/admin/trial-extension-config', { trialExtensionConfig }, auth(token));
export const getAdminFeatures = (token) => apiClient.get('/admin/features', auth(token)).then((r) => r.data);
export const getDiscountCodes = (token) => apiClient.get('/user/admin/discount-codes', auth(token));
export const updateDiscountCodes = ({ discountCodes, token }) =>
  apiClient.post('/user/admin/discount-codes', { discountCodes }, auth(token));

export async function replyToMessage({ messageId, reply, attachments, token }) {
  const formData = new FormData();
  formData.append('messageId', messageId);
  formData.append('reply', reply);
  if (attachments && attachments.length > 0) attachments.forEach((file) => formData.append('attachments', file));
  return apiClient.post('/messages/reply', formData, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });
}

