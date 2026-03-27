import { apiClient } from '../../shared/api/client';

export async function setupSlackWorkspace() {
  const res = await apiClient.post('/user/slack/setup-workspace');
  return res.data;
}

export async function getInstagramAccount() {
  const res = await apiClient.get('/instagram/account');
  return res.data;
}

export async function getInstagramPosts(limit = 5) {
  const res = await apiClient.get('/instagram/posts', { params: { limit } });
  return res.data;
}

export async function getInstagramPostInsights(mediaId) {
  const res = await apiClient.get(`/instagram/posts/${encodeURIComponent(mediaId)}/insights`);
  return res.data;
}

export async function getNightbotKey() {
  const res = await apiClient.get('/user/nightbot-key');
  return res.data?.key ?? null;
}

export async function generateNightbotKey() {
  const res = await apiClient.post('/user/nightbot-key');
  return res.data?.key ?? null;
}

