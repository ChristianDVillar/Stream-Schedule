import { apiClient } from '../../shared/api/client';

export async function getDiscordInviteUrl() {
  const res = await apiClient.get('/discord/invite-url');
  return res.data;
}

export async function getDiscordGuilds() {
  const res = await apiClient.get('/discord/guilds');
  return res.data;
}

export async function getDiscordChannels(guildId) {
  const res = await apiClient.get(`/discord/guilds/${guildId}/channels`);
  return res.data;
}

export async function postDiscordMessage(channelId, { content, embeds } = {}) {
  const res = await apiClient.post(`/discord/channels/${channelId}/messages`, { content, embeds });
  return res.data;
}

export async function getDiscordDashboardStats() {
  const res = await apiClient.get('/discord/dashboard-stats');
  return res.data;
}

