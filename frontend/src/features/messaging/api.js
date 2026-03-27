import { apiClient } from '../../shared/api/client';

export async function createMessage({ subject, content, priority, category, attachments, token }) {
  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('content', content);
  formData.append('priority', priority || 'normal');
  if (category) formData.append('category', category);
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => formData.append('attachments', file));
  }
  return apiClient.post('/messages', formData, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });
}

export async function getMyMessages(token) {
  return apiClient.get('/messages/my-messages', { headers: { Authorization: `Bearer ${token}` } });
}

export async function getMessage(messageId, token) {
  return apiClient.get(`/messages/${messageId}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function replyToMessage({ messageId, reply, attachments, token }) {
  const formData = new FormData();
  formData.append('messageId', messageId);
  formData.append('reply', reply);
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => formData.append('attachments', file));
  }
  return apiClient.post('/messages/reply', formData, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });
}

export async function getNotifications(token) {
  return apiClient.get('/notifications', { headers: { Authorization: `Bearer ${token}` } });
}

export async function getNotificationsUnreadCount(token) {
  return apiClient.get('/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
}

export async function markNotificationRead(notificationId, token) {
  return apiClient.patch(`/notifications/${notificationId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
}

export async function getUnreadMessageCount(token) {
  return apiClient.get('/messages/admin/unread-count', { headers: { Authorization: `Bearer ${token}` } });
}

