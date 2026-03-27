import { apiClient } from '../../shared/api/client';

export async function cancelContent(contentId, token) {
  const res = await apiClient.put(
    `/content/${contentId}`,
    { status: 'canceled' },
    { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
  );
  return res.data;
}

export async function getRouletteState(token) {
  const res = await apiClient.get('/roulette/state', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function rouletteSpin(token) {
  const res = await apiClient.post('/roulette/spin', {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function rouletteReset(token) {
  const res = await apiClient.post('/roulette/reset', {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function getEnabledPlatforms() {
  return apiClient.get('/platforms/enabled');
}

