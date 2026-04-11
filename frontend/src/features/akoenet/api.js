import { apiClient } from '../../shared/api/client';

export async function getAkoenetGuilds() {
  const res = await apiClient.get('/akoenet/guilds');
  return res.data;
}

export async function getAkoenetChannels(guildId) {
  const res = await apiClient.get(`/akoenet/guilds/${encodeURIComponent(guildId)}/channels`);
  return res.data;
}
