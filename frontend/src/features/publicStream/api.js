import { apiClient } from '../../shared/api/client';

export async function getPublicStreamerEvents(username) {
  const res = await apiClient.get(`/streamer/${encodeURIComponent(username)}/events`);
  return res.data;
}

export async function subscribeStreamReminder(username, email) {
  const res = await apiClient.post(`/streamer/${encodeURIComponent(username)}/remind`, { email });
  return res.data;
}

