import { apiClient } from '../../shared/api/client';

export async function getTwitchDashboardStats() {
  const res = await apiClient.get('/user/twitch-dashboard-stats');
  return res.data;
}

export async function getTwitchSubs() {
  const res = await apiClient.get('/user/twitch-subs');
  return res.data;
}

export async function getTwitchBits(format = 'chronological') {
  const res = await apiClient.get(`/user/twitch-bits?format=${format}`);
  return res.data;
}

export async function getTwitchDonations() {
  const res = await apiClient.get('/user/twitch-donations');
  return res.data;
}

