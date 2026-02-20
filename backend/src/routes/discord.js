/**
 * Discord API routes - backend only.
 * Bot token (DISCORD_BOT_TOKEN) is NEVER sent to frontend; all Discord API calls use it here.
 * User's Discord OAuth token is used only to list guilds (servers) the user is in; posting uses bot token.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';

const router = express.Router();
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_OAUTH2 = 'https://discord.com/api/oauth2';

function getBotToken() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn('DISCORD_BOT_TOKEN not set - Discord post/list will fail');
    return null;
  }
  return token;
}

/**
 * Refresh Discord OAuth2 access token so the user does not have to log in again.
 * Returns { accessToken, refreshToken } or null on failure.
 */
async function refreshDiscordToken(refreshToken) {
  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(`${DISCORD_OAUTH2}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken };
  } catch (e) {
    logger.warn('Discord token refresh failed', { error: e.message });
    return null;
  }
}

/**
 * GET /discord/invite-url
 * Returns the Discord bot invite URL so the user can add the bot to their server.
 * Uses DISCORD_CLIENT_ID (same Application as the bot in Discord Developer Portal).
 */
function getInviteUrl() {
  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  if (!clientId) return null;
  const permissions = '8601501696';
  const scope = 'bot%20applications.commands';
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scope}`;
}

router.get('/invite-url', requireAuth, (req, res) => {
  const url = getInviteUrl();
  if (!url) {
    return res.status(503).json({ error: 'Discord not configured', inviteUrl: null });
  }
  res.json({ inviteUrl: url });
});

/**
 * Returns guilds where the user is owner (server they created) AND the bot is in.
 * @param {object} user - User model instance with discordAccessToken, discordRefreshToken (optional save() for token refresh)
 * @returns {Promise<{ guilds: Array<{id,name,icon}>, guildIds: Set<string> } | null>}
 */
async function getOwnedGuildsWithBot(user) {
  if (!user?.discordId || (!user?.discordAccessToken && !user?.discordRefreshToken)) return null;
  let accessToken = user.discordAccessToken;
  if (!accessToken && user.discordRefreshToken) {
    const refreshed = await refreshDiscordToken(user.discordRefreshToken);
    if (!refreshed) return null;
    accessToken = refreshed.accessToken;
    user.discordAccessToken = refreshed.accessToken;
    user.discordRefreshToken = refreshed.refreshToken;
    if (typeof user.save === 'function') await user.save();
  }
  if (!accessToken) return null;
  const botToken = getBotToken();
  if (!botToken) return null;

  const [userGuildsRes, botGuildsRes] = await Promise.all([
    fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bot ${botToken}` } }),
  ]);

  if (!userGuildsRes.ok || !botGuildsRes.ok) return null;
  const userGuilds = await userGuildsRes.json();
  const botGuildIds = new Set((await botGuildsRes.json()).map((g) => g.id));
  const guilds = userGuilds
    .filter((g) => g.owner === true && botGuildIds.has(g.id))
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));
  return { guilds, guildIds: new Set(guilds.map((g) => g.id)) };
}

/**
 * GET /discord/dashboard-stats
 * Returns Discord connection status, guild count (only servers the user owns, with bot), and invite URL.
 */
router.get('/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'discordId', 'discordAccessToken', 'discordRefreshToken'] });
    const hasDiscord = user?.discordId && (user?.discordAccessToken || user?.discordRefreshToken);
    const inviteUrl = getInviteUrl();

    if (!hasDiscord) {
      return res.json({
        discordConnected: false,
        guildsCount: 0,
        inviteUrl: inviteUrl || null
      });
    }

    const result = await getOwnedGuildsWithBot(user);
    const guildsCount = result?.guilds?.length ?? 0;

    res.json({
      discordConnected: true,
      guildsCount,
      inviteUrl: inviteUrl || null
    });
  } catch (err) {
    logger.error('Discord dashboard-stats error', { error: err.message, userId: req.user?.id });
    res.json({
      discordConnected: false,
      guildsCount: 0,
      inviteUrl: getInviteUrl() || null
    });
  }
});

/**
 * GET /discord/guilds
 * Returns guilds where the authenticated user is the owner (server they created) AND the bot is in.
 * So users only see and publish to their own servers, not every server where the bot is present.
 */
router.get('/guilds', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'discordId', 'discordAccessToken', 'discordRefreshToken', 'oauthProvider'] });
    const hasDiscord = user?.discordId && (user?.discordAccessToken || user?.discordRefreshToken);
    if (!hasDiscord) {
      logger.warn('Discord guilds: User does not have valid Discord connection', { userId: req.user.id });
      return res.status(400).json({
        code: 'discord_not_connected',
        error: 'Connect Discord first',
        details: 'Log in with Discord or link Discord in Settings to list your servers.',
      });
    }

    const result = await getOwnedGuildsWithBot(user);
    if (!result) {
      return res.status(502).json({
        code: 'discord_fetch_failed',
        error: 'Could not load your Discord servers',
        details: 'Session may have expired. Try reconnecting Discord in Settings.',
      });
    }

    res.json({ guilds: result.guilds });
  } catch (err) {
    logger.error('Discord guilds error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to list Discord servers' });
  }
});

/**
 * GET /discord/guilds/:guildId/channels
 * Returns text channels in the guild. Only allowed for guilds the user owns (and bot is in).
 */
router.get('/guilds/:guildId/channels', requireAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'discordId', 'discordAccessToken', 'discordRefreshToken'] });
    const allowed = await getOwnedGuildsWithBot(user);
    if (!allowed || !allowed.guildIds.has(guildId)) {
      return res.status(403).json({
        error: 'Access denied to this server',
        details: 'You can only view channels of servers you own (where the bot is added).',
      });
    }

    const botToken = getBotToken();
    if (!botToken) {
      return res.status(503).json({ error: 'Discord bot not configured' });
    }

    const resDiscord = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (resDiscord.status === 403) {
      return res.status(403).json({
        error: 'Bot does not have access to this server',
        details: 'The bot needs to be invited to the server with permission to view channels.',
      });
    }
    if (resDiscord.status === 404) {
      return res.status(404).json({ error: 'Server not found' });
    }
    if (!resDiscord.ok) {
      const errText = await resDiscord.text();
      logger.warn('Discord guild channels failed', { guildId, status: resDiscord.status, body: errText });
      return res.status(502).json({ error: 'Failed to fetch channels' });
    }

    const channels = await resDiscord.json();
    const GUILD_TEXT = 0;
    const textChannels = channels
      .filter((c) => c.type === GUILD_TEXT)
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));

    res.json({ channels: textChannels });
  } catch (err) {
    logger.error('Discord channels error', { error: err.message, guildId: req.params.guildId });
    res.status(500).json({ error: 'Failed to list channels' });
  }
});

/**
 * POST /discord/channels/:channelId/messages
 * Sends a message to a channel. Only allowed for channels in guilds the user owns (with bot).
 */
router.post('/channels/:channelId/messages', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'discordId', 'discordAccessToken', 'discordRefreshToken'] });
    const allowed = await getOwnedGuildsWithBot(user);
    if (!allowed) {
      return res.status(403).json({
        error: 'Discord not connected or could not verify server access',
        details: 'Connect Discord and use a channel from a server you own.',
      });
    }
    const botToken = getBotToken();
    if (!botToken) return res.status(503).json({ error: 'Discord bot not configured' });
    const channelRes = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!channelRes.ok) {
      return res.status(channelRes.status === 404 ? 404 : 502).json({
        error: channelRes.status === 404 ? 'Channel not found' : 'Failed to get channel',
      });
    }
    const channel = await channelRes.json();
    const guildId = channel.guild_id;
    if (!guildId || !allowed.guildIds.has(guildId)) {
      return res.status(403).json({
        error: 'Access denied to this channel',
        details: 'You can only post to channels in servers you own (where the bot is added).',
      });
    }

    const { content, embeds } = req.body || {};
    const { postToDiscordChannel } = await import('../utils/discordPublish.js');
    const message = await postToDiscordChannel(channelId, content, embeds);
    res.json({ id: message.id, channel_id: channelId });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        error: 'Bot does not have permission in this channel',
        details: 'The bot needs SEND_MESSAGES (and ATTACH_FILES if you send attachments) in this channel.',
      });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    logger.error('Discord post message error', { error: err.message, channelId: req.params.channelId });
    res.status(err.status || 500).json({
      error: err.message || 'Failed to send message',
      details: err.details,
    });
  }
});

export default router;
